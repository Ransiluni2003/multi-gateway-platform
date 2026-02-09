// middleware/bruteForceProtection.ts
/**
 * Brute-Force Protection Middleware
 * Implements multi-layered protection against credential stuffing and brute-force attacks
 */

import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import logger from "../utils/logger";

// In-memory store for IP-based rate limiting (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetAt: Date;
  blocked: boolean;
}

const ipRateLimits = new Map<string, RateLimitEntry>();

// Configuration
const config = {
  maxAttemptsPerIP: 10, // Max login attempts per IP per window
  windowMinutes: 15, // Rate limit window
  blockDurationMinutes: 30, // How long to block IP after max attempts
  maxAttemptsPerAccount: 5, // Max attempts per account per window
  accountLockMinutes: 15, // How long to lock account
  suspiciousThreshold: 3, // Different IPs trying same account
  cleanupInterval: 60 * 60 * 1000, // 1 hour
};

// Cleanup old rate limit entries
setInterval(() => {
  const now = new Date();
  for (const [ip, entry] of ipRateLimits.entries()) {
    if (entry.resetAt < now) {
      ipRateLimits.delete(ip);
    }
  }
}, config.cleanupInterval);

/**
 * Get client IP address (handle proxies)
 */
export function getClientIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Get user agent
 */
export function getUserAgent(req: Request): string {
  return req.headers["user-agent"] || "unknown";
}

/**
 * Check if IP is rate-limited
 */
function isIPRateLimited(ip: string): { limited: boolean; resetAt?: Date } {
  const entry = ipRateLimits.get(ip);
  if (!entry) return { limited: false };

  const now = new Date();

  // Check if rate limit window has expired
  if (entry.resetAt < now) {
    ipRateLimits.delete(ip);
    return { limited: false };
  }

  // Check if IP is blocked
  if (entry.blocked) {
    return { limited: true, resetAt: entry.resetAt };
  }

  return { limited: false };
}

/**
 * Increment IP rate limit counter
 */
function incrementIPAttempt(ip: string): void {
  const now = new Date();
  const entry = ipRateLimits.get(ip);

  if (!entry || entry.resetAt < now) {
    // Create new entry
    ipRateLimits.set(ip, {
      count: 1,
      resetAt: new Date(now.getTime() + config.windowMinutes * 60 * 1000),
      blocked: false,
    });
  } else {
    // Increment existing entry
    entry.count += 1;

    // Block if exceeded threshold
    if (entry.count >= config.maxAttemptsPerIP) {
      entry.blocked = true;
      entry.resetAt = new Date(
        now.getTime() + config.blockDurationMinutes * 60 * 1000
      );

      logger.warn("IP blocked due to excessive login attempts", {
        ip,
        attempts: entry.count,
        blockUntil: entry.resetAt,
      });
    }
  }
}

/**
 * Middleware: Check for brute-force attempts before login
 */
export const checkBruteForce = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);
  const { email } = req.body;

  // Check IP rate limit
  const { limited, resetAt } = isIPRateLimited(ip);
  if (limited) {
    logger.warn("Login blocked - IP rate limited", { ip, email, resetAt });
    return res.status(429).json({
      error: "Too many login attempts",
      message: "Your IP has been temporarily blocked due to excessive login attempts",
      retryAfter: resetAt ? Math.ceil((resetAt.getTime() - Date.now()) / 1000) : 1800,
    });
  }

  // Check if account exists and is locked
  if (email) {
    const user = await User.findOne({ email });
    if (user && user.isLocked()) {
      const lockUntil = user.lockUntil;
      const retryAfter = lockUntil
        ? Math.ceil((lockUntil.getTime() - Date.now()) / 1000)
        : 900;

      logger.warn("Login blocked - account locked", {
        email,
        ip,
        lockUntil,
      });

      // Don't reveal if account exists or not for security
      return res.status(429).json({
        error: "Too many login attempts",
        message: "This account has been temporarily locked due to multiple failed login attempts",
        retryAfter,
      });
    }
  }

  // Store IP and user agent for later use
  (req as any).clientIP = ip;
  (req as any).clientUserAgent = userAgent;

  next();
};

/**
 * Middleware: Record failed login attempt
 * Call this after authentication fails
 */
