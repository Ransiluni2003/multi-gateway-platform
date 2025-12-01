import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import * as Sentry from "@sentry/node";
import { connectMongo } from "../../core/db/mongo";
import { publish } from "../../core/eventbus/redisEventBus";

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

// Payment endpoint
app.post("/api/payments/pay", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, method } = req.body;
    if (!amount || !method) {
      return res.status(400).json({ error: "Missing amount or method" });
    }

    const payment = {
      id: `p_${Date.now()}`,
      amount,
      method,
      status: "completed",
      timestamp: new Date().toISOString(),
    };

    await publish("payment.completed", payment);

    res.status(201).json(payment);
  } catch (err) {
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

const port = process.env.PORT || 4001;

connectMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Payments service listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err);
  });
