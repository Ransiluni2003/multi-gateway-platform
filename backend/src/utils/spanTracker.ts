import { Request } from "express";

export interface RequestWithSpans extends Request {
  spans?: Array<{
    spanID: string;
    operation: string;
    service: string;
    status: number;
    startOffsetMs: number;
    durationMs: number;
  }>;
  startTime?: number;
}

/**
 * Record a span in the request context
 */
export function recordSpan(
  req: RequestWithSpans,
  operation: string,
  service: string,
  durationMs: number,
  status: number = 200
) {
  if (!req.spans) {
    req.spans = [];
  }

  const startTime = (req as any).startTime || Date.now();
  const startOffsetMs = Date.now() - startTime;

  const span = {
    spanID: `span-${req.spans.length + 1}`,
    operation,
    service,
    status,
    startOffsetMs: Math.max(0, startOffsetMs - durationMs),
    durationMs: Math.max(0.1, durationMs),
  };

  req.spans.push(span);
  return span;
}

/**
 * Wrap an async operation with span tracking
 */
export async function withSpanTracking<T>(
  req: RequestWithSpans,
  operation: string,
  service: string,
  fn: () => Promise<T>,
  initialStatus: number = 200
): Promise<T> {
  const opStart = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - opStart;
    recordSpan(req, operation, service, duration, 200);
    return result;
  } catch (err) {
    const duration = Date.now() - opStart;
    recordSpan(req, operation, service, duration, 500);
    throw err;
  }
}

export default {
  recordSpan,
  withSpanTracking,
};