export const recordFailedLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ip = (req as any).clientIP || getClientIP(req);
  const userAgent = (req as any).clientUserAgent || getUserAgent(req);
  const { email } = req.body;

  // Increment IP attempt counter
  incrementIPAttempt(ip);

  // Update user's failed attempt record
  if (email) {
    const user = await User.findOne({ email });
    if (user) {
      await user.incrementLoginAttempts(ip, userAgent);

      logger.warn("Failed login attempt recorded", {
        email,
        ip,
        attempts: user.loginAttempts.filter((a) => !a.successful).length,
        locked: user.isLocked(),
      });
    }
  }

  next();
};

/**
 * Middleware: Record successful login
 * Call this after authentication succeeds
 */
export const recordSuccessfulLogin = async (
  email: string,
  ip: string,
  userAgent: string
): Promise<void> => {
  const user = await User.findOne({ email });
  if (user) {
    await user.resetLoginAttempts();

    // Log successful login with details
    logger.info("Successful login", {
      userId: user._id,
      email,
      ip,
      userAgent,
    });
  }
};

/**
 * Middleware: Detect suspicious patterns
 * Analyzes login attempts for anomalies
 */
export const detectSuspiciousActivity = async (
  email: string
): Promise<{ suspicious: boolean; reason?: string }> => {
  const user = await User.findOne({ email });
  if (!user) return { suspicious: false };

  const now = new Date();
  const window = new Date(now.getTime() - config.windowMinutes * 60 * 1000);

  // Get recent attempts
  const recentAttempts = user.loginAttempts.filter(
    (attempt) => attempt.timestamp > window
  );

  // Check 1: Multiple IPs trying same account
  const uniqueIPs = new Set(recentAttempts.map((a) => a.ipAddress));
  if (uniqueIPs.size >= config.suspiciousThreshold) {
    logger.warn("Suspicious activity detected - multiple IPs", {
      email,
      ipCount: uniqueIPs.size,
    });
    return {
      suspicious: true,
      reason: "Multiple IP addresses attempting login",
    };
  }

  // Check 2: Rapid-fire attempts
  const attemptTimes = recentAttempts.map((a) => a.timestamp.getTime());
  if (attemptTimes.length >= 3) {
    const intervals = [];
    for (let i = 1; i < attemptTimes.length; i++) {
      intervals.push(attemptTimes[i] - attemptTimes[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // If average time between attempts is < 2 seconds, likely automated
    if (avgInterval < 2000) {
      logger.warn("Suspicious activity detected - rapid attempts", {
        email,
        avgInterval,
      });
      return {
        suspicious: true,
        reason: "Automated rapid-fire login attempts detected",
      };
    }
  }

  return { suspicious: false };
};

/**
 * Admin endpoint: Unlock account manually
 */
export const unlockAccount = async (
  userId: string
): Promise<{ success: boolean; message: string }> => {
  const user = await User.findById(userId);
  if (!user) {
    return { success: false, message: "User not found" };
  }

  user.lockUntil = undefined;
  user.accountLocked = false;
  user.loginAttempts = [];
  await user.save();

  logger.info("Account manually unlocked", { userId, email: user.email });

  return { success: true, message: "Account unlocked successfully" };
};

/**
 * Get brute-force statistics for monitoring
 */
export const getBruteForceStats = (): {
  blockedIPs: number;
  totalAttempts: number;
  recentBlocks: Array<{ ip: string; resetAt: Date }>;
} => {
  const now = new Date();
  const blocked: Array<{ ip: string; resetAt: Date }> = [];
  let total = 0;

  for (const [ip, entry] of ipRateLimits.entries()) {
    total += entry.count;
    if (entry.blocked && entry.resetAt > now) {
      blocked.push({ ip, resetAt: entry.resetAt });
    }
  }

  return {
    blockedIPs: blocked.length,
    totalAttempts: total,
    recentBlocks: blocked.sort((a, b) => b.resetAt.getTime() - a.resetAt.getTime()),
  };
};

/**
 * Clear IP block manually (admin action)
 */
export const clearIPBlock = (ip: string): boolean => {
  const entry = ipRateLimits.get(ip);
  if (entry) {
    ipRateLimits.delete(ip);
    logger.info("IP block cleared manually", { ip });
    return true;
  }
  return false;
};
