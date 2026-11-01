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
  status: CertificateStatus;
  issuedAt: Date;
  revokedAt: Date | null;
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
  },
  { timestamps: true },
);

certificateSchema.index({ user: 1, status: 1 });

const Certificate: Model<ICertificate> =
  (mongoose.models.Certificate as Model<ICertificate>) ||
  mongoose.model<ICertificate>("Certificate", certificateSchema);

export default Certificate;