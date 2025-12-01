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
