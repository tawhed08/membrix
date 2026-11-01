
import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import mongoose, { Types } from "mongoose";

import MembershipPlan from "../models/MembershipPlan";
import Membership from "../models/Membership";
import Payment from "../models/Payment";
import User from "../models/User";
import { authenticate } from "../middleware/authenticate";

const router = Router();
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
const PLAN_SLUGS = ["essential", "premium", "lifetime"] as const;

type PlanSlug = (typeof PLAN_SLUGS)[number];
type ManualPaymentMethod = "bkash" | "nagad" | "bank";
type CallbackStatus = "success" | "failed" | "cancelled";

type CheckoutPlan = {
  _id: Types.ObjectId;
  name: string;
  slug: PlanSlug;
  price: number;
  isActive: boolean;
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
    PLAN_SLUGS.includes(value as PlanSlug)
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
        method?: unknown;
        transactionId?: unknown;
        payerNumber?: unknown;
      };

      const { planSlug, method, transactionId, payerNumber } = body;

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
        transactionId.trim().length > 120
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

      if (payer.length > 30) {
        res.status(400).json({
          success: false,
          message: "Payer number must not exceed 30 characters.",
        });
        return;
      }

      const [user, planResult] = await Promise.all([
        User.findById(userId).select("_id isActive"),

        MembershipPlan.findOne({
          slug: planSlug,
          isActive: true,
        })
          .select("_id name slug price isActive")
          .lean()
          .exec(),
      ]);

      if (!user || !user.isActive) {
        res.status(401).json({
          success: false,
          message: "Your account is unavailable.",
        });
        return;
      }

      const plan = planResult as unknown as CheckoutPlan | null;

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

      const manualMethod = method as ManualPaymentMethod;

      // Reject an already submitted transaction reference.
      const duplicate = await Payment.findOne({
        method: manualMethod,
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

      console.error("Manual payment submission error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to submit your payment right now.",
      });
    }
  },
);

/**
 * Initiate an AamarPay sandbox payment session.
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

      const planSlug: unknown = (
        req.body as { planSlug?: unknown } | undefined
      )?.planSlug;

      if (!isPlanSlug(planSlug)) {
        res.status(400).json({
          success: false,
          message: "Please select a valid membership plan.",
        });
        return;
      }

      const storeId = process.env.AAMARPAY_STORE_ID;
      const signatureKey = process.env.AAMARPAY_SIGNATURE_KEY;
      const baseUrl = process.env.AAMARPAY_BASE_URL;
      const frontendUrl = process.env.FRONTEND_URL;
      const backendUrl = process.env.BACKEND_URL;

      if (
        !storeId ||
        !signatureKey ||
        !baseUrl ||
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
        process.env.AAMARPAY_MODE !== "sandbox" ||
        baseUrl !== "https://sandbox.aamarpay.com"
      ) {
        res.status(503).json({
          success: false,
          message:
            "Only the configured Sandbox environment is supported.",
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

      const planResult = await MembershipPlan.findOne({
        slug: planSlug,
        isActive: true,
      })
        .select("_id name slug price isActive")
        .lean()
        .exec();

      const plan = planResult as unknown as CheckoutPlan | null;

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
        "name email isActive",
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
        gatewayName: "aamarPay",
      });

      const normalizedBackendUrl = backendUrl.replace(/\/+$/, "");

      const payload = {
        store_id: storeId,
        signature_key: signatureKey,
        tran_id: transactionId,
        amount: String(plan.price),
        currency: "BDT",
        desc: `Membrix ${plan.name} membership`,
        cus_name: user.name,
        cus_email: user.email,
        cus_add1: "Not provided",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",

        // Sandbox placeholder only. Never use for live payments.
        cus_phone: "01700000000",

        success_url:
          `${normalizedBackendUrl}/api/payments/aamarpay/callback?returnStatus=success`,
        fail_url:
          `${normalizedBackendUrl}/api/payments/aamarpay/callback?returnStatus=failed`,
        cancel_url:
          `${normalizedBackendUrl}/api/payments/aamarpay/callback?returnStatus=cancelled`,
        type: "json",
      };

      const response = await fetch(`${baseUrl}/jsonpost.php`, {
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
        paymentUrl.hostname !== "sandbox.aamarpay.com"
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

    const redirectResult = (status: CallbackStatus): void => {
      res.redirect(
        303,
        `${frontendBaseUrl}/checkout/result?status=${status}`,
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

      const storeId = process.env.AAMARPAY_STORE_ID;
      const signatureKey = process.env.AAMARPAY_SIGNATURE_KEY;
      const baseUrl = process.env.AAMARPAY_BASE_URL;

      if (
        !storeId ||
        !signatureKey ||
        baseUrl !== "https://sandbox.aamarpay.com" ||
        process.env.AAMARPAY_MODE !== "sandbox"
      ) {
        redirectResult("failed");
        return;
      }

      const payment = await Payment.findOne({
        transactionId,
        method: "online",
        gatewayName: "aamarPay",
      });

      if (!payment) {
        redirectResult("failed");
        return;
      }

      // Verify the transaction directly with AamarPay.
      const verificationUrl = new URL(
        "/api/v1/trxcheck/request.php",
        baseUrl,
      );

      verificationUrl.search = new URLSearchParams({
        request_id: transactionId,
        store_id: storeId,
        signature_key: signatureKey,
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
        verified.store_id !== storeId
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
        const activeMembership = await Membership.findOne({
          _id: payment.membership,
          status: "active",
        });

        if (activeMembership) {
          redirectResult("success");
          return;
        }

        throw new Error(
          "Payment is completed but membership is not active. Manual review required.",
        );
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
        .select("_id billingType durationDays")
        .lean()
        .exec();

      const plan = planResult as unknown as {
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

      const startDate = new Date();

      const configuredDuration = Number(
        plan.durationDays ?? 365,
      );

      const durationDays =
        Number.isFinite(configuredDuration) &&
        configuredDuration > 0
          ? configuredDuration
          : 365;

      const endDate =
        plan.billingType === "one_time"
          ? null
          : new Date(
              startDate.getTime() +
                durationDays * 24 * 60 * 60 * 1000,
            );

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

          currentPayment.status = "completed";

          currentPayment.gatewayTransactionId =
            typeof verified.pg_txnid === "string"
              ? verified.pg_txnid
              : null;

          currentMembership.status = "active";
          currentMembership.startDate = startDate;
          currentMembership.endDate = endDate;

          await currentPayment.save({ session });
          await currentMembership.save({ session });
        });
      } finally {
        await session.endSession();
      }

      redirectResult("success");
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
