import { afterAll, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { createHonoRateLimiter } from "../hono";
import { RATE_LIMIT_PRESETS } from "../presets";
import { getRedisClient } from "../redis";
import { SlidingWindowRateLimiter } from "../sliding-window";

describe("Rate Limiting Infrastructure", () => {
  const limiter = new SlidingWindowRateLimiter();
  const testKey = `test:user:${Date.now()}`;

  afterAll(async () => {
    await limiter.reset(testKey);
    try {
      const client = getRedisClient();
      await client.quit();
    } catch {
      // Ignore
    }
  });

  it("allows requests within configured limit", async () => {
    const config = { limit: 3, windowSec: 60 };

    const res1 = await limiter.check(testKey, config);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await limiter.check(testKey, config);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await limiter.check(testKey, config);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit and returns positive retryAfter", async () => {
    const config = { limit: 3, windowSec: 60 };

    const res4 = await limiter.check(testKey, config);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.retryAfter).toBeGreaterThan(0);
    expect(res4.retryAfter).toBeLessThanOrEqual(60);
  });

  it("resets key successfully", async () => {
    await limiter.reset(testKey);
    const config = { limit: 3, windowSec: 60 };

    const res = await limiter.check(testKey, config);
    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(2);
  });

  it("enforces Hono middleware with RFC 6585 headers and 429 response", async () => {
    const app = new Hono();
    const midKey = `mw:test:${Date.now()}`;

    app.use(
      "*",
      createHonoRateLimiter({
        config: { limit: 2, windowSec: 60 },
        keyGenerator: () => midKey,
      }),
    );

    app.get("/test", (c) => c.text("OK"));

    // Request 1: 200 OK
    const res1 = await app.request("/test");
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("1");

    // Request 2: 200 OK
    const res2 = await app.request("/test");
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("0");

    // Request 3: 429 Too Many Requests
    const res3 = await app.request("/test");
    expect(res3.status).toBe(429);
    expect(res3.headers.get("Retry-After")).toBeDefined();
    const body = (await res3.json()) as any;
    expect(body.error).toBe("TOO_MANY_REQUESTS");
    expect(body.retryAfter).toBeGreaterThan(0);
  });

  it("exposes all 6 standard rate limit presets", () => {
    expect(RATE_LIMIT_PRESETS.GLOBAL_HTTP.limit).toBe(300);
    expect(RATE_LIMIT_PRESETS.AUTH_SENSITIVE.limit).toBe(5);
    expect(RATE_LIMIT_PRESETS.INVITATIONS.limit).toBe(10);
    expect(RATE_LIMIT_PRESETS.INVITATIONS.windowSec).toBe(3600);
    expect(RATE_LIMIT_PRESETS.PUBLIC_READ.limit).toBe(120);
    expect(RATE_LIMIT_PRESETS.MUTATIONS_STANDARD.limit).toBe(60);
    expect(RATE_LIMIT_PRESETS.MUTATIONS_BULK.limit).toBe(10);
  });
});
