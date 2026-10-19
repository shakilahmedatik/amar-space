import { trpcServer } from "@hono/trpc-server";
import { auth } from "@omniheaven/auth";
import { db } from "@omniheaven/db";
import { env } from "@omniheaven/env";
import { createLogger, createRequestLogger } from "@omniheaven/logger";
import { createHonoRateLimiter, RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import { appRouter, generateOpenApiDocument } from "@omniheaven/trpc";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";

const logger = createLogger("api-gateway");

type AppEnv = {
  Variables: {
    requestId: string;
  };
};

const app = new Hono<AppEnv>();

// 1. Request logging & ID middleware with correlation ID tracking
app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  c.set("requestId", requestId);
  const reqLogger = createRequestLogger(requestId, "http");
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  reqLogger.info({
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: duration,
  });
});

// 2. OWASP Secure Headers
app.use("*", secureHeaders());

// 3. CORS configuration
const allowedOrigins = env.AUTH_TRUSTED_ORIGINS.split(",").map((o) => o.trim());

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] || "*";
      if (allowedOrigins.includes(origin)) return origin;
      if (origin.endsWith(".omniheaven.com")) return origin;
      return null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization", "x-request-id", "x-organization-id"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// 4. CSRF Protection for state-mutating form requests
app.use(
  "*",
  csrf({
    origin: (origin) => {
      if (!origin) return true;
      if (allowedOrigins.includes(origin)) return true;
      if (origin.endsWith(".omniheaven.com")) return true;
      return false;
    },
  }),
);

// 5. Body Limit protection (5MB default limit)
app.use(
  "*",
  bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (c) => {
      return c.json(
        {
          error: "Payload Too Large",
          message: "Request body size exceeds the 5MB payload limit.",
        },
        413,
      );
    },
  }),
);

// 6. Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "omniheaven-api",
    timestamp: new Date().toISOString(),
  });
});

// 7. OpenAPI 3.1 JSON Specification
app.get("/api/openapi.json", (c) => {
  const doc = generateOpenApiDocument();
  return c.json(doc);
});

// 8. Interactive Scalar API Reference Documentation
const docsHandler = apiReference({
  pageTitle: "omniHeaven API Documentation",
  spec: {
    url: "/api/openapi.json",
  },
  theme: "purple",
});
app.get("/api/docs", docsHandler);
app.get("/api/docs/*", docsHandler);

// 9. Global HTTP Rate Limiter (Tier 1: 300 req/min per IP)
app.use(
  "*",
  createHonoRateLimiter({
    config: RATE_LIMIT_PRESETS.GLOBAL_HTTP,
  }),
);

// 10. Mount Better Auth
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

// 11. Mount tRPC server
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

// 7. Global error handler
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
      message: env.NODE_ENV === "production" ? undefined : err.message,
    },
    500,
  );
});

const port = env.PORT;

logger.info(`Omni Heaven API server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
