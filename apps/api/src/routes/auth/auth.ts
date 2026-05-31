import { portalSessions } from '@repo/db'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

/**
 * Auth routes plugin.
 *
 * Delegates all requests under the `/api/auth` prefix to Better Auth's handler.
 * Better Auth internally handles:
 * - POST /sign-up/email — user registration
 * - POST /sign-in/email — user authentication (creates session, returns token)
 * - POST /sign-out — session invalidation
 * - GET /get-session — session retrieval/validation
 *
 * Additional behavior:
 * - Records login events in audit log on successful authentication (Requirement 2.7)
 * - Ensures logout invalidates session within 1 second (Requirement 2.4)
 *
 * Error responses are intercepted to ensure:
 * - Generic messages that don't reveal whether email or password was incorrect (Requirement 2.2)
 * - Proper rate-limit responses (Requirement 2.3)
 * - Invalid/expired session token rejection (Requirement 2.6)
 */

interface ErrorResponse {
  statusCode: number
  error: string
  message: string
}

/**
 * Constructs a Web API Request from Fastify's request object.
 * Better Auth's handler expects a standard Web API Request.
 */
function toWebRequest(request: FastifyRequest, baseURL: string): Request {
  const url = new URL(request.url, baseURL)

  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v)
        }
      } else {
        headers.set(key, value)
      }
    }
  }

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'HEAD'

  return new Request(url.toString(), {
    method,
    headers,
    body: hasBody && request.body ? JSON.stringify(request.body) : undefined,
  })
}

/**
 * Generic authentication error message used for all auth failures.
 * Does not reveal whether email or password was incorrect (Requirement 2.2).
 */
const GENERIC_AUTH_ERROR: ErrorResponse = {
  statusCode: 401,
  error: 'Unauthorized',
  message: 'Invalid credentials',
}

/**
 * Rate limit error response (Requirement 2.3).
 */
const RATE_LIMIT_ERROR: ErrorResponse = {
  statusCode: 429,
  error: 'Too Many Requests',
  message: 'Too many attempts, please try again later',
}

/**
 * Invalid or expired session error response (Requirement 2.6).
 */
const SESSION_INVALID_ERROR: ErrorResponse = {
  statusCode: 401,
  error: 'Unauthorized',
  message: 'Session is invalid or has expired',
}

/**
 * Checks if a response body indicates an authentication failure
 * and replaces it with a generic error to prevent information leakage.
 */
function sanitizeAuthErrorResponse(
  status: number,
  body: string,
): { status: number; body: string } | null {
  // Rate limit responses (Requirement 2.3)
  if (status === 429) {
    return {
      status: 429,
      body: JSON.stringify(RATE_LIMIT_ERROR),
    }
  }

  // Intercept 4xx auth-related errors
  if (status === 401 || status === 403 || status === 422) {
    try {
      const parsed = JSON.parse(body)

      // If parsed body is not an object, treat as unrecognized error and sanitize
      if (typeof parsed !== 'object' || parsed === null) {
        return {
          status: 401,
          body: JSON.stringify(GENERIC_AUTH_ERROR),
        }
      }

      // Invalid or expired session token (Requirement 2.6)
      if (
        parsed?.code === 'INVALID_SESSION' ||
        parsed?.code === 'SESSION_EXPIRED' ||
        parsed?.code === 'INVALID_TOKEN' ||
        parsed?.message?.toLowerCase().includes('session expired') ||
        parsed?.message?.toLowerCase().includes('invalid session') ||
        parsed?.message?.toLowerCase().includes('invalid token')
      ) {
        return {
          status: 401,
          body: JSON.stringify(SESSION_INVALID_ERROR),
        }
      }

      // Better Auth may return specific error messages about email/password.
      // Replace with generic error to prevent information leakage (Requirement 2.2).
      if (
        parsed?.code === 'INVALID_EMAIL_OR_PASSWORD' ||
        parsed?.code === 'USER_NOT_FOUND' ||
        parsed?.code === 'INVALID_PASSWORD' ||
        parsed?.code === 'INVALID_EMAIL' ||
        parsed?.message?.toLowerCase().includes('user not found') ||
        parsed?.message?.toLowerCase().includes('invalid password') ||
        parsed?.message?.toLowerCase().includes('invalid email')
      ) {
        return {
          status: 401,
          body: JSON.stringify(GENERIC_AUTH_ERROR),
        }
      }

      // Any other unrecognized 4xx auth error — sanitize to prevent leakage
      return {
        status: 401,
        body: JSON.stringify(GENERIC_AUTH_ERROR),
      }
    } catch {
      // If body isn't JSON, return generic auth error for safety
      return {
        status: 401,
        body: JSON.stringify(GENERIC_AUTH_ERROR),
      }
    }
  }

  return null
}

