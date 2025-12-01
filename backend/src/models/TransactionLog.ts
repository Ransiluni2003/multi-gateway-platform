import mongoose, { Document, Schema } from "mongoose";

export interface ITransactionLog extends Document {
  provider: "stripe" | "paypal";
  eventType: string;
  status: "success" | "failed" | "pending";
  amount: number; // cents for stripe, minor unit
  currency: string;
  referenceId?: string; // paymentIntent / capture id
  orderId?: string;
  customerId?: string;
  metadata?: any;
  error?: string;
  createdAt: Date;
}

const TransactionLogSchema = new Schema<ITransactionLog>({
  provider: { type: String, required: true },
  eventType: { type: String, required: true },
  status: { type: String, enum: ["success","failed","pending"], default: "pending" },
  amount: Number,
  currency: String,
  referenceId: String,
  orderId: String,
  customerId: String,
  metadata: Schema.Types.Mixed,
  error: String,
}, { timestamps: true });

export default mongoose.model<ITransactionLog>("TransactionLog", TransactionLogSchema);
