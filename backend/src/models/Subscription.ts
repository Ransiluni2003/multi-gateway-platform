import mongoose, { Schema, Document } from "mongoose";

export interface ISubscription extends Document {
  userId: string;                       // Customer/user who owns the subscription
  planId: string;                        // Internal plan ID or Stripe/PayPal plan ID
  provider: "stripe" | "paypal";         // Payment provider
  providerSubscriptionId: string;        // Stripe subscription ID or PayPal subscription ID
  status: "active" | "canceled" | "past_due" | "expired";
  startDate: Date;
  currentPeriodEnd: Date;
  nextPaymentDate?: Date;                // optional
  lastPaidAt?: Date;                     // last successful payment
  amount: number;                        // subscription amount in cents (Stripe) or minor unit
  currency: string;                      // USD, LKR, etc.
  metadata?: Record<string, any>;        // Optional extra info
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: String, required: true },
    planId: { type: String, required: true },
    provider: { type: String, enum: ["stripe", "paypal"], required: true },
    providerSubscriptionId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "expired"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, required: true },
    nextPaymentDate: { type: Date },
    lastPaidAt: { type: Date },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
