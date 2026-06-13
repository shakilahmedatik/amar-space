import { getLogTapeFastifyLogger } from '@logtape/fastify'
import { validateConnection } from '@repo/db'
import { buildApp } from './app'
import { configureLogging, getLogger } from './lib/logger'

async function startServer() {
  await configureLogging()
  const logger = getLogger()

  try {
    const app = buildApp({ loggerInstance: getLogTapeFastifyLogger() })
    await app.ready()
    logger.info('App initialized and ready')

    try {
      await validateConnection(app.db)
      logger.info('Database connection established successfully')
    } catch (err) {
      logger.error('Failed to start server due to database connection issue: {error}', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    }

    const port = Number(process.env.PORT ?? 3001)

    app.listen({ port, host: '0.0.0.0' }, (err) => {
      if (err) {
        logger.error('Failed to start server: {error}', { error: err })
        process.exit(1)
      }
      logger.info(`🚀URL: http://localhost:${port}`)
      logger.info(`⚡️Heath: http://localhost:${port}/api/health`)
      logger.info(`📍Doc: http://localhost:${port}/api/docs`)
    })
  } catch (err) {
    logger.error('Fatal error during startup: {error}', { error: err })
    process.exit(1)
  }
}

void startServer()
