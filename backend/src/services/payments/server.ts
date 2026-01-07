import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";
import { connectMongo } from "../../core/db/mongo";
import { publish, initEventBus } from "../../core/eventbus/redisEventBus";
import { recordSpan, withSpanTracking } from "../../utils/spanTracker";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Sentry (v10)
Sentry.init({
  dsn: process.env.SENTRY_DSN || "",
  tracesSampleRate: 1.0,
});

// Health endpoint
app.get("/api/payments/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "payments",
    time: Date.now(),
  });
});

// Payment endpoint with span tracking
app.post("/api/payments/pay", async (req: Request, res: Response, next: NextFunction) => {
  console.log('💳 Payment endpoint hit:', req.body);
  try {
    const { amount, method } = req.body;
    if (!amount || !method) {
      return res.status(400).json({ error: "Missing amount or method" });
    }

    // Record validation span
    recordSpan(req as any, "Validate payment request", "payments", 1, 200);

    const payment = {
      id: `p_${Date.now()}`,
      amount,
      method,
      status: "completed",
      timestamp: new Date().toISOString(),
    };

    // Wrap event publishing with span tracking
    try {
      console.log('🔄 About to publish payment.completed event...');
      await withSpanTracking(
        req as any,
        "Publish payment.completed event",
        "payments",
        () => publish("payment.completed", payment)
      );
      console.log('✅ Successfully published payment.completed event');
    } catch (publishErr) {
      console.error('❌ Failed to publish event:', publishErr);
      // Continue even if publishing fails
    }

    // Record response span
    recordSpan(req as any, "Format and send response", "payments", 1, 200);

    res.status(201).json(payment);
  } catch (err) {
    // Record error span
    recordSpan(req as any, "Payment processing failed", "payments", 1, 500);
    
    // Manually capture the error in Sentry
    Sentry.captureException(err);
    next(err);
  }
});

// Global fallback error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("❌ Unhandled error in payments service:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Use a service-specific port env to avoid collision with global PORT
const port = parseInt(process.env.PAYMENTS_PORT || '4001', 10);

(async () => {
  try {
    await connectMongo();
    await initEventBus();
    console.log('✅ Payments EventBus initialized');
    
    app.listen(port, () => {
      console.log(`✅ Payments service listening on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to initialize payments service:", err);
    process.exit(1);
  }
})();
