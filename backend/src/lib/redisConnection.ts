import IORedis from 'ioredis';

export function createRedisConnection() {
  return new IORedis({
    host: process.env.REDIS_HOST || 'redis',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    // Required by BullMQ: ensure ioredis won't set a numeric maxRetriesPerRequest
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    // keep default reconnect behavior; apps may override when needed
  });
}

export default createRedisConnection;
