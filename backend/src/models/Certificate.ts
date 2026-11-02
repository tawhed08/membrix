import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type CertificateStatus = "issued" | "revoked";

export interface ICertificate extends Document {
  certificateId: string;
  verificationToken: string;
  user: Types.ObjectId;
  membership: Types.ObjectId;
  membershipIdSnapshot: string;
  memberName: string;
  organizationName: string;
  planName: string;
  expiresAt: Date | null;
  status: CertificateStatus;
  issuedAt: Date;
  revokedAt: Date | null;
  revocationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    verificationToken: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    membership: {
      type: Schema.Types.ObjectId,
      ref: "Membership",
      required: true,
      unique: true,
    },
    membershipIdSnapshot: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    memberName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    organizationName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    planName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["issued", "revoked"],
      default: "issued",
      required: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
  },
  { timestamps: true },
);

certificateSchema.index({ user: 1, status: 1 });

const Certificate: Model<ICertificate> =
  (mongoose.models.Certificate as Model<ICertificate>) ||
  mongoose.model<ICertificate>("Certificate", certificateSchema);

export default Certificate;