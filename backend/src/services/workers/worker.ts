import { Queue, Worker } from 'bullmq';
import createRedisConnection from '../../lib/redisConnection';
import client from 'prom-client';
import http from 'http';

// Redis connection (shared factory)
const connection = createRedisConnection();

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const jobProcessingTime = new client.Histogram({
  name: 'worker_job_processing_seconds',
  help: 'Job processing time in seconds',
  registers: [register],
  buckets: [0.05, 0.1, 0.5, 1, 2, 5]
});
const jobFailures = new client.Counter({ name: 'worker_job_failures_total', help: 'Total failed jobs', registers: [register] });
const jobDlq = new client.Counter({ name: 'worker_job_dlq_total', help: 'Jobs moved to DLQ', registers: [register] });

// Expose a simple HTTP server for Prometheus scraping
const metricsPort = Number(process.env.WORKER_METRICS_PORT || 9100);
http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
    return;
  }
  res.statusCode = 404;
  res.end();
}).listen(metricsPort, () => {
  console.log(`Worker metrics server listening on http://0.0.0.0:${metricsPort}/metrics`);
});

// Main queue
const myQueue = new Queue('my-queue', { connection });

// Worker to process jobs
const myWorker = new Worker(
  'my-queue',
  async job => {
    console.log(`Processing job ${job.id} with data:`, job.data);
    const start = Date.now();

    // Example job logic
    if (Math.random() < 0.3) { // simulate random failure
      throw new Error('Simulated job failure');
    }

    const result = `Job ${job.id} processed successfully`;
    jobProcessingTime.observe((Date.now() - start) / 1000);
    return result;
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
  jobFailures.inc();

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await dlq.add(`dlq-${job.id}`, {
      original: job.data,
      error: err.message
    });
    console.log(`Job ${job.id} moved to DLQ`);
    jobDlq.inc();
    // Also append to local DLQ file for quick inspection inside container
    try {
      const fs = require('fs');
      const dlqDir = '/app/dlq';
      if (!fs.existsSync(dlqDir)) fs.mkdirSync(dlqDir, { recursive: true });
      const line = JSON.stringify({ timestamp: new Date().toISOString(), jobId: job?.id, data: job?.data, error: err?.message || String(err) }) + "\n";
      fs.appendFileSync(dlqDir + '/worker-dlq.jsonl', line, { encoding: 'utf8' });
    } catch (e) {
      console.error('Failed to write worker DLQ file:', e?.message || String(e));
    }
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
