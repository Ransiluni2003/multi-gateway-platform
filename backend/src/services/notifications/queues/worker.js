import { Worker, QueueScheduler } from "bullmq";
import { redisClient } from "../config/redisClient.js";
import { saveFailedJob } from "../models/failedJobs.js";

const scheduler = new QueueScheduler("notifications", { connection: redisClient });

const worker = new Worker(
  "notifications",
  async (job) => {
    // actual email sending logic
  },
  {
    connection: redisClient,
    concurrency: 5,
  }
);

worker.on("failed", async (job, err) => {
  await saveFailedJob({
    id: job.id,
    name: job.name,
    data: job.data,
    reason: err.message,
    timestamp: new Date(),
  });
});

export default worker;
