import { getLogTapeFastifyLogger } from '@logtape/fastify'
import { buildApp } from './app'
import { configureLogging, getLogger } from './lib/logger'

// Configure LogTape before building the app so all log calls are captured.
// This must run before any Fastify logger is created.
await configureLogging()

const logger = getLogger()

// App instance created at module level for warm-start reuse.
// Vercel keeps the module in memory between invocations,
// so subsequent requests skip the initialization cost.
const app = buildApp({ loggerInstance: getLogTapeFastifyLogger() })

/**
 * Vercel serverless handler.
 *
 * - Receives a Web API Request and returns a Response via Fastify's .inject() method.
 * - app.ready() is idempotent — safe to call on every request to ensure plugins are loaded.
 * - Stateless: no request-scoped state persists between invocations.
 * - All route handlers must complete within 10s (Vercel execution limit).
 */
export default async function handler(req: Request): Promise<Response> {
  await app.ready()

  const url = new URL(req.url)
  const body = req.body ? await req.text() : undefined

  const res = await app.inject({
    method: req.method as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'
      | 'PATCH'
      | 'HEAD'
      | 'OPTIONS',
    url: url.pathname + url.search,
    headers: Object.fromEntries(req.headers.entries()),
    body,
  })

  return new Response(res.body, {
    status: res.statusCode,
    headers: res.headers as HeadersInit,
  })
}

// Start a local HTTP server when not running in production (e.g. during local dev with `tsx watch`).
// In production, Vercel manages the lifecycle via the handler export above.
if (process.env.NODE_ENV !== 'production') {
  const port = Number(process.env.PORT ?? 3001)
  app.listen({ port, host: '0.0.0.0' }, (err) => {
    if (err) {
      logger.error('Failed to start server: {error}', { error: err })
      process.exit(1)
    }
    logger.info(`API listening on http://localhost:${port}`)
  })
}
