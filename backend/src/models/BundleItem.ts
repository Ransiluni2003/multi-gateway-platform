import mongoose, { Schema, Document } from "mongoose";

export interface IBundleItem extends Document {
  bundleId: mongoose.Types.ObjectId;
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
  createdAt: Date;
}

const BundleItemSchema = new Schema<IBundleItem>(
  {
    bundleId: {
      type: Schema.Types.ObjectId,
      ref: "Bundle",
      required: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

BundleItemSchema.index({ bundleId: 1 });
BundleItemSchema.index({ productId: 1 });

export default mongoose.model<IBundleItem>("BundleItem", BundleItemSchema);
