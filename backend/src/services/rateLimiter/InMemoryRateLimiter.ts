/**
 * In-Memory Rate Limiter
 * 
 * Suitable for:
 * - Development environments
 * - Single-server deployments
 * - Testing
 * 
 * NOT suitable for:
 * - Production with load balancing
 * - Horizontal scaling
 * - Persistent rate limiting across restarts
 */

import { IRateLimiter, RateLimitEntry, RateLimiterConfig } from './IRateLimiter';

export class InMemoryRateLimiter implements IRateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private config: RateLimiterConfig) {
    // Cleanup expired entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  async isRateLimited(identifier: string): Promise<{ limited: boolean; resetAt?: Date }> {
    const entry = this.storage.get(identifier);
    if (!entry) return { limited: false };

    const now = new Date();

    // Check if rate limit window has expired
    if (entry.resetAt < now) {
      this.storage.delete(identifier);
      return { limited: false };
    }

    // Check if identifier is blocked
    if (entry.blocked) {
      return { limited: true, resetAt: entry.resetAt };
    }

    return { limited: false };
  }

  async incrementAttempt(identifier: string): Promise<void> {
    const now = new Date();
    const entry = this.storage.get(identifier);

    if (!entry || entry.resetAt < now) {
      // Create new entry
      this.storage.set(identifier, {
        count: 1,
        resetAt: new Date(now.getTime() + this.config.windowMinutes * 60 * 1000),
        blocked: false,
      });
    } else {
      // Increment existing entry
      entry.count += 1;

      // Check if max attempts exceeded
      if (entry.count > this.config.maxAttempts) {
        entry.blocked = true;
        entry.resetAt = new Date(
          now.getTime() + this.config.blockDurationMinutes * 60 * 1000
        );
      }
    }
  }

  async blockIdentifier(identifier: string): Promise<void> {
    const now = new Date();
    this.storage.set(identifier, {
      count: this.config.maxAttempts + 1,
      resetAt: new Date(
        now.getTime() + this.config.blockDurationMinutes * 60 * 1000
      ),
      blocked: true,
    });
  }

  async resetIdentifier(identifier: string): Promise<void> {
    this.storage.delete(identifier);
  }

  async getAttemptCount(identifier: string): Promise<number> {
    const entry = this.storage.get(identifier);
    if (!entry) return 0;

    const now = new Date();
    if (entry.resetAt < now) {
      this.storage.delete(identifier);
      return 0;
    }

    return entry.count;
  }

  private cleanup(): void {
    const now = new Date();
    for (const [identifier, entry] of this.storage.entries()) {
      if (entry.resetAt < now) {
        this.storage.delete(identifier);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.storage.clear();
  }
}
