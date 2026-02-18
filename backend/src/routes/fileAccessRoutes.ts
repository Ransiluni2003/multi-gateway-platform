// routes/fileAccessRoutes.ts
/**
 * File Access Control API Routes
 * Endpoints for ACL, share links, and retention management
 */

import express, { Router } from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware";
import { fileAccess, fileWrite } from "../middleware/fileAccessMiddleware";
import { FileService } from "../services/fileService";
import File from "../models/File";
import logger from "../utils/logger";

const router: Router = express.Router();

/**
 * POST /api/files/:fileId/acl
 * Grant access to a user
 * Requires: file owner or admin
 */
router.post(
  "/:fileId/acl",
  protect,
  fileAccess,
  fileWrite,
  async (req, res) => {
    try {
      const { userId, role } = req.body;

      if (!userId || !["viewer", "editor", "admin"].includes(role)) {
        return res.status(400).json({
          error: "Invalid userId or role (viewer|editor|admin)",
        });
      }

      const file = await FileService.grantAccess(
        req.params.fileId,
        userId,
        role,
        req.user._id.toString()
      );

      res.json({
        message: "Access granted successfully",
        file,
      });
    } catch (err: any) {
      logger.error("Grant access error", err);
      res.status(500).json({ error: err.message || "Failed to grant access" });
    }
  }
);

/**
 * DELETE /api/files/:fileId/acl/:userId
 * Revoke user access to a file
 * Requires: file owner or admin
 */
router.delete(
  "/:fileId/acl/:userId",
  protect,
  fileAccess,
  fileWrite,
  async (req, res) => {
    try {
      const file = await FileService.revokeAccess(
        req.params.fileId,
        req.params.userId,
        req.user._id.toString()
      );

      res.json({
        message: "Access revoked successfully",
        file,
      });
    } catch (err: any) {
      logger.error("Revoke access error", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to revoke access" });
    }
  }
);

/**
 * POST /api/files/:fileId/share
 * Create a share link for a file
 * Requires: file owner or editor
 */
router.post(
  "/:fileId/share",
  protect,
  fileAccess,
  fileWrite,
  async (req, res) => {
    try {
      const { expiryHours = 24, maxDownloads } = req.body;

      if (expiryHours < 1 || expiryHours > 720) {
        return res
          .status(400)
          .json({ error: "expiryHours must be between 1 and 720" });
      }

      const { file, shareToken } = await FileService.createShareLink(
        req.params.fileId,
        expiryHours,
        maxDownloads,
        req.user._id.toString()
      );

      res.json({
        message: "Share link created successfully",
        shareToken,
        file,
        expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
      });
    } catch (err: any) {
      logger.error("Create share link error", err);
      res.status(500).json({ error: err.message || "Failed to create share" });
    }
  }
);

/**
 * POST /api/files/:fileId/share/validate
 * Validate a share link (anonymous endpoint)
 */
router.post("/:fileId/share/validate", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Share token required" });
    }

    const validation = await FileService.validateShareLink(
      req.params.fileId,
      token
    );

    if (!validation.valid) {
      return res.status(403).json({
        error: validation.reason || "Invalid share token",
      });
    }

    // Record access
    await FileService.recordAccess(req.params.fileId);

    res.json({
      valid: true,
      message: "Share link is valid",
      file: {
        filename: validation.file?.filename,
        size: validation.file?.size,
        contentType: validation.file?.contentType,
      },
    });
  } catch (err: any) {
    logger.error("Share link validation error", err);
    res.status(500).json({ error: "Validation failed" });
  }
});

/**
 * DELETE /api/files/:fileId/share/:token
 * Revoke a specific share link
 * Requires: file owner or admin
 */
router.delete(
  "/:fileId/share/:token",
  protect,
  fileAccess,
  fileWrite,
  async (req, res) => {
    try {
      const file = await FileService.revokeShareLink(
        req.params.fileId,
        req.params.token
      );

      res.json({
        message: "Share link revoked successfully",
        file,
      });
    } catch (err: any) {
      logger.error("Revoke share link error", err);
      res.status(500).json({ error: err.message || "Failed to revoke share" });
    }
  }
);

/**
 * POST /api/files/:fileId/retention
 * Set retention policy (auto-delete)
 * Requires: file owner or admin
 */
router.post(
  "/:fileId/retention",
  protect,
  fileAccess,
  fileWrite,
  async (req, res) => {
    try {
      const { retentionDays } = req.body;

      if (!retentionDays || retentionDays < 1 || retentionDays > 3650) {
        return res
          .status(400)
          .json({ error: "retentionDays must be between 1 and 3650" });
      }

      const file = await FileService.setRetention(
        req.params.fileId,
        retentionDays
      );

      res.json({
        message: "Retention policy set successfully",
        file,
        deleteScheduledAt: file.deleteScheduledAt,
      });
    } catch (err: any) {
      logger.error("Set retention error", err);
      res.status(500).json({ error: err.message || "Failed to set retention" });
    }
  }
);

/**
 * GET /api/files/:fileId/metadata
 * Get full file metadata including ACL and share links
 * Requires: authentication + file access
 */
router.get("/:fileId/metadata", protect, fileAccess, async (req, res) => {
  try {
    const metadata = await FileService.getFileMetadata(req.params.fileId);

    if (!metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json(metadata);
  } catch (err: any) {
    logger.error("Get metadata error", err);
    res.status(500).json({ error: "Failed to get metadata" });
  }
});

/**
 * Admin-only: Run retention cleanup
 * POST /api/admin/files/retention/cleanup
 */
router.post(
  "/admin/retention/cleanup",
  protect,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const deletedCount = await FileService.processRetention();

      res.json({
        message: "Retention cleanup completed",
        deletedCount,
      });
    } catch (err: any) {
      logger.error("Retention cleanup error", err);
      res.status(500).json({ error: "Cleanup failed" });
    }
  }
);

export default router;
