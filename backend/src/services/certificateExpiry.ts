import nodemailer from "nodemailer";

import Certificate from "../models/Certificate";
import Membership from "../models/Membership";
import Notification, { type INotification } from "../models/Notification";
import User from "../models/User";

export type ReminderKey = "7d" | "1d" | "0d";

export type CertificateExpiryProcessingSummary = {
  created: number;
  skipped: number;
  emailSent: number;
  emailUnavailable: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDhakaDateParts(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as {
    year?: string;
    month?: string;
    day?: string;
  };

  return {
    year: Number(lookup.year ?? "0"),
    month: Number(lookup.month ?? "0"),
    day: Number(lookup.day ?? "0"),
  };
}

function getDhakaCalendarDayValue(date: Date): number {
  const { year, month, day } = toDhakaDateParts(date);
  return Date.UTC(year, month - 1, day);
}

export function getCertificateReminderKey(
  expiresAt: Date,
  now: Date,
): ReminderKey | null {
  const expiryDay = getDhakaCalendarDayValue(expiresAt);
  const nowDay = getDhakaCalendarDayValue(now);
  const daysRemaining = Math.round((expiryDay - nowDay) / DAY_MS);

  if (daysRemaining === 7) return "7d";
  if (daysRemaining === 1) return "1d";
  if (daysRemaining === 0) return "0d";

  return null;
}

function createReminderMessage(daysRemaining: number, expiresAt: Date): {
  title: string;
  message: string;
} {
  const formattedDate = new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(expiresAt);

  if (daysRemaining === 7) {
    return {
      title: "Certificate expiring soon",
      message: `Your Membrix certificate will expire in 7 days on ${formattedDate}. Please review your membership.`,
    };
  }

  if (daysRemaining === 1) {
    return {
      title: "Certificate expires tomorrow",
      message: `Your Membrix certificate expires tomorrow on ${formattedDate}. Please take the necessary action.`,
    };
  }

  return {
    title: "Certificate expired",
    message: `Your Membrix certificate has expired on ${formattedDate}. Please review your membership.`,
  };
}

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

export async function sendExpiryReminderEmail(
  to: string,
  reminderKey: ReminderKey,
  expiresAt: Date,
  certificateId: string,
): Promise<boolean> {
  const transporter = createMailer();

  if (!transporter) {
    return false;
  }

  const formatter = new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });

  const subjectMap: Record<ReminderKey, string> = {
    "7d": "Your Membrix certificate will expire soon",
    "1d": "Your Membrix certificate expires tomorrow",
    "0d": "Your Membrix certificate has expired",
  };

  const contentMap: Record<ReminderKey, string> = {
    "7d": `Your Membrix certificate (${certificateId}) will expire in 7 days. Please review your membership before ${formatter.format(expiresAt)}.`,
    "1d": `Your Membrix certificate (${certificateId}) expires tomorrow. Please take the necessary action before ${formatter.format(expiresAt)}.`,
    "0d": `Your Membrix certificate (${certificateId}) has expired on ${formatter.format(expiresAt)}. Please review your membership.`,
  };

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "no-reply@membrix.com",
      to,
      subject: subjectMap[reminderKey],
      text: contentMap[reminderKey],
      html: `<p>${contentMap[reminderKey]}</p>`,
    });

    return true;
  } catch (error) {
    console.error("Certificate expiry email failed:", error);
    return false;
  }
}

export async function processCertificateExpiryReminders(): Promise<CertificateExpiryProcessingSummary> {
  const now = new Date();
  const summary: CertificateExpiryProcessingSummary = {
    created: 0,
    skipped: 0,
    emailSent: 0,
    emailUnavailable: false,
  };

  const certificates = await Certificate.find({ status: "issued" })
    .populate({
      path: "user",
      select: "_id name email isActive notificationPreferences",
    })
    .populate({
      path: "membership",
      select: "_id user status endDate membershipId",
    })
    .lean();

  for (const certificate of certificates) {
    const membership = certificate.membership as unknown as {
      _id?: string;
      user?: string;
      status?: string;
      endDate?: Date | string | null;
      membershipId?: string;
    } | null;

    const user = certificate.user as unknown as {
      _id?: string;
      email?: string;
      name?: string;
      isActive?: boolean;
      notificationPreferences?: {
        email?: boolean;
        inApp?: boolean;
        certificateExpiry?: boolean;
      };
    } | null;

    if (!membership || !isMembershipEligibleForReminder(membership)) {
      summary.skipped += 1;
      continue;
    }

    if (!user || !user._id || user.isActive === false || !user.email) {
      summary.skipped += 1;
      continue;
    }

    const preferences = user.notificationPreferences;
    const inAppEnabled =
      preferences?.inApp !== false &&
      preferences?.certificateExpiry !== false;
    const emailEnabled =
      preferences?.email !== false &&
      preferences?.certificateExpiry !== false;

    if (!inAppEnabled && !emailEnabled) {
      summary.skipped += 1;
      continue;
    }

    const expiresAt = new Date(membership.endDate as string | Date);
    const reminderKey = getCertificateReminderKey(expiresAt, now);

    if (!reminderKey) {
      summary.skipped += 1;
      continue;
    }

    const reminderMessage = createReminderMessage(
      reminderKey === "7d" ? 7 : reminderKey === "1d" ? 1 : 0,
      expiresAt,
    );

    const existingNotification = await Notification.findOne({
      user: user._id,
      type: "certificate-expiry",
      certificateId: String(certificate.certificateId),
      reminderKey,
    }).lean();

    if (existingNotification) {
      summary.skipped += 1;
      continue;
    }

    const notificationPayload = {
      user: user._id,
      type: "certificate-expiry" as const,
      title: reminderMessage.title,
      message: reminderMessage.message,
      reminderKey,
      relatedType: "certificate",
      relatedId: String(certificate.certificateId),
      certificateId: String(certificate.certificateId),
      membershipId: membership.membershipId ?? String(membership._id ?? ""),
      expiresAt,
      daysRemaining:
        reminderKey === "7d" ? 7 : reminderKey === "1d" ? 1 : 0,
      isRead: false,
      readAt: null,
    };

    const createdNotification: INotification = await Notification.create(notificationPayload);
    summary.created += 1;

    if (emailEnabled) {
      const emailSent = await sendExpiryReminderEmail(
        user.email,
        reminderKey,
        expiresAt,
        String(certificate.certificateId),
      );

      if (emailSent) {
        summary.emailSent += 1;
      } else {
        summary.emailUnavailable = true;
      }
    }

    if (createdNotification && createdNotification._id) {
      console.info(
        `Created certificate expiry notification for ${user.email} (${certificate.certificateId}) with reminder ${reminderKey}.`,
      );
    }
  }

  return summary;
}

function isMembershipEligibleForReminder(membership: {
  status?: string;
  endDate?: Date | string | null;
}): boolean {
  if (!membership.endDate || membership.status !== "active") {
    return false;
  }

  const expiryDate = new Date(membership.endDate);
  if (Number.isNaN(expiryDate.getTime())) {
    return false;
  }

  return expiryDate.getTime() >= Date.now();
}

export function initializeCertificateExpiryScheduler(): void {
  const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

  void processCertificateExpiryReminders();

  setInterval(() => {
    void processCertificateExpiryReminders();
  }, DAILY_INTERVAL_MS);
}
