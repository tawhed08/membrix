import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import paymentRoutes from "./routes/payments";
import membershipRoutes from "./routes/memberships";
import certificateRoutes from "./routes/certificates";
import adminRoutes from "./routes/admin";
import notificationRoutes from "./routes/notifications";
import publicPlanRoutes from "./routes/publicPlans";
import contactRoutes from "./routes/contact";
import paymentSettingsRoutes from "./routes/paymentSettings";
import { initializeCertificateExpiryScheduler } from "./services/certificateExpiry";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

// Middleware
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Membrix API is running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);

// Public membership plans
app.use("/api/plans", publicPlanRoutes);

// Application routes
app.use("/api/payments", paymentRoutes);
app.use("/api/payment-settings", paymentSettingsRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// Start server after connecting to MongoDB Atlas
async function startServer(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB Atlas connected successfully");

    initializeCertificateExpiryScheduler();

    app.listen(PORT, () => {
      console.log(
        `Membrix API running at http://localhost:${PORT}`,
      );
      console.log(
        `Public plans endpoint: http://localhost:${PORT}/api/plans`,
      );
      console.log(
        `Certificate endpoint: http://localhost:${PORT}/api/certificates`,
      );
      console.log(
        `Notifications endpoint: http://localhost:${PORT}/api/notifications`,
      );
    });
  } catch (error) {
    console.error("Failed to start Membrix API:", error);
    process.exit(1);
  }
}

void startServer();