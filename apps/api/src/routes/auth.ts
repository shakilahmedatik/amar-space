import type { FastifyInstance, FastifyRequest } from 'fastify'

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
 * Error responses are intercepted to ensure:
 * - Generic messages that don't reveal whether email or password was incorrect (Requirement 5.6)
 * - Proper rate-limit responses (Requirement 5.8)
 * - Invalid/expired session token rejection (Requirement 5.9)
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
 * Does not reveal whether email or password was incorrect (Requirement 5.6).
 */
const GENERIC_AUTH_ERROR: ErrorResponse = {
  statusCode: 401,
  error: 'Unauthorized',
  message: 'Invalid credentials',
}

/**
 * Rate limit error response (Requirement 5.8).
 */
const RATE_LIMIT_ERROR: ErrorResponse = {
  statusCode: 429,
  error: 'Too Many Requests',
  message: 'Too many attempts, please try again later',
}

/**
 * Invalid or expired session error response (Requirement 5.9).
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
  // Rate limit responses (Requirement 5.8)
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

      // Invalid or expired session token (Requirement 5.9)
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
      // Replace with generic error to prevent information leakage (Requirement 5.6).
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
 * Auth routes plugin.
 * NOT wrapped in fp() so the catch-all route stays encapsulated
 * within the /api/auth prefix and doesn't leak to the root scope.
 */
async function authRoutes(fastify: FastifyInstance) {
  const { auth } = fastify

  // Catch-all route that delegates to Better Auth's handler.
  // Better Auth manages its own routing internally for auth endpoints.
  fastify.all('/*', async (request, reply) => {
    const webRequest = toWebRequest(request, fastify.env.AUTH_BASE_URL)
    const response = await auth.handler(webRequest)

    const body = await response.text()

    // Sanitize auth error responses to prevent information leakage
    const sanitized = sanitizeAuthErrorResponse(response.status, body)

    if (sanitized) {
      reply.status(sanitized.status)
      reply.header('content-type', 'application/json')
      return reply.send(sanitized.body)
    }

    // Copy response headers from Better Auth's response
    for (const [key, value] of response.headers.entries()) {
      reply.header(key, value)
    }

    reply.status(response.status)
    return reply.send(body)
  })
}

export default authRoutes
