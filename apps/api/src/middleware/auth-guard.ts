import type { ApiErrorResponse } from '@repo/shared/types'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * User context injected into the request by the auth guard middleware.
 */
export interface AuthUser {
  id: string
  role: 'owner' | 'manager' | 'renter'
  ownerAccountId: string
  email: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser
  }
}

/**
 * Constructs a Web API Request from Fastify's request object.
 * Better Auth's getSession expects standard Web API Headers.
 */
function toWebHeaders(request: FastifyRequest, _baseURL: string): Headers {
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

  // If the session token is in the Authorization header as a Bearer token,
  // also set it as a cookie for Better Auth compatibility
  const authHeader = request.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const existingCookie = headers.get('cookie') || ''
    const sessionCookie = `better-auth.session_token=${token}`
    headers.set(
      'cookie',
      existingCookie ? `${existingCookie}; ${sessionCookie}` : sessionCookie,
    )
  }

  return headers
}

/**
 * Auth guard preHandler middleware.
 *
 * Extracts the session token from cookie or Authorization header,
 * validates the session via Better Auth, and injects user context
 * (id, role, ownerAccountId, email) into the request.
 *
 * Returns 401 for invalid, expired, or missing sessions.
 *
 * Usage:
 * ```typescript
 * import { authGuard } from '../middleware/auth-guard'
 * app.get('/protected', { preHandler: [authGuard] }, handler)
 * ```
 *
 * Requirements: 2.4, 2.6, 17.2
 */
export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { auth, env } = request.server

  const headers = toWebHeaders(request, env.AUTH_BASE_URL)

  try {
    const session = await auth.api.getSession({ headers })

    if (!session?.user) {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      }
      reply.status(401).send(response)
      return
    }

    const user = session.user as Record<string, unknown>

    // For owners, ownerAccountId is their own ID (they ARE the owner account)
    const role = (user.role as string) || 'owner'
    const ownerAccountId =
      role === 'owner'
        ? (user.id as string)
        : (user.ownerAccountId as string) || (user.id as string)

    request.user = {
      id: user.id as string,
      role: role as 'owner' | 'manager' | 'renter',
      ownerAccountId,
      email: user.email as string,
    }
  } catch {
    const response: ApiErrorResponse = {
      requestId: request.id,
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Session is invalid or has expired',
    }
    reply.status(401).send(response)
  }
}
