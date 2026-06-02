import { portalSessions } from '@repo/db'
import type { ApiErrorResponse } from '@repo/shared/types'
import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * User context injected into the request by the auth guard middleware.
 */
export interface AuthUser {
  id: string
  role: 'superadmin' | 'owner' | 'manager' | 'renter'
  ownerAccountId: string
  email: string
  approvalStatus?: 'pending' | 'approved' | 'rejected'
  isActive?: boolean
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
): Promise<FastifyReply | undefined> {
  const { auth, env } = request.server

  const headers = toWebHeaders(request, env.AUTH_BASE_URL)

  const isPortalRequest =
    request.headers['x-portal-request'] === 'true' ||
    request.url.startsWith('/api/portal/')

  try {
    if (isPortalRequest) {
      // Prioritize portal session check for portal requests to avoid conflicts with owner/manager Better Auth sessions
      const sessionId = request.cookies?.portal_session
      if (sessionId && request.server.db) {
        const portalSession =
          await request.server.db.query.portalSessions.findFirst({
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
          request.user = {
            id: renterUser.id,
            role: 'renter',
            ownerAccountId: renterUser.ownerAccountId ?? '',
            email: renterUser.email,
            approvalStatus: 'approved',
            isActive: renterUser.isActive ?? true,
          }
          return
        }
      }
    }

    const session = await auth.api.getSession({ headers })

    if (!session?.user) {
      // Fallback: check portal_session cookie if not checked already
      if (!isPortalRequest) {
        const sessionId = request.cookies?.portal_session
        if (sessionId && request.server.db) {
          const portalSession =
            await request.server.db.query.portalSessions.findFirst({
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
            request.user = {
              id: renterUser.id,
              role: 'renter',
              ownerAccountId: renterUser.ownerAccountId ?? '',
              email: renterUser.email,
              approvalStatus: 'approved',
              isActive: renterUser.isActive ?? true,
            }
            return
          }
        }
      }

      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      }
      return reply.status(401).send(response)
    }

    const user = session.user as Record<string, unknown>

    // Check if the user account is deactivated
    if (user.isActive === false) {
      // Invalidate the current session via better-auth API
      const sessionToken = (session.session as Record<string, unknown>)
        ?.token as string | undefined
      if (sessionToken) {
        try {
          await auth.api.revokeSession({
            headers,
            body: { token: sessionToken },
          })
        } catch {
          // Best-effort session invalidation — continue with 401 regardless
        }
      }

      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Account is deactivated',
      }
      return reply.status(401).send(response)
    }

    // For owners, ownerAccountId is their own ID (they ARE the owner account)
    const role = (user.role as string) || 'owner'
    const ownerAccountId =
      role === 'owner'
        ? (user.id as string)
        : (user.ownerAccountId as string) || (user.id as string)

    request.user = {
      id: user.id as string,
      role: role as AuthUser['role'],
      ownerAccountId,
      email: user.email as string,
      approvalStatus: user.approvalStatus as
        | 'pending'
        | 'approved'
        | 'rejected'
        | undefined,
      isActive: user.isActive as boolean | undefined,
    }
  } catch {
    const response: ApiErrorResponse = {
      requestId: request.id,
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Session is invalid or has expired',
    }
    return reply.status(401).send(response)
  }
}
