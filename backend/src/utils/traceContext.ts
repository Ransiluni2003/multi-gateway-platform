import { trace, context, SpanStatusCode, Context } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { TextMapGetter, TextMapSetter } from '@opentelemetry/api';

const propagator = new W3CTraceContextPropagator();

// Getter: tells propagator how to read from a carrier object (e.g., headers)
const getter: TextMapGetter<Record<string, any>> = {
  get: (carrier, key) => {
    if (carrier == null) return undefined;
    return carrier[key];
  },
  keys: (carrier) => {
    if (carrier == null) return [];
    return Object.keys(carrier);
  },
};

// Setter: tells propagator how to write to a carrier object
const setter: TextMapSetter<Record<string, any>> = {
  set: (carrier, key, value) => {
    if (carrier != null) {
      carrier[key] = value;
    }
  },
};

/**
 * Extract trace context from carrier (headers or message)
 */
export function extractTraceContext(carrier: Record<string, any>): Context {
  return propagator.extract(context.active(), carrier, getter);
}

/**
 * Inject current trace context into a carrier (headers or message)
 */
export function injectTraceContext(carrier: Record<string, any> = {}): Record<string, any> {
  propagator.inject(context.active(), carrier, setter);
  return carrier;
}

/**
 * Get current trace ID from active span
 */
export function getCurrentTraceId(): string {
  const span = trace.getActiveSpan();
  return span?.spanContext().traceId || '';
}

/**
 * Get current span ID from active span
 */
export function getCurrentSpanId(): string {
  const span = trace.getActiveSpan();
  return span?.spanContext().spanId || '';
}

/**
 * Execute a function within an extracted trace context (for child spans)
 */
export async function withExtractedContext<T>(
  extractedContext: any,
  spanName: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('multi-gateway-tracer', '1.0.0');
  const span = tracer.startSpan(spanName);

  return context.with(extractedContext, () =>
    context.with(trace.setSpan(context.active(), span), async () => {
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
    })
  );
}

export default {
  extractTraceContext,
  injectTraceContext,
  getCurrentTraceId,
  getCurrentSpanId,
  withExtractedContext,
};
