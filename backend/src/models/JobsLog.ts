// src/models/JobsLog.ts
import { Schema, model, Document } from "mongoose";

export interface IJobsLog extends Document {
  jobId: string;
  name?: string;
  status: string; // 'waiting'|'active'|'completed'|'failed'|'stalled'|'retry'
  startedAt?: Date;
  finishedAt?: Date;
  durationMs?: number;
  retries?: number;
  error?: string | null;
  meta?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const jobsLogSchema = new Schema<IJobsLog>(
  {
    jobId: { type: String, index: true, required: true },
    name: { type: String, index: true },
    status: { type: String, required: true, index: true },
    startedAt: Date,
    finishedAt: Date,
    durationMs: Number,
    retries: { type: Number, default: 0 },
    error: { type: String, default: null },
    meta: Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default model<IJobsLog>("JobsLog", jobsLogSchema);
