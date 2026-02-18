import mongoose from 'mongoose';

const spanSchema = new mongoose.Schema({
  spanID: String,
  operation: String,
  service: String,
  status: Number,
  startOffsetMs: Number,
  durationMs: Number,
  attributes: mongoose.Schema.Types.Mixed,
}, { _id: false });

const traceSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  traceID: { type: String, required: true, index: true },
  path: { type: String, required: true },
  method: { type: String, required: true },
  status: { type: Number },
  durationMs: { type: Number },
  ts: { type: String, required: true, index: true },
  serviceName: { type: String, index: true },
  spans: [spanSchema],
  parentTraceID: String,
  attributes: mongoose.Schema.Types.Mixed,
}, { collection: 'traces', timestamps: true });

const TraceModel = mongoose.models.Trace || mongoose.model('Trace', traceSchema);

export default TraceModel;

