/**
 * Rate Limiting Utility
 * 
 * WHY: Prevents abuse by limiting how many requests a user can make
 * 
 * Use Cases:
 * - Login attempts: Prevent brute force password attacks
 * - Webhook endpoints: Prevent spam/DoS attacks
 * - API validation: Prevent automated scraping/abuse
 * 
 * How It Works:
 * - Tracks requests by IP address in memory
 * - If too many requests in time window → returns 429 (Too Many Requests)
 * - Uses sliding window algorithm
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  limit: number;    // Max requests per window
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if request is rate limited
 * 
 * @param identifier - Unique identifier (usually IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Initialize or get existing record
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 0,
      resetTime: now + config.interval,
    };
  }

  // Increment count
  store[key].count++;

  const remaining = Math.max(0, config.limit - store[key].count);
  const success = store[key].count <= config.limit;

  return {
    success,
    limit: config.limit,
    remaining,
    reset: store[key].resetTime,
  };
}

/**
 * Get IP address from request
 */
export function getIp(request: Request): string {
  // Try to get real IP from headers (behind proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection IP (may not be available in serverless)
  return 'unknown';
}

/**
 * Preset rate limit configurations
 */
export const RATE_LIMITS = {
  // Auth endpoints: 5 attempts per 15 minutes
  AUTH: {
    interval: 15 * 60 * 1000, // 15 minutes
    limit: 5,
  },
  
  // Webhook endpoints: 100 requests per minute
  WEBHOOK: {
    interval: 60 * 1000, // 1 minute
    limit: 100,
  },
  
  // Validation endpoints: 10 requests per minute
  VALIDATION: {
    interval: 60 * 1000, // 1 minute
    limit: 10,
  },
  
  // General API: 60 requests per minute
  GENERAL: {
    interval: 60 * 1000, // 1 minute
    limit: 60,
  },
} as const;
