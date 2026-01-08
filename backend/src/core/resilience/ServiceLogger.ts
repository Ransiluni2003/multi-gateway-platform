import winston from "winston";
import Redis from "ioredis";

interface FailureLog {
  timestamp: number;
  serviceName: string;
  errorType: string;
  message: string;
  stack?: string;
  retryCount?: number;
  duration?: number;
}

/**
 * ServiceLogger: Captures service failures, retries, and recovery events
 * Logs to both file system and Redis for real-time monitoring
 */
export class ServiceLogger {
  private logger: winston.Logger;
  private redis: Redis;
  private failurePrefix = "failures:";
  private recoveryPrefix = "recovery:";

  constructor(redis: Redis, serviceName: string) {
    this.redis = redis;

    this.logger = winston.createLogger({
      defaultMeta: { service: serviceName },
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: `logs/${serviceName}-error.log`,
          level: "error",
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: `logs/${serviceName}-combined.log`,
          maxsize: 5242880,
          maxFiles: 5,
        }),
      ],
    });

    // Add console transport for development
    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.simple(),
        })
      );
    }
  }

  /**
   * Log service failure with retry information
   */
  async logFailure(
    serviceName: string,
    error: Error,
    context: {
      retryCount?: number;
      operation?: string;
      duration?: number;
      additionalData?: any;
    } = {}
  ): Promise<void> {
    const failureLog: FailureLog = {
      timestamp: Date.now(),
      serviceName,
      errorType: error.name,
      message: error.message,
      stack: error.stack,
      retryCount: context.retryCount,
      duration: context.duration,
    };

    // Log to Winston
    this.logger.error({
      operation: context.operation || "unknown",
      error: error.message,
      stack: error.stack,
      retryCount: context.retryCount,
      duration: context.duration,
      additionalData: context.additionalData,
    });

    // Store in Redis for real-time monitoring (24 hour TTL)
    const key = `${this.failurePrefix}${serviceName}`;
    await this.redis.lpush(key, JSON.stringify(failureLog));
    await this.redis.expire(key, 86400);
    await this.redis.ltrim(key, 0, 999); // Keep last 1000 failures
  }

  /**
   * Log service recovery
   */
  async logRecovery(
    serviceName: string,
    context: {
      failureDurationMs?: number;
      messagesRecovered?: number;
      additionalData?: any;
    } = {}
  ): Promise<void> {
    const recoveryLog = {
      timestamp: Date.now(),
      serviceName,
      failureDurationMs: context.failureDurationMs,
      messagesRecovered: context.messagesRecovered,
      additionalData: context.additionalData,
    };

    // Log to Winston
    this.logger.info({
      event: "service_recovery",
      serviceName,
      failureDurationMs: context.failureDurationMs,
      messagesRecovered: context.messagesRecovered,
    });

    // Store in Redis for monitoring (7 day TTL)
    const key = `${this.recoveryPrefix}${serviceName}`;
    await this.redis.lpush(key, JSON.stringify(recoveryLog));
    await this.redis.expire(key, 604800);
  }

  /**
   * Get failure logs for a service
   */
  async getFailureLogs(serviceName: string, limit: number = 100): Promise<FailureLog[]> {
    const key = `${this.failurePrefix}${serviceName}`;
    const logs = await this.redis.lrange(key, 0, limit - 1);
    return logs.map((log) => JSON.parse(log));
  }

  /**
   * Get failure statistics
   */
  async getFailureStats(serviceName: string): Promise<{
    totalFailures: number;
    failureRate: number;
    lastFailure?: FailureLog;
    commonErrors: { [key: string]: number };
  }> {
    const key = `${this.failurePrefix}${serviceName}`;
    const logs = await this.redis.lrange(key, 0, -1);

    if (logs.length === 0) {
      return {
        totalFailures: 0,
        failureRate: 0,
        commonErrors: {},
      };
    }

    const parsedLogs: FailureLog[] = logs.map((log) => JSON.parse(log));
    const commonErrors: { [key: string]: number } = {};

    parsedLogs.forEach((log) => {
      commonErrors[log.errorType] = (commonErrors[log.errorType] || 0) + 1;
    });

    return {
      totalFailures: parsedLogs.length,
      failureRate: (parsedLogs.length / 1000) * 100, // Based on 1000 max stored
      lastFailure: parsedLogs[0],
      commonErrors,
    };
  }

  /**
   * Log service health check
   */
  async logHealthCheck(
    serviceName: string,
    status: "healthy" | "degraded" | "unhealthy",
    details?: any
  ): Promise<void> {
    this.logger.info({
      event: "health_check",
      serviceName,
      status,
      details,
    });
  }
}
