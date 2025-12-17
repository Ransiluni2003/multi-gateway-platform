// Worker entry point - loads the actual worker from compiled TypeScript
import('./dist/services/workers/worker.js').catch(err => {
  console.error('Failed to load worker:', err);
  process.exit(1);
});
