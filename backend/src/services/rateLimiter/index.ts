/**
 * Rate Limiter Factory
 * 
 * Automatically selects the appropriate rate limiter based on environment:
 * - Production (REDIS_URL set): Uses Redis for distributed rate limiting
 * - Development (no REDIS_URL): Uses in-memory for simplicity
 * 
 * Usage:
 *   const rateLimiter = createRateLimiter({ maxAttempts: 10, windowMinutes: 15, blockDurationMinutes: 30 });
 *   const { limited } = await rateLimiter.isRateLimited('192.168.1.1');
 */

import { IRateLimiter, RateLimiterConfig } from "./IRateLimiter";
import { InMemoryRateLimiter } from "./InMemoryRateLimiter";
import { RedisRateLimiter } from "./RedisRateLimiter";
import { UpstashRateLimiter } from "./UpstashRateLimiter";

export function createRateLimiter(config: RateLimiterConfig): IRateLimiter {
  const store = (process.env.RATE_LIMIT_STORE || "").toLowerCase();
  const redisUrl = process.env.REDIS_URL;

  if (store === "upstash") {
    console.log("✅ Rate Limiter: Using Upstash REST");
    return new UpstashRateLimiter(config);
  }

  if (store === "redis" || (!store && redisUrl)) {
    if (!redisUrl) {
      throw new Error("RATE_LIMIT_STORE=redis requires REDIS_URL");
    }
    console.log("✅ Rate Limiter: Using Redis");
    console.log(`   Redis URL: ${redisUrl.replace(/:[^:@]+@/, ":****@")}`);
    return new RedisRateLimiter(config);
  }

  console.warn("⚠️  Rate Limiter: Using in-memory storage (development mode)");
  console.warn("   ⚠️  NOT SUITABLE for production with load balancing!");
  console.warn("   ⚠️  Set RATE_LIMIT_STORE=redis|upstash for distributed rate limiting");
  return new InMemoryRateLimiter(config);
}

// Export types and implementations
export { IRateLimiter, RateLimiterConfig } from "./IRateLimiter";
export { InMemoryRateLimiter } from "./InMemoryRateLimiter";
export { RedisRateLimiter } from "./RedisRateLimiter";
export { UpstashRateLimiter } from "./UpstashRateLimiter";
