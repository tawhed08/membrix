
import { Router, type Request, type Response } from "express";
import MembershipPlan from "../models/MembershipPlan";

const router = Router();

/**
 * GET /api/plans
 * Returns active membership plans for public pages.
 */
router.get(
  "/",
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const plans = await MembershipPlan.find({
        isActive: true,
      })
        .select(
          "_id name slug description price billingType durationDays features isActive createdAt updatedAt",
        )
        .sort({ createdAt: -1, _id: -1 })
        .lean()
        .exec();

      res.setHeader("Cache-Control", "no-store");

      res.status(200).json({
        success: true,
        data: {
          plans,
        },
      });
    } catch (error) {
      console.error("Public membership plans error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load membership plans.",
      });
    }
  },
);

export default router;
