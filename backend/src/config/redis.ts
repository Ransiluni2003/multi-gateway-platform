import { createClient, RedisClientType } from "redis";

export const redisClient: RedisClientType = createClient({
  socket: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on("connect", () => console.log("✅ Redis connected"));
redisClient.on("error", (err) => console.error("❌ Redis error:", err));

export async function initRedis() {
  try {
    await redisClient.connect();
    console.log("🚀 Redis client connected successfully");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
  }
}
