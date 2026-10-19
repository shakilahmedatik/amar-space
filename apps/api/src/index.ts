import { trpcServer } from "@hono/trpc-server";
import { auth } from "@omniheaven/auth";
import { and, db, eq, schema } from "@omniheaven/db";
import { env } from "@omniheaven/env";
import { createLogger, createRequestLogger } from "@omniheaven/logger";
import { createHonoRateLimiter, RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import { appRouter, generateOpenApiDocument } from "@omniheaven/trpc";
import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import {
  activeRequestsGauge,
  httpRequestDuration,
  httpRequestsTotal,
  metricsRegistry,
  normalizeMetricPath,
} from "./metrics";
import {
  captureApiException,
  initTelemetry,
  recordTraceSpan,
  resolveTraceContext,
  type TraceContext,
} from "./telemetry";
import { removeClient, subscribeToChannel } from "./websocket";

const logger = createLogger("api-gateway");

// Initialize Sentry error reporting & telemetry
initTelemetry();

const { upgradeWebSocket, websocket } = createBunWebSocket();

type AppEnv = {
  Variables: {
    requestId: string;
    traceContext: TraceContext;
  };
};

const app = new Hono<AppEnv>();

// 1. Telemetry, Prometheus Metrics, W3C Trace & Request Correlation Logger
app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") || crypto.randomUUID();
  const traceContext = resolveTraceContext(c.req.header("traceparent"), c.req.header("x-trace-id"));

  c.set("requestId", requestId);
  c.set("traceContext", traceContext);

  const reqLogger = createRequestLogger(requestId, {
    traceId: traceContext.traceId,
    module: "http",
  });

  const startMs = Date.now();
  const startNano = performance.timeOrigin * 1_000_000 + performance.now() * 1_000_000;

  activeRequestsGauge.inc();

  try {
    await next();
  } finally {
    const durationMs = Date.now() - startMs;
    const endNano = performance.timeOrigin * 1_000_000 + performance.now() * 1_000_000;
    const durationSec = durationMs / 1000;
    const statusCode = c.res.status;
    const normalizedPath = normalizeMetricPath(c.req.path);

    activeRequestsGauge.dec();

    // Record Prometheus metrics
    httpRequestsTotal.inc({
      method: c.req.method,
      path: normalizedPath,
      status_code: String(statusCode),
    });

    httpRequestDuration.observe(
      {
        method: c.req.method,
        path: normalizedPath,
        status_code: String(statusCode),
      },
      durationSec,
    );

    // Forward W3C trace identifiers to response headers for frontend & caller correlation
    c.res.headers.set("x-request-id", requestId);
    c.res.headers.set("x-trace-id", traceContext.traceId);
    c.res.headers.set("traceparent", traceContext.traceparent);

    // Record OTel trace to Grafana Tempo (non-blocking)
    if (!c.req.path.startsWith("/metrics") && !c.req.path.startsWith("/health")) {
      recordTraceSpan({
        name: `${c.req.method} ${normalizedPath}`,
        traceContext,
        startTimeUnixNano: Math.round(startNano),
        endTimeUnixNano: Math.round(endNano),
        statusCode,
        attributes: {
          "http.method": c.req.method,
          "http.target": c.req.path,
          "http.status_code": statusCode,
          "http.request_id": requestId,
        },
      });
    }

    reqLogger.info({
      method: c.req.method,
      path: c.req.path,
      status: statusCode,
      durationMs,
      traceId: traceContext.traceId,
    });
  }
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

// 6. Health check & Prometheus Metrics
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "omniheaven-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", async (c) => {
  if (!env.PROMETHEUS_METRICS_ENABLED) {
    return c.text("Metrics collection disabled", 404);
  }
  const metrics = await metricsRegistry.metrics();
  return c.text(metrics, 200, {
    "Content-Type": metricsRegistry.contentType,
  });
});

// 6b. Real-time WebSockets (Live Booking Alerts, Payment Confirmations & Tickets)
app.get(
  "/ws",
  upgradeWebSocket(async (c) => {
    const headers = new Headers(c.req.raw.headers);
    const token = c.req.query("token") || c.req.query("sessionToken");
    if (token && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${token}`);
    }

    let session = null;
    try {
      session = await auth.api.getSession({ headers });
    } catch {
      // Failed to retrieve session
    }

    if (!session?.user) {
      return {
        onOpen(_event, ws) {
          ws.send(
            JSON.stringify({
              type: "error",
              error: "UNAUTHORIZED",
              message: "Authentication required to establish real-time connection.",
            }),
          );
          ws.close(4401, "Unauthorized");
        },
      };
    }

    const userId = session.user.id;
    const requestedOrgId = c.req.query("orgId") || c.req.header("x-organization-id");

    return {
      async onOpen(_event, ws) {
        if (requestedOrgId) {
          const membership = await db.query.members.findFirst({
            where: and(
              eq(schema.members.organizationId, requestedOrgId),
              eq(schema.members.userId, userId),
            ),
          });

          if (membership) {
            subscribeToChannel(`org:${requestedOrgId}`, ws);
            ws.send(
              JSON.stringify({
                type: "connection.ack",
                channel: `org:${requestedOrgId}`,
                userId,
                timestamp: new Date().toISOString(),
              }),
            );
            return;
          }

          ws.send(
            JSON.stringify({
              type: "error",
              error: "FORBIDDEN",
              message: "User is not a member of the requested organization channel.",
            }),
          );
        }

        ws.send(
          JSON.stringify({
            type: "connection.ack",
            userId,
            timestamp: new Date().toISOString(),
          }),
        );
      },
      async onMessage(event, ws) {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.action === "subscribe" && msg.channel) {
            const channelStr = String(msg.channel);
            if (channelStr.startsWith("org:")) {
              const targetOrgId = channelStr.slice(4);
              const membership = await db.query.members.findFirst({
                where: and(
                  eq(schema.members.organizationId, targetOrgId),
                  eq(schema.members.userId, userId),
                ),
              });

              if (!membership) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    error: "FORBIDDEN",
                    channel: channelStr,
                    message: "Access to this organization channel is denied.",
                  }),
                );
                return;
              }
            }

            subscribeToChannel(channelStr, ws);
            ws.send(JSON.stringify({ type: "subscription.ack", channel: channelStr }));
          } else if (msg.action === "ping") {
            ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
          }
        } catch {
          // ignore malformed payloads
        }
      },
      onClose(_event, ws) {
        removeClient(ws);
      },
    };
  }),
);

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
        traceId: c.get("traceContext")?.traceId,
      };
    },
  }),
);

// 12. Global error handler & Sentry incident reporter
app.onError((err, c) => {
  const requestId = c.get("requestId");
  const traceId = c.get("traceContext")?.traceId;

  // Report exception to Sentry (self-hosted or cloud)
  captureApiException(err, {
    requestId,
    traceId,
    path: c.req.path,
    method: c.req.method,
  });

  logger.error(
    {
      err: err.message,
      stack: err.stack,
      path: c.req.path,
      method: c.req.method,
      requestId,
      traceId,
    },
    "Unhandled API Exception",
  );

  return c.json(
    {
      error: "Internal Server Error",
      requestId,
      traceId,
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
  websocket,
};
