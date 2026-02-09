import express, { Request, Response } from "express";
import { protect } from "../middleware/authMiddleware";
import { AuditLog } from "../models/AuditLog";

const router = express.Router();

// GET /api/audit-logs?limit=20
router.get("/audit-logs", protect, async (req: Request, res: Response) => {
  try {
    const limitParam = req.query.limit;
    const limit = typeof limitParam === "string" ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;

    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to fetch audit logs" });
  }
});

export default router;
