// routes/securityAdminRoutes.ts
/**
 * Security Administration Routes
 * Admin endpoints for managing security features
 */

import express, { Request, Response } from "express";
import { protect, authorizeRoles, AuthRequest } from "../middleware/authMiddleware";
import { 
  getBruteForceStats, 
  clearIPBlock, 
  unlockAccount 
} from "../middleware/bruteForceProtection";
import { RefreshTokenService } from "../services/refreshTokenService";
import User from "../models/User";
import logger from "../utils/logger";

const router = express.Router();

/**
 * GET /api/admin/security/stats
 * Get security statistics
 */
router.get(
  "/stats",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const bruteForceStats = getBruteForceStats();
      
      // Get locked accounts count
      const lockedAccounts = await User.countDocuments({
        $or: [
          { accountLocked: true },
          { lockUntil: { $gt: new Date() } },
        ],
      });

      // Get active refresh tokens count
      const usersWithTokens = await User.countDocuments({
        "refreshTokens.0": { $exists: true },
      });

      res.json({
        bruteForce: {
          blockedIPs: bruteForceStats.blockedIPs,
          totalAttempts: bruteForceStats.totalAttempts,
          recentBlocks: bruteForceStats.recentBlocks.slice(0, 10), // Top 10
        },
        accounts: {
          locked: lockedAccounts,
          withActiveSessions: usersWithTokens,
        },
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Error fetching security stats", error);
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  }
);

/**
 * POST /api/admin/security/unlock-account
 * Manually unlock a locked account
 */
router.post(
  "/unlock-account",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    const { userId, email } = req.body;

    try {
      let targetUserId = userId;

      // If email provided instead of userId, find user
      if (!targetUserId && email) {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        targetUserId = user._id.toString();
      }

      if (!targetUserId) {
        return res.status(400).json({ error: "userId or email required" });
      }

      const result = await unlockAccount(targetUserId);

      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }

      logger.info("Account unlocked by admin", {
        adminId: req.user._id,
        targetUserId,
      });

      res.json({
        message: result.message,
        userId: targetUserId,
      });
    } catch (error) {
      logger.error("Error unlocking account", error);
      res.status(500).json({ error: "Failed to unlock account" });
    }
  }
);

/**
 * POST /api/admin/security/clear-ip-block
 * Clear IP block manually
 */
router.post(
  "/clear-ip-block",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: "IP address required" });
    }

    try {
      const cleared = clearIPBlock(ip);

      if (!cleared) {
        return res.status(404).json({ error: "IP block not found" });
      }

      logger.info("IP block cleared by admin", {
        adminId: req.user._id,
        ip,
      });

      res.json({
        message: "IP block cleared successfully",
        ip,
      });
    } catch (error) {
      logger.error("Error clearing IP block", error);
      res.status(500).json({ error: "Failed to clear IP block" });
    }
  }
);

/**
 * POST /api/admin/security/revoke-user-tokens
 * Revoke all refresh tokens for a specific user
 */
router.post(
  "/revoke-user-tokens",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    const { userId, email } = req.body;

    try {
      let targetUserId = userId;

      // If email provided instead of userId, find user
      if (!targetUserId && email) {
        const user = await User.findOne({ email });
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        targetUserId = user._id.toString();
      }

      if (!targetUserId) {
        return res.status(400).json({ error: "userId or email required" });
      }

      await RefreshTokenService.revokeAllTokens(targetUserId);

      logger.info("User tokens revoked by admin", {
        adminId: req.user._id,
        targetUserId,
      });

      res.json({
        message: "All refresh tokens revoked successfully",
        userId: targetUserId,
      });
    } catch (error) {
      logger.error("Error revoking tokens", error);
      res.status(500).json({ error: "Failed to revoke tokens" });
    }
  }
);

/**
 * GET /api/admin/security/user-sessions/:userId
 * View active sessions for a user
 */
router.get(
  "/user-sessions/:userId",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    try {
      const user = await User.findById(userId).select("refreshTokens loginAttempts email");
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const now = new Date();
      const activeSessions = user.refreshTokens
        .filter((rt) => !rt.revokedAt && rt.expiresAt > now)
        .map((rt) => ({
          createdAt: rt.createdAt,
          expiresAt: rt.expiresAt,
          ipAddress: rt.ipAddress,
          userAgent: rt.userAgent,
        }));

      const recentAttempts = user.loginAttempts
        .slice(-10) // Last 10 attempts
        .map((attempt) => ({
          timestamp: attempt.timestamp,
          ipAddress: attempt.ipAddress,
          successful: attempt.successful,
        }));

      res.json({
        email: user.email,
        activeSessions,
        recentLoginAttempts: recentAttempts,
      });
    } catch (error) {
      logger.error("Error fetching user sessions", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  }
);

/**
 * POST /api/admin/security/cleanup-expired-tokens
 * Manually trigger cleanup of expired refresh tokens
 */
router.post(
  "/cleanup-expired-tokens",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const count = await RefreshTokenService.cleanupExpiredTokens();

      logger.info("Expired tokens cleaned up by admin", {
        adminId: req.user._id,
        count,
      });

      res.json({
        message: "Cleanup completed successfully",
        tokensRemoved: count,
      });
    } catch (error) {
      logger.error("Error during token cleanup", error);
      res.status(500).json({ error: "Cleanup failed" });
    }
  }
);

/**
 * GET /api/admin/security/locked-accounts
 * Get list of currently locked accounts
 */
router.get(
  "/locked-accounts",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const lockedUsers = await User.find({
        $or: [
          { accountLocked: true },
          { lockUntil: { $gt: new Date() } },
        ],
      })
        .select("email lockUntil accountLocked loginAttempts")
        .limit(50); // Limit to 50 most recent

      const accounts = lockedUsers.map((user) => ({
        userId: user._id,
        email: user.email,
        lockUntil: user.lockUntil,
        permanentlyLocked: user.accountLocked,
        failedAttempts: user.loginAttempts.filter((a) => !a.successful).length,
      }));

      res.json({
        count: accounts.length,
        accounts,
      });
    } catch (error) {
      logger.error("Error fetching locked accounts", error);
      res.status(500).json({ error: "Failed to fetch locked accounts" });
    }
  }
);

export default router;
