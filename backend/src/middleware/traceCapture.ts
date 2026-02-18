import { Request, Response, NextFunction } from "express";
import TraceModel from "../models/Trace";
import { trace } from "@opentelemetry/api";

interface RequestWithTrace extends Request {
  traceId?: string;
  spans?: Array<{
    spanID: string;
    operation: string;
    service: string;
    status: number;
    startOffsetMs: number;
    durationMs: number;
  }>;
}

export function traceCapture(req: RequestWithTrace, res: Response, next: NextFunction) {
    // Skip tracing for the traces API itself to avoid recursive trace collection
    if (req.originalUrl.startsWith('/api/traces')) {
        return next();
    }

    const start = Date.now();
    const traceId = (req.headers["x-trace-id"] as string) || (req.headers['x-tarce-id'] as string) || '';
    const spanId = Math.random().toString(36).slice(2, 11);
    const serviceName = (req.headers['x-service-name'] as string) || process.env.SERVICE_NAME || 'api';
    
    // Attach trace context to request
    (req as any).traceId = traceId;
    (req as any).spanId = spanId;
    (req as any).spans = [];

    res.on("finish", async () => {
        const endTime = Date.now();
        const durationMs = endTime - start;
        
        try {
            // Get current span from OpenTelemetry context
            const span = trace.getActiveSpan();
            const traceContext = span?.spanContext();
            const otlpTraceId = traceContext?.traceId || traceId;
            
            // Build main span data
            const mainSpan = {
                spanID: spanId,
                operation: `HTTP ${req.method} ${req.originalUrl}`,
                service: serviceName,
                status: res.statusCode,
                startOffsetMs: 0,
                durationMs: durationMs,
                attributes: {
                    'http.method': req.method,
                    'http.url': req.originalUrl,
                    'http.status_code': res.statusCode,
                    'http.host': req.hostname,
                    'http.user_agent': req.get('user-agent'),
                }
            };

            // Combine with any child spans captured during request processing
            const spans = [(req as any).spans || [], mainSpan].flat();

            const traceDoc = {
                id: traceId || spanId,
                traceID: otlpTraceId || traceId || spanId,
                path: req.originalUrl,
                method: req.method,
                status: res.statusCode,
                durationMs,
                ts: new Date().toISOString(),
                serviceName,
                spans,
                attributes: {
                    'service.name': serviceName,
                    'service.version': process.env.SERVICE_VERSION || '1.0.0',
                }
            };
            
            await TraceModel.create(traceDoc);
        } catch (err) {
            console.error('[TraceCapture] Failed to save trace:', err);
            // Don't block response
        }
    });
    next();
}
