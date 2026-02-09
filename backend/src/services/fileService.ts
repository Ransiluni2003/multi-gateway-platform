// services/fileService.ts
/**
 * File Management Service
 * Handles ACL management, share links, and retention policies
 */

import File, { IFile, ACLEntry, ShareLink } from "../models/File";
import logger from "../utils/logger";
import crypto from "crypto";

export class FileService {
  /**
   * Grant access to a file to another user
   */
  static async grantAccess(
    fileId: string,
    userId: string,
    role: "viewer" | "editor" | "admin",
    grantedBy: string
  ): Promise<IFile> {
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    // Check if already has access
    const existingEntry = file.acl?.find((entry) => entry.userId === userId);
    
    if (existingEntry) {
      // Update role
      existingEntry.role = role;
      existingEntry.grantedBy = grantedBy;
    } else {
      // Add new ACL entry
      file.acl.push({
        userId,
        role,
        grantedAt: new Date(),
        grantedBy,
      } as ACLEntry);
    }

    await file.save();

    logger.info("File access granted", {
      fileId,
      userId,
      role,
      grantedBy,
    });

    return file;
  }

  /**
   * Revoke access to a file
   */
  static async revokeAccess(
    fileId: string,
    userId: string,
    revokedBy: string
  ): Promise<IFile> {
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    const initialLength = file.acl?.length || 0;
    file.acl = file.acl?.filter((entry) => entry.userId !== userId) || [];

    if (file.acl.length === initialLength) {
      throw new Error("User did not have access to this file");
    }

    await file.save();

    logger.info("File access revoked", {
      fileId,
      userId,
      revokedBy,
    });

    return file;
  }

  /**
   * Generate a share link for a file
   */
  static async createShareLink(
    fileId: string,
    expiryHours: number = 24,
    maxDownloads?: number,
    createdBy?: string
  ): Promise<{ file: IFile; shareToken: string }> {
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    const shareToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const shareLink: ShareLink = {
      token: shareToken,
      expiresAt,
      maxDownloads,
      downloadCount: 0,
      createdAt: new Date(),
      createdBy: createdBy || "system",
    };

    file.shareLinks.push(shareLink);
    await file.save();

    logger.info("Share link created", {
      fileId,
      token: shareToken.slice(0, 8) + "...",
      expiryHours,
      createdBy,
    });

    return { file, shareToken };
  }

  /**
   * Validate and use a share link
   */
  static async validateShareLink(
    fileId: string,
    token: string
  ): Promise<{ valid: boolean; file?: IFile; reason?: string }> {
    const file = await File.findById(fileId);
    if (!file) {
      return { valid: false, reason: "File not found" };
    }

    const shareLink = file.shareLinks?.find((link) => link.token === token);
    if (!shareLink) {
      return { valid: false, reason: "Invalid share token" };
    }

    // Check if revoked
    if (shareLink.revokedAt) {
      return { valid: false, reason: "Share link has been revoked" };
    }

    // Check expiry
    if (new Date() > shareLink.expiresAt) {
      return { valid: false, reason: "Share link has expired" };
    }

    // Check max downloads
    if (
      shareLink.maxDownloads &&
      shareLink.downloadCount >= shareLink.maxDownloads
    ) {
      return { valid: false, reason: "Download limit reached" };
    }

    return { valid: true, file };
  }

  /**
   * Increment download count for a share link
   */
  static async incrementShareLinkDownload(
    fileId: string,
    token: string
  ): Promise<void> {
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    const shareLink = file.shareLinks?.find((link) => link.token === token);
    if (!shareLink) throw new Error("Share link not found");

    shareLink.downloadCount += 1;
    await file.save();

    logger.info("Share link download recorded", {
      fileId,
      downloadCount: shareLink.downloadCount,
      maxDownloads: shareLink.maxDownloads,
    });
  }

  /**
   * Revoke a share link
   */
  static async revokeShareLink(
    fileId: string,
    token: string
  ): Promise<IFile> {
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    const shareLink = file.shareLinks?.find((link) => link.token === token);
    if (!shareLink) throw new Error("Share link not found");

    shareLink.revokedAt = new Date();
    await file.save();

    logger.info("Share link revoked", {
      fileId,
      token: token.slice(0, 8) + "...",
    });

    return file;
  }

  /**
   * Set retention policy for a file
   */
  static async setRetention(
    fileId: string,
    retentionDays: number
  ): Promise<IFile> {
    const file = await File.findById(fileId);
    if (!file) throw new Error("File not found");

    file.retentionDays = retentionDays;
    file.deleteScheduledAt = new Date(
      Date.now() + retentionDays * 24 * 60 * 60 * 1000
    );

    await file.save();

    logger.info("File retention policy set", {
      fileId,
      retentionDays,
      deleteScheduledAt: file.deleteScheduledAt,
    });

    return file;
  }

  /**
   * Process retention cleanup (call from cron job)
   * Soft-deletes files past their retention date
   */
  static async processRetention(): Promise<number> {
    const now = new Date();
    const result = await File.updateMany(
      {
        deleteScheduledAt: { $lte: now },
        deletedAt: null,
      },
      {
        $set: { deletedAt: now },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info("Retention cleanup processed", {
        deletedCount: result.modifiedCount,
      });
    }

    return result.modifiedCount || 0;
  }

  /**
   * Record file access (for audit)
   */
  static async recordAccess(fileId: string): Promise<void> {
    await File.findByIdAndUpdate(
      fileId,
      {
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() },
      },
      { new: true }
    );
  }

  /**
   * Get file with full metadata
   */
  static async getFileMetadata(fileId: string): Promise<{
    file: IFile;
    accessibleBy: string[];
    activeShareLinks: number;
    isScheduledForDeletion: boolean;
  } | null> {
    const file = await File.findById(fileId);
    if (!file) return null;

    const accessibleBy = [
      file.uploadedBy,
      ...file.acl.map((entry) => entry.userId),
    ];

    const activeShareLinks = (file.shareLinks || []).filter(
      (link) => !link.revokedAt && new Date() <= link.expiresAt
    ).length;

    return {
      file,
      accessibleBy: [...new Set(accessibleBy)],
      activeShareLinks,
      isScheduledForDeletion: !!file.deleteScheduledAt,
    };
  }
}
