// src/services/notifications/eventHandler.ts
import { Queue } from "bullmq";
import EventBus from "../../core/eventbus/redisEventBus";
import { EventLog } from "../../models/EventLog";
import { extractTraceContext, withExtractedContext, injectTraceContext } from '../../utils/traceContext';
import { trace } from '@opentelemetry/api';

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
  // Subscribe to the specific channel published by analytics
  EventBus.subscribe("report.generate", async (parsedMsg) => {
    console.log('📨 Notifications received report.generate event');
    try {
      // parsedMsg is already the clean report object from EventBus
      const start = Date.now();

      // Trace context is automatically handled by EventBus withExtractedContext wrapper
      // Execute report generation in a child span
      const processReport = async () => {
        const span = trace.getTracer('multi-gateway-tracer').startSpan('Notifications: Process Report');

        try {
          // Log received event
          const logSpan = trace.getTracer('multi-gateway-tracer').startSpan('Notifications: Log Event');
          try {
            await EventLog.create({
              event: "report.generate",
              status: "received",
              source: "reports",
              traceId: parsedMsg.traceId,
            });
            logSpan.end();
          } catch (err) {
            logSpan.recordException(err as Error);
            logSpan.end();
          }

          // Add job to BullMQ queue with trace context
          const queueSpan = trace.getTracer('multi-gateway-tracer').startSpan('Notifications: Queue Report Job');
          try {
            await reportQueue.add("generate-report", {
              ...parsedMsg,
              _traceContext: injectTraceContext(), // Propagate trace to worker
            }, { attempts: 3 });
            queueSpan.end();
          } catch (err) {
            queueSpan.recordException(err as Error);
            queueSpan.end();
            throw err;
          }

          // Log queued event
          await EventLog.create({
            event: "report.generate",
            status: "queued",
            source: "reports",
            duration: Date.now() - start,
            traceId: parsedMsg.traceId,
          });

          span.end();
        } catch (err) {
          span.recordException(err as Error);
          span.end();
          throw err;
        }
      };

      // Trace context is already active from EventBus wrapper, just execute
      await processReport();
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
