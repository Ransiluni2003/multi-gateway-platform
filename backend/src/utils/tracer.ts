import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Get the tracer instance
const tracer = trace.getTracer('multi-gateway-tracer', '1.0.0');

export interface SpanData {
  operation: string;
  service: string;
  status: number;
  durationMs: number;
  attributes?: Record<string, any>;
}

/**
 * Create a span for an operation
 */
export function createSpan(name: string, attributes?: Record<string, any>) {
  return tracer.startSpan(name, { attributes });
}

/**
 * Execute a function within a span context
 */
export async function withSpan<T>(
  spanName: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = tracer.startSpan(spanName, { attributes });
  
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}

/**
 * Sync version of span execution
 */
export function withSpanSync<T>(
  spanName: string,
  fn: () => T,
  attributes?: Record<string, any>
): T {
  const span = tracer.startSpan(spanName, { attributes });
  
  return context.with(trace.setSpan(context.active(), span), () => {
    try {
      const result = fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}

/**
 * Get current trace ID from context
 */
export function getCurrentTraceId(): string {
  const span = trace.getActiveSpan();
  return span?.spanContext().traceId || '';
}

export default tracer;
