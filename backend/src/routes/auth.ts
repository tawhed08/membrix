
import { OAuth2Client } from "google-auth-library";
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import multer from "multer";
import cloudinary from "../config/cloudinary";
import type { UploadApiResponse } from "cloudinary";
import User from "../models/User";
import { authenticate } from "../middleware/authenticate";

const router = Router();
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPEG, PNG, WebP and AVIF images are allowed."),
      );
    }

    callback(null, true);
  },
});

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type PublicUserInput = {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  phone?: string;
  organization?: string;
  address?: string;
  bio?: string;
  profileImage?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in .env");
  }

  return secret;
}

function createToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), {
    expiresIn: "7d",
  });
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie("membrix_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie("membrix_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

function publicUser(user: PublicUserInput) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    organization: user.organization ?? "",
    address: user.address ?? "",
    bio: user.bio ?? "",
    profileImage: user.profileImage ?? "",
    role: user.role,
    isActive: user.isActive,
  };
}

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function compareOTP(submittedOTP: string, storedHash: string): boolean {
  const submittedHash = hashOTP(submittedOTP);

  if (
    !/^[a-f0-9]{64}$/i.test(storedHash) ||
    submittedHash.length !== storedHash.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(submittedHash, "hex"),
    Buffer.from(storedHash, "hex"),
  );
}

