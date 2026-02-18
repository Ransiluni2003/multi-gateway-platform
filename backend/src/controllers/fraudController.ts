import { Request, Response } from "express";
import { EventLog } from "../models/EventLog";

export async function getFraudAndRefundTrend(req: Request, res: Response) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    // First, get all matching documents
    const allDocs = await EventLog.find({
      event: { $in: ['fraud_detected', 'refund_processed'] }
    }).lean();

    console.log('Total docs found:', allDocs.length);
    console.log('Sample doc:', allDocs[0]);

    // Process and group them
    const dayMap: { [key: string]: { fraud: number; refund: number } } = {};

    allDocs.forEach((doc: any) => {
      let createdDate: Date;
      
      // Handle both string and Date formats
      if (typeof doc.createdAt === 'string') {
        createdDate = new Date(doc.createdAt);
      } else if (doc.createdAt instanceof Date) {
        createdDate = doc.createdAt;
      } else {
        return; // Skip invalid dates
      }

      if (createdDate < thirtyDaysAgo) return;

      const dateStr = createdDate.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { fraud: 0, refund: 0 };
      }

      if (doc.event === 'fraud_detected') {
        dayMap[dateStr].fraud += 1;
      } else if (doc.event === 'refund_processed') {
        dayMap[dateStr].refund += 1;
      }
    });

    const data = Object.entries(dayMap)
      .map(([date, counts]) => {
        const totalTransactions = counts.fraud + counts.refund || 1; // Avoid division by zero
        const refundRatio = counts.refund / totalTransactions;
        
        return {
          date,
          fraudCount: counts.fraud,
          refundRatio: refundRatio,
          refundCount: counts.refund,
          totalTransactions: totalTransactions
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('Final data:', data);
    res.json(data);
  } catch (error) {
    console.error('Fraud trend error:', error);
    res.status(500).json({ message: 'Error fetching fraud/refund data' });
  }
}
