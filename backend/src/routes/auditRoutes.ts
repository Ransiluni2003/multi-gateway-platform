import express, { Request, Response } from "express";
import { protect, authorizeRoles, AuthRequest } from "../middleware/authMiddleware";
import { AuditLog } from "../models/AuditLog";
import { Parser } from "json2csv";
import { logAuditEvent } from "../utils/audit";
import logger from "../utils/logger";

const router = express.Router();

// GET /api/audit-logs?page=1&limit=20&action=login&userId=123&startDate=...&endDate=...
router.get("/audit-logs", protect, authorizeRoles("admin"), async (req: AuthRequest, res: Response) => {
  try {
    // Parse pagination parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    
    const page = typeof pageParam === "string" ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = typeof limitParam === "string" ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter: any = {};
    
    // Filter by action type
    if (req.query.action && typeof req.query.action === "string") {
      filter.action = req.query.action;
    }
    
    // Filter by userId (actor)
    if (req.query.userId && typeof req.query.userId === "string") {
      filter.userId = req.query.userId;
    }
    
    // Filter by target (in details)
    if (req.query.target && typeof req.query.target === "string") {
      filter["details.target"] = req.query.target;
    }
    
    // Filter by status
    if (req.query.status && typeof req.query.status === "string") {
      filter.status = req.query.status;
    }
    
    // Date range filter with validation
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    const MAX_QUERY_WINDOW_DAYS = 90;
    
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate && typeof req.query.startDate === "string") {
        startDate = new Date(req.query.startDate);
        filter.createdAt.$gte = startDate;
      }
      if (req.query.endDate && typeof req.query.endDate === "string") {
        endDate = new Date(req.query.endDate);
        filter.createdAt.$lte = endDate;
      }
      
      // Validate date range window
      if (startDate && endDate) {
        const windowMs = endDate.getTime() - startDate.getTime();
        const maxWindowMs = MAX_QUERY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        
        if (windowMs > maxWindowMs) {
          return res.status(400).json({
            error: "Date range too large",
            message: `Query window cannot exceed ${MAX_QUERY_WINDOW_DAYS} days. Your request spans ${Math.ceil(windowMs / (24 * 60 * 60 * 1000))} days.`,
            maxDays: MAX_QUERY_WINDOW_DAYS,
          });
        }
      }
    }
    
    // PERFORMANCE: For large datasets, require date range to prevent slow queries
    const LARGE_DATASET_THRESHOLD = 10000;
    if (!startDate && !endDate) {
      // Check if dataset is large (use countDocuments with a limit)
      const estimatedCount = await AuditLog.countDocuments().limit(LARGE_DATASET_THRESHOLD + 1);
      
      if (estimatedCount > LARGE_DATASET_THRESHOLD) {
        // Dataset is large, require date range
        return res.status(400).json({
          error: "Date range required",
          message: `The audit log dataset is large (${estimatedCount}+ records). Please specify startDate and endDate query parameters to narrow your search.`,
          hint: "Example: ?startDate=2024-01-01&endDate=2024-01-31",
          maxWindowDays: MAX_QUERY_WINDOW_DAYS,
        });
      }
    }

    // Execute queries in parallel for better performance
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
        nextPage: hasNextPage ? page + 1 : null,
        previousPage: hasPreviousPage ? page - 1 : null,
      },
      filters: filter,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch audit logs" });
  }
});

// GET /api/audit-logs/export - Export audit logs to CSV
router.get("/audit-logs/export", protect, authorizeRoles("admin"), async (req: AuthRequest, res: Response) => {
  try {
    // Build same filters as main endpoint
    const filter: any = {};
    
    if (req.query.action && typeof req.query.action === "string") {
      filter.action = req.query.action;
    }
    
    if (req.query.userId && typeof req.query.userId === "string") {
      filter.userId = req.query.userId;
    }
    
    if (req.query.target && typeof req.query.target === "string") {
      filter["details.target"] = req.query.target;
    }
    
    if (req.query.status && typeof req.query.status === "string") {
      filter.status = req.query.status;
    }
    
    // Date range filter with validation
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate && typeof req.query.startDate === "string") {
        startDate = new Date(req.query.startDate);
        filter.createdAt.$gte = startDate;
      }
      if (req.query.endDate && typeof req.query.endDate === "string") {
        endDate = new Date(req.query.endDate);
        filter.createdAt.$lte = endDate;
      }
    }

    // HARDENING: Enforce max export window (14 days)
    const MAX_EXPORT_WINDOW_DAYS = 14;
    const maxWindowMs = MAX_EXPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    
    if (startDate && endDate) {
      const windowMs = endDate.getTime() - startDate.getTime();
      if (windowMs > maxWindowMs) {
        logger.warn("Export rejected: date range exceeds limit", {
          adminId: req.user?._id,
          startDate,
          endDate,
          requestedDays: Math.ceil(windowMs / (24 * 60 * 60 * 1000)),
          maxDays: MAX_EXPORT_WINDOW_DAYS,
        });
        
        return res.status(400).json({
          error: "Date range too large",
          message: `Export window cannot exceed ${MAX_EXPORT_WINDOW_DAYS} days. Your request spans ${Math.ceil(windowMs / (24 * 60 * 60 * 1000))} days.`,
          maxDays: MAX_EXPORT_WINDOW_DAYS,
        });
      }
    } else if (!startDate || !endDate) {
      // If no date range specified, default to last 7 days
      endDate = new Date();
      startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      filter.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    // Fetch logs (limit to 10,000 for export safety)
    const MAX_EXPORT_ROWS = 10000;
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .lean();

    // HARDENING: Log the export action for audit trail
    await logAuditEvent({
      action: "AUDIT_EXPORT",
      status: "success",
      userId: req.user?._id?.toString(),
      ip: req.ip || req.socket.remoteAddress || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
      details: {
        recordCount: logs.length,
        filters: {
          action: filter.action,
          userId: filter.userId,
          status: filter.status,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
        exportedAt: new Date(),
        adminEmail: req.user?.email,
      },
    });

    logger.info("Audit logs exported", {
      adminId: req.user?._id,
      recordCount: logs.length,
      dateRange: { startDate, endDate },
    });

    // Flatten logs for CSV export
    const flattenedLogs = logs.map((log) => ({
      timestamp: log.createdAt?.toISOString() || "",
      action: log.action,
      status: log.status || "",
      userId: log.userId || "",
      ip: log.ip || "",
      userAgent: log.userAgent || "",
      details: JSON.stringify(log.details || {}),
    }));

    // Convert to CSV
    const parser = new Parser({
      fields: ["timestamp", "action", "status", "userId", "ip", "userAgent", "details"],
    });
    const csv = parser.parse(flattenedLogs);

    // Set headers for file download
    const filename = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    logger.error("Audit export failed", {
      error: err?.message || err,
      adminId: req.user?._id,
    });
    
    // Log failed export attempt
    await logAuditEvent({
      action: "AUDIT_EXPORT",
      status: "failure",
      userId: req.user?._id?.toString(),
      ip: req.ip || req.socket.remoteAddress || "unknown",
      details: {
        error: err?.message || "Unknown error",
      },
    });
    
    res.status(500).json({ error: err?.message || "Failed to export audit logs" });
  }
});

// GET /api/audit-logs/actions - Get list of unique action types
router.get("/audit-logs/actions", protect, authorizeRoles("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const actions = await AuditLog.distinct("action");
    res.json({ actions: actions.sort() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch action types" });
  }
});

export default router;
