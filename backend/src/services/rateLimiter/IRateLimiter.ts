/**
 * Rate Limiter Interface
 * 
 * Abstraction for rate limiting implementations
 * Allows switching between in-memory (dev) and Redis (prod) without code changes
 */

export interface RateLimitEntry {
  count: number;
  resetAt: Date;
  blocked: boolean;
}

export interface RateLimiterConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockDurationMinutes: number;
}

export interface IRateLimiter {
  /**
   * Check if an identifier is currently rate-limited
   * @param identifier - IP address, user ID, or other unique identifier
   * @returns Object indicating if limited and when limit resets
   */
  isRateLimited(identifier: string): Promise<{ limited: boolean; resetAt?: Date }>;

  /**
   * Increment attempt counter for an identifier
   * @param identifier - IP address, user ID, or other unique identifier
   */
  incrementAttempt(identifier: string): Promise<void>;

  /**
   * Block an identifier for the configured block duration
   * @param identifier - IP address, user ID, or other unique identifier
   */
  blockIdentifier(identifier: string): Promise<void>;

  /**
   * Reset/clear rate limit data for an identifier
   * @param identifier - IP address, user ID, or other unique identifier
   */
  resetIdentifier(identifier: string): Promise<void>;

  /**
   * Get current attempt count for an identifier
   * @param identifier - IP address, user ID, or other unique identifier
   */
  getAttemptCount(identifier: string): Promise<number>;
}
