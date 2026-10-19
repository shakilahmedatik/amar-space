import { env } from "@omniheaven/env";
import { createLogger } from "@omniheaven/logger";
import Redis, { type RedisOptions } from "ioredis";

const logger = createLogger("rate-limit:redis");

let redisInstance: Redis | null = null;
let isConnected = false;

export function getRedisClient(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const options: RedisOptions = {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 500,
    retryStrategy(times) {
      if (times > 3) {
        return null;
      }
      // Exponential backoff with 500ms max delay
      return Math.min(times * 100, 500);
    },
  };

  redisInstance = new Redis(env.REDIS_URL, options);

  redisInstance.on("connect", () => {
    isConnected = true;
  });

  redisInstance.on("ready", () => {
    isConnected = true;
  });

  redisInstance.on("error", (err) => {
    isConnected = false;
    // Suppress unhandled error crashes; sliding window will fail-open with in-memory fallback
    if (env.NODE_ENV !== "test") {
      logger.warn(
        { err: err.message },
        "Redis connection warning; rate limiter will fail open to in-memory fallback",
      );
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
