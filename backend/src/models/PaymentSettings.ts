import mongoose, { Schema, type InferSchemaType } from "mongoose";

const paymentSettingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    bkashNumber: { type: String, trim: true, maxlength: 30, default: "" },
    nagadNumber: { type: String, trim: true, maxlength: 30, default: "" },
    bankAccountName: { type: String, trim: true, maxlength: 120, default: "" },
    bankName: { type: String, trim: true, maxlength: 120, default: "" },
    bankAccountNumber: { type: String, trim: true, maxlength: 60, default: "" },
    bankBranch: { type: String, trim: true, maxlength: 120, default: "" },
    bankAccountType: { type: String, trim: true, maxlength: 60, default: "" },
    paymentInstructions: { type: String, trim: true, maxlength: 2000, default: "" },
    aamarPayAdminConfigured: { type: Boolean, default: false },
    aamarPayEnabled: { type: Boolean, default: false },
    aamarPayMode: {
      type: String,
      enum: ["sandbox", "live"],
      default: "sandbox",
    },
    aamarPayCredentialsEncrypted: {
      type: String,
      default: undefined,
      select: false,
    },
    enabled: {
      bkash: { type: Boolean, default: false },
      nagad: { type: Boolean, default: false },
      bank: { type: Boolean, default: false },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export type IPaymentSettings = InferSchemaType<typeof paymentSettingsSchema>;

const PaymentSettings =
  mongoose.models.PaymentSettings ??
  mongoose.model("PaymentSettings", paymentSettingsSchema);

export default PaymentSettings;
