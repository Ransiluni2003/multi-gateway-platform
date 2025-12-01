// src/scripts/testCrash.js
import { myQueue } from "../queues/jobsQueue.js";

(async () => {
  console.log("🚀 Adding crash simulation job...");

  await myQueue.add(
    "task",
    { intentionalCrash: true },
    {
      attempts: 3, // retry 3 times
      backoff: { type: "fixed", delay: 500 },
      removeOnComplete: true,
    }
  );

  console.log("✅ Job added. Watch worker logs for retries and DLQ move.");
})();
