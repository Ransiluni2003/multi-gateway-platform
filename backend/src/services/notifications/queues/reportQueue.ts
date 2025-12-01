import { Queue, Worker, Job, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import JobsLogModel from "../../../models/JobsLog";
import supabase from "../../../supabase";

dotenv.config();

// ✅ Use full Redis URL if available (more reliable)
const redisUrl =
  process.env.REDIS_URL || "redis://default:yourpassword@127.0.0.1:6379";

// ✅ Shared Redis connection for queue, worker, and events
const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // 🔥 Required for BullMQ
  enableReadyCheck: false,
});

// ✅ Queue instance
export const reportQueue = new Queue("reportQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// ✅ Worker instance
export const reportWorker = new Worker(
  "reportQueue",
  async (job: Job<{ type: "daily" | "weekly"; [key: string]: any }>) => {
    const start = Date.now();
    try {
      await JobsLogModel.findOneAndUpdate(
        { jobId: job.id },
        {
          jobId: job.id,
          name: job.name,
          status: "active",
          startedAt: new Date(),
          meta: job.data,
        },
        { upsert: true }
      );

      console.log(`🧾 Processing job: ${job.name}`);
      return { ok: true };
    } catch (err) {
      console.error("Worker job error:", err);
      throw err;
    } finally {
      const duration = Date.now() - start;
      await JobsLogModel.findOneAndUpdate(
        { jobId: job.id },
        { durationMs: duration }
      );
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// ✅ Queue events
export const reportQueueEvents = new QueueEvents("reportQueue", {
  connection: redisConnection,
});

// ✅ Event listeners
reportQueueEvents.on("completed", ({ jobId }) => {
  console.log(`✅ Job completed: ${jobId}`);
});

reportQueueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`❌ Job failed: ${jobId} - ${failedReason}`);
});

reportQueueEvents.on("error", (err) => {
  console.error("⚠️ QueueEvents error:", err);
});
