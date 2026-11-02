import { Router, type Request, type Response } from "express";
import { authenticate, requireAdmin } from "../middleware/authenticate";
import PaymentSettings, { type IPaymentSettings } from "../models/PaymentSettings";
import {
  decryptGatewayValue,
  encryptAamarPayConfiguration,
  getAamarPayStatus,
  type AamarPayMode,
} from "../services/aamarPay";

const router = Router();

const EMPTY_SETTINGS = {
  bkashNumber: "",
  nagadNumber: "",
  bankAccountName: "",
  bankName: "",
  bankAccountNumber: "",
  bankBranch: "",
  bankAccountType: "",
  paymentInstructions: "",
  enabled: { bkash: false, nagad: false, bank: false },
};

type ManualPaymentMethod = "bkash" | "nagad" | "bank";

function serializeSettings(settings: Partial<IPaymentSettings> | null) {
  const values = settings ?? EMPTY_SETTINGS;
  return {
    bkashNumber: values.bkashNumber ?? "",
    nagadNumber: values.nagadNumber ?? "",
    bankAccountName: values.bankAccountName ?? "",
    bankName: values.bankName ?? "",
    bankAccountNumber: values.bankAccountNumber ?? "",
    bankBranch: values.bankBranch ?? "",
    bankAccountType: values.bankAccountType ?? "",
    paymentInstructions: values.paymentInstructions ?? "",
    enabled: {
      bkash: values.enabled?.bkash ?? false,
      nagad: values.enabled?.nagad ?? false,
      bank: values.enabled?.bank ?? false,
    },
  };
}

export function getAvailableManualMethods(
  settings: Partial<IPaymentSettings> | null,
): ManualPaymentMethod[] {
  if (!settings) return [];

  const enabled = settings.enabled;
  const available: ManualPaymentMethod[] = [];

  if (
    enabled?.bkash === true &&
    typeof settings.bkashNumber === "string" &&
    /^\+?[0-9][0-9\s()-]{2,29}$/.test(settings.bkashNumber.trim())
  ) {
    available.push("bkash");
  }
  if (
    enabled?.nagad === true &&
    typeof settings.nagadNumber === "string" &&
    /^\+?[0-9][0-9\s()-]{2,29}$/.test(settings.nagadNumber.trim())
  ) {
    available.push("nagad");
  }
  if (
    enabled?.bank === true &&
    Boolean(
      settings.bankAccountName?.trim() &&
        settings.bankName?.trim() &&
        settings.bankAccountNumber?.trim(),
    )
  ) {
    available.push("bank");
  }

  return available;
}

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await PaymentSettings.findOne({ key: "default" }).lean().exec();
    const gateway = await getAamarPayStatus();
    res.status(200).json({
      success: true,
      settings: serializeSettings(settings as Partial<IPaymentSettings> | null),
      availableManualMethods: getAvailableManualMethods(
        settings as Partial<IPaymentSettings> | null,
      ),
      gateway: {
        provider: gateway.provider,
        mode: gateway.mode,
        enabled: gateway.enabled,
        configured: gateway.configured,
        recurringBillingAvailable: gateway.recurringBillingAvailable,
      },
    });
  } catch (error) {
    console.error("Public payment settings error:", error);
    res.status(500).json({ success: false, message: "Unable to load payment options." });
  }
});

router.get(
  "/admin",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const settings = await PaymentSettings.findOne({ key: "default" }).lean().exec();
      res.status(200).json({
        success: true,
        settings: serializeSettings(settings as Partial<IPaymentSettings> | null),
        gateway: await getAamarPayStatus(),
      });
    } catch (error) {
      console.error("Admin payment settings load error:", error);
      res.status(500).json({ success: false, message: "Unable to load payment settings." });
    }
  },
);

