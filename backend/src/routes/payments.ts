
import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import mongoose, { Types } from "mongoose";

import MembershipPlan from "../models/MembershipPlan";
import Membership from "../models/Membership";
import Payment from "../models/Payment";
import User from "../models/User";
import PaymentSettings from "../models/PaymentSettings";
import Certificate from "../models/Certificate";
import Notification from "../models/Notification";
import { buildPaymentReceiptPdf } from "../services/paymentReceipt";
import {
  getActivationIntegrityIssue,
  isFinalReceiptEligible,
  isManualSubmissionReceiptEligible,
} from "../services/paymentIntegrity";
import { authenticate } from "../middleware/authenticate";
import type { PaymentReceiptKind } from "../services/paymentReceipt";
import {
  encryptAamarPayConfiguration,
  getAamarPayConfiguration,
  getAamarPayConfigurationForPayment,
} from "../services/aamarPay";

const router = Router();

async function sendPaymentReceipt(
  req: Request,
  res: Response,
  kind: PaymentReceiptKind,
): Promise<void> {
  const paymentId = req.params.paymentId;
  if (typeof paymentId !== "string" || !Types.ObjectId.isValid(paymentId)) {
    res.status(400).json({
      success: false,
      message: "Invalid payment ID.",
    });
    return;
  }
  if (!req.userId) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  try {
    const payment = await Payment.findOne({
      _id: paymentId,
      user: req.userId,
    }).exec();
    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment not found.",
      });
      return;
    }

    const eligible =
      kind === "submission"
        ? isManualSubmissionReceiptEligible(payment.status, payment.method)
        : isFinalReceiptEligible(payment.status, payment.method);
    if (!eligible) {
      res.status(409).json({
        success: false,
        message:
          kind === "submission"
            ? "A submission receipt is available only for pending manual payments."
            : "A final receipt is available only for completed payments.",
      });
      return;
    }

    const [membership, user, plan] = await Promise.all([
      Membership.findById(payment.membership).exec(),
      User.findById(payment.user)
        .select("name email phone organization")
        .exec(),
      MembershipPlan.findById(payment.plan).exec(),
    ]);

    if (!membership || !user || !plan) {
      res.status(409).json({
        success: false,
        message: "Payment records are incomplete; a receipt cannot be issued.",
      });
      return;
    }
    if (kind === "submission" && membership.status !== "pending") {
      res.status(409).json({
        success: false,
        message:
          "A submission receipt is available only while its membership is pending.",
      });
      return;
    }

    const integrityIssue = getActivationIntegrityIssue(
      payment,
      membership,
      plan,
    );
    if (integrityIssue) {
      console.error("Payment receipt integrity check failed.", {
        paymentId: String(payment._id),
        membershipId: String(membership._id),
        check: integrityIssue,
      });
      res.status(409).json({
        success: false,
        message: "Payment records do not match; a receipt cannot be issued.",
      });
      return;
    }

    const completedAt =
      kind === "final"
        ? payment.completedAt ?? payment.reviewedAt ?? payment.updatedAt
        : null;
    const receiptNumber = `${
      kind === "submission" ? "MBX-SUB" : "MBX-RCPT"
    }-${String(payment._id).toUpperCase()}`;
    const providerNames: Record<string, string> = {
      bkash: "bKash",
      nagad: "Nagad",
      bank: "Bank Transfer",
      online: payment.gatewayName || "AamarPay",
    };
    const methodNames: Record<string, string> = {
      bkash: "bKash",
      nagad: "Nagad",
      bank: "Bank Transfer",
      online: "Online payment",
    };
    const pdf = await buildPaymentReceiptPdf({
      kind,
      receiptNumber,
      issuedAt: new Date(),
      memberName: user.name,
      memberEmail: user.email,
      memberPhone: user.phone,
      organizationName: user.organization ?? "",
      membershipId: membership.membershipId,
      planName: plan.name,
      amount: payment.amount,
      currency: payment.currency,
      method: methodNames[payment.method],
      serviceProvider: providerNames[payment.method],
      transactionId: payment.transactionId ?? payment.paymentReference,
      gatewayTransactionId: payment.gatewayTransactionId,
      submittedAt: payment.createdAt,
      completedAt,
    });

    res
      .status(200)
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receiptNumber}.pdf"`,
        "Cache-Control": "private, no-store",
        "Content-Length": String(pdf.length),
      })
      .send(pdf);
  } catch (error) {
    console.error("Payment receipt generation failed.", {
      paymentId,
      kind,
      error,
    });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Unable to generate the payment receipt.",
      });
    }
  }
}

