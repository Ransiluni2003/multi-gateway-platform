// src/queues/jobsQueue.js
import { Queue, Worker, QueueScheduler } from "bullmq";
import createRedisConnection from '../../../lib/redisConnection';

const connection = createRedisConnection();

// Queue setup
export const myQueue = new Queue("jobs", { connection });

// Scheduler is required for retries and delayed jobs
export const queueScheduler = new QueueScheduler("jobs", { connection });

// Worker setup
export const worker = new Worker(
  "jobs",
  async (job) => {
    console.log(`Processing job ${job.id}...`);

    // simulate intentional crash
    if (job.data.intentionalCrash) {
      throw new Error("Simulated crash");
    }

    console.log(`Job ${job.id} done.`);
    return { ok: true };
  },
  {
    connection,
  }
);

// Retry + DLQ handling
worker.on("failed", async (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);

  if (job.attemptsMade >= job.opts.attempts) {
    const dlq = new Queue("jobs:dlq", { connection });
    await dlq.add("dlq", {
      original: job.data,
      failedAt: Date.now(),
      reason: err.message,
    });
    console.log(`🚨 Job ${job.id} moved to DLQ`);
  }
});

console.log("✅ BullMQ worker and queue setup complete.");
