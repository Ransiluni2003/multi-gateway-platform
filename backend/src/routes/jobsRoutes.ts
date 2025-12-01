import express from "express";
import {  reportQueue } from "../services/notifications/queues/reportQueue"; // Import your Bull queue instance

const router = express.Router();

// GET /api/jobs/health → return job stats
router.get("/health", async (req, res) => {
  try {
    const [active, failed, completed, delayed] = await Promise.all([
       reportQueue.getActiveCount(),
       reportQueue.getFailedCount(),
       reportQueue.getCompletedCount(),
       reportQueue.getDelayedCount(),
    ]);

    res.json({ active, failed, completed, delayed });
  } catch (err) {
    console.error("❌ Error fetching job stats:", err);
    res.status(500).json({ error: "Failed to fetch job stats" });
  }
});

export default router;
