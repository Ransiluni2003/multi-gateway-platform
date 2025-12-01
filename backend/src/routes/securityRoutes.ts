// src/routes/securityRoutes.ts
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User"; // adjust path / name if different

const router = express.Router();

/**
 * GET /api/security-check
 * Returns:
 *  - jwtSecret: boolean
 *  - dbConnected: boolean
 *  - adminSeeded: boolean
 */
router.get("/security-check", async (req: Request, res: Response) => {
  try {
    // 1) JWT secret exists
    const jwtSecretExists = !!process.env.JWT_SECRET;

    // 2) DB connection status
    const dbState = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    const dbConnected = dbState === 1;

    // 3) Admin account exists
    const admin = await User.findOne({ role: "admin" }).lean();
    const adminSeeded = !!admin;

    res.json({
      jwtSecretExists,
      dbConnected,
      adminSeeded,
    });
  } catch (error) {
    res.status(500).json({ message: "Security check failed", error: (error as Error).message });
  }
});

export default router;
