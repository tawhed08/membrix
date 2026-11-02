import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import mongoose, { Types } from "mongoose";

import {
  authenticate,
  requireAdmin,
} from "../middleware/authenticate";

import User from "../models/User";
import Membership from "../models/Membership";
import MembershipPlan from "../models/MembershipPlan";
import Payment, {
  type PaymentMethod,
  type PaymentStatus,
} from "../models/Payment";
import Certificate from "../models/Certificate";
import Notification from "../models/Notification";
import { getActivationIntegrityIssue } from "../services/paymentIntegrity";

const router = Router();

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MembershipSummary = {
  _id: Types.ObjectId;
  totalMemberships: number;
  activeMemberships: number;
};

type RegexFilter = {
  $regex: string;
  $options: "i";
};

type MemberSearchFilter = {
  role: "member";
  isActive?: boolean;
  $or?: (
    | { name: RegexFilter }
    | { email: RegexFilter }
  )[];
};

type AdminPaymentFilter = {
  status?: PaymentStatus;
  method?: PaymentMethod;
  $or?: (
    | { transactionId: RegexFilter }
    | { paymentReference: RegexFilter }
    | { gatewayTransactionId: RegexFilter }
    | { user: { $in: Types.ObjectId[] } }
  )[];
};

type MemberStatus = "all" | "active" | "inactive";

type PaymentMethodFilter = "all" | PaymentMethod;

type PaymentStatusFilter = "all" | PaymentStatus;

type ReviewAction = "approve" | "reject";

class AdminActionError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AdminActionError";
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

/* -------------------------------------------------------------------------- */
/* GET /api/admin/overview                                                    */
/* -------------------------------------------------------------------------- */

