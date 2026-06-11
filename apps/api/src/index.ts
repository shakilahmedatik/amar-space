import { getLogTapeFastifyLogger } from '@logtape/fastify'
import { validateConnection } from '@repo/db'
import { buildApp } from './app'
import { configureLogging, getLogger } from './lib/logger'

let app: ReturnType<typeof buildApp> | null = null
let readyPromise: Promise<void> | null = null

async function initApp() {
  await configureLogging()
  const logger = getLogger()
  app = buildApp({ loggerInstance: getLogTapeFastifyLogger() })
  await app.ready()
  logger.info('App initialized and ready')
  return app
}

export default async function handler(req: Request): Promise<Response> {
  if (!readyPromise) {
    readyPromise = initApp()
  }

  try {
    const app = await Promise.race([
      readyPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Initialization timed out after 20s')), 20_000),
      ),
    ])

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
  } catch (err) {
    return new Response(
      JSON.stringify({
        statusCode: 503,
        error: 'Service Unavailable',
        message: err instanceof Error ? err.message : 'Internal error',
      }),
      {
        status: 503,
        headers: { 'content-type': 'application/json' },
      },
    )
  }
}

if (process.env.NODE_ENV !== 'production') {
  const port = Number(process.env.PORT ?? 3001)

  void initApp().then(async (app) => {
    try {
      await validateConnection(app.db)
      getLogger().info('Database connection established successfully')
    } catch (err) {
      getLogger().error(
        'Failed to start server due to database connection issue: {error}',
        { error: err instanceof Error ? err.message : String(err) },
      )
      process.exit(1)
    }

    app.listen({ port, host: '0.0.0.0' }, (err) => {
      if (err) {
        getLogger().error('Failed to start server: {error}', { error: err })
        process.exit(1)
      }
      const logger = getLogger()
      logger.info(`🚀URL: http://localhost:${port}`)
      logger.info(`⚡️Heath: http://localhost:${port}/api/health`)
      logger.info(`📍Doc: http://localhost:${port}/api/docs`)
    })
  })
}
