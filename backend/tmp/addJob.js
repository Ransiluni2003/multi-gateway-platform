const { Queue } = require('bullmq');
const IORedis = require('ioredis');

(async () => {
  try {
    const connection = new IORedis('redis://redis:6379', { maxRetriesPerRequest: null });
    const q = new Queue('jobs', { connection });
    await q.add('task', { intentionalCrash: true }, { attempts: 3, backoff: { type: 'fixed', delay: 500 } });
    console.log('✅ test job added');
    process.exit(0);
  } catch (e) {
    console.error('Failed to add job:', e);
    process.exit(1);
  }
})();
