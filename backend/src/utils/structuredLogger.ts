/**
 * Structured Logger with Request Correlation
 * Provides JSON-structured logging with requestId, userId, route, and latency tracking
 */

import winston from "winston";
import path from "path";
import { Request, Response } from "express";

const logDir = path.join(process.cwd(), "logs");

// Create transport array
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    ),
  }),
];

// Add file transports if filesystem is available
try {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: winston.format.json(),
    })
  );
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: winston.format.json(),
    })
  );
} catch (err) {
  // Ignore file transport errors in environments without filesystem access
}

// Create base winston logger
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "gateway-backend" },
  transports,
});

export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  latency?: number;
  statusCode?: number;
  eventType?: string;
  idempotencyKey?: string;
  eventId?: string;
  [key: string]: any;
}

class StructuredLogger {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  /**
   * Log with context
   */
  private log(level: string, message: string, context?: LogContext) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    this.logger.log(level, message, context);
  }

  /**
   * Info level log
   */
  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  /**
   * Warning level log
   */
  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  /**
   * Error level log with stack trace
   */
  error(message: string, error?: Error | any, context?: LogContext) {
    const errorContext: LogContext = {
      ...context,
      stack: error?.stack,
      errorMessage: error?.message,
      errorName: error?.name,
    };
    this.log("error", message, errorContext);
  }

  /**
   * Debug level log
   */
  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  /**
   * Log HTTP request start
   */
  logRequest(req: Request, context?: LogContext) {
    const requestContext: LogContext = {
      requestId: (req as any).requestId,
      userId: (req as any).user?.id || (req as any).userId,
      route: req.path,
      method: req.method,
      ...context,
    };

    this.info(`${req.method} ${req.path}`, requestContext);
  }

  /**
   * Log HTTP request completion with latency
   */
  logResponse(req: Request, res: Response, latency: number, context?: LogContext) {
    const responseContext: LogContext = {
      requestId: (req as any).requestId,
      userId: (req as any).user?.id || (req as any).userId,
      route: req.path,
      method: req.method,
      statusCode: res.statusCode,
      latency,
      ...context,
    };

    const level = res.statusCode >= 400 ? "warn" : "info";
    this.log(level, `${req.method} ${req.path} - ${res.statusCode}`, responseContext);
  }

  /**
   * Log webhook event
   */
  logWebhook(eventType: string, context: LogContext) {
    const webhookContext: LogContext = {
      eventType,
      ...context,
    };

    this.info(`Webhook received: ${eventType}`, webhookContext);
  }

  /**
   * Log error with request context
   */
  logErrorWithRequest(req: Request, error: Error | any, message?: string) {
    const errorContext: LogContext = {
      requestId: (req as any).requestId,
      userId: (req as any).user?.id || (req as any).userId,
      route: req.path,
      method: req.method,
      stack: error?.stack,
      errorMessage: error?.message,
      errorName: error?.name,
    };

    this.error(message || `Error processing ${req.method} ${req.path}`, error, errorContext);
  }
}

// Export singleton instance
export const structuredLogger = new StructuredLogger(winstonLogger);

// Export base logger for backward compatibility
export default winstonLogger;
