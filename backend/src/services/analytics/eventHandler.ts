import { PaymentCompletedSchema } from '../_shared/eventSchemas';
import EventBus from '../../core/eventbus/redisEventBus';
import { EventLog } from '../../models/EventLog';
import { updateMetrics } from "./updateMetrics";
import { extractTraceContext, withExtractedContext, injectTraceContext } from '../../utils/traceContext';
import { trace } from '@opentelemetry/api';

// Subscribe to the specific channel used by the publisher
EventBus.subscribe('payment.completed', async (parsedMsg) => {
  console.log('📨 Analytics received payment.completed event');
  if (!parsedMsg) return;
  const start = Date.now();

  try {
    // parsedMsg is already the clean payment object from EventBus
    const data = PaymentCompletedSchema.parse(parsedMsg);
    
    // Trace context is automatically handled by EventBus withExtractedContext wrapper
    // Execute analytics processing in a child span
    const processAnalytics = async () => {
      const span = trace.getTracer('multi-gateway-tracer').startSpan('Analytics: Process Payment');
      
      try {
        await EventLog.create({ 
          event: 'payment.completed', 
          status: 'received',
          source: 'analytics',
          traceId: data.traceId 
        });

        // Track metrics calculation as a sub-span
        const metricsSpan = trace.getTracer('multi-gateway-tracer').startSpan('Analytics: Update Metrics');
        try {
          await updateMetrics(data);
          metricsSpan.end();
        } catch (err) {
          metricsSpan.recordException(err as Error);
          metricsSpan.end();
          throw err;
        }

        // Prepare report generation event with trace context
        const publishSpan = trace.getTracer('multi-gateway-tracer').startSpan('Analytics: Publish Report Event');
        try {
          await EventBus.publish('report.generate', { traceId: data.traceId, since: '24h' });
          publishSpan.end();
        } catch (err) {
          publishSpan.recordException(err as Error);
          publishSpan.end();
          throw err;
        }

        await EventLog.create({ 
          event: 'payment.completed', 
          status: 'processed', 
          source: 'analytics', 
          duration: Date.now() - start, 
          traceId: data.traceId 
        });
        
        span.end();
      } catch (err) {
        span.recordException(err as Error);
        span.end();
        throw err;
      }
    };

    // Trace context is already active from EventBus wrapper, just execute
    await processAnalytics();
  } catch (err) {
    console.error('❌ Analytics event handler error:', err);
    await EventLog.create({ 
      event: 'payment.completed', 
      status: 'failed', 
      source: 'analytics', 
      duration: Date.now() - start 
    });
  }
});

