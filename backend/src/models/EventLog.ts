import mongoose, { Schema, Document } from 'mongoose';

export interface IEventLog extends Document {
  event: string;
  status: string;
  source: string;
  duration?: number;
  traceId?: string;
  createdAt?: Date;
}

const EventLogSchema = new Schema<IEventLog>(
  {
    event: { type: String, required: true },
    status: { type: String, required: true },
    source: { type: String, required: true },
    duration: { type: Number },
    traceId: { type: String },
  },
  { timestamps: { createdAt: 'createdAt' } }
);

// Prevent duplicate model registration
export const EventLog = mongoose.models.EventLog || mongoose.model<IEventLog>('EventLog', EventLogSchema);
