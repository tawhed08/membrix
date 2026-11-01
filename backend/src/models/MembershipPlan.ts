
import mongoose, { InferSchemaType, Schema } from "mongoose";

export type MembershipPlanSlug = string;
export type MembershipBillingType = "yearly" | "one_time";

const membershipPlanSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    billingType: {
      type: String,
      enum: ["yearly", "one_time"],
      required: true,
    },
    durationDays: {
      type: Number,
      default: 365,
      min: 1,
      required: false,
      validate: {
        validator(this: { billingType?: string }, value: number | null | undefined) {
          if (this.billingType === "one_time") {
            return value == null;
          }

          return Number.isInteger(value) && Number(value) > 0;
        },
        message:
          "Yearly plans require a positive duration; one-time plans must not have a duration.",
      },
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: (features: string[]) =>
          features.length <= 30 &&
          features.every(
            (feature) =>
              typeof feature === "string" &&
              feature.trim().length > 0 &&
              feature.length <= 200,
          ),
        message: "A plan can have up to 30 valid features.",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

membershipPlanSchema.index({ isActive: 1, slug: 1 });

export type IMembershipPlan = InferSchemaType<
  typeof membershipPlanSchema
>;

const MembershipPlan =
  mongoose.models.MembershipPlan ??
  mongoose.model("MembershipPlan", membershipPlanSchema);

export default MembershipPlan;
