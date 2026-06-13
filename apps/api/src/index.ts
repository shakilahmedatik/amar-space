import type { IncomingMessage, ServerResponse } from 'node:http'
import { getLogTapeFastifyLogger } from '@logtape/fastify'
import { validateConnection } from '@repo/db'
import { buildApp } from './app'
import { configureLogging, getLogger } from './lib/logger'

let app: ReturnType<typeof buildApp> | null = null
let readyPromise: Promise<ReturnType<typeof buildApp>> | null = null

async function initApp() {
  await configureLogging()
  const logger = getLogger()
  app = buildApp({ loggerInstance: getLogTapeFastifyLogger() })
  await app.ready()
  logger.info('App initialized and ready')
  return app
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
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

    app.server.emit('request', req, res)
  } catch (err) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(
      JSON.stringify({
        statusCode: 503,
        error: 'Service Unavailable',
        message: err instanceof Error ? err.message : 'Internal error',
      }),
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
