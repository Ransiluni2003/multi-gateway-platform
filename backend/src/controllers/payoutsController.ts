import { Request, Response } from "express";
import Transaction from "../models/Transaction";

export const getSellerTransactions = async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const transactions = await Transaction.find({ sellerId });

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      sellerId,
      totalAmount,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch seller payouts" });
  }
};
