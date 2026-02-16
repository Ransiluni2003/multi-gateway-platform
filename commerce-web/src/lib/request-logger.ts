/**
 * Request Logging Utilities for Next.js API Routes
 * Provides correlation ID and structured logging support
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, LogContext } from './logger';

/**
 * Generate or extract request ID from headers
 */
export function getRequestId(request: NextRequest): string {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-correlation-id') ||
    crypto.randomUUID()
  );
}

/**
 * Create response with request ID headers
 */
export function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-correlation-id', requestId);
  return response;
}

/**
 * Log API request with context
 */
export function logRequest(
  request: NextRequest,
  context?: Omit<LogContext, 'method' | 'route'>
) {
  const requestId = getRequestId(request);
  const url = new URL(request.url);

  logger.info(`${request.method} ${url.pathname}`, {
    requestId,
    method: request.method,
    route: url.pathname,
    ...context,
  });

  return requestId;
}

/**
 * Log API response with latency
 */
export function logResponse(
  request: NextRequest,
  requestId: string,
  statusCode: number,
  startTime: number,
  context?: LogContext
) {
  const url = new URL(request.url);
  const latency = Date.now() - startTime;

  const level = statusCode >= 400 ? 'warn' : 'info';
  logger[level](`${request.method} ${url.pathname} - ${statusCode}`, {
    requestId,
    method: request.method,
    route: url.pathname,
    statusCode,
    latency,
    ...context,
  });
}

/**
 * Log error with request context
 */
export function logError(
  request: NextRequest,
  requestId: string,
  error: Error | any,
  message?: string
) {
  const url = new URL(request.url);

  logger.error(message || `Error processing ${request.method} ${url.pathname}`, error, {
    requestId,
    method: request.method,
    route: url.pathname,
  });
}

/**
 * Higher-order function to wrap API route handlers with logging
 */
export function withLogging<T>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options?: { routeName?: string }
) {
  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now();
    const requestId = logRequest(request, {
      routeName: options?.routeName,
    });

    try {
      const response = await handler(request, context);
      logResponse(request, requestId, response.status, startTime);
      return withRequestId(response, requestId);
    } catch (error) {
      logError(request, requestId, error);
      const errorResponse = NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      );
      return withRequestId(errorResponse, requestId);
    }
  };
}
