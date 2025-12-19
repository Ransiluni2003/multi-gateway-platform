// API endpoint: /api/analytics/dashboard-metrics
import connectMongo from '../../config/db';
import TransactionLog from '../../models/TransactionLog';

export default async function handler(req, res) {
  await connectMongo();
  // Calculate metrics for last 24 hours
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const totalTransactions = await TransactionLog.countDocuments({ createdAt: { $gte: since } });
  const fraudEvents = await TransactionLog.countDocuments({ createdAt: { $gte: since }, eventType: { $regex: /fraud/i } });
  const refundEvents = await TransactionLog.countDocuments({ createdAt: { $gte: since }, eventType: { $regex: /refund/i } });

  // Calculate refund ratio for past week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const payments = await TransactionLog.countDocuments({ createdAt: { $gte: weekAgo }, eventType: { $regex: /payment/i } });
  const refunds = await TransactionLog.countDocuments({ createdAt: { $gte: weekAgo }, eventType: { $regex: /refund/i } });
  const refundRatio = payments > 0 ? refunds / payments : 0;

  // Calculate fraud change percent (compare today vs yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2);
  const todayFraud = await TransactionLog.countDocuments({ createdAt: { $gte: since }, eventType: { $regex: /fraud/i } });
  const yesterdayFraud = await TransactionLog.countDocuments({ createdAt: { $gte: yesterday, $lt: since }, eventType: { $regex: /fraud/i } });
  const fraudChangePct = yesterdayFraud > 0 ? ((todayFraud - yesterdayFraud) / yesterdayFraud) * 100 : 0;

  res.status(200).json({
    totalTransactions,
    fraudEvents,
    fraudChangePct,
    refundRatio,
  });
}