router.get(
  "/:paymentId/submission-receipt",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    await sendPaymentReceipt(req, res, "submission");
  },
);

router.get(
  "/:paymentId/receipt",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    await sendPaymentReceipt(req, res, "final");
  },
);

// GET /api/payments/me
// Return only the authenticated user's payment history.
router.get(
  "/me",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const payments = await Payment.find({
        user: userId,
      })
        .populate("plan", "name slug")
        .populate("membership", "membershipId")
        .populate("reviewedBy", "name")
        .sort({ createdAt: -1 })
        .lean()
        .exec();

      res.status(200).json({
        success: true,
        payments: payments.map((payment) => {
          const plan = payment.plan as unknown as {
            name: string;
            slug: string;
          } | null;

          const membership = payment.membership as unknown as {
            membershipId: string;
          } | null;
          const reviewer = payment.reviewedBy as unknown as {
            name: string;
          } | null;

          return {
            id: String(payment._id),
            amount: payment.amount,
            currency: payment.currency,
            method: payment.method,
            status: payment.status,
            transactionId: payment.transactionId,
            gatewayTransactionId: payment.gatewayTransactionId,
            membershipId: membership?.membershipId ?? null,
            planName: plan?.name ?? "Membership",
            reviewedAt: payment.reviewedAt,
            reviewedBy: reviewer?.name ?? null,
            adminNote: payment.adminNote,
            createdAt: payment.createdAt,
          };
        }),
      });
    } catch (error) {
      console.error("Payment history error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load payment history.",
      });
    }
  },
);
type PlanSlug = string;
type ManualPaymentMethod = "bkash" | "nagad" | "bank";
type CallbackStatus = "success" | "failed" | "cancelled";

type CheckoutPlan = {
  _id: Types.ObjectId;
  name: string;
  slug: PlanSlug;
  price: number;
  isActive: boolean;
  billingType?: "yearly" | "one_time";
};

type AamarPayInitiateResponse = {
  result?: unknown;
  payment_url?: unknown;
};

type AamarPayVerificationResponse = {
  mer_txnid?: unknown;
  store_id?: unknown;
  status_code?: unknown;
  pay_status?: unknown;
  amount?: unknown;
  amount_bdt?: unknown;
  currency?: unknown;
  currency_merchant?: unknown;
  pg_txnid?: unknown;
};

