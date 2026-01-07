// core/eventbus/redisEventBus.ts
import IORedis from "ioredis";
import { injectTraceContext, extractTraceContext, withExtractedContext } from "../../utils/traceContext";
import { trace } from "@opentelemetry/api";

const redis = new IORedis(process.env.REDIS_URL as string);

export const publisher = redis.duplicate();
export const subscriber = redis.duplicate();

let isConnected = false;

/**
 * Initialize Redis connections for pub/sub
 */
export async function initEventBus() {
  if (isConnected) return;

  const alreadyReady = () => publisher.status === 'ready' && subscriber.status === 'ready';

  try {
    if (alreadyReady()) {
      isConnected = true;
      console.log('✅ EventBus Redis connected (publisher + subscriber)');
      return;
    }

    // Ensure clients are connecting
    publisher.connect();
    subscriber.connect();

    await Promise.all([
      new Promise((resolve, reject) => {
        if (publisher.status === 'ready') return resolve(true);
        publisher.once('ready', resolve);
        publisher.once('error', reject);
      }),
      new Promise((resolve, reject) => {
        if (subscriber.status === 'ready') return resolve(true);
        subscriber.once('ready', resolve);
        subscriber.once('error', reject);
      })
    ]);
    isConnected = true;
    console.log('✅ EventBus Redis connected (publisher + subscriber)');
  } catch (err) {
    console.error('❌ EventBus Redis connection failed:', err);
    throw err;
  }
}

/**
 * Publish a message with trace context attached
 */
export async function publish(channel: string, message: any) {
  // Create a wrapper with trace context injected
  const messageWithContext = {
    ...message,
    _traceContext: injectTraceContext(),
    _timestamp: Date.now(),
  };
  const payload = JSON.stringify(messageWithContext);
  await publisher.publish(channel, payload);
  console.log(`📤 Published to ${channel}:`, message);
}

/**
 * Subscribe with automatic trace context extraction
 */
export function subscribe(channel: string, handler: (msg: any) => void) {
  subscriber.subscribe(channel, (err, count) => {
    if (err) {
      console.error(`❌ Failed to subscribe to ${channel}:`, err);
    } else {
      console.log(`📥 Subscribed to ${channel} (total: ${count} channels)`);
    }
  });
  subscriber.on("message", async (_ch, message) => {
    if (_ch === channel) {
      try {
        const parsedMsg = JSON.parse(message);
        const traceContext = parsedMsg._traceContext;
        const cleanMsg = { ...parsedMsg };
        delete cleanMsg._traceContext;
        delete cleanMsg._timestamp;

        // Extract parent trace context and execute handler as child span
        if (traceContext) {
          const extractedCtx = extractTraceContext(traceContext);
          await withExtractedContext(
            extractedCtx,
            `EventBus consume: ${channel}`,
            () => Promise.resolve(handler(cleanMsg))
          );
        } else {
          handler(cleanMsg);
        }
      } catch (err) {
        console.error(`[EventBus] Error processing message on ${channel}:`, err);
      }
    }
  });
}

export default {
  publish,
  subscribe,
  publisher,
  subscriber,
};

