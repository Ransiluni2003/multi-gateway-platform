import mongoose from "mongoose";

const eventLogSchema = new mongoose.Schema({
  event: { type: String, required: true },
  status: { type: String, required: true },
  source: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  error: { type: String },
});

const EventsLog = mongoose.models.EventsLog || mongoose.model("EventsLog", eventLogSchema);

export const logEvent = async (entry: any) => {
  try {
    await EventsLog.create(entry);
  } catch (err: any) {
    console.error("❌ Failed to log event:", err.message);
  }
};
