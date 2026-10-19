import { Counter, collectDefaultMetrics, Gauge, Histogram, Registry } from "prom-client";

/**
 * Custom Prometheus Registry for omniHeaven API & Services.
 */
export const metricsRegistry = new Registry();

// Collect default runtime and process metrics (memory, GC, event loop, CPU)
collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "omniheaven_",
});

/**
 * Histogram measuring HTTP request duration in seconds with fine-grained latency buckets.
 */
export const httpRequestDuration = new Histogram({
  name: "omniheaven_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "path", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 1.5, 2.5, 5, 10],
  registers: [metricsRegistry],
});

/**
 * Counter tracking all incoming HTTP requests by HTTP verb, sanitized path, and status code.
 */
export const httpRequestsTotal = new Counter({
  name: "omniheaven_http_requests_total",
  help: "Total number of HTTP requests processed",
  labelNames: ["method", "path", "status_code"] as const,
  registers: [metricsRegistry],
});

/**
 * Gauge tracking in-flight concurrent requests.
 */
export const activeRequestsGauge = new Gauge({
  name: "omniheaven_active_requests",
  help: "Current number of in-flight active HTTP requests",
  registers: [metricsRegistry],
});

/**
 * Counter tracking domain business and security errors.
 */
export const domainErrorsTotal = new Counter({
  name: "omniheaven_domain_errors_total",
  help: "Total domain errors thrown by code and tRPC classification",
  labelNames: ["domain_code", "trpc_code"] as const,
  registers: [metricsRegistry],
});

/**
 * Normalizes HTTP route paths to prevent high cardinality in Prometheus labels.
 * E.g. /api/auth/callback/google -> /api/auth/*
 * /trpc/properties.getById -> /trpc/properties.getById
 */
export function normalizeMetricPath(path: string): string {
  if (path.startsWith("/trpc/")) {
    const procedure = path.slice(6).split("?")[0];
    return `/trpc/${procedure || "unknown"}`;
  }
  if (path.startsWith("/api/auth/")) {
    return "/api/auth/*";
  }
  if (path.startsWith("/api/docs")) {
    return "/api/docs/*";
  }
  return path.split("?")[0] || path;
}