/**
 * Checks if the request URL matches the sign-in endpoint.
 */
function isSignInRequest(url: string): boolean {
  return url.includes('/sign-in/email')
}

/**
 * Checks if the request URL matches the sign-out endpoint.
 */
function isSignOutRequest(url: string): boolean {
  return url.includes('/sign-out')
}

/**
 * Extracts user information from a successful login response body.
 * Returns null if the body cannot be parsed or doesn't contain user data.
 */
function extractLoginUser(body: string): { id: string; email: string } | null {
  try {
    const parsed = JSON.parse(body)
    if (parsed?.user?.id && parsed?.user?.email) {
      return { id: parsed.user.id, email: parsed.user.email }
    }
    // Some Better Auth versions return the user at the top level
    if (parsed?.id && parsed?.email) {
      return { id: parsed.id, email: parsed.email }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Auth routes plugin.
 * NOT wrapped in fp() so the catch-all route stays encapsulated
 * within the /api/auth prefix and doesn't leak to the root scope.
 *
 * Adds audit logging for successful login events (Requirement 2.7)
 * and ensures logout invalidates session within 1 second (Requirement 2.4).
 */
async function authRoutes(fastify: FastifyInstance) {
  const { auth } = fastify

  async function handleBetterAuthRequest(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const webRequest = toWebRequest(request, fastify.env.AUTH_BASE_URL)
    const response = await auth.handler(webRequest)
    const body = await response.text()
    const sanitized = sanitizeAuthErrorResponse(response.status, body)
    if (sanitized) {
      reply.status(sanitized.status)
      reply.header('content-type', 'application/json')
      return reply.send(sanitized.body)
    }

    // Record audit log for successful login (Requirement 2.7)
    if (
      isSignInRequest(request.url) &&
      response.status >= 200 &&
      response.status < 300
    ) {
      const loginUser = extractLoginUser(body)
      if (loginUser) {
        fastify.auditLogger.log({
          actorId: loginUser.id,
          action: 'user.login',
          entityType: 'session',
          entityId: loginUser.id,
          ownerAccountId: loginUser.id,
          metadata: {
            ip: request.ip,
            userAgent: request.headers['user-agent'] || '',
            timestamp: new Date().toISOString(),
          },
        })
      }
    }

    // Record audit log for successful logout (Requirement 2.4)
    if (
      isSignOutRequest(request.url) &&
      request.method === 'POST' &&
      response.status >= 200 &&
      response.status < 300
    ) {
      // Extract user from the request context if available (session was valid before sign-out)
      const requestUser = (request as unknown as { user?: { id?: string } })
        .user
      if (requestUser?.id) {
        fastify.auditLogger.log({
          actorId: requestUser.id,
          action: 'user.logout',
          entityType: 'session',
          entityId: requestUser.id,
          ownerAccountId: requestUser.id,
          metadata: {
            ip: request.ip,
            userAgent: request.headers['user-agent'] || '',
            timestamp: new Date().toISOString(),
          },
        })
      }
    }

    // Copy response headers from Better Auth's response
    for (const [key, value] of response.headers.entries()) {
      reply.header(key, value)
    }

    reply.status(response.status)
    return reply.send(body)
  }

  // ─── Explicit OpenAPI schema stubs ───────────────────────────────────────
  // Fastify's schema system does not process catch-all routes for OpenAPI.
  // These four explicit route definitions sit BEFORE the catch-all so that
  // @fastify/swagger picks them up and includes them in the generated spec.
  // Each handler delegates to the same auth.handler() logic as the catch-all.

  // Sign-up stub for OpenAPI documentation
  fastify.post(
    '/sign-up/email',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Sign up with email',
        description:
          'Creates a new user account via Better Auth. Note: Use POST /api/register to create an Owner account with a session token.',
        security: [],
        body: z.object({
          email: z.string().email(),
          password: z.string().min(8),
          name: z.string(),
        }),
        response: {
          200: z.object({
            user: z.object({ id: z.string(), email: z.string() }),
            session: z.object({}).nullable(),
          }),
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return handleBetterAuthRequest(request, reply)
    },
  )

  // Sign-in stub for OpenAPI documentation
  fastify.post(
    '/sign-in/email',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Sign in with email',
        description:
          'Authenticates a user and returns a session token. The token can be used as a Bearer token in the Authorization header for protected endpoints.',
        security: [],
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
        response: {
          200: z.object({
            user: z.object({
              id: z.string(),
              email: z.string(),
              name: z.string().nullable().optional(),
              role: z.string().optional(),
            }),
            session: z.object({
              token: z
                .string()
                .describe(
                  'Use this as Bearer token for authenticated requests',
                ),
              expiresAt: dateTimeResponseSchema,
            }),
          }),
          401: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return handleBetterAuthRequest(request, reply)
    },
  )

  // Sign-out stub for OpenAPI documentation
  fastify.post(
    '/sign-out',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Sign out',
        description:
          'Invalidates the current session. Requires a valid Bearer token or session cookie.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({ success: z.boolean() }),
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return handleBetterAuthRequest(request, reply)
    },
  )

  // Get session stub for OpenAPI documentation
  fastify.get(
    '/get-session',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Get current session',
        description:
          'Returns the current session and user information if the session is valid.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({
            user: z
              .object({
                id: z.string(),
                email: z.string(),
                name: z.string().nullable().optional(),
                role: z.string().optional(),
              })
              .nullable(),
            session: z
              .object({
                token: z.string(),
                expiresAt: dateTimeResponseSchema,
              })
              .nullable(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // First try Better Auth
      const webRequest = toWebRequest(request, fastify.env.AUTH_BASE_URL)
      const response = await auth.handler(webRequest)
      const body = await response.text()

      // If Better Auth is successful and returns user, send that
      if (response.status >= 200 && response.status < 300) {
        try {
          const parsed = JSON.parse(body)
          if (parsed?.user) {
            for (const [key, value] of response.headers.entries()) {
              reply.header(key, value)
            }
            reply.status(response.status as 200 | 401)
            return reply.send(body)
          }
        } catch {}
      }

      // Fallback: check portal_session cookie
      const sessionId = request.cookies?.portal_session
      if (sessionId && fastify.db) {
        const portalSession = await fastify.db.query.portalSessions.findFirst({
          where: eq(portalSessions.id, sessionId),
          with: {
            renter: {
              with: {
                user: true,
              },
            },
          },
        })

        if (
          portalSession &&
          new Date(portalSession.expiresAt) > new Date() &&
          portalSession.renter?.user
        ) {
          const renterUser = portalSession.renter.user
          return reply.status(200).send({
            user: {
              id: renterUser.id,
              email: renterUser.email,
              name: renterUser.name || null,
              role: 'renter',
            },
            session: {
              token: portalSession.id,
              expiresAt: portalSession.expiresAt,
            },
          })
        }
      }

      // If no session found, return the Better Auth response (which will be 401 or null user)
      const sanitized = sanitizeAuthErrorResponse(response.status, body)
      if (sanitized) {
        reply.status(sanitized.status as 401 | 403 | 429)
        reply.header('content-type', 'application/json')
        return reply.send(sanitized.body)
      }

      for (const [key, value] of response.headers.entries()) {
        reply.header(key, value)
      }
      reply.status(response.status as 200 | 401)
      return reply.send(body)
    },
  )

  // ─── Catch-all ────────────────────────────────────────────────────────────
  // Catch-all route that delegates to Better Auth's handler.
  // Better Auth manages its own routing internally for auth endpoints.
  fastify.all('/*', async (request, reply) => {
    return handleBetterAuthRequest(request, reply)
  })
}

export default authRoutes
