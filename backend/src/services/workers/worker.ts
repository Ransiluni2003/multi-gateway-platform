import { Queue, Worker } from 'bullmq';
import createRedisConnection from '../../lib/redisConnection';

// Redis connection (shared factory)
const connection = createRedisConnection();

// Main queue
const myQueue = new Queue('my-queue', { connection });

// Worker to process jobs
const myWorker = new Worker(
  'my-queue',
  async job => {
    console.log(`Processing job ${job.id} with data:`, job.data);

    // Example job logic
    if (Math.random() < 0.3) { // simulate random failure
      throw new Error('Simulated job failure');
    }

    return `Job ${job.id} processed successfully`;
  },
  {
    connection,
    // Optionally configure concurrency
    concurrency: 5,
  }
);

// Dead Letter Queue (DLQ) for failed jobs
const dlq = new Queue('my-queue-dlq', { connection });

// Move failed jobs to DLQ after retries
myWorker.on('failed', async (job, err) => {
  if (!job) {
    console.error("Failed event triggered with no job");
    return;
  }

  console.error(`Job ${job.id} failed: ${err.message}`);

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await dlq.add(`dlq-${job.id}`, {
      original: job.data,
      error: err.message
    });
    console.log(`Job ${job.id} moved to DLQ`);
  }
});


// Optional: Log completed jobs
myWorker.on('completed', job => {
  console.log(`Job ${job.id} completed`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await myWorker.close();
  await myQueue.close();
  await dlq.close();
  process.exit(0);
});
