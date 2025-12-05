const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });
const TOTAL_REQUESTS = 10000;
const CONCURRENCY = 100;

async function run() {
  let inFlight = 0, completed = 0;
  let start = Date.now();
  function send() {
    if (completed >= TOTAL_REQUESTS) return;
    inFlight++;
    redis.lpush('test-queue', `job-${completed}`, () => {
      inFlight--;
      completed++;
      if (completed % 1000 === 0) console.log(`Completed: ${completed}`);
      if (completed < TOTAL_REQUESTS) send();
    });
  }
  for (let i = 0; i < CONCURRENCY; i++) send();
  const interval = setInterval(() => {
    if (completed >= TOTAL_REQUESTS && inFlight === 0) {
      console.log(`All done in ${Date.now() - start}ms`);
      redis.quit();
      clearInterval(interval);
    }
  }, 100);
}
run();
