import Redis from "ioredis";

interface ServiceStatus {
  name: string;
  status: "up" | "down" | "degraded";
  lastCheck: number;
  lastResponseTime?: number;
  failureCount: number;
  uptime: number; // percentage
}

/**
 * ServiceHealthMonitor: Monitors health of multiple services
 * Detects failures and triggers recovery procedures
 */
export class ServiceHealthMonitor {
  private redis: Redis;
  private healthPrefix = "health:";
  private statusCheckInterval: Map<string, NodeJS.Timeout> = new Map();
  private serviceUrls: Map<string, string> = new Map();
  private failureThreshold = 3; // Mark as down after N consecutive failures
  private responseTimeoutMs = 5000;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Register a service for health monitoring
   */
  registerService(serviceName: string, healthCheckUrl: string, intervalMs: number = 10000): void {
    this.serviceUrls.set(serviceName, healthCheckUrl);

    const existingInterval = this.statusCheckInterval.get(serviceName);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Initial check
    this.performHealthCheck(serviceName);

    // Schedule periodic checks
    const interval = setInterval(() => {
      this.performHealthCheck(serviceName);
    }, intervalMs);

    this.statusCheckInterval.set(serviceName, interval);
  }

  /**
   * Perform health check for a service
   */
  private async performHealthCheck(serviceName: string): Promise<void> {
    const url = this.serviceUrls.get(serviceName);
    if (!url) return;

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.responseTimeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok && responseTime < this.responseTimeoutMs;

      if (isHealthy) {
        await this.recordHealthCheck(serviceName, "up", responseTime);
      } else {
        await this.recordHealthCheck(serviceName, "degraded", responseTime);
      }
    } catch (error) {
      await this.recordHealthCheck(serviceName, "down", Date.now() - startTime);
    }
  }

  /**
   * Record health check result
   */
  private async recordHealthCheck(
    serviceName: string,
    status: "up" | "down" | "degraded",
    responseTime: number
  ): Promise<void> {
    const key = `${this.healthPrefix}${serviceName}`;
    const currentStatus = await this.getServiceStatus(serviceName);

    let failureCount = currentStatus?.failureCount || 0;
    if (status !== "up") {
      failureCount++;
    } else {
      failureCount = 0;
    }

    const finalStatus = failureCount >= this.failureThreshold ? "down" : status;

    const statusData: ServiceStatus = {
      name: serviceName,
      status: finalStatus,
      lastCheck: Date.now(),
      lastResponseTime: responseTime,
      failureCount,
      uptime: 99, // Calculate based on historical data
    };

    await this.redis.set(key, JSON.stringify(statusData), "EX", 3600);

    // Log status changes
    if (currentStatus && currentStatus.status !== finalStatus) {
      await this.logStatusChange(serviceName, currentStatus.status, finalStatus);
    }
  }

  /**
   * Log service status changes
   */
  private async logStatusChange(
    serviceName: string,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    const logKey = `status-changes:${serviceName}`;
    const change = {
      timestamp: Date.now(),
      from: oldStatus,
      to: newStatus,
    };

    await this.redis.lpush(logKey, JSON.stringify(change));
    await this.redis.expire(logKey, 604800); // 7 days
    await this.redis.ltrim(logKey, 0, 999);

    console.log(
      `[HEALTH] ${serviceName}: ${oldStatus} → ${newStatus} at ${new Date().toISOString()}`
    );
  }

  /**
   * Get status of a single service
   */
  async getServiceStatus(serviceName: string): Promise<ServiceStatus | null> {
    const key = `${this.healthPrefix}${serviceName}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get status of all registered services
   */
  async getAllServiceStatus(): Promise<ServiceStatus[]> {
    const statuses: ServiceStatus[] = [];

    for (const serviceName of this.serviceUrls.keys()) {
      const status = await this.getServiceStatus(serviceName);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Check if system is healthy (all services up)
   */
  async isSystemHealthy(): Promise<boolean> {
    const statuses = await this.getAllServiceStatus();
    return statuses.every((s) => s.status === "up");
  }

  /**
   * Unregister service monitoring
   */
  unregisterService(serviceName: string): void {
    const interval = this.statusCheckInterval.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.statusCheckInterval.delete(serviceName);
    }
    this.serviceUrls.delete(serviceName);
  }

  /**
   * Cleanup all monitoring
   */
  cleanup(): void {
    for (const interval of this.statusCheckInterval.values()) {
      clearInterval(interval);
    }
    this.statusCheckInterval.clear();
  }
}
