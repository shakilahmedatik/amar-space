import Redis, { type RedisOptions } from "ioredis";

let redisInstance: Redis | null = null;
let isConnected = false;

export function getRedisClient(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const options: RedisOptions = {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      // Exponential backoff with 2000ms max delay
      return Math.min(times * 100, 2000);
    },
  };

  redisInstance = new Redis(redisUrl, options);

  redisInstance.on("connect", () => {
    isConnected = true;
  });

  redisInstance.on("ready", () => {
    isConnected = true;
  });

  redisInstance.on("error", (err) => {
    isConnected = false;
    // Suppress unhandled error crashes; sliding window will fail-open with in-memory fallback
    if (process.env.NODE_ENV !== "test") {
      console.warn("[RateLimit:Redis] Connection warning:", err.message);
    }
  });

  redisInstance.on("close", () => {
    isConnected = false;
  });

  return redisInstance;
}

export function isRedisConnected(): boolean {
  return isConnected;
}