function isPlanSlug(value: unknown): value is PlanSlug {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.length <= 100
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toMinorUnits(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function validWebUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function getCallbackTransactionId(
  body: Record<string, unknown>,
  req: Request,
): string | null {
  const candidate =
    body.mer_txnid ??
    body.tran_id ??
    body.request_id ??
    req.query.mer_txnid ??
    req.query.tran_id ??
    req.query.request_id;

  if (
    typeof candidate !== "string" ||
    candidate.length === 0 ||
    candidate.length > 32
  ) {
    return null;
  }

  return candidate;
}

function getReturnStatus(req: Request): CallbackStatus | null {
  const value = req.query.returnStatus;

  if (
    value === "success" ||
    value === "failed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return null;
}

/**
 * Submit a manual bKash, Nagad or bank payment.
 * Manual payments always remain pending until admin approval.
 */
router.post(
  "/manual/submit",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    let createdMembershipId: Types.ObjectId | undefined;

    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Please log in to submit a payment.",
        });
        return;
      }

      const body = (req.body ?? {}) as {
        planSlug?: unknown;
        amount?: unknown;
        method?: unknown;
        transactionId?: unknown;
        payerNumber?: unknown;
        renewalMembershipId?: unknown;
      };

      const { planSlug, amount, method, transactionId, payerNumber, renewalMembershipId } = body;

      if (!isPlanSlug(planSlug)) {
        res.status(400).json({
          success: false,
          message: "Please select a valid membership plan.",
        });
        return;
      }

      if (
        method !== "bkash" &&
        method !== "nagad" &&
        method !== "bank"
      ) {
        res.status(400).json({
          success: false,
          message: "Please select a supported manual payment method.",
        });
        return;
      }

      if (
        typeof transactionId !== "string" ||
        transactionId.trim().length < 3 ||
        transactionId.trim().length > 120 ||
        /[\u0000-\u001f\u007f]/.test(transactionId)
      ) {
        res.status(400).json({
          success: false,
          message: "Enter a valid transaction reference.",
        });
        return;
      }

      if (
        payerNumber !== undefined &&
        payerNumber !== null &&
        typeof payerNumber !== "string"
      ) {
        res.status(400).json({
          success: false,
          message: "The payer number is invalid.",
        });
        return;
      }

      const reference = transactionId.trim();
      const payer =
        typeof payerNumber === "string"
          ? payerNumber.trim()
          : "";

      if (
        payer.length > 60 ||
        payer.length < 3 ||
        /[\u0000-\u001f\u007f]/.test(payer) ||
        ((method === "bkash" || method === "nagad") &&
          !/^\+?[0-9][0-9\s()-]{2,29}$/.test(payer))
      ) {
        res.status(400).json({
          success: false,
          message: "Enter a valid sender number or account (3–60 characters).",
        });
        return;
      }

      const settings = await PaymentSettings.findOne({ key: "default" }).lean().exec();
      const enabledMethod = settings?.enabled?.[method as ManualPaymentMethod] ?? false;
      const recipientConfigured =
        method === "bkash"
          ? Boolean(settings?.bkashNumber)
          : method === "nagad"
            ? Boolean(settings?.nagadNumber)
            : Boolean(settings?.bankAccountName && settings?.bankName && settings?.bankAccountNumber);
      if (!enabledMethod || !recipientConfigured) {
        res.status(400).json({
          success: false,
          message: "This payment method is not currently available.",
        });
        return;
      }

      const [user, planResult, renewalSource] = await Promise.all([
        User.findById(userId).select("_id isActive"),

        MembershipPlan.findOne({
          slug: planSlug,
          isActive: true,
        })
          .select("_id name slug price isActive billingType")
          .lean()
          .exec(),
        typeof renewalMembershipId === "string"
          ? Membership.findOne({
              membershipId: renewalMembershipId.trim(),
              user: userId,
              status: { $in: ["active", "expired"] },
            })
              .populate({ path: "plan", select: "_id name slug price isActive billingType" })
              .exec()
          : Promise.resolve(null),
      ]);

      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: "Your account is unavailable.",
        });
        return;
      }

      const plan = renewalSource
        ? (renewalSource.plan as unknown as CheckoutPlan)
        : (planResult as unknown as CheckoutPlan | null);

      if (renewalMembershipId !== undefined && !renewalSource) {
        res.status(404).json({
          success: false,
          message: "The membership selected for renewal was not found or is not eligible.",
        });
        return;
      }
      if (renewalSource && plan?.billingType === "one_time") {
        res.status(400).json({
          success: false,
          message: "Lifetime memberships do not require renewal.",
        });
        return;
      }
      if (renewalSource) {
        const existingRenewal = await Membership.findOne({
          renewalOf: renewalSource._id,
          status: { $in: ["pending", "active", "expired"] },
        }).select("_id").lean().exec();
        if (existingRenewal) {
          res.status(409).json({
            success: false,
            message: "This membership already has a pending or approved renewal.",
          });
          return;
        }
      }

      if (!plan) {
        res.status(404).json({
          success: false,
          message: "Membership plan not found or inactive.",
        });
        return;
      }

      if (
        !Types.ObjectId.isValid(plan._id) ||
        typeof plan.price !== "number" ||
        !Number.isFinite(plan.price) ||
        plan.price < 0
      ) {
        res.status(500).json({
          success: false,
          message:
            "The selected membership plan is not configured correctly.",
        });
        return;
      }

      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        toMinorUnits(amount) !== toMinorUnits(plan.price)
      ) {
        res.status(400).json({
          success: false,
          message: "The submitted payment amount does not match the selected plan.",
        });
        return;
      }

      const manualMethod = method as ManualPaymentMethod;

      // Reject an already submitted transaction reference.
      const duplicate = await Payment.findOne({
        transactionId: {
          $regex: new RegExp(
            `^${escapeRegExp(reference)}$`,
            "i",
          ),
        },
      })
        .select("_id")
        .lean()
        .exec();

      if (duplicate) {
        res.status(409).json({
          success: false,
          message:
            "This transaction reference has already been submitted.",
        });
        return;
      }

      const membershipId = `MBR-${crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 20)}`;

      const membership = await Membership.create({
        membershipId,
        user: user._id,
        plan: plan._id,
        status: "pending",
        startDate: null,
        endDate: null,
        renewalOf: renewalSource?._id ?? null,
      });

      createdMembershipId = membership._id;

      const payment = await Payment.create({
        user: user._id,
        membership: membership._id,
        plan: plan._id,
        amount: plan.price,
        currency: "BDT",
        method: manualMethod,
        status: "pending",
        transactionId: reference,
        referenceHash: crypto
          .createHash("sha256")
          .update(reference.toLowerCase())
          .digest("hex"),
        payerNumber: payer || null,
        paymentReference: null,
        proofUrl: null,
        gatewayTransactionId: null,
        gatewayName: null,
        reviewedBy: null,
        reviewedAt: null,
        adminNote: null,
      });

      res.status(201).json({
        success: true,
        message:
          "Payment submitted successfully and is awaiting admin review.",
        payment: {
          id: String(payment._id),
          membershipId: membership.membershipId,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          status: payment.status,
          transactionId: payment.transactionId,
          createdAt: payment.createdAt,
        },
      });
    } catch (error) {
      if (createdMembershipId) {
        await Membership.deleteOne({
          _id: createdMembershipId,
          status: "pending",
        }).catch((cleanupError) => {
          console.error(
            "Unable to clean up pending manual membership:",
            cleanupError,
          );
        });
      }

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        res.status(409).json({
          success: false,
          message: "This transaction reference or renewal request has already been submitted.",
        });
        return;
      }

      console.error("Manual payment submission error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to submit your payment right now.",
      });
    }
  },
);

