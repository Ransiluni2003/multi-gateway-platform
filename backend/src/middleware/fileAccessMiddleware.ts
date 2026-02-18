// middleware/fileAccessMiddleware.ts
/**
 * File Access Control Middleware
 * Enforces role-based and ACL-based file access policies
 */

import { Request, Response, NextFunction } from "express";
import File, { IFile } from "../models/File";
import logger from "../utils/logger";
import { AuthRequest } from "./authMiddleware";

export interface FileRequest extends AuthRequest {
  file?: IFile;
}

/**
 * Check if user has access to a file based on:
 * 1. Owner (uploadedBy)
 * 2. Role-based: admin users bypass ACL
 * 3. ACL entry
 */
export const fileAccess = async (
  req: FileRequest,
  res: Response,
  next: NextFunction
) => {
  const fileId = req.params.fileId || req.query.fileId;
  
  if (!fileId) {
    return res.status(400).json({ error: "File ID required" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const file = await File.findById(fileId);
    
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if file is deleted
    if (file.deletedAt) {
      return res.status(404).json({ error: "File has been deleted" });
    }

    // Admin bypass
    if (req.user.role === "admin") {
      req.file = file;
      return next();
    }

    // Owner always has access
    if (file.uploadedBy === req.user._id?.toString()) {
      req.file = file;
      return next();
    }

    // Check ACL
    const aclEntry = file.acl?.find(
      (entry) => entry.userId === req.user._id?.toString()
    );

    if (!aclEntry) {
      logger.warn("File access denied", {
        userId: req.user._id,
        fileId,
        reason: "No ACL entry",
      });
      return res.status(403).json({ error: "Access denied to this file" });
    }

    req.file = file;
    next();
  } catch (err) {
    logger.error("File access check error", err);
    res.status(500).json({ error: "Access check failed" });
  }
};

/**
 * Check if user can perform an action (edit/share) on a file
 * Requires: owner or "editor"/"admin" ACL role
 */
export const fileWrite = (
  req: FileRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.file) {
    return res.status(400).json({ error: "File context required" });
  }

  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Owner can always write
  if (req.file.uploadedBy === req.user._id?.toString()) {
    return next();
  }

  // Admin can write
  if (req.user.role === "admin") {
    return next();
  }

  // Check ACL role
  const aclEntry = req.file.acl?.find(
    (entry) => entry.userId === req.user._id?.toString()
  );

  if (!aclEntry || !["editor", "admin"].includes(aclEntry.role)) {
    logger.warn("File write denied", {
      userId: req.user._id,
      fileId: req.file._id,
      aclRole: aclEntry?.role,
    });
    return res.status(403).json({ error: "Edit permission required" });
  }

  next();
};
