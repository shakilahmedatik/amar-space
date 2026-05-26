import { createDbClient, type Database } from '@repo/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export interface AuthConfig {
  db: Database
  secret: string
  baseURL: string
  /** Session max age in seconds (default: 7 days) */
  sessionMaxAge: number
  /** Max authentication attempts before rate limiting (default: 5) */
  rateLimitMaxAttempts: number
  /** Rate limit window in milliseconds (default: 15 minutes) */
  rateLimitWindowMs: number
}

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60
const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000
const ONE_DAY_IN_SECONDS = 60 * 60 * 24

/**
 * Creates a Better Auth instance configured with Drizzle adapter,
 * email/password authentication, session management, and rate limiting.
 */
export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(config.db, {
      provider: 'pg',
    }),
    secret: config.secret,
    baseURL: config.baseURL,
    emailAndPassword: { enabled: true },
    session: {
      expiresIn: config.sessionMaxAge,
      updateAge: ONE_DAY_IN_SECONDS,
    },
    rateLimit: {
      window: config.rateLimitWindowMs / 1000,
      max: config.rateLimitMaxAttempts,
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

declare module 'fastify' {
  interface FastifyInstance {
    auth: Auth
  }
}

export default fp(
  async function authPlugin(fastify: FastifyInstance) {
    const { env } = fastify

    const db = createDbClient(env.DATABASE_URL)

    const auth = createAuth({
      db,
      secret: env.AUTH_SECRET,
      baseURL: env.AUTH_BASE_URL,
      sessionMaxAge: SEVEN_DAYS_IN_SECONDS,
      rateLimitMaxAttempts: 5,
      rateLimitWindowMs: FIFTEEN_MINUTES_IN_MS,
    })

    fastify.decorate('auth', auth)
  },
  {
    name: 'auth',
    dependencies: ['env'],
  },
)
