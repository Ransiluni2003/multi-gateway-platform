import mongoose, { Schema, Document } from "mongoose";

export type DiscountType = "percentage" | "fixed" | "tiered" | "bogo";

export interface IDiscountConditions {
  min_quantity?: number;
  max_quantity?: number;
  buy?: number;
  get?: number;
  apply_to?: "cheapest" | "most_expensive" | "all";
  tiers?: Array<{
    min_qty: number;
    max_qty?: number;
    discount: number;
  }>;
}

export interface IBundleDiscount extends Document {
  bundleId: mongoose.Types.ObjectId;
  discountType: DiscountType;
  discountValue: number;
  conditions?: IDiscountConditions;
  priority: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}

const BundleDiscountSchema = new Schema<IBundleDiscount>(
  {
    bundleId: {
      type: Schema.Types.ObjectId,
      ref: "Bundle",
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed", "tiered", "bogo"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    conditions: {
      type: Schema.Types.Mixed,
    },
    priority: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

BundleDiscountSchema.index({ bundleId: 1, priority: -1 });
BundleDiscountSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model<IBundleDiscount>(
  "BundleDiscount",
  BundleDiscountSchema
);
