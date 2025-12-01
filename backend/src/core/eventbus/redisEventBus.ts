// core/eventbus/redisEventBus.ts
import IORedis from "ioredis";
const redis = new IORedis(process.env.REDIS_URL as string);

export const publisher = redis.duplicate();
export const subscriber = redis.duplicate();

export async function publish(channel: string, message: any) {
  await publisher.publish(channel, JSON.stringify(message));
}
export function subscribe(channel: string, handler: (msg:any)=>void){
  subscriber.subscribe(channel);
  subscriber.on("message", (_ch, message) => {
    if (_ch === channel) handler(JSON.parse(message));
  });
}
