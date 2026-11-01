
import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type MembershipStatus =
  | "pending"
  | "active"
  | "expired"
  | "cancelled";

export interface IMembership extends Document {
  membershipId: string;
  user: Types.ObjectId;
  plan: Types.ObjectId;
  status: MembershipStatus;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    membershipId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled"],
      default: "pending",
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

membershipSchema.index({ user: 1, status: 1 });

const Membership: Model<IMembership> =
  (mongoose.models.Membership as Model<IMembership>) ||
  mongoose.model<IMembership>("Membership", membershipSchema);

export default Membership;
