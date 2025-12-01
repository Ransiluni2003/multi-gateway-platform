// server.ts
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import * as Sentry from "@sentry/node";
import { Logtail } from "@logtail/node";
import winston from "winston";
import { LogtailTransport } from "@logtail/winston";
import client from "prom-client";
import { createClient } from "@supabase/supabase-js";
import tracesRoutes from './routes/tracesRoutes';
import fraudRoutes from "./routes/fraudRoutes";
import { traceCapture } from "./middleware/traceCapture";

// Load .env (ONLY from backend/.env)
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

// Local Imports
import connectMongo from "./config/db";
import authRoutes from "./routes/authRoutes";
import errorHandler from "./middleware/errorHandler";
import securityRoutes from "./routes/securityRoutes";
import jobsRoutes from "./routes/jobsRoutes";
import filesRoutes from "./routes/filesRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import { initRedis, redisClient } from "./config/redisClient";
import { getPaymentDetails } from "./services/paymentsService";
import axiosInstance from "./utils/axiosRetryClient";

// ==========================
// Validate Supabase Variables
// ==========================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("❌ Supabase URL or Service Role Key missing in .env");
}

// ==========================
// Supabase Client
// ==========================
export const supabase = createClient(supabaseUrl, supabaseKey);
const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || "uploads";

// ==========================
// Connect MongoDB
// ==========================
connectMongo();

// ==========================
// Logger Setup
// ==========================
const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN || "");
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console(), new LogtailTransport(logtail)],
});

// ==========================
// Express App Setup
// ==========================
const app = express();
app.use(express.json());
// Capture lightweight traces for the admin trace viewer
app.use(traceCapture);
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Rate Limiter
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { message: "Too many requests. Try again later." },
  })
);

// Metrics
client.collectDefaultMetrics();
Sentry.init({ dsn: process.env.SENTRY_DSN || "" });

// ==========================
// Trace ID Middleware
// ==========================
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).traceId = uuidv4();
  res.setHeader("X-Trace-ID", (req as any).traceId || "unknown");
  console.log(`[${(req as any).traceId}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/traces', tracesRoutes);
app.use("/api/fraud", fraudRoutes);

// ==========================
// Routes
// ==========================
app.use("/api/auth", authRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/analytics", analyticsRoutes);

// ==========================
// Health Checks
// ==========================
app.get("/api/health/services", async (req: Request, res: Response) => {
  const services = [
    { name: "payments", fn: getPaymentDetails },
    { name: "analytics", fn: async () => axiosInstance.get("http://analytics:4002/health") },
    { name: "notifications", fn: async () => axiosInstance.get("http://notifications:4003/health") },
  ];

  const results = await Promise.allSettled(services.map((s) => s.fn()));
  res.json(
    results.map((r, i) => ({
      service: services[i].name,
      status: r.status === "fulfilled" ? "healthy" : "down",
    }))
  );
});

app.get("/api/health", (req: Request, res: Response) =>
  res.json({ status: "OK", uptime: process.uptime() })
);

// Metrics endpoint
app.get("/metrics", async (req: Request, res: Response) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    console.error("Error fetching metrics:", err);
    res.status(500).send("Error fetching metrics");
  }
});

// ==========================
// Supabase Upload URL
// ==========================
app.post("/api/files/upload-url", async (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body;
    if (!filename || !contentType)
      return res.status(400).json({ error: "filename and contentType required" });

    const fileKey = `uploads/${new Date().toISOString().slice(0, 10)}/${uuidv4()}-${filename}`;
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(fileKey);

    if (error) throw error;

    logger.info("Generated Supabase signed upload URL", { fileKey });
    res.json({ uploadUrl: data.signedUrl, key: fileKey });
  } catch (err: any) {
    logger.error("Supabase upload URL failed", { error: err.message });
    Sentry.captureException(err);
    res.status(500).json({ error: "Server error generating upload URL" });
  }
});

// ==========================
// Supabase Download URL
// ==========================
app.get("/api/files/download-url", async (req: Request, res: Response) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: "file key required" });
    // Optional `expires` query param (seconds). Clamp to safe bounds (1 minute - 1 hour).
    const expiresParam = req.query.expires;
    let expiresSeconds = 60 * 15; // default 15 minutes
    if (typeof expiresParam === 'string') {
      const p = parseInt(expiresParam, 10);
      if (!isNaN(p)) expiresSeconds = p;
    }
    expiresSeconds = Math.max(60, Math.min(expiresSeconds, 60 * 60));

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(key as string, expiresSeconds);

    if (error || !data || !((data as any).signedUrl)) {
      logger.error("Supabase createSignedUrl failed", { key, expiresSeconds, error: error?.message || error });
      Sentry.captureException(error || new Error('Signed URL missing'));
      return res.status(500).json({ error: "Server error generating download URL" });
    }

    const signedUrl = (data as any).signedUrl;
    const expiresAt = Date.now() + expiresSeconds * 1000;

    // Optional verification: perform a HEAD request to the signed URL to ensure it's valid now.
    const verifySignedUrl = (process.env.VERIFY_SIGNED_URL || 'true').toLowerCase() !== 'false';
    if (verifySignedUrl) {
      try {
        const headResp = await axios.head(signedUrl, { timeout: 5000 });
        if (!(headResp.status >= 200 && headResp.status < 400)) {
          logger.error("Signed URL verification failed (non-2xx)", { key, signedUrl, status: headResp.status });
          Sentry.captureException(new Error(`Signed URL verification failed: ${headResp.status}`));
          return res.status(502).json({ error: "Signed URL verification failed" });
        }
      } catch (verErr: any) {
        // If the request fails (network error, expired URL), log and return an error so callers know the URL isn't usable.
        logger.error("Signed URL verification error", { key, error: verErr?.message || String(verErr) });
        Sentry.captureException(verErr);
        return res.status(502).json({ error: "Signed URL verification failed" });
      }
    } else {
      logger.info('Signed URL verification skipped by VERIFY_SIGNED_URL=false');
    }

    logger.info("Generated Supabase signed download URL", { key, expiresSeconds, expiresAt });
    res.json({ downloadUrl: signedUrl, expiresAt });
  } catch (err: any) {
    logger.error("Supabase download URL failed", { error: err.message });
    Sentry.captureException(err);
    res.status(500).json({ error: "Server error generating download URL" });
  }
});

// ==========================
// Serve React Frontend
// ==========================
const frontendBuildPath = path.join(__dirname, "../frontend/build");
app.use(express.static(frontendBuildPath));
// SPA fallback: serve index.html for any unmatched route
// SPA fallback: serve index.html for any unmatched route (use regex to avoid path parsing issues)
app.get(/.*/ , (req: Request, res: Response) =>
  res.sendFile(path.join(frontendBuildPath, 'index.html'))
);

// ==========================
// Error Handler
// ==========================
app.use(errorHandler);

// ==========================
// Start Server + Redis
// ==========================
(async () => {
  await initRedis();

  const PORT = parseInt(process.env.PORT || "5000", 10);
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    logger.info(`Server started on port ${PORT}`);
  });

  process.on("SIGTERM", async () => {
    console.log("Shutting down...");
    logger.info("SIGTERM received: shutting down...");

    try {
      if (redisClient) await redisClient.quit();
      console.log("Redis connection closed.");
    } catch (err) {
      console.error("Error closing Redis:", err);
    }

    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });
})();
