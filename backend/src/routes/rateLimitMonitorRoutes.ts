/**
 * Rate Limit Monitoring Routes
 * Admin endpoints for monitoring rate limiting activity
 */

import express, { Request, Response } from "express";
import { protect, authorizeRoles, AuthRequest } from "../middleware/authMiddleware";
import { AuditLog } from "../models/AuditLog";
import logger from "../utils/logger";

const router = express.Router();

/**
 * GET /api/rate-limit-monitor/stats
 * Get rate limit statistics for the last 24 hours
 */
router.get(
  "/stats",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get blocked requests from audit logs
      const blockedRequests = await AuditLog.find({
        action: "rate_limit_exceeded",
        createdAt: { $gte: oneDayAgo },
      }).lean();

      // Aggregate by hour
      const hourlyBlocks: Record<string, number> = {};
      blockedRequests.forEach((log) => {
        if (log.createdAt) {
          const hour = new Date(log.createdAt).toISOString().slice(0, 13) + ":00";
          hourlyBlocks[hour] = (hourlyBlocks[hour] || 0) + 1;
        }
      });

      // Aggregate by endpoint
      const endpointBlocks: Record<string, number> = {};
      blockedRequests.forEach((log) => {
        const endpoint = (log.details?.endpoint || "unknown") as string;
        endpointBlocks[endpoint] = (endpointBlocks[endpoint] || 0) + 1;
      });

      // Aggregate by IP
      const ipBlocks: Record<string, number> = {};
      blockedRequests.forEach((log) => {
        const ip = log.ip || "unknown";
        ipBlocks[ip] = (ipBlocks[ip] || 0) + 1;
      });

      // Sort endpoints by block count
      const topEndpoints = Object.entries(endpointBlocks)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }));

      // Sort IPs by block count
      const topIPs = Object.entries(ipBlocks)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }));

      // Determine current limiter mode
      const store = (process.env.RATE_LIMIT_STORE || "memory").toLowerCase();
      const limiterMode = store === "upstash" ? "upstash" : 
                          store === "redis" ? "redis" : "memory";

      res.json({
        period: "24h",
        totalBlocked: blockedRequests.length,
        hourlyBlocks,
        topEndpoints,
        topIPs,
        limiterMode,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error("Error fetching rate limit stats", error);
      res.status(500).json({ error: "Failed to fetch rate limit statistics" });
    }
  }
);

/**
 * GET /api/rate-limit-monitor/recent
 * Get recent rate limit violations
 */
router.get(
  "/recent",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const limit = typeof req.query.limit === "string" ? 
        Math.min(parseInt(req.query.limit, 10) || 50, 200) : 50;

      const recentBlocks = await AuditLog.find({
        action: "rate_limit_exceeded",
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const formatted = recentBlocks.map((log) => ({
        timestamp: log.createdAt,
        ip: log.ip,
        endpoint: log.details?.endpoint,
        userAgent: log.userAgent,
        userId: log.userId,
      }));

      res.json({
        count: formatted.length,
        blocks: formatted,
      });
    } catch (error) {
      logger.error("Error fetching recent rate limit blocks", error);
      res.status(500).json({ error: "Failed to fetch recent blocks" });
    }
  }
);

/**
 * GET /api/rate-limit-monitor/config
 * Get current rate limiter configuration
 */
router.get(
  "/config",
  protect,
  authorizeRoles("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const store = (process.env.RATE_LIMIT_STORE || "memory").toLowerCase();
      const limiterMode = store === "upstash" ? "upstash" : 
                          store === "redis" ? "redis" : "memory";

      const config = {
        mode: limiterMode,
        redisUrl: process.env.REDIS_URL ? "configured" : "not set",
        upstashUrl: process.env.UPSTASH_REDIS_REST_URL ? "configured" : "not set",
        distributed: limiterMode !== "memory",
        recommendation: limiterMode === "memory" ? 
          "Consider using Redis or Upstash for production deployments with load balancing" : 
          "Current configuration is suitable for distributed deployments",
      };

      res.json(config);
    } catch (error) {
      logger.error("Error fetching rate limiter config", error);
      res.status(500).json({ error: "Failed to fetch configuration" });
    }
  }
);

export default router;
