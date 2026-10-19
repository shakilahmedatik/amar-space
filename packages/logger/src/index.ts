import { env } from "@omniheaven/env";
import pino from "pino";

const isDev = env.NODE_ENV !== "production";

/**
 * Root Pino application logger with sensible sanitization for PII & credentials.
 */
export const rootLogger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "password",
      "secret",
      "token",
      "authorization",
      "*.password",
      "*.secret",
      "*.token",
      "*.authorization",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

/**
 * Creates a sub-logger tagged with a specific module identifier.
 */
export function createLogger(module: string): pino.Logger {
  return rootLogger.child({ module });
}

/**
 * Creates a sub-logger tagged with a request correlation ID and optional trace/tenant context.
 */
export function createRequestLogger(
  requestId: string,
  moduleOrContext?: string | { module?: string; traceId?: string; tenantId?: string | null },
): pino.Logger {
  const extra =
    typeof moduleOrContext === "string" ? { module: moduleOrContext } : moduleOrContext || {};
  return rootLogger.child({ requestId, ...extra });
}

export type Logger = pino.Logger;
