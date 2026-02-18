import mongoose, { Schema, Document } from "mongoose";

export type TransactionEventType =
  | "payment.authorized"
  | "payment.captured"
  | "payment.refunded"
  | "payment.failed"
  | "payment.expired";

export interface ITransactionEvent extends Document {
  transactionId: mongoose.Types.ObjectId;
  eventType: TransactionEventType;
  payload: Record<string, any>;
  createdAt: Date;
}

const TransactionEventSchema = new Schema<ITransactionEvent>(
  {
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "MockTransaction",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "payment.authorized",
        "payment.captured",
        "payment.refunded",
        "payment.failed",
        "payment.expired",
      ],
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TransactionEventSchema.index({ transactionId: 1, createdAt: -1 });
TransactionEventSchema.index({ eventType: 1, createdAt: -1 });

export default mongoose.model<ITransactionEvent>(
  "TransactionEvent",
  TransactionEventSchema
);
