import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL,
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
