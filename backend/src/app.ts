// OpenTelemetry setup (must be first import)
import "./otel-setup";
import express from "express";
import requestIdMiddleware from "./middleware/requestId";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import analyticsRoutes from "./routes/analytics";
import payoutsRoutes from "./routes/payouts";
import fraudRoutes from "./routes/fraudRoutes";

const app = express();

// Middleware
app.use(express.json());
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(requestIdMiddleware);

// Routes
app.use("/api/analytics", analyticsRoutes);
app.use("/api/payouts", payoutsRoutes);
app.use("/api/fraud", fraudRoutes);

export default app;
