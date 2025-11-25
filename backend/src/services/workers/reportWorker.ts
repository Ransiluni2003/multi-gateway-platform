import { Worker, Job, QueueEvents } from 'bullmq';
import createRedisConnection from '../../lib/redisConnection';
import { EventLog } from '../../models/EventLog';

// Dummy generateReport function (replace with your actual report logic)
export async function generateReport(data: any) {
  console.log('📝 Generating report with data:', data);
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return true;
}

const reportWorker = new Worker(
  'reportQueue',
  async (job: Job) => {
    const start = Date.now();

    try {
      await EventLog.create({
        event: job.name,
        status: 'active',
        source: 'worker',
        traceId: job.data.traceId,
      });

      await generateReport(job.data);

      await EventLog.create({
        event: job.name,
        status: 'completed',
        source: 'worker',
        duration: Date.now() - start,
        traceId: job.data.traceId,
      });
    } catch (err) {
      console.error('❌ Worker error:', err);
      await EventLog.create({
        event: job.name,
        status: 'failed',
        source: 'worker',
        duration: Date.now() - start,
        traceId: job.data.traceId,
      });
      throw err;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 5,
  }
);

const reportQueueEvents = new QueueEvents('reportQueue', {
  connection: createRedisConnection(),
});

reportQueueEvents.on('completed', ({ jobId }) => {
  console.log(`✅ Job completed: ${jobId}`);
});

reportQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`❌ Job failed: ${jobId} - ${failedReason}`);
});

reportQueueEvents.on('error', (err) => {
  console.error('⚠️ QueueEvents error:', err);
});

export { reportWorker, reportQueueEvents };
