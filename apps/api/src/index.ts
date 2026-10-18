import { trpcServer } from "@hono/trpc-server";
import { auth } from "@omniheaven/auth";
import { db } from "@omniheaven/db";
import { createHonoRateLimiter, RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import { appRouter } from "@omniheaven/trpc";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./logger";

type AppEnv = {
  Variables: {
    requestId: string;
  };
};

const app = new Hono<AppEnv>();

// 1. Request logging & ID middleware
app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  c.set("requestId", requestId);
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: duration,
  });
});

// 2. CORS configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "https://omniheaven.com",
  "https://admin.omniheaven.com",
  "https://hq.omniheaven.com",
  "https://renter.omniheaven.com",
];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0];
      if (allowedOrigins.includes(origin)) return origin;
      if (origin.endsWith(".omniheaven.com")) return origin;
      return null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "x-request-id", "x-organization-id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// 3. Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "omniheaven-api",
    timestamp: new Date().toISOString(),
  });
});

// 4. Global HTTP Rate Limiter (Tier 1: 300 req/min per IP)
app.use(
  "*",
  createHonoRateLimiter({
    config: RATE_LIMIT_PRESETS.GLOBAL_HTTP,
  }),
);

// 5. Mount Better Auth
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

// 6. Mount tRPC server
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (_opts, c) => {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      const organizationId =
        c.req.header("x-organization-id") || session?.session?.activeOrganizationId || null;

      return {
        db,
        session,
        organizationId,
        requestId: c.get("requestId"),
      };
    },
  }),
);

// 6. Global error handler
app.onError((err, c) => {
  logger.error(
    {
      err: err.message,
      stack: err.stack,
      path: c.req.path,
    },
    "Unhandled API Exception",
  );
  return c.json(
    {
      error: "Internal Server Error",
      message: process.env.NODE_ENV === "production" ? undefined : err.message,
    },
    500,
  );
});

const port = Number(process.env.PORT || 4000);

logger.info(`Omni Heaven API server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
