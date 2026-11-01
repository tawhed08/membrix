import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

dotenv.config();

async function createAdmin(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  const name = process.env.ADMIN_NAME?.trim() || "Membrix Admin";
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from .env");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please configure a valid ADMIN_EMAIL in .env");
  }

  if (
    password === undefined ||
    password.length < 12 ||
    password.length > 128
  ) {
    throw new Error(
      "ADMIN_PASSWORD must be between 12 and 128 characters.",
    );
  }

  if (name.length < 2 || name.length > 100) {
    throw new Error("ADMIN_NAME must be between 2 and 100 characters.");
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new Error(
        "This email already exists. No account or role was changed. Choose a new email.",
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });

    console.log("Admin account created successfully.");
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

createAdmin().catch((error: unknown) => {
  console.error(
    "Admin account creation failed:",
    error instanceof Error ? error.message : error,
  );

  process.exitCode = 1;
});