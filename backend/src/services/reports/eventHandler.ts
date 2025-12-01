import { Queue } from "bullmq";
import { redisClient } from "../../config/redis";
import { EventLog } from "../../models/EventLog";

const reportQueue = new Queue("reportQueue", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
});

export async function handleRedisEvents() {
  // Duplicate client for Pub/Sub
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  console.log("✅ Redis subscriber running...");

  // Subscribe with callback: channel is second parameter
  await subscriber.subscribe("events", async (message: string, channel: string) => {
    try {
      const { type, payload } = JSON.parse(message);
      const start = Date.now();

      if (type !== "report.generate") return;

      await EventLog.create({
        event: type,
        status: "received",
        source: "reports",
        traceId: payload.traceId,
      });

      await reportQueue.add("generate-report", payload, { attempts: 3 });

      await EventLog.create({
        event: type,
        status: "queued",
        source: "reports",
        duration: Date.now() - start,
        traceId: payload.traceId,
      });
    } catch (err) {
      console.error("❌ Event handler error:", err);
      await EventLog.create({
        event: "report.generate",
        status: "failed",
        source: "reports",
        duration: 0,
      });
    }
  });
}

// Call this on server start
handleRedisEvents().catch(console.error);
