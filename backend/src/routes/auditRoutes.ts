import express, { Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import { AuditLog } from "../models/AuditLog";

const router = express.Router();

// GET /api/audit-logs?page=1&limit=20
router.get("/audit-logs", protect, async (req: Request, res: Response) => {
  try {
    // Parse pagination parameters
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    
    const page = typeof pageParam === "string" ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = typeof limitParam === "string" ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;
    const skip = (page - 1) * limit;

    // Execute queries in parallel for better performance
    const [logs, total] = await Promise.all([
      AuditLog.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments({})
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
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch audit logs" });
  }
});

export default router;
