import { RateLimitError } from '@repo/shared/errors'
import type { ApiErrorResponse } from '@repo/shared/types'
import { registerSchema } from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { registerUser } from '../../services/registration'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * In-memory rate limiter for registration attempts.
 * Tracks attempts per IP address with a sliding window.
 *
 * Requirement 1.8: 10 attempts per 15 minutes per IP
 */
interface RateLimitEntry {
  attempts: number[]
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 10

function checkRateLimit(ip: string): void {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  if (!entry) {
    rateLimitStore.set(ip, { attempts: [now] })
    return
  }

  // Remove expired attempts outside the window
  entry.attempts = entry.attempts.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  )

  if (entry.attempts.length >= RATE_LIMIT_MAX) {
    throw new RateLimitError(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000))
  }

  entry.attempts.push(now)
}

/**
 * Periodically clean up expired rate limit entries to prevent memory leaks.
 * Runs every 5 minutes.
 */
function startRateLimitCleanup(): NodeJS.Timeout {
  return setInterval(
    () => {
      const now = Date.now()
      for (const [ip, entry] of rateLimitStore.entries()) {
        entry.attempts = entry.attempts.filter(
          (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
        )
        if (entry.attempts.length === 0) {
          rateLimitStore.delete(ip)
        }
      }
    },
    5 * 60 * 1000,
  )
}

/**
 * Registration route plugin.
 *
 * POST /api/register
 *
 * Accepts email and password, validates input, creates user with Owner role,
 * and returns session token on success.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
async function registerRoutes(fastify: FastifyInstance) {
  const cleanupTimer = startRateLimitCleanup()

  // Clean up timer on server close
  fastify.addHook('onClose', async () => {
    clearInterval(cleanupTimer)
  })

  fastify.post(
    '/',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Register a new owner account',
        description:
          'Creates a new user account with the Owner role and returns a session token. Rate limited to 10 attempts per 15 minutes per IP.',
        security: [],
        body: registerSchema,
        response: {
          201: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string().nullable(),
              role: z.string(),
              createdAt: dateTimeResponseSchema,
            }),
            session: z
              .object({
                token: z.string(),
                expiresAt: dateTimeResponseSchema,
              })
              .nullable(),
            requestId: z.string().optional(),
            statusCode: z.number().optional(),
            error: z.string().optional(),
            message: z.string().optional(),
          }),
          400: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ip = request.ip

      // Rate limit check (Requirement 1.8)
      checkRateLimit(ip)

      const { email, password } = request.body as {
        email: string
        password: string
      }

      const result = await registerUser(
        request.server,
        { email, password },
        ip,
        request.headers['user-agent'] || '',
      )

      // Requirement 1.7: If session creation failed, inform user to sign in manually
      if (result.sessionError) {
        const response: ApiErrorResponse = {
          requestId: request.id,
          statusCode: 201,
          error: 'Session Creation Failed',
          message:
            'Account created successfully but session could not be established. Please sign in manually.',
        }
        return reply.status(201).send({
          ...response,
          user: result.user,
          session: null,
        })
      }

      // Success: return user and session (Requirement 1.4)
      return reply.status(201).send({
        user: result.user,
        session: result.session,
      })
    },
  )
}

export default registerRoutes

/** Exported for testing */
export { checkRateLimit, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, rateLimitStore }