/**
 * Initiate an AamarPay payment session.
 * Membership activation is only allowed after server verification.
 */
router.post(
  "/aamarpay/initiate",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    let membershipId: string | undefined;
    let transactionId: string | undefined;

    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const requestBody = (req.body ?? {}) as {
        planSlug?: unknown;
        renewalMembershipId?: unknown;
      };
      const planSlug: unknown = requestBody.planSlug;
      const renewalMembershipId = requestBody.renewalMembershipId;

      if (!isPlanSlug(planSlug) && typeof renewalMembershipId !== "string") {
        res.status(400).json({
          success: false,
          message: "Please select a valid membership plan.",
        });
        return;
      }

      const gateway = await getAamarPayConfiguration();
      const frontendUrl = process.env.FRONTEND_URL;
      const backendUrl = process.env.BACKEND_URL;

      if (
        !gateway ||
        !frontendUrl ||
        !backendUrl
      ) {
        res.status(503).json({
          success: false,
          message: "Payment gateway configuration is incomplete.",
        });
        return;
      }

      if (
        !validWebUrl(frontendUrl) ||
        !validWebUrl(backendUrl)
      ) {
        res.status(503).json({
          success: false,
          message:
            "The frontend or backend URL configuration is invalid.",
        });
        return;
      }

      const renewalSource =
        typeof renewalMembershipId === "string"
          ? await Membership.findOne({
              membershipId: renewalMembershipId.trim(),
              user: userId,
              status: { $in: ["active", "expired"] },
            }).populate({ path: "plan", select: "_id name slug price isActive billingType" })
          : null;

      if (typeof renewalMembershipId === "string" && !renewalSource) {
        res.status(404).json({
          success: false,
          message: "The membership selected for renewal was not found or is not eligible.",
        });
        return;
      }

      const plan = renewalSource
        ? (renewalSource.plan as unknown as CheckoutPlan)
        : ((await MembershipPlan.findOne({
            slug: planSlug,
            isActive: true,
          })
            .select("_id name slug price isActive billingType")
            .lean()
            .exec()) as unknown as CheckoutPlan | null);

      if (renewalSource && plan?.billingType === "one_time") {
        res.status(400).json({
          success: false,
          message: "Lifetime memberships do not require renewal.",
        });
        return;
      }
      if (renewalSource) {
        const existingRenewal = await Membership.findOne({
          renewalOf: renewalSource._id,
          status: { $in: ["pending", "active", "expired"] },
        }).select("_id").lean().exec();
        if (existingRenewal) {
          res.status(409).json({
            success: false,
            message: "This membership already has a pending or approved renewal.",
          });
          return;
        }
      }

      if (!plan) {
        res.status(404).json({
          success: false,
          message: "Membership plan not found or inactive.",
        });
        return;
      }

      if (
        !Types.ObjectId.isValid(plan._id) ||
        typeof plan.price !== "number" ||
        !Number.isFinite(plan.price) ||
        plan.price < 0 ||
        typeof plan.name !== "string"
      ) {
        res.status(500).json({
          success: false,
          message:
            "The selected membership plan is not configured correctly.",
        });
        return;
      }

      const user = await User.findById(userId).select(
        "name email phone isActive",
      );

      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: "Your account is unavailable.",
        });
        return;
      }

      // AamarPay transaction IDs must not exceed 32 characters.
      transactionId = `MBX${crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 29)}`;

      membershipId = `MBR-${crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 20)}`;

      const membership = await Membership.create({
        membershipId,
        user: user._id,
        plan: plan._id,
        status: "pending",
        startDate: null,
        endDate: null,
        renewalOf: renewalSource?._id ?? null,
      });

      await Payment.create({
        user: user._id,
        membership: membership._id,
        plan: plan._id,
        amount: plan.price,
        currency: "BDT",
        method: "online",
        status: "pending",
        transactionId,
        payerNumber: null,
        gatewayTransactionId: null,
        gatewayName: `aamarPay-${gateway.mode}`,
        gatewayConfigEncrypted: encryptAamarPayConfiguration(gateway),
      });

      const normalizedBackendUrl = backendUrl.replace(/\/+$/, "");

      const payload = {
        store_id: gateway.storeId,
        signature_key: gateway.signatureKey,
        tran_id: transactionId,
        amount: String(plan.price),
        currency: "BDT",
        desc: `Membrix ${plan.name} membership`,
        cus_name: user.name,
        cus_email: user.email,
        cus_add1: "Not provided",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",

        cus_phone: user.phone,

        success_url:
          `${normalizedBackendUrl}/api/payments/aamarpay/callback?returnStatus=success`,
        fail_url:
          `${normalizedBackendUrl}/api/payments/aamarpay/callback?returnStatus=failed`,
        cancel_url:
          `${normalizedBackendUrl}/api/payments/aamarpay/callback?returnStatus=cancelled`,
        type: "json",
      };

      const response = await fetch(`${gateway.baseUrl}/jsonpost.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(
          `AamarPay returned HTTP ${response.status}.`,
        );
      }

      const gatewayResult: unknown = await response.json();

      if (
        typeof gatewayResult !== "object" ||
        gatewayResult === null ||
        Array.isArray(gatewayResult)
      ) {
        throw new Error("AamarPay returned an invalid response.");
      }

      const result =
        gatewayResult as AamarPayInitiateResponse;

      if (
        result.result !== "true" ||
        typeof result.payment_url !== "string"
      ) {
        throw new Error(
          "AamarPay did not return a valid payment URL.",
        );
      }

      let paymentUrl: URL;

      try {
        paymentUrl = new URL(result.payment_url);
      } catch {
        throw new Error("AamarPay returned an invalid payment URL.");
      }

      if (
        paymentUrl.protocol !== "https:" ||
        paymentUrl.hostname !==
          (gateway.mode === "live"
            ? "secure.aamarpay.com"
            : "sandbox.aamarpay.com")
      ) {
        throw new Error(
          "AamarPay returned an unexpected payment URL.",
        );
      }

      res.status(200).json({
        success: true,
        paymentUrl: paymentUrl.toString(),
        transactionId,
      });
    } catch (error) {
      console.error("AamarPay initiation error:", error);

      if (membershipId) {
        await Membership.updateOne(
          {
            membershipId,
            status: "pending",
          },
          {
            $set: { status: "cancelled" },
          },
        ).catch((updateError) => {
          console.error(
            "Unable to cancel pending membership:",
            updateError,
          );
        });
      }

      if (transactionId) {
        await Payment.updateOne(
          {
            transactionId,
            method: "online",
            status: "pending",
          },
          {
            $set: { status: "failed" },
          },
        ).catch((updateError) => {
          console.error(
            "Unable to update failed payment:",
            updateError,
          );
        });
      }

      res.status(502).json({
        success: false,
        message: "Unable to start payment. Please try again.",
      });
    }
  },
);

/**
 * AamarPay callback.
 *
 * A browser redirect is never trusted as proof of payment.
 * Every successful payment must be verified with AamarPay.
 */
router.post(
  "/aamarpay/callback",
  async (req: Request, res: Response): Promise<void> => {
    const frontendBaseUrl = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/+$/, "");

    const redirectResult = (
      status: CallbackStatus,
      paymentId?: string,
    ): void => {
      const query = new URLSearchParams({ status });
      if (paymentId) query.set("paymentId", paymentId);
      res.redirect(
        303,
        `${frontendBaseUrl}/checkout/result?${query.toString()}`,
      );
    };

    try {
      const body = (req.body ?? {}) as Record<string, unknown>;

      const returnStatus = getReturnStatus(req);
      const transactionId = getCallbackTransactionId(body, req);

      if (!transactionId) {
        redirectResult(
          returnStatus === "cancelled" ? "cancelled" : "failed",
        );
        return;
      }

      const payment = await Payment.findOne({
        transactionId,
        method: "online",
      })
        .select("+gatewayConfigEncrypted")
        .exec();

      if (!payment) {
        redirectResult("failed");
        return;
      }

      const gateway = await getAamarPayConfigurationForPayment(
        payment.gatewayConfigEncrypted,
      );
      if (
        !gateway ||
        (payment.gatewayName &&
          payment.gatewayName !== `aamarPay-${gateway.mode}` &&
          !(gateway.mode === "sandbox" && payment.gatewayName === "aamarPay"))
      ) {
        redirectResult("failed");
        return;
      }

      // Verify the transaction directly with AamarPay.
      const verificationUrl = new URL(
        "/api/v1/trxcheck/request.php",
        gateway.baseUrl,
      );

      verificationUrl.search = new URLSearchParams({
        request_id: transactionId,
        store_id: gateway.storeId,
        signature_key: gateway.signatureKey,
        type: "json",
      }).toString();

      const verificationResponse = await fetch(
        verificationUrl,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!verificationResponse.ok) {
        throw new Error(
          `AamarPay verification returned HTTP ${verificationResponse.status}.`,
        );
      }

      const verificationData: unknown =
        await verificationResponse.json();

      if (
        typeof verificationData !== "object" ||
        verificationData === null ||
        Array.isArray(verificationData)
      ) {
        throw new Error(
          "Invalid AamarPay verification response.",
        );
      }

      const verified =
        verificationData as AamarPayVerificationResponse;

      // Merchant and transaction identity must match.
      if (
        verified.mer_txnid !== transactionId ||
        verified.store_id !== gateway.storeId
      ) {
        throw new Error(
          "The verified merchant transaction details do not match.",
        );
      }

      const statusCode = String(
        verified.status_code ?? "",
      );

      const paymentStatus = String(
        verified.pay_status ?? "",
      ).trim().toLowerCase();

      // A payment is successful only when BOTH fields confirm success.
      if (
        statusCode !== "2" ||
        paymentStatus !== "successful"
      ) {
        const definitivelyFailed =
          ["3", "7"].includes(statusCode) ||
          ["failed", "expired"].includes(paymentStatus);

        // Only mark a payment failed when the gateway confirms failure.
        if (definitivelyFailed) {
          const failureSession = await mongoose.startSession();

          try {
            await failureSession.withTransaction(async () => {
              const currentPayment = await Payment.findById(
                payment._id,
              ).session(failureSession);

              const currentMembership = await Membership.findById(
                payment.membership,
              ).session(failureSession);

              if (
                !currentPayment ||
                !currentMembership
              ) {
                return;
              }

              if (
                !["pending", "processing"].includes(
                  currentPayment.status,
                )
              ) {
                return;
              }

              currentPayment.status = "failed";

              if (currentMembership.status === "pending") {
                currentMembership.status = "cancelled";
              }

              await currentPayment.save({
                session: failureSession,
              });

              await currentMembership.save({
                session: failureSession,
              });
              await Notification.updateOne(
                {
                  user: currentPayment.user,
                  type: "payment-update",
                  relatedType: "payment",
                  relatedId: String(currentPayment._id),
                  reminderKey: "failed",
                },
                {
                  $setOnInsert: {
                    user: currentPayment.user,
                    type: "payment-update",
                    title: "Payment failed",
                    message: "The online payment could not be completed. You can try again from your membership dashboard.",
                    reminderKey: "failed",
                    relatedType: "payment",
                    relatedId: String(currentPayment._id),
                    certificateId: null,
                    membershipId: currentMembership.membershipId,
                    expiresAt: null,
                    daysRemaining: null,
                    isRead: false,
                    readAt: null,
                  },
                },
                { upsert: true, session: failureSession },
              ).exec();
            });
          } finally {
            await failureSession.endSession();
          }

          redirectResult("failed");
          return;
        }

        // A cancelled browser flow is not proof of payment failure.
        redirectResult(
          returnStatus === "cancelled" ? "cancelled" : "failed",
        );
        return;
      }

      // Validate currency.
      if (
        String(verified.currency ?? "").toUpperCase() !== "BDT" ||
        String(verified.currency_merchant ?? "").toUpperCase() !==
          "BDT"
      ) {
        throw new Error(
          "The verified payment currency does not match BDT.",
        );
      }

      // Validate the exact payment amount.
      const expectedAmount = toMinorUnits(payment.amount);
      const verifiedAmount = toMinorUnits(verified.amount);

      if (
        expectedAmount === null ||
        verifiedAmount === null ||
        expectedAmount !== verifiedAmount
      ) {
        throw new Error(
          "The verified payment amount does not match.",
        );
      }

      if (
        verified.amount_bdt !== undefined &&
        verified.amount_bdt !== null &&
        toMinorUnits(verified.amount_bdt) !== expectedAmount
      ) {
        throw new Error(
          "The verified BDT amount does not match.",
        );
      }

      // Idempotent handling for an already completed payment.
      if (payment.status === "completed") {
        redirectResult("success", String(payment._id));
        return;
      }

      if (
        !["pending", "processing"].includes(payment.status)
      ) {
        redirectResult("failed");
        return;
      }

      const planResult = await MembershipPlan.findById(
        payment.plan,
      )
        .select("_id name billingType durationDays")
        .lean()
        .exec();

      const plan = planResult as unknown as {
        name: string;
        billingType: "yearly" | "one_time";
        durationDays?: number | null;
      } | null;

      if (
        !plan ||
        !["yearly", "one_time"].includes(plan.billingType)
      ) {
        throw new Error(
          "The membership plan billing settings are invalid.",
        );
      }

      // Atomically complete payment and activate membership.
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const currentPayment = await Payment.findById(
            payment._id,
          ).session(session);

          const currentMembership = await Membership.findById(
            payment.membership,
          ).session(session);

          if (!currentPayment || !currentMembership) {
            throw new Error(
              "Payment or membership record was not found.",
            );
          }

          // Another callback may already have completed this payment.
          if (
            currentPayment.status === "completed" &&
            currentMembership.status === "active"
          ) {
            return;
          }

          if (
            !["pending", "processing"].includes(
              currentPayment.status,
            ) ||
            currentMembership.status !== "pending"
          ) {
            throw new Error(
              "Payment or membership is not eligible for activation.",
            );
          }

          const currentPlan = await MembershipPlan.findById(
            currentMembership.plan,
          )
            .select("_id name price billingType durationDays")
            .session(session)
            .exec();
          const integrityIssue = getActivationIntegrityIssue(
            currentPayment,
            currentMembership,
            currentPlan,
          );
          if (integrityIssue) {
            console.error("AamarPay activation integrity check failed.", {
              paymentId: String(currentPayment._id),
              membershipId: String(currentMembership._id),
              check: integrityIssue,
            });
            throw new Error("Payment records failed an integrity check.");
          }
          if (
            !currentPlan ||
            !["yearly", "one_time"].includes(currentPlan.billingType)
          ) {
            throw new Error("The membership plan billing settings are invalid.");
          }
          const activationUser = await User.findById(currentMembership.user)
            .select("_id name organization")
            .session(session)
            .exec();
          if (!activationUser) {
            console.error("AamarPay activation member record is missing.", {
              paymentId: String(currentPayment._id),
              membershipId: String(currentMembership._id),
            });
            throw new Error("The associated member record is unavailable.");
          }

          let startDate = new Date();
          if (currentMembership.renewalOf) {
            const previousMembership = await Membership.findById(
              currentMembership.renewalOf,
            )
              .select("endDate")
              .session(session)
              .exec();
            if (previousMembership?.endDate && previousMembership.endDate > startDate) {
              startDate = previousMembership.endDate;
            }
          }

          const configuredDuration = Number(currentPlan.durationDays ?? 365);
          const durationDays =
            Number.isFinite(configuredDuration) && configuredDuration > 0
              ? configuredDuration
              : 365;
          const endDate =
            currentPlan.billingType === "one_time"
              ? null
              : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

          currentPayment.status = "completed";
          currentPayment.completedAt = new Date();

          currentPayment.gatewayTransactionId =
            typeof verified.pg_txnid === "string"
              ? verified.pg_txnid
              : null;

          currentMembership.status = "active";
          currentMembership.startDate = startDate;
          currentMembership.endDate = endDate;

          await currentPayment.save({ session });
          await currentMembership.save({ session });
          await Notification.updateOne(
            {
              user: currentPayment.user,
              type: "payment-update",
              relatedType: "payment",
              relatedId: String(currentPayment._id),
              reminderKey: "completed",
            },
            {
              $setOnInsert: {
                user: currentPayment.user,
                type: "payment-update",
                title: "Payment approved",
                message: "Your online payment was verified and your membership is active.",
                reminderKey: "completed",
                relatedType: "payment",
                relatedId: String(currentPayment._id),
                certificateId: null,
                membershipId: currentMembership.membershipId,
                expiresAt: null,
                daysRemaining: null,
                isRead: false,
                readAt: null,
              },
            },
            { upsert: true, session },
          ).exec();
          const existingCertificate = await Certificate.findOne({
            membership: currentMembership._id,
          }).session(session);
          if (!existingCertificate) {
            await Certificate.create(
              [
                {
                  certificateId: `MBX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
                  verificationToken: crypto.randomBytes(32).toString("hex"),
                  user: currentMembership.user,
                  membership: currentMembership._id,
                  membershipIdSnapshot: currentMembership.membershipId,
                  memberName: activationUser.name,
                  organizationName: activationUser.organization ?? "",
                  planName: currentPlan.name,
                  expiresAt: endDate,
                  status: "issued",
                },
              ],
              { session },
            );
          }
        });
      } finally {
        await session.endSession();
      }

      redirectResult("success", String(payment._id));
    } catch (error) {
      console.error(
        "AamarPay callback verification error:",
        error,
      );

      redirectResult("failed");
    }
  },
);

export default router;
