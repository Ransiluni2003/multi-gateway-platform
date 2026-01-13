import mongoose, { Schema, Document } from "mongoose";

export type MockTransactionType = "authorize" | "capture" | "refund";
export type MockTransactionStatus = "success" | "failure" | "pending" | "refunded";

export interface IPaymentMethod {
  card_number: string;
  exp_month?: string;
  exp_year?: string;
  cvv?: string;
  type?: string;
}

export interface IMockTransaction extends Document {
  transactionId: string;
  orderId?: string;
  type: MockTransactionType;
  status: MockTransactionStatus;
  amount: number;
  currency: string;
  paymentMethod?: IPaymentMethod;
  deterministicOutcome?: string;
  metadata?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  authorizedAt?: Date;
  capturedAt?: Date;
  refundedAt?: Date;
  expiresAt?: Date;
  parentTransactionId?: string; // For captures and refunds
  createdAt: Date;
  updatedAt: Date;
}

const MockTransactionSchema = new Schema<IMockTransaction>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: ["authorize", "capture", "refund"],
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failure", "pending", "refunded"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    paymentMethod: {
      card_number: String,
      exp_month: String,
      exp_year: String,
      cvv: String,
      type: String,
    },
    deterministicOutcome: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    errorCode: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    authorizedAt: {
      type: Date,
    },
    capturedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    parentTransactionId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

MockTransactionSchema.index({ status: 1, createdAt: -1 });
MockTransactionSchema.index({ orderId: 1, type: 1 });

export default mongoose.model<IMockTransaction>(
  "MockTransaction",
  MockTransactionSchema
);
