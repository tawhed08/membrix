import { Router, type Request, type Response } from "express";
import nodemailer from "nodemailer";

const router = Router();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const subjects = new Set([
  "Membership Support",
  "Account & Profile",
  "Payment Assistance",
  "Partnership & Business",
  "General Inquiry",
]);

type ContactBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  organization?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;

  const cleaned = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  return cleaned.length <= maxLength ? cleaned : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function isRateLimited(ip: string, now: number): boolean {
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }

  const current = rateLimits.get(ip);
  if (!current || current.resetAt <= now) {
    if (rateLimits.size >= 5000) return true;
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (current.count >= RATE_LIMIT) return true;
  current.count += 1;
  return false;
}

router.post("/", async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  if (isRateLimited(ip, now)) {
    res.setHeader("Retry-After", String(Math.ceil(RATE_WINDOW_MS / 1000)));
    res.status(429).json({
      success: false,
      message: "Too many messages were submitted. Please try again later.",
    });
    return;
  }

  const body =
    typeof req.body === "object" && req.body !== null
      ? (req.body as ContactBody)
      : {};
  const name = cleanText(body.name, 120)?.replace(/\s+/g, " ") ?? null;
  const email = cleanText(body.email, 254);
  const phone =
    cleanText(body.phone ?? "", 40)?.replace(/\s+/g, " ") ?? null;
  const organization =
    cleanText(body.organization ?? "", 120)?.replace(/\s+/g, " ") ?? null;
  const subject = cleanText(body.subject, 40);
  const message = cleanText(body.message, 5000);
  const website = cleanText(body.website ?? "", 500);

  if (website === null || website.length > 0) {
    res.status(400).json({
      success: false,
      message: "Unable to process this inquiry.",
    });
    return;
  }

  if (
    !name ||
    name.length < 2 ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    phone === null ||
    organization === null ||
    !subject ||
    !subjects.has(subject) ||
    !message ||
    message.length < 20
  ) {
    res.status(400).json({
      success: false,
      message: "Please review the form fields and try again.",
    });
    return;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const recipient = process.env.CONTACT_EMAIL;

  if (!host || !port || !user || !pass || !recipient) {
    res.status(503).json({
      success: false,
      message:
        "Message delivery is not configured yet. Please try again later.",
    });
    return;
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Not provided");
  const safeOrganization = escapeHtml(organization || "Not provided");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: recipient,
      replyTo: { name, address: email },
      subject: `Membrix contact: ${subject}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Organization: ${organization || "Not provided"}`,
        `Topic: ${subject}`,
        "",
        message,
      ].join("\n"),
      html: [
        `<p><strong>Name:</strong> ${safeName}</p>`,
        `<p><strong>Email:</strong> ${safeEmail}</p>`,
        `<p><strong>Phone:</strong> ${safePhone}</p>`,
        `<p><strong>Organization:</strong> ${safeOrganization}</p>`,
        `<p><strong>Topic:</strong> ${safeSubject}</p>`,
        `<p><strong>Message:</strong><br>${safeMessage}</p>`,
      ].join(""),
    });

    res.status(200).json({
      success: true,
      message: "Your message has been sent. Thank you for reaching out.",
    });
  } catch (error) {
    const errorName =
      error instanceof Error ? error.name : "Unknown delivery error";
    console.error("Contact message delivery failed:", errorName);
    res.status(502).json({
      success: false,
      message:
        "We could not deliver your message right now. Please try again later.",
    });
  }
});

export default router;
