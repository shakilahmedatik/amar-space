/**
 * LogTape configuration and logger factory for the API.
 *
 * Call `configureLogging()` once at application startup before building the
 * Fastify app. Then use `getLogger()` anywhere in the codebase to get a
 * category-scoped logger.
 *
 * Categories used in this app:
 *   ["amar-space", "api"]            – general API / startup messages
 *   ["amar-space", "api", "routes"]  – route-level logs
 *   ["amar-space", "api", "services"]– service-level logs
 *   ["amar-space", "api", "plugins"] – plugin lifecycle logs
 *   ["fastify"]                      – Fastify / request logs (via @logtape/fastify)
 */

import {
  getLogger as _getLogger,
  ansiColorFormatter,
  configure,
  getConsoleSink,
  type LogLevel,
} from '@logtape/logtape'

let configured = false

/**
 * Configures LogTape with a pretty ANSI-colored console sink.
 * Safe to call multiple times — only configures once.
 */
export async function configureLogging(
  lowestLevel: LogLevel = 'debug',
): Promise<void> {
  if (configured) return
  configured = true

  await configure({
    sinks: {
      console: getConsoleSink({
        formatter: ansiColorFormatter,
      }),
    },
    loggers: [
      // Root app logger — catches everything under "amar-space"
      {
        category: ['amar-space'],
        sinks: ['console'],
        lowestLevel,
      },
      // Fastify internal + request logs
      {
        category: ['fastify'],
        sinks: ['console'],
        lowestLevel: 'info',
      },
      // LogTape meta logger — only show warnings and above to reduce noise
      {
        category: ['logtape', 'meta'],
        sinks: ['console'],
        lowestLevel: 'warning',
      },
    ],
  })
}

/**
 * Returns a LogTape logger scoped to the given sub-category under "amar-space·api".
 *
 * @example
 * const logger = getLogger("routes")
 * // category: ["amar-space", "api", "routes"]
 *
 * @example
 * const logger = getLogger(["services", "registration"])
 * // category: ["amar-space", "api", "services", "registration"]
 */
export function getLogger(sub?: string | string[]) {
  const base = ['amar-space', 'api']
  if (!sub) return _getLogger(base)
  const parts = Array.isArray(sub) ? sub : [sub]
  return _getLogger([...base, ...parts])
}
