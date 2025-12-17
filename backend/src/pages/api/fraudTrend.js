// API endpoint: /api/fraudTrend
import dbConnect from '../../config/db';
import TransactionLog from '../../models/TransactionLog';

export default async function handler(req, res) {
  await dbConnect();
  // Get last 14 days
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 13);

  // Aggregate fraud (eventType: 'fraud') and refund (eventType: 'refund') per day
  const pipeline = [
    { $match: { createdAt: { $gte: start }, eventType: { $in: [/fraud/i, /refund/i, /payment/i] } } },
    { $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        eventType: 1,
        customerId: 1
      }
    },
    { $group: {
        _id: { date: "$date" },
        fraud: { $sum: { $cond: [{ $regexMatch: { input: "$eventType", regex: /fraud/i } }, 1, 0] } },
        refund: { $sum: { $cond: [{ $regexMatch: { input: "$eventType", regex: /refund/i } }, 1, 0] } },
        payment: { $sum: { $cond: [{ $regexMatch: { input: "$eventType", regex: /payment/i } }, 1, 0] } }
      }
    },
    { $sort: { "_id.date": 1 } }
  ];

  const results = await TransactionLog.aggregate(pipeline);
  // Normalize for chart
  const data = results.map(r => {
    const fraud = r.fraud || 0;
    const refund = r.refund || 0;
    const payment = r.payment || 0;
    const refundRatio = payment > 0 ? refund / payment : 0;
    return {
      date: r._id.date,
      fraudCount: fraud,
      refundRatio
    };
  });
  res.status(200).json(data);
}
