import mongoose from "mongoose";

const FailedJobSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  data: { type: Object, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const FailedJob = mongoose.model("FailedJob", FailedJobSchema);

// Helper function to store failed job
export const saveFailedJob = async (job: {
  id: string;
  name: string;
  data: object;
  reason: string;
}) => {
  try {
    await FailedJob.create({
      id: job.id,
      name: job.name,
      data: job.data,
      reason: job.reason,
      timestamp: new Date(),
    });
    console.log("⚠️ Failed job saved to DB:", job.name);
  } catch (err) {
    console.error("❌ Error saving failed job:", err);
  }
};
