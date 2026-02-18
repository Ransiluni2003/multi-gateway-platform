import express, { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User, { IUser } from "../models/User";
import { protect, AuthRequest } from "../middleware/authMiddleware";
import { RefreshTokenService } from "../services/refreshTokenService";
import { 
  checkBruteForce, 
  recordFailedLogin, 
  recordSuccessfulLogin,
  detectSuspiciousActivity,
  getClientIP,
  getUserAgent
} from "../middleware/bruteForceProtection";
import { provideCSRFToken, validateCSRF } from "../middleware/csrfProtection";
import logger from "../utils/logger";
import { logAuditEvent } from "../utils/audit";

const router = express.Router();

// Rate limiter for auth routes: 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { message: "Too many authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT (for backward compatibility)
const generateToken = (id: string, role: IUser['role']): string => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be defined');
  return (jwt as any).sign({ id, role }, process.env.JWT_SECRET!, { expiresIn: "15m" }); // Short-lived
};

// POST /api/auth/register
// Includes CSRF protection and rate limiting
router.post("/register", authLimiter, validateCSRF, async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = (await User.create({
      name,
      email,
      password: hashed,
      role: role || "user",
    })) as IUser;

    // Generate token pair
    const ip = getClientIP(req);
    const userAgent = getUserAgent(req);
    const tokens = await RefreshTokenService.generateTokenPair(
      user._id.toString(),
      user.role,
      ip,
      userAgent
    );

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

// POST /api/auth/login
// Includes brute-force protection and CSRF
router.post("/login", validateCSRF, checkBruteForce, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    const user = (await User.findOne({ email })) as IUser | null;
    
    // Generic error message to prevent user enumeration
    const invalidCredentialsMsg = "Invalid credentials";
    
    if (!user) {
      // Still record the attempt even if user doesn't exist
      await recordFailedLogin(req, res, () => {});
      await logAuditEvent({
        action: "LOGIN_FAILURE",
        status: "failure",
        ip,
        userAgent,
        details: { email, reason: "user_not_found" },
      });
      return res.status(400).json({ message: invalidCredentialsMsg });
    }

    // Check if account is locked
    if (user.isLocked()) {
      logger.warn("Login attempt on locked account", { email, ip });
      return res.status(429).json({ 
        message: "Account temporarily locked due to multiple failed attempts",
        retryAfter: user.lockUntil ? Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000) : 900
      });
    }

    // Verify password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await recordFailedLogin(req, res, () => {});
      await logAuditEvent({
        action: "LOGIN_FAILURE",
        status: "failure",
        userId: user._id.toString(),
        ip,
        userAgent,
        details: { email, reason: "invalid_password" },
      });
      return res.status(400).json({ message: invalidCredentialsMsg });
    }

    // Check for suspicious activity
    const suspicious = await detectSuspiciousActivity(email);
    if (suspicious.suspicious) {
      logger.warn("Suspicious login activity detected", { 
        email, 
        ip, 
        reason: suspicious.reason 
      });
      // Still allow login but log the suspicious activity
    }

    // Successful login - record it
    await recordSuccessfulLogin(email, ip, userAgent);
    await logAuditEvent({
      action: "LOGIN_SUCCESS",
      status: "success",
      userId: user._id.toString(),
      ip,
      userAgent,
      details: { email },
    });

    // Generate token pair
    const tokens = await RefreshTokenService.generateTokenPair(
      user._id.toString(),
      user.role,
      ip,
      userAgent
    );

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    logger.error("Login error", error);
    res.status(500).json({ message: (error as Error).message });
  }
});

// POST /api/auth/refresh
// Rotate refresh token to get new access token
router.post("/refresh", async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  const ip = getClientIP(req);
  const userAgent = getUserAgent(req);

  try {
    const tokens = await RefreshTokenService.rotateRefreshToken(
      refreshToken,
      ip,
      userAgent
    );

    if (!tokens) {
      // Clear invalid refresh token cookie
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    // Set new refresh token as httpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      accessToken: tokens.accessToken,
    });
  } catch (error) {
    logger.error("Token refresh error", error);
    res.status(500).json({ message: "Token refresh failed" });
  }
});

// POST /api/auth/logout
// Revoke refresh token
router.post("/logout", validateCSRF, protect, async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  
  try {
    if (refreshToken && req.user) {
      // Revoke the specific refresh token
      await req.user.revokeRefreshToken(refreshToken);
    }

    // Clear cookie
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error("Logout error", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

// POST /api/auth/logout-all
// Revoke all refresh tokens (logout from all devices)
router.post("/logout-all", validateCSRF, protect, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user) {
      await RefreshTokenService.revokeAllTokens(req.user._id.toString());
    }

    // Clear cookie
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out from all devices" });
  } catch (error) {
    logger.error("Logout all error", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

// GET /api/auth/csrf-token
// Provide CSRF token to client
router.get("/csrf-token", provideCSRFToken, (req: any, res: Response) => {
  res.json({
    csrfToken: req.csrfToken,
  });
});

export default router;