router.put(
  "/admin",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const body: unknown = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      res.status(400).json({ success: false, message: "A valid settings object is required." });
      return;
    }

    const input = body as Record<string, unknown>;
    const stringFields = [
      "bkashNumber",
      "nagadNumber",
      "bankAccountName",
      "bankName",
      "bankAccountNumber",
      "bankBranch",
      "bankAccountType",
      "paymentInstructions",
    ] as const;
    const limits: Record<(typeof stringFields)[number], number> = {
      bkashNumber: 30,
      nagadNumber: 30,
      bankAccountName: 120,
      bankName: 120,
      bankAccountNumber: 60,
      bankBranch: 120,
      bankAccountType: 60,
      paymentInstructions: 2000,
    };

    const values: Record<string, string> = {};
    for (const field of stringFields) {
      if (typeof input[field] !== "string" || input[field].trim().length > limits[field]) {
        res.status(400).json({ success: false, message: `Invalid ${field}.` });
        return;
      }
      values[field] = input[field].trim();
    }

    const enabled = input.enabled;
    if (
      !enabled ||
      typeof enabled !== "object" ||
      Array.isArray(enabled) ||
      typeof (enabled as Record<string, unknown>).bkash !== "boolean" ||
      typeof (enabled as Record<string, unknown>).nagad !== "boolean" ||
      typeof (enabled as Record<string, unknown>).bank !== "boolean"
    ) {
      res.status(400).json({ success: false, message: "Payment method statuses are invalid." });
      return;
    }

    const methodStatuses = enabled as Record<"bkash" | "nagad" | "bank", boolean>;
    const gatewayInput = input.gateway;
    let gatewayUpdate: Record<string, unknown> = {};
    if (gatewayInput !== undefined) {
      if (
        !gatewayInput ||
        typeof gatewayInput !== "object" ||
        Array.isArray(gatewayInput)
      ) {
        res.status(400).json({ success: false, message: "AamarPay settings are invalid." });
        return;
      }

      const gateway = gatewayInput as Record<string, unknown>;
      if (
        typeof gateway.enabled !== "boolean" ||
        (gateway.mode !== "sandbox" && gateway.mode !== "live") ||
        typeof gateway.storeId !== "string" ||
        typeof gateway.signatureKey !== "string" ||
        gateway.storeId.trim().length > 120 ||
        gateway.signatureKey.length > 500
      ) {
        res.status(400).json({ success: false, message: "AamarPay settings are invalid." });
        return;
      }

      const mode = gateway.mode as AamarPayMode;
      const existing = await PaymentSettings.findOne({ key: "default" })
        .select("+aamarPayCredentialsEncrypted")
        .lean()
        .exec();
      let existingCredentials: {
        mode?: AamarPayMode;
        storeId: string;
        signatureKey: string;
      } | null = null;
      const replacingBothCredentials =
        gateway.storeId.trim().length > 0 &&
        gateway.signatureKey.trim().length > 0;
      if (existing?.aamarPayCredentialsEncrypted && !replacingBothCredentials) {
        try {
          existingCredentials = JSON.parse(
            decryptGatewayValue(existing.aamarPayCredentialsEncrypted),
          ) as {
            mode?: AamarPayMode;
            storeId: string;
            signatureKey: string;
          };
        } catch (error) {
          console.error("Unable to decrypt saved AamarPay credentials:", error);
          res.status(500).json({ success: false, message: "Saved gateway credentials cannot be read. Re-enter both credentials." });
          return;
        }
      }

      const credentialMode =
        existingCredentials?.mode ?? process.env.AAMARPAY_MODE;
      const hasExistingCredentials = Boolean(
        existingCredentials?.storeId ||
          existingCredentials?.signatureKey ||
          (process.env.AAMARPAY_STORE_ID &&
            process.env.AAMARPAY_SIGNATURE_KEY),
      );
      if (
        credentialMode !== mode &&
        hasExistingCredentials &&
        !replacingBothCredentials
      ) {
        res.status(400).json({
          success: false,
          message: "Enter both merchant credentials when changing between sandbox and live mode.",
        });
        return;
      }

      const storeId =
        gateway.storeId.trim() ||
        existingCredentials?.storeId ||
        process.env.AAMARPAY_STORE_ID ||
        "";
      const signatureKey =
        gateway.signatureKey.trim() ||
        existingCredentials?.signatureKey ||
        process.env.AAMARPAY_SIGNATURE_KEY ||
        "";

      if (gateway.enabled && (!storeId || !signatureKey)) {
        res.status(400).json({
          success: false,
          message: "Enter the AamarPay store ID and signature key before enabling the gateway.",
        });
        return;
      }

      let encryptedCredentials: string | undefined;
      if (storeId && signatureKey) {
        try {
          encryptedCredentials = encryptAamarPayConfiguration({
            mode,
            storeId,
            signatureKey,
            baseUrl:
              mode === "live"
                ? "https://secure.aamarpay.com"
                : "https://sandbox.aamarpay.com",
          });
        } catch (error) {
          console.error("Unable to encrypt AamarPay credentials:", error);
          res.status(503).json({
            success: false,
            message: "Secure gateway credential storage is unavailable. Configure PAYMENT_SETTINGS_ENCRYPTION_KEY on the backend.",
          });
          return;
        }
      }

      gatewayUpdate = {
        aamarPayAdminConfigured: true,
        aamarPayEnabled: gateway.enabled,
        aamarPayMode: mode,
        ...(encryptedCredentials
          ? { aamarPayCredentialsEncrypted: encryptedCredentials }
          : {}),
      };
    }

    if (
      (values.bkashNumber && !/^\+?[0-9][0-9\s()-]{2,29}$/.test(values.bkashNumber)) ||
      (values.nagadNumber && !/^\+?[0-9][0-9\s()-]{2,29}$/.test(values.nagadNumber))
    ) {
      res.status(400).json({ success: false, message: "Mobile wallet numbers must contain a valid phone number." });
      return;
    }
    if (methodStatuses.bkash && !values.bkashNumber) {
      res.status(400).json({ success: false, message: "Add the bKash recipient number before enabling bKash." });
      return;
    }
    if (methodStatuses.nagad && !values.nagadNumber) {
      res.status(400).json({ success: false, message: "Add the Nagad recipient number before enabling Nagad." });
      return;
    }
    if (
      methodStatuses.bank &&
      (!values.bankAccountName || !values.bankName || !values.bankAccountNumber)
    ) {
      res.status(400).json({ success: false, message: "Complete the bank account name, bank name and account number before enabling bank transfer." });
      return;
    }

    try {
      const settings = await PaymentSettings.findOneAndUpdate(
        { key: "default" },
        {
          $set: {
            ...values,
            enabled: methodStatuses,
            ...gatewayUpdate,
            updatedBy: req.userId,
          },
        },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      ).lean().exec();

      res.status(200).json({
        success: true,
        message: "Payment settings saved.",
        settings: serializeSettings(settings as Partial<IPaymentSettings>),
        gateway: await getAamarPayStatus(),
      });
    } catch (error) {
      console.error("Admin payment settings save error:", error);
      res.status(500).json({ success: false, message: "Unable to save payment settings." });
    }
  },
);

export default router;
