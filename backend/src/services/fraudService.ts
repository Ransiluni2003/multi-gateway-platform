import TransactionLog from "../models/TransactionLog";
import User from "../models/User";

export const evaluateFraudForUser = async (userId: string) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  const refunds = await TransactionLog.countDocuments({ customerId: userId, eventType: /refund/i, createdAt: { $gte: since } });
  const payments = await TransactionLog.countDocuments({ customerId: userId, eventType: /payment/i, createdAt: { $gte: since } });

  const refundRatio = payments === 0 ? (refunds > 0 ? 1 : 0) : refunds / payments;

  let flagged = false;
  if (refunds >= 3 || refundRatio > 0.5) flagged = true;

  if (flagged) {
    await User.findByIdAndUpdate(userId, { $set: { flagged: true, flaggedReason: "high_refund_activity" } });
    await TransactionLog.create({
      provider: "system",
      eventType: "fraud_flag",
      status: "success",
      customerId: userId,
      metadata: { refunds, payments, refundRatio },
    });
  }
};
