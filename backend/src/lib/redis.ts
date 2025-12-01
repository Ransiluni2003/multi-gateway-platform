import Redis, { RedisOptions } from "ioredis";

// Redis configuration
const redisOptions: RedisOptions = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

const redisClient = new Redis(redisOptions);

redisClient.on("connect", () => {
  console.log("✅ Redis connected successfully");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis connection error:", err);
});

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
  try {
    await redisClient.publish(channel, JSON.stringify(payload));
  } catch (err) {
    console.error("❌ Redis publish error:", err);
  }
};

export default redisClient;
