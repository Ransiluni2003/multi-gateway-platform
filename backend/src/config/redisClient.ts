import { createClient } from "redis";

export let redisClient: any = null;
let redisConnected = false;

// Initialize Redis client only if URL is configured
if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500),
    },
  });

  redisClient.on("connect", () => {
    redisConnected = true;
    console.log("✅ Redis connected");
  });
  redisClient.on("error", (err: any) => {
    if (!redisConnected) {
      console.warn("⚠️  Redis connection warning (app will continue):", err.message);
    } else {
      console.error("❌ Redis error:", err);
    }
  });
}

export async function initRedis() {
  if (!redisClient) {
    console.warn("⚠️  Redis not configured (REDIS_URL missing). Running without Redis.");
    return;
  }
  try {
    await redisClient.connect();
    redisConnected = true;
    console.log("🚀 Redis client connected successfully");
  } catch (error: any) {
    console.warn("⚠️  Redis connection failed (app will continue):", error.message);
  }
}

export function isRedisConnected() {
  return redisConnected && redisClient !== null;
}
