/**
 * Rate Limiting Middleware Wrapper
 * 
 * WHY: Makes it easy to apply rate limiting to any API route
 * 
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request) => { ... },
 *   RATE_LIMITS.AUTH
 * );
 * ```
 */

import { NextResponse } from 'next/server';
import { rateLimit, getIp, type RateLimitConfig } from './rateLimit';

/**
 * Wraps an API handler with rate limiting
 * 
 * @param handler - The actual API handler function
 * @param config - Rate limit configuration
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response>,
  config: RateLimitConfig
) {
  return async (request: Request) => {
    // Get client IP
    const ip = getIp(request);
    const identifier = `${ip}:${new URL(request.url).pathname}`;

    // Check rate limit
    const result = rateLimit(identifier, config);

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.reset).toISOString(),
    };

    // If rate limited, return 429
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Call original handler and add rate limit headers
    try {
      const response = await handler(request);
      
      // Clone response to add headers
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // Add rate limit headers
      Object.entries(headers).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });

      return newResponse;
    } catch (error) {
      console.error('Handler error:', error);
      throw error;
    }
  };
}
