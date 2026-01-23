import Redis, { RedisOptions } from "ioredis";

// Redis configuration
const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Only create Redis client if REDIS_URL or REDIS_HOST is configured
const redisClient = (process.env.REDIS_URL || process.env.REDIS_HOST) ? new Redis(redisOptions) : null;

if (redisClient) {
  redisClient.on("connect", () => {
    console.log("✅ Redis connected successfully");
  });

  redisClient.on("error", (err) => {
    console.warn("⚠️  Redis connection error (app will continue):", err.message);
  });
} else {
  console.warn("⚠️  Redis not configured. Running without Redis.");
}

// Example type for payment events
export interface PaymentEvent {
  id: string;
  amount: number;
  method: string;
  status: string;
  timestamp: string;
}

// Publish helper
export const publish = async (channel: string, payload: PaymentEvent) => {
  if (!redisClient) {
    console.warn("⚠️  Redis not available. Message not published.");
    return;
  }
  try {
    await redisClient.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error("❌ Redis publish error:", err);
  }
};

export default redisClient;
