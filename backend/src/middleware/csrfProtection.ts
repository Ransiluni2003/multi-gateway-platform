// middleware/csrfProtection.ts
/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern for CSRF protection
 */

import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import logger from "../utils/logger";

export interface CSRFRequest extends Request {
  csrfToken?: string;
}

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Verify CSRF token using Double Submit Cookie pattern
 */
export function verifyCSRFToken(
  tokenFromHeader: string | undefined,
  tokenFromCookie: string | undefined
): boolean {
  if (!tokenFromHeader || !tokenFromCookie) return false;
  
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(tokenFromHeader),
      Buffer.from(tokenFromCookie)
    );
  } catch {
    return false;
  }
}

/**
 * Middleware: Generate and set CSRF token
 * Call this on GET requests to provide token to client
 */
export const provideCSRFToken = (
  req: CSRFRequest,
  res: Response,
  next: NextFunction
) => {
  // Generate new token
  const csrfToken = generateCSRFToken();
  
  // Set as httpOnly cookie
  res.cookie("XSRF-TOKEN", csrfToken, {
    httpOnly: false, // Client needs to read this for Double Submit
    secure: process.env.NODE_ENV === "production", // HTTPS only in prod
    sameSite: "strict", // CSRF protection
    maxAge: 3600000, // 1 hour
  });
  
  // Also provide in response (for programmatic access)
  req.csrfToken = csrfToken;
  
  next();
};

/**
 * Middleware: Validate CSRF token on state-changing requests
 * Apply to POST, PUT, PATCH, DELETE routes
 */
export const validateCSRF = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Skip CSRF for safe methods (idempotent)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  
  // Extract token from header
  const tokenFromHeader =
    req.headers["x-csrf-token"] || req.headers["x-xsrf-token"];
  
  // Extract token from cookie
  const tokenFromCookie = req.cookies["XSRF-TOKEN"];
  
  // Verify tokens match
  if (!verifyCSRFToken(tokenFromHeader as string, tokenFromCookie)) {
    logger.warn("CSRF token validation failed", {
      method: req.method,
      path: req.path,
      hasHeader: !!tokenFromHeader,
      hasCookie: !!tokenFromCookie,
      ip: req.ip,
    });
    
    return res.status(403).json({
      error: "CSRF token validation failed",
      message: "Invalid or missing CSRF token",
    });
  }
  
  next();
};

/**
 * Middleware: CSRF protection with automatic token refresh
 * Combines provide + validate
 */
export const csrfProtection = (
  req: CSRFRequest,
  res: Response,
  next: NextFunction
) => {
  // For GET requests: provide token
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return provideCSRFToken(req, res, next);
  }
  
  // For state-changing requests: validate
  return validateCSRF(req, res, next);
};

/**
 * Helper: Add CSRF token to response body
 * Useful for API responses that need to include the token
 */
export const includeCSRFToken = (
  req: CSRFRequest,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json.bind(res);
  
  res.json = function (body: any) {
    if (req.csrfToken && body && typeof body === "object") {
      body.csrfToken = req.csrfToken;
    }
    return originalJson(body);
  };
  
  next();
};

/**
 * Exemption list for specific routes
 * Use sparingly - only for public APIs or webhook endpoints
 */
export const exemptFromCSRF = (exemptPaths: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if current path should be exempted
    const isExempt = exemptPaths.some((path) => {
      if (path.endsWith("*")) {
        // Wildcard matching
        const prefix = path.slice(0, -1);
        return req.path.startsWith(prefix);
      }
      return req.path === path;
    });
    
    if (isExempt) {
      logger.debug("CSRF exemption applied", { path: req.path });
      return next();
    }
    
    // Not exempted, apply CSRF protection
    return csrfProtection(req, res, next);
  };
};

/**
 * CSRF Configuration for different environments
 */
export const csrfConfig = {
  development: {
    secure: false,
    sameSite: "lax" as const,
  },
  production: {
    secure: true,
    sameSite: "strict" as const,
  },
};

/**
 * Get CSRF configuration based on environment
 */
export function getCSRFConfig() {
  const env = process.env.NODE_ENV || "development";
  return env === "production" ? csrfConfig.production : csrfConfig.development;
}
