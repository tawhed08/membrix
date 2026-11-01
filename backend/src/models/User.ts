
import mongoose, { Document, Model, Schema } from "mongoose";

export type UserRole = "member" | "admin";

export interface INotificationPreferences {
  email: boolean;
  inApp: boolean;
  certificateExpiry: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified?: boolean;

  // Member profile
  organization?: string;
  address?: string;
  bio?: string;

  // Cloudinary profile photo
  profileImage?: string;
  profileImagePublicId?: string;
  notificationPreferences: INotificationPreferences;

  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  emailVerificationAttempts?: number;

  termsAcceptedAt?: Date;
  termsVersion?: string;

  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts?: number;
  passwordResetVerified?: boolean;
  passwordChangedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
    },

    organization: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },
    profileImagePublicId: {
      type: String,
      select: false,
    },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      certificateExpiry: { type: Boolean, default: true },
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    termsAcceptedAt: {
      type: Date,
    },
    termsVersion: {
      type: String,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordResetAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordResetVerified: {
      type: Boolean,
      default: false,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", userSchema);

export default User;
