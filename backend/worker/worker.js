// backend/worker/worker.js

import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Redis Cluster connection
const clusterNodes = [
  { host: 'redis-cluster-node-1', port: 6379 },
  { host: 'redis-cluster-node-2', port: 6379 },
  { host: 'redis-cluster-node-3', port: 6379 },
  { host: 'redis-cluster-node-4', port: 6379 },
  { host: 'redis-cluster-node-5', port: 6379 },
  { host: 'redis-cluster-node-6', port: 6379 }
];
const connection = new IORedis.Cluster(clusterNodes, {
  redisOptions: {
    maxRetriesPerRequest: null
  }
});

// Create a worker for a queue called "jobs"
const worker = new Worker(
  'jobs',
  async (job) => {
    // Calculate queue latency (now - timestamp when job was created)
    const now = Date.now();
    const created = job.timestamp || now;
    const latencyMs = now - created;
    // Retry count
    const attempts = job.attemptsMade || 0;
    // Message delay (if any)
    const delay = job.opts && job.opts.delay ? job.opts.delay : 0;
    console.log(JSON.stringify({
      level: 'info',
      msg: 'Processing job',
      jobId: job.id,
      data: job.data,
      latencyMs,
      attempts,
      delay
    }));
    // Example: simulate some processing
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(JSON.stringify({ level: 'info', msg: 'Job completed', jobId: job.id }));
    return { result: 'success' };
  },
  { connection }
);

// Event handlers
worker.on('completed', (job) => {
  console.log(JSON.stringify({ level: 'info', msg: 'Job completed event', jobId: job.id }));
});

worker.on('failed', (job, err) => {
  console.error(JSON.stringify({ level: 'error', msg: 'Job failed', jobId: job?.id, error: err?.message || String(err) }));
  // Optionally, write to a simple DLQ file inside the container for inspection
  try {
    const fs = require('fs');
    const dlqDir = '/app/dlq';
    if (!fs.existsSync(dlqDir)) fs.mkdirSync(dlqDir, { recursive: true });
    const line = JSON.stringify({ timestamp: new Date().toISOString(), jobId: job?.id, data: job?.data, error: err?.message || String(err) }) + "\n";
    fs.appendFileSync(dlqDir + '/worker-dlq.jsonl', line, { encoding: 'utf8' });
  } catch (e) {
    console.error('Failed to write worker DLQ file:', e?.message || String(e));
  }
});

worker.on('error', (err) => {
  console.error(JSON.stringify({ level: 'error', msg: 'Worker error', error: err?.message || String(err) }));
});

console.log(JSON.stringify({ level: 'info', msg: 'Worker is running...' }));
