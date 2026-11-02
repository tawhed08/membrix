import type { NextFunction, Request, Response } from "express";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;
const requests = new Map<string, { count: number; resetAt: number }>();
let lastCleanup = Date.now();

export function publicVerificationRateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const now = Date.now();
  if (now - lastCleanup > WINDOW_MS) {
    for (const [key, entry] of requests) {
      if (entry.resetAt <= now) requests.delete(key);
    }
    lastCleanup = now;
  }

  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_REQUESTS) {
    res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    res.status(429).json({
      success: false,
      message: "Too many verification requests. Please try again later.",
    });
    return;
  }

  current.count += 1;
  next();
}
