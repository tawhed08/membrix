
import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import QRCode from "qrcode";

import { authenticate, requireAdmin } from "../middleware/authenticate";
import Certificate from "../models/Certificate";
import Membership from "../models/Membership";
import User from "../models/User";
import VerificationLog from "../models/VerificationLog";
import { publicVerificationRateLimit } from "../middleware/publicVerificationRateLimit";

const router = Router();

const getVerificationUrl = (
  certificateId: string,
  token: string,
) => {
  const baseUrl = (
    process.env.FRONTEND_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");

  return `${baseUrl}/verify-certificate/${encodeURIComponent(certificateId)}?token=${encodeURIComponent(token)}`;
};

// GET /api/certificates/me
router.get(
  "/me",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const certificates = await Certificate.find({
        user: req.userId,
        status: "issued",
      })
        .select("-verificationToken")
        .populate({
          path: "membership",
          select: "membershipId status startDate endDate plan",
          populate: {
            path: "plan",
            select: "name slug",
          },
        })
        .sort({ issuedAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        certificates,
      });
    } catch (error) {
      console.error("Certificate loading error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load certificates.",
      });
    }
  },
);

// POST /api/certificates/generate
router.post(
  "/generate",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const membershipIdInput: unknown = req.body?.membershipId;
      const membershipId =
        typeof membershipIdInput === "string" ? membershipIdInput.trim() : "";

      if (
        !membershipId ||
        membershipId.length > 100 ||
        !/^[A-Za-z0-9-]+$/.test(membershipId)
      ) {
        res.status(400).json({
          success: false,
          message: "A valid membership ID is required.",
        });
        return;
      }

      const user = await User.findById(req.userId).select("isActive name organization");

      if (!user || user.isActive === false) {
        res.status(403).json({
          success: false,
          message: "Your account is not active.",
        });
        return;
      }

      const membership = await Membership.findOne({
        membershipId,
        user: req.userId,
      }).populate("plan", "name slug");

      if (!membership) {
        res.status(404).json({
          success: false,
          message: "Membership not found.",
        });
        return;
      }

      const now = new Date();

      if (
        membership.status !== "active" ||
        (membership.startDate && membership.startDate > now) ||
        (membership.endDate && membership.endDate < now)
      ) {
        res.status(403).json({
          success: false,
          message: "Only currently active memberships can receive certificates.",
        });
        return;
      }

      let certificate = await Certificate.findOne({
        membership: membership._id,
      }).select("+verificationToken");

      if (certificate?.status === "revoked") {
        res.status(403).json({
          success: false,
          message: "This certificate has been revoked.",
        });
        return;
      }

      if (!certificate) {
        const certificateId = `MBX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
        const verificationToken = crypto.randomBytes(32).toString("hex");

        try {
          certificate = await Certificate.create({
            certificateId,
            verificationToken,
            user: req.userId,
            membership: membership._id,
            membershipIdSnapshot: membership.membershipId,
            memberName: user.name,
            organizationName: user.organization ?? "",
            planName:
              membership.plan &&
              typeof membership.plan === "object" &&
              "name" in membership.plan
                ? String(membership.plan.name)
                : "Membership",
            expiresAt: membership.endDate,
          });
        } catch (error) {
          certificate = await Certificate.findOne({
            membership: membership._id,
          }).select("+verificationToken");

          if (!certificate) {
            throw error;
          }
        }
      }

      const verificationUrl = getVerificationUrl(
        certificate.certificateId,
        certificate.verificationToken,
      );

      const qrCode = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 320,
      });

      res.status(200).json({
        success: true,
        message: "Membership certificate is ready.",
        certificate: {
          certificateId: certificate.certificateId,
          status: certificate.status,
          issuedAt: certificate.issuedAt,
          memberName: certificate.memberName || user.name,
          organization: certificate.organizationName || user.organization || "",
          verificationUrl,
          qrCode,
          membership: {
            membershipId: membership.membershipId,
            plan:
              membership.plan &&
              typeof membership.plan === "object" &&
              "name" in membership.plan
                ? membership.plan.name
                : "Membership",
            startDate: membership.startDate,
            endDate: certificate.expiresAt ?? membership.endDate,
          },
        },
      });
    } catch (error) {
      console.error("Certificate generation error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to generate certificate.",
      });
    }
  },
);

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function dateOnly(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function getCertificateStatus(
  certificate: { status: string },
  membership: { status: string; startDate: Date | null; endDate: Date | null },
): "VERIFIED" | "EXPIRED" | "REVOKED" {
  if (certificate.status === "revoked") return "REVOKED";
  const now = new Date();
  if (
    membership.status !== "active" ||
    (membership.startDate && membership.startDate > now) ||
    (membership.endDate && membership.endDate < now)
  ) {
    return "EXPIRED";
  }
  return "VERIFIED";
}

async function loadVerificationRecord(certificateId: string) {
  return Certificate.findOne({ certificateId })
    .select("+verificationToken")
    .populate({
      path: "membership",
      select: "membershipId status startDate endDate plan",
      populate: { path: "plan", select: "name" },
    })
    .populate({ path: "user", select: "name organization" })
    .exec();
}

// GET /api/certificates/verify/:certificateId
router.get(
  "/verify/:certificateId",
  publicVerificationRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const certificateId = Array.isArray(req.params.certificateId)
        ? req.params.certificateId[0] ?? ""
        : req.params.certificateId;
      if (!certificateId || certificateId.length > 100 || !/^[A-Za-z0-9-]+$/.test(certificateId)) {
        res.status(400).json({ success: false, valid: false, status: "INVALID", message: "Invalid certificate ID." });
        return;
      }
      const token = typeof req.query.token === "string" ? req.query.token : "";
      const certificate = await loadVerificationRecord(certificateId);

      if (!certificate) {
        await VerificationLog.create({
          certificate: null,
          certificateId,
          verificationType: "public",
          result: "invalid",
        });
        res.status(200).json({
          success: true,
          valid: false,
          status: "INVALID",
          message: "No certificate matches this ID.",
        });
        return;
      }

      if (
        token &&
        (!/^[a-f0-9]{64}$/i.test(token) ||
          !crypto.timingSafeEqual(
            Buffer.from(certificate.verificationToken, "hex"),
            Buffer.from(token, "hex"),
          ))
      ) {
        await VerificationLog.create({
          certificate: certificate._id,
          certificateId,
          verificationType: "public",
          result: "invalid",
        });
        res.status(200).json({
          success: true,
          valid: false,
          status: "INVALID",
          message: "The certificate verification token is invalid.",
        });
        return;
      }

      const membership = certificate.membership as unknown as {
        membershipId: string;
        status: string;
        startDate: Date | null;
        endDate: Date | null;
        plan: { name: string } | null;
      } | null;
      const member = certificate.user as unknown as {
        name: string;
        organization?: string;
      } | null;

      if (!membership || !member) {
        await VerificationLog.create({
          certificate: certificate._id,
          certificateId,
          verificationType: "public",
          result: "invalid",
        });
        res.status(200).json({
          success: true,
          valid: false,
          status: "INVALID",
          message: "The certificate record is incomplete.",
        });
        return;
      }

      const status = getCertificateStatus(certificate, membership);
      const result =
        status === "VERIFIED" ? "verified" : status.toLowerCase();
      await VerificationLog.create({
        certificate: certificate._id,
        certificateId,
        verificationType: "public",
        result,
      });

      res.status(200).json({
        success: true,
        valid: status === "VERIFIED",
        status,
        message:
          status === "VERIFIED"
            ? "This certificate is authentic and currently valid."
            : status === "REVOKED"
              ? "This certificate has been revoked."
              : "The membership associated with this certificate has expired or is inactive.",
        certificate: {
          certificateId: certificate.certificateId,
          memberName: certificate.memberName || member.name,
          organization: certificate.organizationName || member.organization || "",
          membershipId: certificate.membershipIdSnapshot || membership.membershipId,
          membershipType: certificate.planName || membership.plan?.name || "Membership",
          issuedAt: certificate.issuedAt,
          startDate: membership.startDate,
          endDate: certificate.expiresAt ?? membership.endDate,
          status,
        },
      });
    } catch (error) {
      console.error("Certificate verification error:", error);
      res.status(500).json({
        success: false,
        valid: false,
        message: "Unable to verify certificate.",
      });
    }
  },
);

router.post(
  "/verify/:certificateId/match",
  publicVerificationRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const certificateId = Array.isArray(req.params.certificateId)
        ? req.params.certificateId[0] ?? ""
        : req.params.certificateId;
      if (!certificateId || certificateId.length > 100 || !/^[A-Za-z0-9-]+$/.test(certificateId)) {
        res.status(400).json({ success: false, message: "Invalid certificate ID." });
        return;
      }
      const input: unknown = req.body;
      const allowedFields = [
        "membershipId",
        "memberName",
        "organization",
        "planName",
        "issueDate",
        "expiryDate",
      ] as const;
      if (!input || typeof input !== "object" || Array.isArray(input)) {
        res.status(400).json({ success: false, message: "Verification fields are required." });
        return;
      }

      const values = input as Record<string, unknown>;
      if (
        Object.keys(values).length === 0 ||
        Object.keys(values).some((field) => !allowedFields.includes(field as (typeof allowedFields)[number])) ||
        Object.values(values).some((value) => typeof value !== "string" || value.length > 200)
      ) {
        res.status(400).json({ success: false, message: "One or more verification fields are invalid." });
        return;
      }

      const certificate = await loadVerificationRecord(certificateId);
      const membership = certificate?.membership as unknown as {
        membershipId: string;
        status: string;
        startDate: Date | null;
        endDate: Date | null;
        plan: { name: string } | null;
      } | null;
      const member = certificate?.user as unknown as {
        name: string;
        organization?: string;
      } | null;

      if (!certificate || !membership || !member) {
        await VerificationLog.create({
          certificate: certificate?._id ?? null,
          certificateId,
          verificationType: "public",
          result: "invalid",
          fieldMatches: {},
        });
        res.status(200).json({
          success: true,
          verified: false,
          status: "INVALID",
          fieldMatches: {},
          message: "No matching certificate record was found.",
        });
        return;
      }

      const expected: Record<string, string> = {
            membershipId: certificate.membershipIdSnapshot || membership.membershipId,
            memberName: certificate.memberName || member.name,
            organization: certificate.organizationName || member.organization || "",
            planName: certificate.planName || membership.plan?.name || "Membership",
        issueDate: dateOnly(certificate.issuedAt),
            expiryDate: dateOnly(certificate.expiresAt ?? membership.endDate),
      };
      const fieldMatches: Record<string, boolean> = {};
      for (const [field, supplied] of Object.entries(values)) {
        if (typeof supplied !== "string") continue;
        const isDate = field === "issueDate" || field === "expiryDate";
        fieldMatches[field] = isDate
          ? dateOnly(supplied) !== "" && dateOnly(supplied) === expected[field]
          : normalizeText(supplied) === normalizeText(expected[field]);
      }

      const status = getCertificateStatus(certificate, membership);
      const mismatch = Object.values(fieldMatches).some((match) => !match);
      const result =
        status === "REVOKED"
          ? "revoked"
          : status === "EXPIRED"
            ? "expired"
            : mismatch
              ? "mismatch"
              : "verified";
      await VerificationLog.create({
        certificate: certificate._id,
        certificateId,
        verificationType: "public",
        result,
        fieldMatches,
      });

      res.status(200).json({
        success: true,
        verified: result === "verified",
        status: status === "VERIFIED" ? (mismatch ? "INFORMATION MISMATCH" : "VERIFIED") : status,
        fieldMatches,
        certificate: {
          certificateId: certificate.certificateId,
          membershipId: expected.membershipId,
          memberName: expected.memberName,
          organization: expected.organization,
          planName: expected.planName,
          issueDate: expected.issueDate,
          expiryDate: expected.expiryDate || null,
          status,
        },
      });
    } catch (error) {
      console.error("Certificate cross-match error:", error);
      res.status(500).json({ success: false, message: "Unable to verify certificate information." });
    }
  },
);

router.get(
  "/admin/certificates",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
      const status = typeof req.query.status === "string" ? req.query.status : "all";
      if (search.length > 100 || !["all", "active", "expired", "revoked"].includes(status)) {
        res.status(400).json({ success: false, message: "Invalid certificate search filters." });
        return;
      }
      const filter: Record<string, unknown> = {};
      if (status === "revoked") filter.status = "revoked";
      else if (status === "active" || status === "expired") filter.status = "issued";
      if (search) {
        const regex = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        const [membershipIds, memberIds] = await Promise.all([
          Membership.find({ membershipId: regex }).distinct("_id").exec(),
          User.find({ name: regex, role: "member" }).distinct("_id").exec(),
        ]);
        filter.$or = [
          { certificateId: regex },
          { membership: { $in: membershipIds } },
          { user: { $in: memberIds } },
        ];
      }
      const certificates = await Certificate.find(filter)
        .populate({
          path: "membership",
          select: "membershipId renewalOf endDate",
          populate: [
            { path: "plan", select: "name" },
            { path: "renewalOf", select: "membershipId" },
          ],
        })
        .populate("user", "name organization")
        .sort({ issuedAt: -1 })
        .limit(100)
        .lean()
        .exec();
      const now = new Date();
      const results = certificates.map((certificate) => {
        const membership = certificate.membership as unknown as {
          membershipId: string;
          status: string;
          startDate: Date | null;
          endDate: Date | null;
          plan: { name: string } | null;
          renewalOf: { membershipId: string } | null;
        } | null;
        const user = certificate.user as unknown as { name: string; organization?: string } | null;
        const computedStatus = !membership
          ? "INVALID"
          : getCertificateStatus(certificate, membership);
        const currentStatus = computedStatus === "VERIFIED" ? "ACTIVE" : computedStatus;
        return {
          certificateId: certificate.certificateId,
          membershipId: certificate.membershipIdSnapshot || membership?.membershipId || null,
          renewalOfMembershipId: membership?.renewalOf?.membershipId ?? null,
          memberName: certificate.memberName || user?.name || "Unknown member",
          organization: certificate.organizationName || user?.organization || "",
          planName: certificate.planName || membership?.plan?.name || "Membership",
          issueDate: certificate.issuedAt,
          expiryDate: certificate.expiresAt ?? membership?.endDate ?? null,
          status: currentStatus,
          revokedAt: certificate.revokedAt,
          revocationReason: certificate.revocationReason,
        };
      }).filter((certificate) =>
        status === "all" ||
        (status === "active" && certificate.status === "ACTIVE") ||
        (status === "expired" && certificate.status === "EXPIRED") ||
        (status === "revoked" && certificate.status === "REVOKED"),
      );
      res.status(200).json({ success: true, certificates: results });
    } catch (error) {
      console.error("Admin certificate list error:", error);
      res.status(500).json({ success: false, message: "Unable to load certificates." });
    }
  },
);

router.post(
  "/admin/certificates/:certificateId/verify",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const certificateId = Array.isArray(req.params.certificateId)
        ? req.params.certificateId[0] ?? ""
        : req.params.certificateId;
      if (!certificateId || certificateId.length > 100 || !/^[A-Za-z0-9-]+$/.test(certificateId)) {
        res.status(400).json({ success: false, message: "Invalid certificate ID." });
        return;
      }
      const fields = [
        "certificateId",
        "membershipId",
        "memberName",
        "organization",
        "planName",
        "issueDate",
        "expiryDate",
        "status",
      ] as const;
      const input: unknown = req.body;
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        fields.some((field) => typeof (input as Record<string, unknown>)[field] !== "string")
      ) {
        res.status(400).json({ success: false, message: "All certificate verification fields are required." });
        return;
      }
      const supplied = input as Record<(typeof fields)[number], string>;
      if (fields.some((field) => supplied[field].length > 200)) {
        res.status(400).json({ success: false, message: "Verification values cannot exceed 200 characters." });
        return;
      }

      const certificate = await loadVerificationRecord(certificateId);
      const membership = certificate?.membership as unknown as {
        membershipId: string;
        status: string;
        startDate: Date | null;
        endDate: Date | null;
        plan: { name: string } | null;
      } | null;
      const member = certificate?.user as unknown as {
        name: string;
        organization?: string;
      } | null;

      if (!certificate || !membership || !member) {
        await VerificationLog.create({
          certificate: certificate?._id ?? null,
          certificateId,
          verificationType: "admin",
          result: "invalid",
        });
        res.status(200).json({ success: true, verified: false, status: "INVALID", fieldMatches: {} });
        return;
      }

      const currentStatus = getCertificateStatus(certificate, membership);
      const expected: Record<(typeof fields)[number], string> = {
        certificateId: certificate.certificateId,
        membershipId: certificate.membershipIdSnapshot || membership.membershipId,
        memberName: certificate.memberName || member.name,
        organization: certificate.organizationName || member.organization || "",
        planName: certificate.planName || membership.plan?.name || "Membership",
        issueDate: dateOnly(certificate.issuedAt),
        expiryDate: dateOnly(certificate.expiresAt ?? membership.endDate),
        status: currentStatus === "VERIFIED" ? "ACTIVE" : currentStatus,
      };
      const fieldMatches: Record<string, boolean> = {};
      for (const field of fields) {
        const isDate = field === "issueDate" || field === "expiryDate";
        fieldMatches[field] = isDate
          ? dateOnly(supplied[field]) !== "" && dateOnly(supplied[field]) === expected[field]
          : normalizeText(supplied[field]) === normalizeText(expected[field]);
      }
      const matches = Object.values(fieldMatches).every(Boolean);
      const result =
        currentStatus === "REVOKED"
          ? "revoked"
          : currentStatus === "EXPIRED"
            ? "expired"
            : matches
              ? "verified"
              : "mismatch";
      await VerificationLog.create({
        certificate: certificate._id,
        certificateId,
        verificationType: "admin",
        result,
        fieldMatches,
      });
      res.status(200).json({
        success: true,
        verified: result === "verified",
        status: result === "mismatch" ? "INFORMATION MISMATCH" : currentStatus,
        fieldMatches,
        expected,
      });
    } catch (error) {
      console.error("Admin certificate verification error:", error);
      res.status(500).json({ success: false, message: "Unable to verify certificate fields." });
    }
  },
);

router.patch(
  "/admin/certificates/:certificateId/revoke",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    const certificateId = req.params.certificateId;
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason || reason.length > 500) {
      res.status(400).json({ success: false, message: "A revocation reason of up to 500 characters is required." });
      return;
    }
    try {
      const certificate = await Certificate.findOne({ certificateId });
      if (!certificate) {
        res.status(404).json({ success: false, message: "Certificate not found." });
        return;
      }
      if (certificate.status === "revoked") {
        res.status(409).json({ success: false, message: "Certificate is already revoked." });
        return;
      }
      certificate.status = "revoked";
      certificate.revokedAt = new Date();
      certificate.revocationReason = reason;
      await certificate.save();
      await VerificationLog.create({
        certificate: certificate._id,
        certificateId,
        verificationType: "admin",
        result: "revoked",
      });
      res.status(200).json({ success: true, message: "Certificate revoked." });
    } catch (error) {
      console.error("Certificate revocation error:", error);
      res.status(500).json({ success: false, message: "Unable to revoke certificate." });
    }
  },
);

router.get(
  "/admin/certificates/:certificateId/logs",
  authenticate,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const logs = await VerificationLog.find({ certificateId: req.params.certificateId })
        .sort({ createdAt: -1 })
        .limit(100)
        .select("verificationType result fieldMatches createdAt")
        .lean()
        .exec();
      res.status(200).json({ success: true, logs });
    } catch (error) {
      console.error("Certificate verification log error:", error);
      res.status(500).json({ success: false, message: "Unable to load verification logs." });
    }
  },
);

export default router;
