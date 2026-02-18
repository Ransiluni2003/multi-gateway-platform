/**
 * Request Logging Middleware
 * Logs all HTTP requests with request/response details and latency
 */

import { Request, Response, NextFunction } from "express";
import { structuredLogger } from "../utils/structuredLogger";

/**
 * Middleware to log request start and completion with latency
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Log request start
  structuredLogger.logRequest(req);

  // Capture response finish event
  res.on("finish", () => {
    const latency = Date.now() - startTime;
    structuredLogger.logResponse(req, res, latency);
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      const latency = Date.now() - startTime;
      structuredLogger.warn("Request closed before response finished", {
        requestId: (req as any).requestId,
        route: req.path,
        method: req.method,
        latency,
      });
    }
  });

  next();
}

export default requestLogger;
