import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  status?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    status: { type: String, default: "success" },
    userId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: "createdAt" } }
);

// PERFORMANCE: Compound indexes for efficient audit log queries
// Primary index: date range queries with optional filters (most common pattern)
AuditLogSchema.index({ createdAt: -1, action: 1, userId: 1, status: 1 });

// Date-only index: for queries without specific filters
AuditLogSchema.index({ createdAt: -1 });

// User-centric index: for user-specific audit trails
AuditLogSchema.index({ userId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
