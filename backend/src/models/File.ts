// models/File.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ACLEntry {
  userId: string;        // user id who has access
  role: "viewer" | "editor" | "admin";  // permission level
  grantedAt: Date;
  grantedBy: string;     // who granted this permission
}

export interface ShareLink {
  token: string;         // unique share token
  expiresAt: Date;       // expiry timestamp
  maxDownloads?: number; // optional: max download count
  downloadCount: number; // current download count
  createdAt: Date;
  revokedAt?: Date;      // when link was revoked (null = active)
  createdBy: string;     // who created the share link
}

export interface IFile extends Document {
  key: string;          // S3 object key
  filename: string;     // original filename
  size: number;         // bytes
  contentType?: string;
  uploadedBy: string;   // user id / email
  gateway?: string;     // default: 's3'
  url?: string;         // optional public url (or signed)
  
  // Access Control
  acl: ACLEntry[];      // per-file access control list
  shareLinks: ShareLink[]; // active and revoked share links
  
  // Retention Policy
  retentionDays?: number;    // auto-delete after X days (null = no auto-delete)
  deleteScheduledAt?: Date;  // when file will be auto-deleted
  deletedAt?: Date;          // soft delete timestamp
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;       // track downloads
}

const aclSchema = new Schema({
  userId: { type: String, required: true },
  role: { type: String, enum: ["viewer", "editor", "admin"], required: true },
  grantedAt: { type: Date, default: Date.now },
  grantedBy: { type: String, required: true },
}, { _id: false });

const shareLinkSchema = new Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  maxDownloads: { type: Number },
  downloadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date },
  createdBy: { type: String, required: true },
}, { _id: false });

const fileSchema: Schema<IFile> = new Schema({
  key: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String },
  uploadedBy: { type: String, required: true },
  gateway: { type: String, default: "s3" },
  url: { type: String },
  
  // Access Control
  acl: { type: [aclSchema], default: [] },
  shareLinks: { type: [shareLinkSchema], default: [] },
  
  // Retention Policy
  retentionDays: { type: Number },
  deleteScheduledAt: { type: Date },
  deletedAt: { type: Date },
  
  // Audit
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date },
  accessCount: { type: Number, default: 0 },
}, { timestamps: true });

// Index for retention policy cleanup
fileSchema.index({ deleteScheduledAt: 1 }, { sparse: true });
// Index for share link queries
fileSchema.index({ "shareLinks.token": 1 }, { sparse: true });
// Index for finding files by user
fileSchema.index({ uploadedBy: 1 });

const File = mongoose.model<IFile>("File", fileSchema);

export default File;
