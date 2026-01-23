// API endpoint: /api/fraud/trend
// Returns 14 days of fraud trend and refund ratio data with enhanced metrics
import dbConnect from '../../config/db';
import TransactionLog from '../../models/TransactionLog';

export default async function handler(req, res) {
  try {
    await dbConnect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - 13); // 14 days of data

    // Aggregate fraud, refund, and payment transactions per day
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lt: new Date(today.getTime() + 86400000) },
          eventType: { $in: [/fraud/i, /refund/i, /payment/i] }
        }
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          eventType: 1,
          amount: { $ifNull: ['$amount', 0] }
        }
      },
      {
        $group: {
          _id: { date: "$date" },
          fraudCount: { $sum: { $cond: [{ $regexMatch: { input: "$eventType", regex: /fraud/i } }, 1, 0] } },
          refundCount: { $sum: { $cond: [{ $regexMatch: { input: "$eventType", regex: /refund/i } }, 1, 0] } },
          paymentCount: { $sum: { $cond: [{ $regexMatch: { input: "$eventType", regex: /payment/i } }, 1, 0] } },
          totalAmount: {
            $sum: {
              $cond: [
                { $regexMatch: { input: "$eventType", regex: /payment/i } },
                "$amount",
                0
              ]
            }
          }
        }
      },
      { $sort: { "_id.date": 1 } }
    ];

    const results = await TransactionLog.aggregate(pipeline);

    // Transform results with enhanced metrics
    const data = results.map((r) => {
      const fraudCount = r.fraudCount || 0;
      const refundCount = r.refundCount || 0;
      const paymentCount = r.paymentCount || 0;
      const totalAmount = r.totalAmount || 0;

      // Fraud rate: fraud incidents / total transactions
      const fraudRate = paymentCount > 0 ? (fraudCount / paymentCount) * 100 : 0;

      // Refund ratio: refunds / total payments
      const refundRatio = paymentCount > 0 ? refundCount / paymentCount : 0;

      return {
        date: r._id.date,
        fraudCount, // Number of fraud incidents
        fraudRate, // Percentage of transactions flagged as fraud
        refundCount,
        paymentCount,
        refundRatio, // Ratio of refunds to payments (0-1 scale)
        refundPercentage: refundRatio * 100, // Percentage format (0-100)
        totalAmount // Total transaction amount for the day
      };
    });

    // Fill gaps for missing days
    const filledData = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);

      const existingData = data.find((item) => item.date === dateStr);
      if (existingData) {
        filledData.push(existingData);
      } else {
        filledData.push({
          date: dateStr,
          fraudCount: 0,
          fraudRate: 0,
          refundCount: 0,
          paymentCount: 0,
          refundRatio: 0,
          refundPercentage: 0,
          totalAmount: 0
        });
      }
    }

    res.status(200).json(filledData);
  } catch (error) {
    console.error('Error fetching fraud trend:', error);
    res.status(500).json({ error: 'Failed to fetch fraud trend data' });
  }
}
