import { Router, Request, Response } from "express";
import Membership from "../models/Membership";
import { authenticate } from "../middleware/authenticate";

const router = Router();

type MembershipPlanData = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  billingType: "yearly" | "one_time";
  durationDays?: number | null;
  features: string[];
};

type MembershipRecord = {
  membershipId: string;
  status: "pending" | "active" | "expired" | "cancelled";
  startDate: Date | null;
  endDate: Date | null;
  autoRenewEnabled: boolean;
  autoRenewStatus: "unavailable" | "cancelled" | "active";
  autoRenewConsentAt: Date | null;
  renewalOf?: { membershipId: string } | null;
  createdAt: Date;
  plan: MembershipPlanData | null;
};

// GET /api/memberships/me
// Return only the authenticated user's membership records.
router.get(
  "/me",
  authenticate,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const userId = _req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const records = await Membership.find({ user: userId })
        .populate({
          path: "plan",
          select: "name slug price billingType durationDays features",
        })
        .populate({ path: "renewalOf", select: "membershipId" })
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      const memberships = records as unknown as MembershipRecord[];
      const renewedMembershipIds = new Set(
        memberships
          .filter((membership) => membership.status !== "cancelled")
          .map((membership) => membership.renewalOf?.membershipId)
          .filter((membershipId): membershipId is string => Boolean(membershipId)),
      );

      res.status(200).json({
        success: true,
        memberships: memberships.map((membership) => ({
          membershipId: membership.membershipId,
          status: membership.status,
          startDate: membership.startDate,
          endDate: membership.endDate,
          autoRenewEnabled: membership.autoRenewEnabled ?? false,
          autoRenewStatus: membership.autoRenewStatus ?? "unavailable",
          autoRenewConsentAt: membership.autoRenewConsentAt ?? null,
          hasRenewal: renewedMembershipIds.has(membership.membershipId),
          createdAt: membership.createdAt,
          plan: membership.plan
            ? {
                name: membership.plan.name,
                slug: membership.plan.slug,
                price: membership.plan.price,
                billingType: membership.plan.billingType,
                durationDays: membership.plan.durationDays ?? null,
                features: membership.plan.features ?? [],
              }
            : null,
        })),
      });
    } catch (error) {
      console.error("Unable to load memberships:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load your memberships.",
      });
    }
  },
);

export default router;