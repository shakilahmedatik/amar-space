import { createDbClient, type Database } from '@repo/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

export interface AuthConfig {
  db: Database
  secret: string
  baseURL: string
  /** Trusted origins allowed to make cross-origin auth requests (e.g. the web app) */
  trustedOrigins: string[]
  /** Session max age in seconds (default: 7 days) */
  sessionMaxAge: number
  /** Max login attempts before rate limiting (default: 5) */
  loginRateLimitMax: number
  /** Login rate limit window in seconds (default: 15 minutes) */
  loginRateLimitWindow: number
  /** Max registration attempts before rate limiting (default: 10) */
  registrationRateLimitMax: number
  /** Registration rate limit window in seconds (default: 15 minutes) */
  registrationRateLimitWindow: number
}

const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60
const FIFTEEN_MINUTES_IN_SECONDS = 15 * 60

/**
 * Creates a Better Auth instance configured with Drizzle adapter,
 * email/password authentication, session management, and rate limiting.
 *
 * Session management:
 * - Sessions expire after 7 days of inactivity (Requirement 2.5)
 * - The inactivity timer resets on each authenticated request (updateAge: 0)
 *
 * Rate limiting:
 * - Login: 5 attempts per 15 minutes per email (Requirement 2.3)
 * - Registration: 10 attempts per 15 minutes per IP (Requirement 1.8)
 */
export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(config.db, {
      provider: 'pg',
      usePlural: true,
    }),
    secret: config.secret,
    baseURL: config.baseURL,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'owner',
          input: false, // not settable by the client during sign-up
        },
      },
    },
    session: {
      expiresIn: config.sessionMaxAge,
      updateAge: 0, // Refresh session on every authenticated request to reset the 7-day inactivity timer
    },
    rateLimit: {
      enabled: true,
      window: FIFTEEN_MINUTES_IN_SECONDS,
      max: 100, // Default global limit (generous)
      customRules: {
        '/sign-in/email': {
          window: config.loginRateLimitWindow,
          max: config.loginRateLimitMax,
        },
        '/sign-up/email': {
          window: config.registrationRateLimitWindow,
          max: config.registrationRateLimitMax,
        },
      },
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
    console.log(env.AUTH_TRUSTED_ORIGINS)
    const db = createDbClient(env.DATABASE_URL)

    const auth = createAuth({
      db,
      secret: env.AUTH_SECRET,
      baseURL: env.AUTH_BASE_URL,
      trustedOrigins: env.AUTH_TRUSTED_ORIGINS,
      sessionMaxAge: SEVEN_DAYS_IN_SECONDS,
      loginRateLimitMax: 5,
      loginRateLimitWindow: FIFTEEN_MINUTES_IN_SECONDS,
      registrationRateLimitMax: 10,
      registrationRateLimitWindow: FIFTEEN_MINUTES_IN_SECONDS,
    })

    fastify.decorate('auth', auth)
  },
  {
    name: 'auth',
    dependencies: ['env'],
  },
)
