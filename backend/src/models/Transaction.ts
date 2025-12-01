import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  sellerId?: string; // Seller or vendor (optional for general income/expense)
  userId?: string;   // Optional: customer or admin user
  type: "income" | "expense" | "payout";
  amount: number;
  method: "stripe" | "paypal" | "cash" | "bank" | "other";
  description?: string;
  date: Date;
  status: "pending" | "completed" | "failed";
}

const TransactionSchema = new Schema<ITransaction>(
  {
    sellerId: { type: String },
    userId: { type: String },
    type: {
      type: String,
      enum: ["income", "expense", "payout"],
      required: true,
    },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["stripe", "paypal", "cash", "bank", "other"],
      default: "other",
    },
    description: { type: String },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITransaction>("Transaction", TransactionSchema);