function normalizeBangladeshPhone(phone: string): string | null {
  const cleanPhone = phone.trim().replace(/[\s()-]/g, "");

  if (!/^(?:\+?880)?01[3-9]\d{8}$/.test(cleanPhone)) {
    return null;
  }

  if (cleanPhone.startsWith("+880")) return cleanPhone;
  if (cleanPhone.startsWith("880")) return `+${cleanPhone}`;

  return `+88${cleanPhone}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP configuration is incomplete.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

/* -------------------------------------------------------------------------- */
/* Register                                                                   */
/* -------------------------------------------------------------------------- */

// POST /api/auth/register

router.post("/register", async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      confirmPassword,
      termsAccepted,
    } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      confirmPassword?: string;
      termsAccepted?: boolean;
    };

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof phone !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      !isValidEmail(email) ||
      !isValidPassword(password) ||
      typeof confirmPassword !== "string" ||
      password !== confirmPassword ||
      termsAccepted !== true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid details, a strong password, matching passwords, and accept the Terms & Conditions.",
      });
    }

    const normalizedPhone = normalizeBangladeshPhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Bangladesh mobile number.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = crypto.randomInt(100000, 1000000).toString();

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: "member",
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken: hashOTP(otp),
      emailVerificationExpires: new Date(Date.now() + 5 * 60 * 1000),
      emailVerificationAttempts: 0,
      termsAcceptedAt: new Date(),
      termsVersion: "1.0",
    });

    try {
      const transporter = createMailer();

      await transporter.sendMail({
        from: `Membrix <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Verify Your Membrix Email Address",
        text: `Your Membrix email verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;color:#222">
            <h2 style="color:#102B46">Welcome to Membrix!</h2>
            <p>Use this code to verify your email address:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:20px;background:#f3f4f6;text-align:center">
              ${otp}
            </div>
            <p>This code expires in <strong>5 minutes</strong>.</p>
            <p>If you did not create this account, please ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      await User.deleteOne({ _id: user._id });

      console.error("Registration email error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Account created. Please verify your email using the OTP sent to your inbox.",
      email: normalizedEmail,
      requiresEmailVerification: true,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account right now.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Google Authentication                                                     */
/* -------------------------------------------------------------------------- */

// POST /api/auth/google

router.post("/google", async (req: Request, res: Response) => {
  try {
    const { credential, phone, termsAccepted } = req.body as {
      credential?: string;
      phone?: string;
      termsAccepted?: boolean;
    };

    if (typeof credential !== "string" || !credential.trim()) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({
        success: false,
        message: "Google email verification failed.",
      });
    }

    const email = payload.email.trim().toLowerCase();
    const googleName = payload.name?.trim() || email.split("@")[0];

    let user = await User.findOne({ email });

    if (user) {
      if (user.isEmailVerified === false) {
        return res.status(403).json({
          success: false,
          message: "Please complete email verification first.",
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended.",
        });
      }
    }

    if (typeof phone !== "string" || termsAccepted !== true) {
      return res.status(200).json({
        success: true,
        requiresPhone: true,
        message: "Please provide your phone number and accept the terms.",
      });
    }

    const normalizedPhone = normalizeBangladeshPhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Bangladesh mobile number.",
      });
    }

    if (user) {
      let shouldSave = false;

      if (!user.phone) {
        user.phone = normalizedPhone;
        shouldSave = true;
      }

      if (!user.termsAcceptedAt) {
        user.termsAcceptedAt = new Date();
        user.termsVersion = "1.0";
        shouldSave = true;
      }

      if (shouldSave) {
        await user.save();
      }
    } else {
      user = await User.create({
        name: googleName,
        email,
        phone: normalizedPhone,
        password: await bcrypt.hash(
          crypto.randomBytes(32).toString("hex"),
          12,
        ),
        role: "member",
        isActive: true,
        isEmailVerified: true,
        termsAcceptedAt: new Date(),
        termsVersion: "1.0",
      });
    }

    const token = createToken(String(user._id));
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Google authentication successful.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google authentication error:", error);

    return res.status(401).json({
      success: false,
      message: "Google authentication failed.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Email Verification                                                         */
/* -------------------------------------------------------------------------- */

// POST /api/auth/verify-email-otp

router.post("/verify-email-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body as {
      email?: string;
      otp?: string;
    };

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !isValidEmail(email) ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and 6-digit verification code.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select(
      "+emailVerificationToken +emailVerificationExpires +emailVerificationAttempts",
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification request.",
      });
    }

    if (user.isEmailVerified !== false) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified. You can sign in.",
      });
    }

    if (
      !user.emailVerificationToken ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please register again.",
      });
    }

    const attempts = user.emailVerificationAttempts ?? 0;

    if (attempts >= 5) {
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please register again.",
      });
    }

    if (!compareOTP(otp, user.emailVerificationToken)) {
      user.emailVerificationAttempts = attempts + 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: `Incorrect verification code. ${4 - attempts} attempts remaining.`,
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationAttempts = 0;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify email right now.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Login                                                                      */
/* -------------------------------------------------------------------------- */

// POST /api/auth/login

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.isEmailVerified === false) {
      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        message: "Please verify your email before logging in.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended.",
      });
    }

    const token = createToken(String(user._id));
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login. Please try again.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Forgot Password                                                            */
/* -------------------------------------------------------------------------- */

// POST /api/auth/forgot-password

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (typeof email !== "string" || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
      isActive: true,
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a verification code will be sent.",
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.passwordResetToken = hashOTP(otp);
    user.passwordResetExpires = new Date(Date.now() + 5 * 60 * 1000);
    user.passwordResetAttempts = 0;
    user.passwordResetVerified = false;

    await user.save();

    try {
      const transporter = createMailer();

      await transporter.sendMail({
        from: `Membrix <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: "Your Membrix Password Reset Code",
        text: `Your Membrix verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;color:#222">
            <h2 style="color:#102B46">Membrix Password Reset</h2>
            <p>Your verification code is:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:20px;background:#f3f4f6;text-align:center">
              ${otp}
            </div>
            <p>This code expires in <strong>5 minutes</strong>.</p>
            <p>If you did not request this code, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetAttempts = 0;
      user.passwordResetVerified = false;

      await user.save();

      console.error("Password reset email error:", emailError);

      return res.status(500).json({
        success: false,
        message: "Unable to send verification email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists, a verification code will be sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process your request right now.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Password Reset OTP                                                         */
/* -------------------------------------------------------------------------- */

// POST /api/auth/verify-reset-otp

router.post("/verify-reset-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body as {
      email?: string;
      otp?: string;
    };

    if (
      typeof email !== "string" ||
      typeof otp !== "string" ||
      !isValidEmail(email) ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email and 6-digit verification code.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select(
      "+passwordResetToken +passwordResetExpires +passwordResetAttempts +passwordResetVerified",
    );

    if (
      !user ||
      !user.passwordResetToken ||
      !user.passwordResetExpires ||
      user.passwordResetExpires.getTime() <= Date.now() ||
      user.passwordResetVerified
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code is invalid or expired. Request a new code.",
      });
    }

    const attempts = user.passwordResetAttempts ?? 0;

    if (attempts >= 5) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetAttempts = 0;
      user.passwordResetVerified = false;

      await user.save();

      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Request a new code.",
      });
    }

    if (!compareOTP(otp, user.passwordResetToken)) {
      user.passwordResetAttempts = attempts + 1;

      if (user.passwordResetAttempts >= 5) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.passwordResetAttempts = 0;
        user.passwordResetVerified = false;
      }

      await user.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
      });
    }

    user.passwordResetVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Verification successful. You can now create a new password.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify the code right now.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Reset Password                                                             */
/* -------------------------------------------------------------------------- */

// POST /api/auth/reset-password

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, password, confirmPassword } = req.body as {
      email?: string;
      password?: string;
      confirmPassword?: string;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string" ||
      !isValidEmail(email) ||
      !isValidPassword(password) ||
      password !== confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Enter valid matching passwords. Password must be 8–128 characters and include uppercase, lowercase, number, and symbol.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    }).select(
      "+password +passwordResetToken +passwordResetExpires +passwordResetAttempts +passwordResetVerified",
    );

    if (
      !user ||
      !user.passwordResetVerified ||
      !user.passwordResetExpires ||
      user.passwordResetExpires.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please verify your email code before resetting your password.",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordChangedAt = new Date();

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetAttempts = 0;
    user.passwordResetVerified = false;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password right now.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Logout                                                                     */
/* -------------------------------------------------------------------------- */

// POST /api/auth/logout

router.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
});

/* -------------------------------------------------------------------------- */
/* Current User                                                               */
/* -------------------------------------------------------------------------- */

// GET /api/auth/me

router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.membrix_token as string | undefined;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;

    if (typeof payload.userId !== "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      clearAuthCookie(res);

      return res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      user: publicUser(user),
    });
  } catch {
    clearAuthCookie(res);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* Update Member Profile                                                      */
/* -------------------------------------------------------------------------- */

// PUT /api/auth/profile

router.put(
  "/profile",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const { name, phone, organization, address, bio } = req.body ?? {};

      if (
        typeof name !== "string" ||
        name.trim().length < 2 ||
        name.trim().length > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "Name must be between 2 and 100 characters.",
        });
      }

      if (
        typeof phone !== "string" ||
        !/^\+?[0-9\s()-]{7,20}$/.test(phone.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number.",
        });
      }

      const optionalFields = [
        {
          value: organization,
          max: 150,
          label: "Organization",
        },
        {
          value: address,
          max: 300,
          label: "Address",
        },
        {
          value: bio,
          max: 1000,
          label: "Bio",
        },
      ];

      for (const field of optionalFields) {
        if (
          typeof field.value !== "string" ||
          field.value.trim().length > field.max
        ) {
          return res.status(400).json({
            success: false,
            message: `${field.label} must be within ${field.max} characters.`,
          });
        }
      }

      const user = await User.findById(req.userId);

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      // Only update the allowed profile fields.
      // Email, role, membership, payment and account status stay unchanged.

      user.name = name.trim();
      user.phone = phone.trim().replace(/\s+/g, " ");
      user.organization = organization.trim().replace(/[\u0000-\u001F\u007F]/g, "");
      user.address = address.trim().replace(/[\u0000-\u001F\u007F]/g, "");
      user.bio = bio.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully.",
        user: publicUser(user),
      });
    } catch (error) {
      console.error("Profile update error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to update profile.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Change Member Password                                                    */
/* -------------------------------------------------------------------------- */

router.put(
  "/password",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

      if (
        typeof currentPassword !== "string" ||
        currentPassword.length > 128 ||
        typeof newPassword !== "string" ||
        typeof confirmPassword !== "string" ||
        !currentPassword ||
        !isValidPassword(newPassword) ||
        newPassword !== confirmPassword
      ) {
        res.status(400).json({
          success: false,
          message:
            "Enter your current password and matching new passwords. New passwords must be 8–128 characters and include uppercase, lowercase, number, and symbol.",
        });
        return;
      }

      const user = await User.findById(req.userId).select("+password");
      if (!user || !user.isActive) {
        res.status(404).json({
          success: false,
          message: "User account not found.",
        });
        return;
      }

      if (!(await bcrypt.compare(currentPassword, user.password))) {
        res.status(400).json({
          success: false,
          message: "Your current password is incorrect.",
        });
        return;
      }

      if (await bcrypt.compare(newPassword, user.password)) {
        res.status(400).json({
          success: false,
          message: "Choose a new password you have not used for this account.",
        });
        return;
      }

      user.password = await bcrypt.hash(newPassword, 12);
      user.passwordChangedAt = new Date();
      await user.save();

      res.status(200).json({
        success: true,
        message: "Your password was changed successfully.",
      });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to change your password right now.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Notification Preferences                                                   */
/* -------------------------------------------------------------------------- */

router.get(
  "/preferences",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const user = await User.findById(req.userId).select(
        "notificationPreferences",
      );
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User account not found.",
        });
        return;
      }

      res.status(200).json({
        success: true,
        preferences: user.notificationPreferences,
      });
    } catch (error) {
      console.error("Notification preference load error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to load notification preferences.",
      });
    }
  },
);

router.put(
  "/preferences",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
        return;
      }

      const allowedKeys = [
        "email",
        "inApp",
        "certificateExpiry",
      ] as const;
      const submitted = req.body?.preferences;

      if (
        typeof submitted !== "object" ||
        submitted === null ||
        Array.isArray(submitted) ||
        Object.keys(submitted).length !== allowedKeys.length ||
        !allowedKeys.every((key) => typeof submitted[key] === "boolean")
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid notification preferences.",
        });
        return;
      }

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User account not found.",
        });
        return;
      }

      user.notificationPreferences = {
        email: submitted.email,
        inApp: submitted.inApp,
        certificateExpiry: submitted.certificateExpiry,
      };
      await user.save();

      res.status(200).json({
        success: true,
        message: "Notification preferences saved.",
        preferences: user.notificationPreferences,
      });
    } catch (error) {
      console.error("Notification preference update error:", error);
      res.status(500).json({
        success: false,
        message: "Unable to save notification preferences.",
      });
    }
  },
);
/* -------------------------------------------------------------------------- */
/* Upload Member Profile Photo                                                */
/* -------------------------------------------------------------------------- */

// POST /api/auth/profile/photo

router.post(
  "/profile/photo",
  authenticate,
  (req, res, next) => {
    profilePhotoUpload.single("photo")(req, res, (error) => {
      if (error) {
        const message =
          error instanceof multer.MulterError &&
          error.code === "LIMIT_FILE_SIZE"
            ? "Image size must not exceed 5 MB."
            : error.message || "Invalid image upload.";

        return res.status(400).json({
          success: false,
          message,
        });
      }

      next();
    });
  },
  async (req: Request, res: Response) => {
    let uploadedPublicId = "";

    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a profile photo.",
        });
      }

      const user = await User.findById(req.userId).select(
        "+profileImagePublicId",
      );

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      const uploaded = await new Promise<UploadApiResponse>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "membrix/profile-photos",
              resource_type: "image",
              transformation: [
                {
                  width: 1200,
                  height: 1200,
                  crop: "limit",
                  quality: "auto",
                  fetch_format: "auto",
                },
              ],
            },
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }

              if (!result) {
                reject(new Error("Cloudinary returned no upload result."));
                return;
              }

              resolve(result);
            },
          );

          stream.end(req.file!.buffer);
        },
      );

      uploadedPublicId = uploaded.public_id;

      const oldPublicId = user.profileImagePublicId;

      user.profileImage = uploaded.secure_url;
      user.profileImagePublicId = uploaded.public_id;

      await user.save();

      // Delete the previous image only after the new image is saved.
      if (oldPublicId && oldPublicId !== uploaded.public_id) {
        try {
          await cloudinary.uploader.destroy(oldPublicId, {
            resource_type: "image",
          });
        } catch (deleteError) {
          console.error(
            "Previous profile photo cleanup failed:",
            deleteError,
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: "Profile photo uploaded successfully.",
        user: publicUser(user),
      });
    } catch (error) {
      console.error("Profile photo upload error:", error);

      // Clean up the new upload if the database save failed.
      if (uploadedPublicId) {
        try {
          await cloudinary.uploader.destroy(uploadedPublicId, {
            resource_type: "image",
          });
        } catch (cleanupError) {
          console.error("Uploaded image cleanup failed:", cleanupError);
        }
      }

      return res.status(500).json({
        success: false,
        message: "Unable to upload profile photo.",
      });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Remove Member Profile Photo                                                */
/* -------------------------------------------------------------------------- */

// DELETE /api/auth/profile/photo

router.delete(
  "/profile/photo",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const user = await User.findById(req.userId).select(
        "+profileImagePublicId",
      );

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          message: "User account not found.",
        });
      }

      const oldPublicId = user.profileImagePublicId;

      user.profileImage = "";
      user.profileImagePublicId = undefined;

      await user.save();

      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId, {
            resource_type: "image",
          });
        } catch (deleteError) {
          console.error(
            "Cloudinary profile photo deletion failed:",
            deleteError,
          );
        }
      }

      return res.status(200).json({
        success: true,
        message: "Profile photo removed successfully.",
        user: publicUser(user),
      });
    } catch (error) {
      console.error("Profile photo removal error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to remove profile photo.",
      });
    }
  },
);
export default router;
