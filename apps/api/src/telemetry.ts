import { env } from "@omniheaven/env";
import { createLogger } from "@omniheaven/logger";
import * as Sentry from "@sentry/node";

const log = createLogger("telemetry");

let sentryInitialized = false;

/**
 * Initialize Sentry SDK for error tracking & crash reporting if DSN is provided.
 */
export function initTelemetry(): void {
  if (env.SENTRY_DSN) {
    try {
      Sentry.init({
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT,
        tracesSampleRate: env.NODE_ENV === "production" ? 0.2 : 1.0,
      });
      sentryInitialized = true;
      log.info(
        { dsn: env.SENTRY_DSN.split("@")[1] || "configured" },
        "Sentry SDK initialized successfully",
      );
    } catch (err) {
      log.warn({ err }, "Failed to initialize Sentry SDK");
    }
  } else {
    log.info("Sentry DSN not provided; error tracking will log locally without external reporting");
  }
}

/**
 * Generates a random hex string of given byte length for standard W3C trace identifiers.
 */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type TraceContext = {
  traceId: string;
  spanId: string;
  traceparent: string;
};

/**
 * Extracts W3C trace context from request headers, or generates a new trace ID.
 */
export function resolveTraceContext(
  traceparentHeader?: string | null,
  xTraceIdHeader?: string | null,
): TraceContext {
  if (traceparentHeader?.startsWith("00-")) {
    const parts = traceparentHeader.split("-");
    if (parts.length >= 4 && parts[1] && parts[2]) {
      return {
        traceId: parts[1],
        spanId: parts[2],
        traceparent: traceparentHeader,
      };
    }
  }

  const traceId = xTraceIdHeader?.replace(/[^a-f0-9]/gi, "").slice(0, 32) || randomHex(16);
  const spanId = randomHex(8);
  const traceparent = `00-${traceId}-${spanId}-01`;

  return {
    traceId,
    spanId,
    traceparent,
  };
}

/**
 * Dispatches an asynchronous OpenTelemetry trace span to Grafana Tempo (OTLP HTTP).
 * Non-blocking: failures are gracefully swallowed without interrupting request flow.
 */
export function recordTraceSpan(options: {
  name: string;
  traceContext: TraceContext;
  startTimeUnixNano: number;
  endTimeUnixNano: number;
  statusCode: number;
  attributes: Record<string, string | number | boolean>;
}): void {
  const endpoint = `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`;

  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "omniheaven-api" } },
            { key: "service.environment", value: { stringValue: env.NODE_ENV } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "omniheaven-http-server" },
            spans: [
              {
                traceId: options.traceContext.traceId,
                spanId: options.traceContext.spanId,
                name: options.name,
                kind: 2, // SPAN_KIND_SERVER
                startTimeUnixNano: options.startTimeUnixNano,
                endTimeUnixNano: options.endTimeUnixNano,
                status: {
                  code: options.statusCode >= 500 ? 2 : 1, // 2 = STATUS_CODE_ERROR, 1 = STATUS_CODE_OK
                },
                attributes: Object.entries(options.attributes).map(([key, val]) => ({
                  key,
                  value:
                    typeof val === "number"
                      ? { intValue: Math.round(val) }
                      : typeof val === "boolean"
                        ? { boolValue: val }
                        : { stringValue: String(val) },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  // Fire-and-forget non-blocking fetch to Tempo
  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Graceful no-op when Tempo is offline or not installed
  });
}

/**
 * Captures an unhandled exception into Sentry with rich correlation metadata.
 */
export function captureApiException(
  error: unknown,
  context?: {
    requestId?: string;
    traceId?: string;
    path?: string;
    method?: string;
    tenantId?: string | null;
  },
): void {
  if (sentryInitialized) {
    Sentry.withScope((scope) => {
      if (context?.requestId) scope.setTag("requestId", context.requestId);
      if (context?.traceId) scope.setTag("traceId", context.traceId);
      if (context?.tenantId) scope.setTag("tenantId", context.tenantId);
      if (context?.path) scope.setExtra("path", context.path);
      if (context?.method) scope.setExtra("method", context.method);
      Sentry.captureException(error);
    });
  }
}
