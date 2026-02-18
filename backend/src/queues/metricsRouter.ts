import { Router, Request, Response } from "express";
import QueueManager from "./queueManager";
import { Logger } from "winston";

export function createQueueMetricsRouter(
  queueManager: QueueManager,
  logger: Logger
): Router {
  const router = Router();

  /**
   * GET /queue/metrics - Get all queue metrics
   */
  router.get("/metrics", async (req: Request, res: Response) => {
    try {
      const metrics = await queueManager.getAllMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("Failed to fetch queue metrics:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  /**
   * GET /queue/status - Get overall queue status
   */
  router.get("/status", async (req: Request, res: Response) => {
    try {
      const status = await queueManager.getQueueStatus();
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("Failed to fetch queue status:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  /**
   * GET /queue/:name/metrics - Get specific queue metrics
   */
  router.get("/:name/metrics", async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const metrics = await queueManager.getMetrics(name);

      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: `Queue '${name}' not found`,
        });
      }

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("Failed to fetch queue metrics:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  /**
   * POST /queue/job - Enqueue a generic job
   */
  router.post("/job", async (req: Request, res: Response) => {
    try {
      const { queueName, jobName, data, options } = req.body;

      if (!queueName || !jobName || !data) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: queueName, jobName, data",
        });
      }

      const job = await queueManager.addJob(
        queueName,
        jobName,
        data,
        options
      );

      res.status(201).json({
        success: true,
        data: {
          jobId: job?.id,
          queueName,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      logger.error("Failed to enqueue job:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  return router;
}
