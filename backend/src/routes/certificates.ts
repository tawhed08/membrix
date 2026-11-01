
import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import QRCode from "qrcode";

import { authenticate } from "../middleware/authenticate";
import Certificate from "../models/Certificate";
import Membership from "../models/Membership";
import User from "../models/User";

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

      const { membershipId } = req.body as {
        membershipId?: string;
      };

      if (!membershipId) {
        res.status(400).json({
          success: false,
          message: "Membership ID is required.",
        });
        return;
      }

      const user = await User.findById(req.userId).select("isActive");

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
            endDate: membership.endDate,
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

// GET /api/certificates/verify/:certificateId
router.get(
  "/verify/:certificateId",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const certificateId = req.params.certificateId;
      const token =
        typeof req.query.token === "string" ? req.query.token : "";

      if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
        res.status(400).json({
          success: false,
          valid: false,
          message: "A valid verification token is required.",
        });
        return;
      }

      const certificate = await Certificate.findOne({
        certificateId,
      })
        .select("+verificationToken")
        .populate({
          path: "membership",
          select: "membershipId status startDate endDate plan",
          populate: {
            path: "plan",
            select: "name",
          },
        })
        .populate({
          path: "user",
          select: "name",
        });

      if (
        !certificate ||
        certificate.status !== "issued" ||
        !crypto.timingSafeEqual(
          Buffer.from(certificate.verificationToken, "hex"),
          Buffer.from(token, "hex"),
        )
      ) {
        res.status(200).json({
          success: true,
          valid: false,
          message: "Certificate is invalid or revoked.",
        });
        return;
      }

      const membership = certificate.membership as unknown as {
        membershipId: string;
        status: string;
        startDate: Date | null;
        endDate: Date | null;
        plan: { name: string } | null;
      };

      const member = certificate.user as unknown as {
        name: string;
      };

      const now = new Date();

      const membershipActive =
        membership.status === "active" &&
        (!membership.startDate || membership.startDate <= now) &&
        (!membership.endDate || membership.endDate >= now);

      if (!membershipActive) {
        res.status(200).json({
          success: true,
          valid: false,
          message: "The membership associated with this certificate is not active.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        valid: true,
        certificate: {
          certificateId: certificate.certificateId,
          memberName: member.name,
          membershipId: membership.membershipId,
          membershipType: membership.plan?.name || "Membership",
          issuedAt: certificate.issuedAt,
          startDate: membership.startDate,
          endDate: membership.endDate,
          status: "Verified",
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

export default router;
