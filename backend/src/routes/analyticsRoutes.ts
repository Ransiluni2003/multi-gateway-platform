import { Router, Request, Response } from "express";
import Transaction from "../models/Transaction"; // your Transaction model

const router = Router();

// Fraud Trendline + Refund Ratio
router.get("/fraud-trend", async (req: Request, res: Response) => {
  try {
    const data = await Transaction.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalAmount: { $sum: "$amount" },
          totalRefunds: { $sum: "$refundAmount" },
          fraudCount: { $sum: { $cond: ["$isFraud", 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate refund ratio
    const result = data.map((d) => ({
      date: d._id,
      totalAmount: d.totalAmount,
      totalRefunds: d.totalRefunds,
      refundRatio: d.totalAmount ? d.totalRefunds / d.totalAmount : 0,
      fraudCount: d.fraudCount,
    }));

    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
