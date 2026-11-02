import crypto from "node:crypto";
import PaymentSettings from "../models/PaymentSettings";

export type AamarPayMode = "sandbox" | "live";

export interface AamarPayConfiguration {
  mode: AamarPayMode;
  storeId: string;
  signatureKey: string;
  baseUrl: string;
}

interface EncryptedGatewayCredentials {
  storeId: string;
  signatureKey: string;
}

interface GatewaySettings {
  aamarPayAdminConfigured?: boolean;
  aamarPayEnabled?: boolean;
  aamarPayMode?: AamarPayMode;
  aamarPayCredentialsEncrypted?: string;
}

function encryptionKey(): Buffer {
  const keyMaterial =
    process.env.PAYMENT_SETTINGS_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!keyMaterial || keyMaterial.length < 32) {
    throw new Error(
      "Set PAYMENT_SETTINGS_ENCRYPTION_KEY (at least 32 characters) or a 32-character JWT_SECRET to store gateway credentials securely.",
    );
  }
  return crypto.createHash("sha256").update(keyMaterial).digest();
}

export function encryptGatewayValue(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptGatewayValue(value: string): string {
  const [encodedIv, encodedTag, encodedCiphertext, extra] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new Error("Stored AamarPay credentials have an invalid format.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptAamarPayConfiguration(
  configuration: AamarPayConfiguration,
): string {
  return encryptGatewayValue(JSON.stringify(configuration));
}

export function decryptAamarPayConfiguration(
  encrypted: string,
): AamarPayConfiguration {
  const parsed: unknown = JSON.parse(decryptGatewayValue(encrypted));
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("mode" in parsed) ||
    (parsed.mode !== "sandbox" && parsed.mode !== "live") ||
    !("storeId" in parsed) ||
    typeof parsed.storeId !== "string" ||
    !parsed.storeId ||
    !("signatureKey" in parsed) ||
    typeof parsed.signatureKey !== "string" ||
    !parsed.signatureKey
  ) {
    throw new Error("Stored AamarPay credentials are incomplete.");
  }

  const mode = parsed.mode;
  return {
    mode,
    storeId: parsed.storeId,
    signatureKey: parsed.signatureKey,
    baseUrl:
      mode === "live"
        ? "https://secure.aamarpay.com"
        : "https://sandbox.aamarpay.com",
  };
}

function validWebUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function environmentConfiguration(): AamarPayConfiguration | null {
  const mode = process.env.AAMARPAY_MODE;
  const storeId = process.env.AAMARPAY_STORE_ID;
  const signatureKey = process.env.AAMARPAY_SIGNATURE_KEY;
  const baseUrl = process.env.AAMARPAY_BASE_URL;
  if (
    (mode !== "sandbox" && mode !== "live") ||
    !storeId ||
    !signatureKey ||
    !baseUrl
  ) {
    return null;
  }
  try {
    const parsedUrl = new URL(baseUrl);
    const expectedHost =
      mode === "live" ? "secure.aamarpay.com" : "sandbox.aamarpay.com";
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== expectedHost
    ) {
      return null;
    }
    return {
      mode,
      storeId,
      signatureKey,
      baseUrl: parsedUrl.origin,
    };
  } catch {
    return null;
  }
}

async function loadGatewaySettings(): Promise<GatewaySettings | null> {
  const settings = await PaymentSettings.findOne({ key: "default" })
    .select("+aamarPayCredentialsEncrypted")
    .lean()
    .exec();
  return settings as GatewaySettings | null;
}

async function resolveConfiguration(
  settings: GatewaySettings | null,
): Promise<AamarPayConfiguration | null> {
  if (settings?.aamarPayCredentialsEncrypted) {
    return decryptAamarPayConfiguration(
      settings.aamarPayCredentialsEncrypted,
    );
  }
  return environmentConfiguration();
}

export async function getAamarPayConfiguration(): Promise<AamarPayConfiguration | null> {
  const settings = await loadGatewaySettings();
  if (settings?.aamarPayAdminConfigured && !settings.aamarPayEnabled) {
    return null;
  }
  if (
    !validWebUrl(process.env.FRONTEND_URL) ||
    !validWebUrl(process.env.BACKEND_URL)
  ) {
    return null;
  }
  return resolveConfiguration(settings);
}

export async function getAamarPayStatus(): Promise<{
  provider: "aamarPay";
  mode: AamarPayMode;
  enabled: boolean;
  configured: boolean;
  credentialsStored: boolean;
  recurringBillingAvailable: false;
}> {
  const settings = await loadGatewaySettings();
  let configuration: AamarPayConfiguration | null;
  try {
    configuration = await resolveConfiguration(settings);
  } catch (error) {
    console.error("Unable to read stored AamarPay configuration:", error);
    configuration = null;
  }
  const environmentConfigured = environmentConfiguration() !== null;
  const enabled = settings?.aamarPayAdminConfigured
    ? settings.aamarPayEnabled === true
    : environmentConfigured;
  const mode =
    settings?.aamarPayAdminConfigured &&
    (settings.aamarPayMode === "sandbox" || settings.aamarPayMode === "live")
      ? settings.aamarPayMode
      : configuration?.mode ?? "sandbox";
  return {
    provider: "aamarPay",
    mode,
    enabled,
    configured: Boolean(
      configuration &&
        validWebUrl(process.env.FRONTEND_URL) &&
        validWebUrl(process.env.BACKEND_URL),
    ),
    credentialsStored: Boolean(settings?.aamarPayCredentialsEncrypted),
    recurringBillingAvailable: false,
  };
}

export async function getAamarPayConfigurationForPayment(
  paymentGatewayConfigEncrypted?: string,
): Promise<AamarPayConfiguration | null> {
  if (paymentGatewayConfigEncrypted) {
    return decryptAamarPayConfiguration(paymentGatewayConfigEncrypted);
  }
  return getAamarPayConfiguration();
}
