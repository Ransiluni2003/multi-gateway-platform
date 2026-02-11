/**
 * Redis Rate Limiter
 * 
 * Suitable for:
 * - Production environments
 * - Load-balanced deployments
 * - Horizontal scaling
 * - Persistent rate limiting across restarts
 * 
 * Requires:
 * - Redis server running
 * - REDIS_URL environment variable set
 */

import { IRateLimiter, RateLimiterConfig } from './IRateLimiter';
import Redis from 'ioredis';

export class RedisRateLimiter implements IRateLimiter {
  private redis: Redis;
  private keyPrefix = 'ratelimit';

  constructor(
    private config: RateLimiterConfig,
    redisClient?: Redis
  ) {
    // Use provided client or create new one
    this.redis = redisClient || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async isRateLimited(identifier: string): Promise<{ limited: boolean; resetAt?: Date }> {
    const key = `${this.keyPrefix}:${identifier}`;
    
    try {
      const data = await this.redis.get(key);
      if (!data) return { limited: false };

      const entry = JSON.parse(data);
      const resetAt = new Date(entry.resetAt);
      const now = new Date();

      // Check if expired
      if (resetAt < now) {
        await this.redis.del(key);
        return { limited: false };
      }

      // Check if blocked
      if (entry.blocked) {
        return { limited: true, resetAt };
      }

      return { limited: false };
    } catch (error) {
      console.error('Redis isRateLimited error:', error);
      // Fail open: allow request if Redis is down
      return { limited: false };
    }
  }

  async incrementAttempt(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = new Date();

    try {
      const data = await this.redis.get(key);
      let entry;

      if (!data) {
        // Create new entry
        entry = {
          count: 1,
          resetAt: new Date(now.getTime() + this.config.windowMinutes * 60 * 1000).toISOString(),
          blocked: false,
        };
      } else {
        entry = JSON.parse(data);
        const resetAt = new Date(entry.resetAt);

        // Check if expired
        if (resetAt < now) {
          entry = {
            count: 1,
            resetAt: new Date(now.getTime() + this.config.windowMinutes * 60 * 1000).toISOString(),
            blocked: false,
          };
        } else {
          // Increment
          entry.count += 1;

          // Check if max attempts exceeded
          if (entry.count > this.config.maxAttempts) {
            entry.blocked = true;
            entry.resetAt = new Date(
              now.getTime() + this.config.blockDurationMinutes * 60 * 1000
            ).toISOString();
          }
        }
      }

      // Save with TTL
      const ttl = Math.ceil(
        (new Date(entry.resetAt).getTime() - now.getTime()) / 1000
      );
      await this.redis.setex(key, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('Redis incrementAttempt error:', error);
      // Fail open: continue without rate limiting if Redis is down
    }
  }

  async blockIdentifier(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = new Date();

    try {
      const entry = {
        count: this.config.maxAttempts + 1,
        resetAt: new Date(
          now.getTime() + this.config.blockDurationMinutes * 60 * 1000
        ).toISOString(),
        blocked: true,
      };

      const ttl = this.config.blockDurationMinutes * 60;
      await this.redis.setex(key, ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('Redis blockIdentifier error:', error);
    }
  }

  async resetIdentifier(identifier: string): Promise<void> {
    const key = `${this.keyPrefix}:${identifier}`;
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis resetIdentifier error:', error);
    }
  }

  async getAttemptCount(identifier: string): Promise<number> {
    const key = `${this.keyPrefix}:${identifier}`;
    
    try {
      const data = await this.redis.get(key);
      if (!data) return 0;

      const entry = JSON.parse(data);
      const resetAt = new Date(entry.resetAt);
      const now = new Date();

      // Check if expired
      if (resetAt < now) {
        await this.redis.del(key);
        return 0;
      }

      return entry.count;
    } catch (error) {
      console.error('Redis getAttemptCount error:', error);
      return 0;
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
