import express, { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { protect, AuthRequest } from "../middleware/authMiddleware";
import { logAuditEvent } from "../utils/audit";

const router = express.Router();

// Rate limiter for coupon validation: 10 requests per minute
const couponLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  message: { message: "Too many coupon validation attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/coupons/validate
router.post("/coupons/validate", couponLimiter, protect, async (req: AuthRequest, res: Response) => {
  const { code } = req.body || {};
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";

  const validCodes = new Set(["DEMO10", "SAVE10"]);
  const isValid = validCodes.has(normalized);

  await logAuditEvent({
    action: "VALIDATE_COUPON",
    status: isValid ? "success" : "failure",
    userId: req.user?._id?.toString(),
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    details: { code: normalized || "(missing)", valid: isValid },
  });

  res.json({ code: normalized, valid: isValid, discountPct: isValid ? 10 : 0 });
});

export default router;
