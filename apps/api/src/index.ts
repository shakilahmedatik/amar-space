import { getLogTapeFastifyLogger } from '@logtape/fastify'
import { validateConnection } from '@repo/db'
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
export default async function handler(req: Request): Promise<Response> {
  await app.ready()

  const url = req.url.startsWith('/')
    ? new URL(req.url, 'http://localhost')
    : new URL(req.url)
  const body = req.body ? await req.text() : undefined

  const headers =
    req.headers instanceof Headers
      ? Object.fromEntries(req.headers.entries())
      : (req.headers as unknown as Record<string, string | string[] | undefined>)

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
    headers,
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

  try {
    await app.ready()
    await validateConnection(app.db)
    logger.info('Database connection established successfully')
  } catch (err) {
    logger.error(
      'Failed to start server due to database connection issue: {error}',
      {
        error: err instanceof Error ? err.message : String(err),
      },
    )
    process.exit(1)
  }

  app.listen({ port, host: '0.0.0.0' }, (err) => {
    if (err) {
      logger.error('Failed to start server: {error}', { error: err })
      process.exit(1)
    }
    logger.info(`🚀URL: http://localhost:${port}`)
    logger.info(`⚡️Heath: http://localhost:${port}/api/health`)
    logger.info(`📍Doc: http://localhost:${port}/api/docs`)
  })
}
