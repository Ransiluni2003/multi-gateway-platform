import { PaymentCompletedSchema } from '../_shared/eventSchemas';
import { redisClient } from '../../config/redis'; // corrected named import
import { EventLog } from '../../models/EventLog';
import { updateMetrics } from "./updateMetrics";

redisClient.subscribe('events', async (msg) => {
  if (!msg) return; // skip if null or undefined
  const { type, payload } = JSON.parse(msg);
  const start = Date.now();

  if (type !== 'payment.completed') return;

  try {
    const data = PaymentCompletedSchema.parse(payload);
    await EventLog.create({ event: type, status:'received', source:'analytics', traceId:data.traceId });
    await updateMetrics(data);

    const reportEvent = { type:'report.generate', payload: { traceId: data.traceId, since: '24h' } };
    await redisClient.publish('events', JSON.stringify(reportEvent));

    await EventLog.create({ event: type, status:'processed', source:'analytics', duration: Date.now()-start, traceId:data.traceId });
  } catch (err) {
    await EventLog.create({ event:type, status:'failed', source:'analytics', duration: Date.now()-start });
    // Optionally log error to Sentry
    // Sentry.captureException(err);
  }
});
