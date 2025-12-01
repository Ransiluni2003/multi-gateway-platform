import { Request, Response } from "express";
import { EventLog } from "../models/EventLog";

export async function getFraudAndRefundTrend(req: Request, res: Response) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const result = await EventLog.aggregate([
      {
        $match: {
          event: { $in: ['fraud_detected', 'refund_processed'] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$event" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.day",
          counts: { $push: { type: "$_id.type", count: "$count" } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const data = result.map((day: any) => {
      const fraud = day.counts.find((c: any) => c.type === 'fraud_detected')?.count || 0;
      const refund = day.counts.find((c: any) => c.type === 'refund_processed')?.count || 0;
      return { date: day._id, fraud, refund };
    });

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching fraud/refund data' });
  }
}
