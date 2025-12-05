// redis-worker.js
// Automated Redis queue consumer for processing jobs from the queue under load.
// Usage: node redis-worker.js

const Redis = require('ioredis');

// Update these values if your Redis host/port are different
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  // password: process.env.REDIS_PASSWORD, // Uncomment if needed
});

const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'jobs';

async function processJob(job) {
  // Simulate job processing (replace with real logic)
  console.log('Processing job:', job);
  await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate work
}

async function workerLoop() {
  while (true) {
    try {
      // BLPOP blocks until a job is available
      const result = await redis.blpop(QUEUE_NAME, 0);
      if (result && result[1]) {
        const job = result[1];
        await processJob(job);
      }
    } catch (err) {
      console.error('Worker error:', err);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Backoff on error
    }
  }
}

redis.on('connect', () => {
  console.log('Connected to Redis. Starting worker...');
  workerLoop();
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