router.get(
  "/overview",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const now = new Date();

      const [
        totalMembers,
        activeMemberships,
        pendingPayments,
        processingPayments,
        revenueRows,
        recentPayments,
      ] = await Promise.all([
        User.countDocuments({
          role: "member",
        }),

        Membership.countDocuments({
          status: "active",
          $or: [
            { endDate: null },
            { endDate: { $gt: now } },
          ],
        }),

        Payment.countDocuments({
          status: "pending",
        }),

        Payment.countDocuments({
          status: "processing",
        }),

        Payment.aggregate<{
          _id: null;
          totalRevenue: number;
          completedPayments: number;
        }>([
          {
            $match: {
              status: "completed",
              currency: "BDT",
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: "$amount",
              },
              completedPayments: {
                $sum: 1,
              },
            },
          },
        ]),

        Payment.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select(
            "amount currency method status transactionId gatewayTransactionId createdAt user plan",
          )
          .populate("user", "name email")
          .populate("plan", "name slug")
          .lean(),
      ]);

      const revenue = revenueRows[0] ?? {
        totalRevenue: 0,
        completedPayments: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          totalMembers,
          activeMemberships,
          pendingPayments,
          processingPayments,
          totalRevenue: revenue.totalRevenue,
          completedPayments: revenue.completedPayments,
          currency: "BDT",
          recentPayments,
        },
      });
    } catch (error) {
      console.error("Admin overview error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load admin overview.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* GET /api/admin/members                                                     */
/* -------------------------------------------------------------------------- */

router.get(
  "/members",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const requestedStatus =
        typeof req.query.status === "string"
          ? req.query.status
          : "all";

      if (
        !["all", "active", "inactive"].includes(requestedStatus)
      ) {
        res.status(400).json({
          success: false,
          message: "Status must be all, active, or inactive.",
        });
        return;
      }

      if (search.length > 100) {
        res.status(400).json({
          success: false,
          message: "Search text must not exceed 100 characters.",
        });
        return;
      }

      const page = parsePositiveInteger(req.query.page, 1);
      const limit = parsePositiveInteger(req.query.limit, 10, 50);

      const status = requestedStatus as MemberStatus;

      const filter: MemberSearchFilter = {
        role: "member",
      };

      if (status === "active") {
        filter.isActive = true;
      } else if (status === "inactive") {
        filter.isActive = false;
      }

      if (search) {
        const safeSearch = escapeRegex(search);

        filter.$or = [
          {
            name: {
              $regex: safeSearch,
              $options: "i",
            },
          },
          {
            email: {
              $regex: safeSearch,
              $options: "i",
            },
          },
        ];
      }

      const [total, members] = await Promise.all([
        User.countDocuments(filter),

        User.find(filter)
          .select("_id name email profileImage isActive createdAt updatedAt")
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      const memberIds = members.map((member) => member._id);
      const now = new Date();

      let summaries: MembershipSummary[] = [];

      if (memberIds.length > 0) {
        summaries = await Membership.aggregate<MembershipSummary>([
          {
            $match: {
              user: {
                $in: memberIds,
              },
            },
          },
          {
            $group: {
              _id: "$user",

              totalMemberships: {
                $sum: 1,
              },

              activeMemberships: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ["$status", "active"],
                        },
                        {
                          $or: [
                            {
                              $eq: [
                                {
                                  $ifNull: ["$endDate", null],
                                },
                                null,
                              ],
                            },
                            {
                              $gt: ["$endDate", now],
                            },
                          ],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]);
      }

      const summaryByUser = new Map(
        summaries.map((summary) => [
          String(summary._id),
          summary,
        ]),
      );

      const results = members.map((member) => {
        const id = String(member._id);
        const summary = summaryByUser.get(id);

        return {
          id,
          name: member.name,
          email: member.email,
          profileImage: member.profileImage ?? "",
          isActive: member.isActive,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          membershipCount: summary?.totalMemberships ?? 0,
          activeMembershipCount:
            summary?.activeMemberships ?? 0,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          members: results,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          filters: {
            search,
            status,
          },
        },
      });
    } catch (error) {
      console.error("Admin member list error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load members.",
      });
    }
  },
);
/* -------------------------------------------------------------------------- */
/* PATCH /api/admin/members/:memberId/status                                  */
/* -------------------------------------------------------------------------- */

router.patch(
  "/members/:memberId/status",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const memberId = req.params.memberId;

      if (
        typeof memberId !== "string" ||
        !Types.ObjectId.isValid(memberId)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid member ID.",
        });
        return;
      }

      const { isActive } = req.body ?? {};

      if (
        typeof isActive !== "boolean" ||
        Object.keys(req.body ?? {}).length !== 1
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid account status.",
        });
        return;
      }

      if (String(req.userId) === memberId) {
        res.status(403).json({
          success: false,
          message: "You cannot change your own account status.",
        });
        return;
      }

      const member = await User.findOneAndUpdate(
        {
          _id: memberId,
          role: "member",
          isActive: { $ne: isActive },
        },
        { $set: { isActive } },
        { new: true, runValidators: true },
      ).select("_id name email role isActive");

      if (!member) {
        const existing = await User.findById(memberId)
          .select("role isActive")
          .lean();

        if (!existing) {
          res.status(404).json({
            success: false,
            message: "Member not found.",
          });
          return;
        }

        res.status(409).json({
          success: false,
          message: existing.role !== "member"
            ? "Administrator accounts cannot be changed."
            : "Account already has this status.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: isActive
          ? "Member reactivated successfully."
          : "Member suspended successfully.",
        data: {
          member: {
            id: String(member._id),
            name: member.name,
            email: member.email,
            isActive: member.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Member status update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update member status.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* GET /api/admin/payments                                                    */
/* -------------------------------------------------------------------------- */

router.get(
  "/payments",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const requestedStatus =
        typeof req.query.status === "string"
          ? req.query.status
          : "all";

      const requestedMethod =
        typeof req.query.method === "string"
          ? req.query.method
          : "all";

      const allowedStatuses = [
        "all",
        "pending",
        "processing",
        "completed",
        "rejected",
        "failed",
        "refunded",
      ];

      const allowedMethods = [
        "all",
        "bkash",
        "nagad",
        "bank",
        "online",
      ];

      if (!allowedStatuses.includes(requestedStatus)) {
        res.status(400).json({
          success: false,
          message: "Invalid payment status filter.",
        });
        return;
      }

      if (!allowedMethods.includes(requestedMethod)) {
        res.status(400).json({
          success: false,
          message: "Invalid payment method filter.",
        });
        return;
      }

      if (search.length > 100) {
        res.status(400).json({
          success: false,
          message: "Search text must not exceed 100 characters.",
        });
        return;
      }

      const page = parsePositiveInteger(req.query.page, 1);
      const limit = parsePositiveInteger(req.query.limit, 10, 50);

      const status = requestedStatus as PaymentStatusFilter;
      const method = requestedMethod as PaymentMethodFilter;

      const filter: AdminPaymentFilter = {};

      if (status !== "all") {
        filter.status = status;
      }

      if (method !== "all") {
        filter.method = method;
      }

      if (search) {
        const safeSearch = escapeRegex(search);

        const regex: RegexFilter = {
          $regex: safeSearch,
          $options: "i",
        };

        const matchingUserIds = await User.find({
          role: "member",
          $or: [
            { name: regex },
            { email: regex },
          ],
        })
          .distinct("_id")
          .exec();

        const searchConditions: NonNullable<
          AdminPaymentFilter["$or"]
        > = [
          { transactionId: regex },
          { paymentReference: regex },
          { gatewayTransactionId: regex },
        ];

        if (matchingUserIds.length > 0) {
          searchConditions.push({
            user: {
              $in: matchingUserIds,
            },
          });
        }

        filter.$or = searchConditions;
      }

      const [total, payments] = await Promise.all([
        Payment.countDocuments(filter),

        Payment.find(filter)
          .select(
            "user membership plan amount currency method status transactionId paymentReference proofUrl gatewayTransactionId gatewayName reviewedBy reviewedAt adminNote createdAt updatedAt",
          )
          .populate("user", "name email")
          .populate("plan", "name slug price billingType")
          .populate("reviewedBy", "name email")
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          payments,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          filters: {
            search,
            status,
            method,
          },
        },
      });
    } catch (error) {
      console.error("Admin payment list error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load payments.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* PATCH /api/admin/payments/:paymentId/review                                 */
/* -------------------------------------------------------------------------- */

router.patch(
  "/payments/:paymentId/review",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    /*
     * Express 5 route parameters can have a wider type.
     * Validate the parameter before passing it to Mongoose.
     */
    const paymentIdParam = req.params.paymentId;

    const paymentId = Array.isArray(paymentIdParam)
      ? paymentIdParam[0]
      : paymentIdParam;

    if (
      typeof paymentId !== "string" ||
      !Types.ObjectId.isValid(paymentId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid payment ID.",
      });
      return;
    }

    const body = (req.body ?? {}) as {
      action?: unknown;
      adminNote?: unknown;
    };

    if (body.action !== "approve" && body.action !== "reject") {
      res.status(400).json({
        success: false,
        message: "Action must be approve or reject.",
      });
      return;
    }

    if (
      body.adminNote !== undefined &&
      typeof body.adminNote !== "string"
    ) {
      res.status(400).json({
        success: false,
        message: "Admin note must be text.",
      });
      return;
    }

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    if (adminNote.length > 1000) {
      res.status(400).json({
        success: false,
        message: "Admin note cannot exceed 1000 characters.",
      });
      return;
    }

    if (
      !req.userId ||
      !Types.ObjectId.isValid(req.userId)
    ) {
      res.status(401).json({
        success: false,
        message: "Valid admin authentication is required.",
      });
      return;
    }

    const action = body.action as ReviewAction;
    const session = await mongoose.startSession();

    try {
      let finalPaymentStatus: PaymentStatus =
        action === "approve" ? "completed" : "rejected";

      let finalMembershipStatus: string =
        action === "approve" ? "active" : "cancelled";
      let certificateMemberName = "";
      let certificateOrganization = "";

      await session.withTransaction(async () => {
        const payment = await Payment.findById(paymentId)
          .session(session);

        if (!payment) {
          throw new AdminActionError(404, "Payment not found.");
        }

        /*
         * Online payments must never be manually approved.
         * Their status is controlled by the verified gateway callback.
         */
        if (payment.method === "online") {
          throw new AdminActionError(
            400,
            "Online payments must be verified by the gateway callback.",
          );
        }

        if (
          !["bkash", "nagad", "bank"].includes(payment.method)
        ) {
          throw new AdminActionError(
            400,
            "This payment method cannot be reviewed manually.",
          );
        }

        if (
          !["pending", "processing"].includes(payment.status)
        ) {
          throw new AdminActionError(
            409,
            "Only pending or processing payments can be reviewed.",
          );
        }

        if (payment.currency !== "BDT") {
          throw new AdminActionError(
            400,
            "Only BDT payments can be reviewed through this workflow.",
          );
        }

        const membership = await Membership.findById(
          payment.membership,
        ).session(session);

        if (!membership) {
          throw new AdminActionError(
            404,
            "The associated membership was not found.",
          );
        }

        if (membership.status !== "pending") {
          throw new AdminActionError(
            409,
            "The associated membership is no longer pending review.",
          );
        }

        let certificatePlanName = "Membership";
        if (action === "approve") {
          const plan = await MembershipPlan.findById(payment.plan)
            .select("_id name price billingType durationDays")
            .session(session)
            .exec();

          if (
            !plan ||
            !["yearly", "one_time"].includes(plan.billingType)
          ) {
            throw new AdminActionError(
              409,
              "The membership plan billing configuration is invalid.",
            );
          }
          const integrityIssue = getActivationIntegrityIssue(
            payment,
            membership,
            plan,
          );
          if (integrityIssue) {
            console.error("Manual payment activation integrity check failed.", {
              paymentId: String(payment._id),
              membershipId: String(membership._id),
              check: integrityIssue,
            });
            throw new AdminActionError(
              409,
              "Payment records failed an integrity check; membership was not activated.",
            );
          }
          const approvalMember = await User.findById(membership.user)
            .select("_id name organization")
            .session(session)
            .exec();
          if (!approvalMember) {
            console.error("Manual payment activation member record is missing.", {
              paymentId: String(payment._id),
              membershipId: String(membership._id),
            });
            throw new AdminActionError(
              409,
              "The associated member record is unavailable; membership was not activated.",
            );
          }
          certificateMemberName = approvalMember.name;
          certificateOrganization = approvalMember.organization ?? "";
          certificatePlanName = plan.name;

          const durationDays =
            plan.durationDays == null
              ? 365
              : Number(plan.durationDays);

          if (
            plan.billingType === "yearly" &&
            (!Number.isFinite(durationDays) || durationDays <= 0)
          ) {
            throw new AdminActionError(
              409,
              "The membership duration is invalid.",
            );
          }

          let startDate = new Date();
          if (membership.renewalOf) {
            const previousMembership = await Membership.findById(
              membership.renewalOf,
            )
              .select("endDate")
              .session(session)
              .exec();
            if (previousMembership?.endDate && previousMembership.endDate > startDate) {
              startDate = previousMembership.endDate;
            }
          }

          membership.status = "active";
          membership.startDate = startDate;
          membership.endDate =
            plan.billingType === "one_time"
              ? null
              : new Date(
                  startDate.getTime() +
                    durationDays * 24 * 60 * 60 * 1000,
                );

          payment.status = "completed";
          payment.completedAt = new Date();

          finalPaymentStatus = "completed";
          finalMembershipStatus = "active";
        } else {
          membership.status = "cancelled";
          payment.status = "rejected";

          finalPaymentStatus = "rejected";
          finalMembershipStatus = "cancelled";
        }

        payment.reviewedBy = new Types.ObjectId(req.userId);
        payment.reviewedAt = new Date();
        payment.adminNote = adminNote || null;

        await payment.save({ session });
        await membership.save({ session });
        await Notification.updateOne(
          {
            user: payment.user,
            type: "payment-update",
            relatedType: "payment",
            relatedId: String(payment._id),
            reminderKey: "reviewed",
          },
          {
            $setOnInsert: {
              user: payment.user,
              type: "payment-update",
              title: action === "approve" ? "Payment approved" : "Payment rejected",
              message:
                action === "approve"
                  ? "Your payment was approved and your membership is active."
                  : `Your payment was rejected.${adminNote ? ` Admin note: ${adminNote}` : ""}`,
              reminderKey: "reviewed",
              relatedType: "payment",
              relatedId: String(payment._id),
              certificateId: null,
              membershipId: membership.membershipId,
              expiresAt: null,
              daysRemaining: null,
              isRead: false,
              readAt: null,
            },
          },
          { upsert: true, session },
        ).exec();
        if (action === "approve") {
          const existingCertificate = await Certificate.findOne({
            membership: membership._id,
          }).session(session);
          if (!existingCertificate) {
            await Certificate.create(
              [
                {
                  certificateId: `MBX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
                  verificationToken: crypto.randomBytes(32).toString("hex"),
                  user: membership.user,
                  membership: membership._id,
                  membershipIdSnapshot: membership.membershipId,
                  memberName: certificateMemberName,
                  organizationName: certificateOrganization,
                  planName: certificatePlanName,
                  expiresAt: membership.endDate,
                  status: "issued",
                },
              ],
              { session },
            );
          }
        }
      });

      res.status(200).json({
        success: true,
        message:
          action === "approve"
            ? "Manual payment approved and membership activated."
            : "Manual payment rejected.",
        data: {
          paymentId,
          paymentStatus: finalPaymentStatus,
          membershipStatus: finalMembershipStatus,
          reviewedBy: req.userId,
        },
      });
    } catch (error) {
      if (error instanceof AdminActionError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }

      console.error("Admin payment review error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to review this payment.",
      });
    } finally {
      await session.endSession();
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Admin Membership Plan Management                                           */
/* -------------------------------------------------------------------------- */

function createPlanSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validatePlanPayload(body: Record<string, unknown>): {
  name: string;
  slug: string;
  description: string;
  price: number;
  billingType: "yearly" | "one_time";
  durationDays: number | null;
  features: string[];
  isActive?: boolean;
} | null {
  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : "";

  const slugInput =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim()
      : name;

  const slug = createPlanSlug(slugInput);
  const price = Number(body.price);
  const billingType = body.billingType;
  const rawDuration = body.durationDays;
  const durationDays =
    billingType === "one_time"
      ? null
      : Number(rawDuration ?? 365);

  if (
    !name ||
    name.length > 80 ||
    !slug ||
    slug.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !description ||
    description.length > 500 ||
    !Number.isFinite(price) ||
    price < 0 ||
    !["yearly", "one_time"].includes(String(billingType))
  ) {
    return null;
  }

  if (
    billingType === "yearly" &&
    (!Number.isSafeInteger(durationDays) ||
      Number(durationDays) < 1 ||
      Number(durationDays) > 36500)
  ) {
    return null;
  }

  if (
    !Array.isArray(body.features) ||
    body.features.length > 30 ||
    !body.features.every(
      (feature) =>
        typeof feature === "string" &&
        feature.trim().length > 0 &&
        feature.trim().length <= 200,
    )
  ) {
    return null;
  }

  if (
    body.isActive !== undefined &&
    typeof body.isActive !== "boolean"
  ) {
    return null;
  }

  return {
    name,
    slug,
    description,
    price,
    billingType: billingType as "yearly" | "one_time",
    durationDays,
    features: body.features.map(
      (feature) => feature.trim(),
    ),
    ...(typeof body.isActive === "boolean"
      ? { isActive: body.isActive }
      : {}),
  };
}

/* GET /api/admin/plans */

router.get(
  "/plans",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const plans = await MembershipPlan.find()
        .sort({ createdAt: -1, _id: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: { plans },
      });
    } catch (error) {
      console.error("Admin plan list error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load membership plans.",
      });
    }
  },
);

/* POST /api/admin/plans */

router.post(
  "/plans",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        res.status(400).json({
          success: false,
          message: "A valid plan payload is required.",
        });
        return;
      }

      const payload = validatePlanPayload(
        req.body as Record<string, unknown>,
      );

      if (!payload) {
        res.status(400).json({
          success: false,
          message:
            "Invalid plan details. Check the name, slug, description, price, billing type, duration and features.",
        });
        return;
      }

      const existingPlan = await MembershipPlan.findOne({
        slug: payload.slug,
      }).lean();

      if (existingPlan) {
        res.status(409).json({
          success: false,
          message: "A plan with this slug already exists.",
        });
        return;
      }

      const plan = await MembershipPlan.create({
        ...payload,
        isActive: payload.isActive ?? true,
      });

      res.status(201).json({
        success: true,
        message: "Membership plan created successfully.",
        data: { plan },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        res.status(409).json({
          success: false,
          message: "A plan with this slug already exists.",
        });
        return;
      }

      console.error("Admin plan creation error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create membership plan.",
      });
    }
  },
);


/* PATCH /api/admin/plans/:planId */

router.patch(
  "/plans/:planId",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const planId = req.params.planId;

      if (
        typeof planId !== "string" ||
        !Types.ObjectId.isValid(planId)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid membership plan ID.",
        });
        return;
      }

      const existingPlan = await MembershipPlan.findById(planId);

      if (!existingPlan) {
        res.status(404).json({
          success: false,
          message: "Membership plan not found.",
        });
        return;
      }

      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        res.status(400).json({
          success: false,
          message: "A valid update payload is required.",
        });
        return;
      }

      const body = req.body as Record<string, unknown>;

      // Activate/deactivate without changing plan details.
      if (
        Object.keys(body).length === 1 &&
        typeof body.isActive === "boolean"
      ) {
        existingPlan.isActive = body.isActive;
        await existingPlan.save();

        res.status(200).json({
          success: true,
          message: body.isActive
            ? "Membership plan activated."
            : "Membership plan deactivated.",
          data: { plan: existingPlan },
        });
        return;
      }

      const billingType =
        body.billingType ?? existingPlan.billingType;

      const mergedPayload: Record<string, unknown> = {
        name: body.name ?? existingPlan.name,
        slug: body.slug ?? existingPlan.slug,
        description:
          body.description ?? existingPlan.description,
        price: body.price ?? existingPlan.price,
        billingType,
        durationDays:
          billingType === "one_time"
            ? null
            : body.durationDays ??
              (existingPlan.billingType === "one_time"
                ? 365
                : existingPlan.durationDays ?? 365),
        features: body.features ?? existingPlan.features,
        isActive: body.isActive ?? existingPlan.isActive,
      };

      const payload = validatePlanPayload(mergedPayload);

      if (!payload) {
        res.status(400).json({
          success: false,
          message:
            "Invalid plan details. Check the name, slug, description, price, billing type, duration and features.",
        });
        return;
      }

      const duplicate = await MembershipPlan.findOne({
        slug: payload.slug,
        _id: { $ne: existingPlan._id },
      }).lean();

      if (duplicate) {
        res.status(409).json({
          success: false,
          message: "Another plan already uses this slug.",
        });
        return;
      }

      existingPlan.name = payload.name;
      existingPlan.slug = payload.slug;
      existingPlan.description = payload.description;
      existingPlan.price = payload.price;
      existingPlan.billingType = payload.billingType;

      // A one-time plan has no expiry duration.
      existingPlan.durationDays =
        payload.durationDays as typeof existingPlan.durationDays;

      existingPlan.features = payload.features;

      if (payload.isActive !== undefined) {
        existingPlan.isActive = payload.isActive;
      }

      await existingPlan.save();

      res.status(200).json({
        success: true,
        message: "Membership plan updated successfully.",
        data: { plan: existingPlan },
      });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        res.status(409).json({
          success: false,
          message: "Another plan already uses this slug.",
        });
        return;
      }

      console.error("Admin plan update error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update membership plan.",
      });
    }
  },
);



export default router;