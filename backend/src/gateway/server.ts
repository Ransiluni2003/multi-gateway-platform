import express, { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import CircuitBreaker from "opossum";

// ✅ Use require instead of import for JWT
const jwt = require("jsonwebtoken");

interface AuthRequest extends Request {
  user?: any; // you can replace `any` with your actual payload type
}

const app = express();
app.use(express.json());

// ------------------------
// Rate limiting per IP
// ------------------------
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use("/api", limiter);

// ------------------------
// JWT auth middleware
// ------------------------
app.use((req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.GATEWAY_SECRET || "secret";

  try {
    const payload = jwt.verify(token, secret); // ✅ Works perfectly with require
    req.user = payload;
    next();
  } catch (err) {
    console.error("JWT verify error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
});

// ------------------------
// Proxy routes
// ------------------------
app.use(
  "/api/v1/payments",
  createProxyMiddleware({
    target: "http://localhost:4001",
    changeOrigin: true,
    pathRewrite: { "^/api/v1/payments": "" },
  })
);

app.use(
  "/api/v1/analytics",
  createProxyMiddleware({
    target: "http://localhost:4002",
    changeOrigin: true,
    pathRewrite: { "^/api/v1/analytics": "" },
  })
);

app.use(
  "/api/v1/notifications",
  createProxyMiddleware({
    target: "http://localhost:4003",
    changeOrigin: true,
    pathRewrite: { "^/api/v1/notifications": "" },
  })
);

// ------------------------
// Optional Circuit Breaker example
// ------------------------
const breakerOptions = {
  timeout: 5000, // 5 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 10000,
};

const exampleServiceCall = async () => "ok";
const breaker = new CircuitBreaker(exampleServiceCall, breakerOptions);
breaker.fallback(() => "Service unavailable");

// ------------------------
// Start Gateway server
// ------------------------
app.listen(3000, () => console.log("🚀 Gateway listening on port 3000"));
