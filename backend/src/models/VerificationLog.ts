import mongoose, { Schema, type Types } from "mongoose";

const verificationLogSchema = new Schema(
  {
    certificate: {
      type: Schema.Types.ObjectId,
      ref: "Certificate",
      default: null,
      index: true,
    },
    certificateId: { type: String, trim: true, maxlength: 100, default: "" },
    verificationType: {
      type: String,
      enum: ["public", "admin"],
      required: true,
    },
    result: {
      type: String,
      enum: ["verified", "expired", "revoked", "invalid", "mismatch"],
      required: true,
    },
    fieldMatches: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

verificationLogSchema.index({ certificateId: 1, createdAt: -1 });

export interface IVerificationLog {
  certificate: Types.ObjectId | null;
  certificateId: string;
  verificationType: "public" | "admin";
  result: "verified" | "expired" | "revoked" | "invalid" | "mismatch";
  fieldMatches: Record<string, boolean>;
  createdAt: Date;
}

const VerificationLog =
  mongoose.models.VerificationLog ??
  mongoose.model("VerificationLog", verificationLogSchema);

export default VerificationLog;
