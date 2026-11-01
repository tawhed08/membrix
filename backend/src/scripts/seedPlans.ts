
import dotenv from "dotenv";
import mongoose from "mongoose";
import MembershipPlan from "../models/MembershipPlan";

dotenv.config();

const plans = [
  {
    name: "Essential" as const,
    slug: "essential" as const,
    description: "A simple starting point for your membership journey.",
    price: 500,
    billingType: "yearly" as const,
    durationDays: 365,
    features: [
      "Personal member profile",
      "Membership status tracking",
      "Member announcements",
    ],
  },
  {
    name: "Premium" as const,
    slug: "premium" as const,
    description: "More value for members ready to get involved.",
    price: 1000,
    billingType: "yearly" as const,
    durationDays: 365,
    features: [
      "Everything in Essential",
      "Digital membership card",
      "Priority member support",
      "Membership history",
    ],
  },
  {
    name: "Lifetime" as const,
    slug: "lifetime" as const,
    description: "A long-term membership option.",
    price: 5000,
    billingType: "one_time" as const,
    durationDays: null,
    features: [
      "Lifetime membership option",
      "Digital membership card",
      "Member profile and history",
      "Priority support",
    ],
  },
];

async function seedPlans() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB Atlas.");

    for (const plan of plans) {
      const existing = await MembershipPlan.findOne({
        slug: plan.slug,
      });

      if (existing) {
        console.log(`Skipped existing plan: ${plan.slug}`);
        continue;
      }

      await MembershipPlan.create({
        ...plan,
        isActive: true,
      });

      console.log(`Created plan: ${plan.slug}`);
    }

    console.log("Plan seeding completed.");
  } catch (error) {
    console.error("Plan seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

void seedPlans();
