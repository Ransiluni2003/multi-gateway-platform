import mongoose from 'mongoose';

const traceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  path: { type: String, required: true },
  method: { type: String, required: true },
  status: { type: Number },
  durationMs: { type: Number },
  ts: { type: String, required: true },
  serviceName: { type: String }
}, { collection: 'traces' });

const TraceModel = mongoose.models.Trace || mongoose.model('Trace', traceSchema);

export default TraceModel;
