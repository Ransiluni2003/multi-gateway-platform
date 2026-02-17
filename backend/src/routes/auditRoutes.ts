import express, { Request, Response } from "express";
import { protect, authorizeRoles, AuthRequest } from "../middleware/authMiddleware";
import { AuditLog } from "../models/AuditLog";
import { Parser } from "json2csv";

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
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate && typeof req.query.startDate === "string") {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate && typeof req.query.endDate === "string") {
        filter.createdAt.$lte = new Date(req.query.endDate);
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
    
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate && typeof req.query.startDate === "string") {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate && typeof req.query.endDate === "string") {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // Fetch logs (limit to 10,000 for export safety)
    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

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
