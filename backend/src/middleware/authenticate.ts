
import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

import User, { type UserRole } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

/**
 * Validate the configured JWT secret.
 */
function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    return null;
  }

  return secret;
}

/**
 * Authenticate a request using the HttpOnly membrix_token cookie.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token: unknown = req.cookies?.membrix_token;

  if (typeof token !== "string" || token.length === 0) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
    return;
  }

  const secret = getJwtSecret();

  if (!secret) {
    console.error(
      "Authentication configuration error: JWT_SECRET is missing or too short.",
    );

    res.status(500).json({
      success: false,
      message: "Authentication service is not configured correctly.",
    });
    return;
  }

  let payload: JwtPayload;

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded !== "object" || decoded === null) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    payload = decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    console.error("JWT verification error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify authentication right now.",
    });
    return;
  }

  if (typeof payload.userId !== "string" || !payload.userId) {
    res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
    return;
  }

  try {
    const user = await User.findById(payload.userId).select(
      "_id isActive role",
    );

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account not found or inactive.",
      });
      return;
    }

    req.userId = String(user._id);
    req.userRole = user.role;

    next();
  } catch (error) {
    console.error("Authentication middleware database error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify your account right now.",
    });
  }
}

/**
 * Use after authenticate() on admin-only routes.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
    return;
  }

  if (req.userRole !== "admin") {
    res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource.",
    });
    return;
  }

  next();
}
