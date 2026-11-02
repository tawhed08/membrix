import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type NotificationType = "certificate-expiry" | "membership-renewal" | "payment-update";

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  reminderKey: string;
  relatedType: string;
  relatedId: string;
  certificateId: string | null;
  membershipId: string | null;
  expiresAt: Date | null;
  daysRemaining: number | null;
  isRead: boolean;
  isHidden: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["certificate-expiry", "membership-renewal", "payment-update"],
      default: "certificate-expiry",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    reminderKey: {
      type: String,
      required: true,
      trim: true,
      default: "expiry",
    },
    relatedType: {
      type: String,
      required: true,
      trim: true,
      default: "certificate",
    },
    relatedId: {
      type: String,
      required: true,
      trim: true,
    },
    certificateId: {
      type: String,
      default: null,
      trim: true,
    },
    membershipId: {
      type: String,
      default: null,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    daysRemaining: {
      type: Number,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

notificationSchema.index(
  { user: 1, type: 1, relatedType: 1, relatedId: 1, reminderKey: 1 },
  { unique: true },
);
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> =
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
