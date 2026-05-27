import { createDbClient, type Database } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    db: Database
  }
}

/**
 * Database plugin that registers a Drizzle ORM client on the Fastify instance.
 *
 * Uses the DATABASE_URL from the env plugin to create a Neon serverless
 * HTTP-based database connection.
 *
 * Usage:
 * ```typescript
 * const db = request.server.db
 * const results = await db.query.users.findMany()
 * ```
 */
export default fp(
  async function dbPlugin(fastify: FastifyInstance) {
    const { env } = fastify
    const db = createDbClient(env.DATABASE_URL)
    fastify.decorate('db', db)
  },
  {
    name: 'db',
    dependencies: ['env'],
  },
)
