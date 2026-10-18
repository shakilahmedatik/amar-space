import type { Context, MiddlewareHandler } from "hono";
import { defaultLimiter, type SlidingWindowRateLimiter } from "./sliding-window";
import type { RateLimitConfig } from "./types";

export interface HonoRateLimitOptions {
  config: RateLimitConfig;
  keyGenerator?: (c: Context) => string;
  limiter?: SlidingWindowRateLimiter;
  message?: string;
}

/**
 * Creates an RFC 6585 compliant Hono rate-limiting middleware
 */
export function createHonoRateLimiter(options: HonoRateLimitOptions): MiddlewareHandler {
  const limiter = options.limiter || defaultLimiter;
  const getKey =
    options.keyGenerator ||
    ((c: Context) => {
      const forwarded = c.req.header("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0]?.trim() : c.req.header("x-real-ip");
      return ip || "anonymous";
    });

  return async (c, next) => {
    const rawKey = getKey(c);
    const key = `http:${rawKey}`;
    const result = await limiter.check(key, options.config);

    // Standard RFC 6585 rate limiting headers
    c.header("X-RateLimit-Limit", result.limit.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", result.reset.toString());

    if (!result.allowed) {
      c.header("Retry-After", result.retryAfter.toString());
      return c.json(
        {
          error: "TOO_MANY_REQUESTS",
          message:
            options.message ||
            `Rate limit exceeded. Please retry after ${result.retryAfter} second${
              result.retryAfter === 1 ? "" : "s"
            }.`,
          retryAfter: result.retryAfter,
        },
        429,
      );
    }

    await next();
  };
}
