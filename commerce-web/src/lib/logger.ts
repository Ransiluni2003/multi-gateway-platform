/**
 * Structured Logger for Next.js API Routes
 * Provides JSON-structured logging with requestId, userId, route, and latency tracking
 */

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
  /**
   * Log with context
   */
  private log(level: string, message: string, context?: LogContext) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: "commerce-web",
      ...context,
    };

    // In production, this would go to a logging service
    // For now, output as JSON to stdout/stderr
    if (level === "error") {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
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
   * Log webhook event
   */
  logWebhook(eventType: string, context: LogContext) {
    const webhookContext: LogContext = {
      eventType,
      ...context,
    };

    this.info(`Webhook received: ${eventType}`, webhookContext);
  }
}

// Export singleton instance
export const logger = new StructuredLogger();
