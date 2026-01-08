import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

// Redis connection - only create if REDIS_URL is set
let connection: IORedis | null = null;
let dlq: Queue | null = null;

if (process.env.REDIS_URL) {
  connection = new IORedis(process.env.REDIS_URL);
  
  // Create the Dead-Letter Queue
  dlq = new Queue("dead-letter-queue", { connection });

  // Worker to process failed jobs
  new Worker(
    "dead-letter-queue",
    async (job: Job) => {
      console.log("⚠️ Retrying failed job:", job.data);

      try {
        // Retry logic: example using axios
        const { url } = job.data;
        const axios = (await import("axios")).default; // dynamic import
        const res = await axios.get(url);
        console.log("✅ Job succeeded on retry:", res.status);
        // You can remove job from queue automatically, BullMQ does this
      } catch (err: any) {
        console.error("❌ Job retry failed, keeping in DLQ:", err.message);
        // Optionally, re-add the job or schedule for later retry
        // await job.queue.add("failed-request", job.data, { delay: 60000 });
      }
    },
    { connection }
  );
} else {
  console.warn("⚠️ Redis not configured. BullMQ queue functionality disabled.");
}

export { dlq };
