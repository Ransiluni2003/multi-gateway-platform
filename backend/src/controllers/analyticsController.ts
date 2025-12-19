import { EventLog } from "../models/EventLog";
import TransactionLog from "../models/TransactionLog";
// Dashboard metrics: total transactions (24h), fraud events (24h, % change), avg. refund ratio (7d)
export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    // Total Transactions (last 24h)
    const since24h = new Date(Date.now() - 24 * 3600 * 1000);
    const totalTransactions = await TransactionLog.countDocuments({ createdAt: { $gte: since24h } });

    // Fraud Events (last 24h)
    const fraudEvents24h = await EventLog.countDocuments({ event: 'fraud_detected', createdAt: { $gte: since24h } });

    // Fraud Events (previous 24h)
    const since48h = new Date(Date.now() - 48 * 3600 * 1000);
    const fraudEventsPrev24h = await EventLog.countDocuments({ event: 'fraud_detected', createdAt: { $gte: since48h, $lt: since24h } });
    let fraudChangePct = 0;
    if (fraudEventsPrev24h > 0) {
      fraudChangePct = ((fraudEvents24h - fraudEventsPrev24h) / fraudEventsPrev24h) * 100;
    } else if (fraudEvents24h > 0) {
      fraudChangePct = 100;
    }

    // Avg. Refund Ratio (past week)
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const refunds7d = await TransactionLog.countDocuments({ eventType: /refund/i, createdAt: { $gte: since7d } });
    const payments7d = await TransactionLog.countDocuments({ eventType: /payment/i, createdAt: { $gte: since7d } });
    const refundRatio = payments7d > 0 ? refunds7d / payments7d : 0;

    // Log the results for debugging
    console.log('[DashboardMetrics]', {
      totalTransactions,
      fraudEvents24h,
      fraudEventsPrev24h,
      fraudChangePct,
      refunds7d,
      payments7d,
      refundRatio,
    });

    res.json({
      totalTransactions,
      fraudEvents: fraudEvents24h,
      fraudChangePct,
      refundRatio,
    });
  } catch (error) {
    console.error('[DashboardMetrics][Error]', error);
    res.status(500).json({ error: "Failed to fetch dashboard metrics" });
  }
};
import { Request, Response } from "express";
import Transaction from "../models/Transaction";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalIncome = await Transaction.aggregate([
      { $match: { type: "income" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalExpense = await Transaction.aggregate([
      { $match: { type: "expense" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    res.json({
      income: totalIncome[0]?.total || 0,
      expense: totalExpense[0]?.total || 0,
      balance: (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

export const getChartData = async (req: Request, res: Response) => {
  try {
    const data = await Transaction.aggregate([
      {
        $group: {
          _id: { month: { $month: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
};
