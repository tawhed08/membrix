
import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type PaymentMethod = "bkash" | "nagad" | "bank" | "online";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "failed"
  | "refunded";

export interface IPayment extends Document {
  user: Types.ObjectId;
  membership: Types.ObjectId;
  plan: Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  payerNumber: string | null;
  paymentReference: string | null;
  proofUrl: string | null;
  gatewayTransactionId: string | null;
  gatewayName: string | null;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
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
      index: true,
    },

    plan: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "BDT",
      uppercase: true,
      trim: true,
    },

    method: {
      type: String,
      enum: ["bkash", "nagad", "bank", "online"],
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "rejected",
        "failed",
        "refunded",
      ],
      default: "pending",
      index: true,
    },

    transactionId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },

    payerNumber: {
      type: String,
      default: null,
      trim: true,
      maxlength: 30,
    },

    paymentReference: {
      type: String,
      default: null,
      trim: true,
    },

    proofUrl: {
      type: String,
      default: null,
      trim: true,
    },

    gatewayTransactionId: {
      type: String,
      default: null,
      trim: true,
    },

    gatewayName: {
      type: String,
      default: null,
      trim: true,
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    adminNote: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ membership: 1, status: 1 });

const Payment: Model<IPayment> =
  (mongoose.models.Payment as Model<IPayment>) ||
  mongoose.model<IPayment>("Payment", paymentSchema);

export default Payment;
