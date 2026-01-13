import mongoose, { Schema, Document } from "mongoose";

export interface IBundle extends Document {
  name: string;
  description?: string;
  status: "active" | "inactive" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const BundleSchema = new Schema<IBundle>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

BundleSchema.index({ name: 1 });
BundleSchema.index({ status: 1 });

export default mongoose.model<IBundle>("Bundle", BundleSchema);
