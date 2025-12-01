const { Queue } = require('bullmq');
const connection = { host: 'localhost', port: 6379 };

const queue = new Queue('test-jobs', { connection });

(async () => {
  for (let i = 0; i < 500; i++) {
    await queue.add('test-job', { index: i });
    console.log(`Added job ${i}`);
  }
})();
