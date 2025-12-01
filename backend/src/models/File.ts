// models/File.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IFile extends Document {
  key: string;          // S3 object key
  filename: string;     // original filename
  size: number;         // bytes
  contentType?: string;
  uploadedBy?: string;  // user id / email
  gateway?: string;     // default: 's3'
  url?: string;         // optional public url (or signed)
  createdAt?: Date;
}

const fileSchema: Schema<IFile> = new Schema({
  key: { type: String, required: true },
  filename: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String },
  uploadedBy: { type: String },
  gateway: { type: String, default: "s3" },
  url: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const File = mongoose.model<IFile>("File", fileSchema);

export default File;
