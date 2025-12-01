// src/services/reports/eventHandler.ts
import { Queue } from "bullmq";
import { redisClient } from "../../config/redis";
import { EventLog } from "../../models/EventLog";

// Create BullMQ queue instance
const reportQueue = new Queue("reportQueue", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  },
});

// Async function to handle Redis pub/sub
export async function handleRedisEvents() {
  // Subscribe to the "events" channel
  const subscriber = redisClient.duplicate(); // duplicate connection for pub/sub
  await subscriber.connect();
  await subscriber.subscribe("events", async (message) => {
    try {
      const { type, payload } = JSON.parse(message);

      if (type !== "report.generate") return;

      const start = Date.now();

      // Log received event
      await EventLog.create({
        event: type,
        status: "received",
        source: "reports",
        traceId: payload.traceId,
      });

      // Add job to BullMQ queue
      await reportQueue.add("generate-report", payload, { attempts: 3 });

      // Log queued event
      await EventLog.create({
        event: type,
        status: "queued",
        source: "reports",
        duration: Date.now() - start,
        traceId: payload.traceId,
      });
    } catch (err) {
      console.error("❌ Event handler error:", err);

      // Log failure
      await EventLog.create({
        event: "report.generate",
        status: "failed",
        source: "reports",
        duration: 0,
      });
    }
  });
}

// Call it somewhere in your server startup
handleRedisEvents().catch(console.error);
