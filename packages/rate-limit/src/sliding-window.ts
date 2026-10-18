import type Redis from "ioredis";
import { getRedisClient } from "./redis";
import type { RateLimitConfig, RateLimitResult } from "./types";

const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]
local clearBefore = now - windowMs

-- 1. Remove expired timestamps
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

-- 2. Count active entries
local currentCount = redis.call('ZCARD', key)

if currentCount < limit then
  -- Allowed: Add current hit and renew TTL
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs)
  local resetSec = math.ceil((now + windowMs) / 1000)
  return {1, limit - currentCount - 1, 0, resetSec}
else
  -- Disallowed: Compute retry-after based on oldest active token
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestScore = (oldest and oldest[2]) and tonumber(oldest[2]) or now
  local retryAfterMs = (oldestScore + windowMs) - now
  if retryAfterMs < 0 then retryAfterMs = 0 end
  local retryAfterSec = math.max(1, math.ceil(retryAfterMs / 1000))
  local resetSec = math.ceil((oldestScore + windowMs) / 1000)
  return {0, 0, retryAfterSec, resetSec}
end
`;

export class SlidingWindowRateLimiter {
  private redis: Redis | null = null;
  private memoryFallback = new Map<string, number[]>();
  private readonly maxMemoryKeys = 10000;

  constructor(customRedis?: Redis) {
    if (customRedis) {
      this.redis = customRedis;
    }
  }

  private getClient(): Redis {
    if (!this.redis) {
      this.redis = getRedisClient();
    }
    return this.redis;
  }

  /**
   * Evaluates the rate limit for a specific identifier
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const fullKey = `ratelimit:${key}`;
    const now = Date.now();
    const windowMs = config.windowSec * 1000;
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;

    try {
      const client = this.getClient();
      // Execute atomic Lua script
      const result = (await client.eval(
        LUA_SLIDING_WINDOW,
        1,
        fullKey,
        now.toString(),
        windowMs.toString(),
        config.limit.toString(),
        member,
      )) as [number, number, number, number];

      const allowed = result[0] === 1;
      const remaining = Number(result[1]);
      const retryAfter = Number(result[2]);
      const reset = Number(result[3]);

      return {
        allowed,
        limit: config.limit,
        remaining,
        reset,
        retryAfter,
      };
    } catch (_err) {
      // Fail-open with in-memory sliding window fallback
      return this.checkMemoryFallback(fullKey, config, now);
    }
  }

  /**
   * In-memory fallback if Redis/Valkey is temporarily unreachable
   */
  private checkMemoryFallback(key: string, config: RateLimitConfig, now: number): RateLimitResult {
    // Prevent memory leaks
    if (this.memoryFallback.size > this.maxMemoryKeys) {
      this.memoryFallback.clear();
    }

    const windowMs = config.windowSec * 1000;
    const clearBefore = now - windowMs;

    const existing = this.memoryFallback.get(key) || [];
    const active = existing.filter((timestamp) => timestamp > clearBefore);

    if (active.length < config.limit) {
      active.push(now);
      this.memoryFallback.set(key, active);
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - active.length,
        reset: Math.ceil((now + windowMs) / 1000),
        retryAfter: 0,
      };
    }

    const oldest = active[0] ?? now;
    const retryAfterMs = oldest + windowMs - now;
    const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      allowed: false,
      limit: config.limit,
      remaining: 0,
      reset: Math.ceil((oldest + windowMs) / 1000),
      retryAfter,
    };
  }

  /**
   * Reset a rate limit key (useful for tests or manual admin unlock)
   */
  async reset(key: string): Promise<void> {
    const fullKey = `ratelimit:${key}`;
    this.memoryFallback.delete(fullKey);
    try {
      const client = this.getClient();
      await client.del(fullKey);
    } catch {
      // Ignore if disconnected
    }
  }
}

export const defaultLimiter = new SlidingWindowRateLimiter();
