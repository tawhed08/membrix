import { Router, type Request, type Response } from "express";

import { authenticate, requireAdmin } from "../middleware/authenticate";
import Notification from "../models/Notification";
import User from "../models/User";
import {
  processCertificateExpiryReminders,
} from "../services/certificateExpiry";

const router = Router();

router.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const user = await User.findById(req.userId).select(
      "notificationPreferences",
    );
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User account not found.",
      });
      return;
    }

    if (
      user.notificationPreferences?.inApp === false ||
      user.notificationPreferences?.certificateExpiry === false
    ) {
      res.status(200).json({ success: true, notifications: [] });
      return;
    }

    const notifications = await Notification.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      success: true,
      notifications: notifications.map((notification) => ({
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        reminderKey: notification.reminderKey,
        relatedType: notification.relatedType,
        relatedId: notification.relatedId,
        certificateId: notification.certificateId,
        membershipId: notification.membershipId,
        expiresAt: notification.expiresAt,
        daysRemaining: notification.daysRemaining,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    console.error("Notification load error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load notifications.",
    });
  }
});

router.post(
  "/:notificationId/read",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, message: "Authentication required." });
        return;
      }

      const notification = await Notification.findOne({
        _id: req.params.notificationId,
        user: req.userId,
      });

      if (!notification) {
        res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
        return;
      }

      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();

      res.status(200).json({
        success: true,
        notification,
      });
    } catch (error) {
      console.error("Notification update error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to update notification.",
      });
    }
  },
);

router.post(
  "/mark-all-read",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({ success: false, message: "Authentication required." });
        return;
      }

      const result = await Notification.updateMany(
        { user: req.userId, isRead: false },
        { isRead: true, readAt: new Date() },
      );

      res.status(200).json({
        success: true,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Notification bulk update error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to update notifications.",
      });
    }
  },
);

router.post(
  "/process-expiry-reminders",
  authenticate,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const summary = await processCertificateExpiryReminders();
      res.status(200).json({
        success: true,
        summary,
      });
    } catch (error) {
      console.error("Certificate expiry reminder processing error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to process certificate expiry reminders.",
      });
    }
  },
);

export default router;
