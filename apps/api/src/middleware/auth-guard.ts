import { portalSessions } from '@repo/db'
import type { ApiErrorResponse } from '@repo/shared/types'
import { eq } from 'drizzle-orm'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * User context injected into the request by the auth guard middleware.
 */
export interface AuthUser {
  id: string
  role:
    | 'superadmin'
    | 'owner'
    | 'manager'
    | 'security_guard'
    | 'care_taker'
    | 'renter'
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
 * Attempt portal session authentication.
 * Checks for a portal_session cookie and validates it against the database.
 * Returns the user context if valid, or null if no valid portal session exists.
 */
async function authenticatePortalSession(
  request: FastifyRequest,
): Promise<AuthUser | null> {
  const portalSessionId = request.cookies?.portal_session
  if (!portalSessionId) return null

  const db = request.server.db

  try {
    const portalSession = await db.query.portalSessions.findFirst({
      where: eq(portalSessions.id, portalSessionId),
      with: {
        renter: {
          with: {
            user: true,
          },
        },
      },
    })

    if (!portalSession) return null

    // Check if session has expired
    const now = new Date()
    if (portalSession.expiresAt <= now) return null

    const renter = portalSession.renter as {
      user: {
        id: string
        email: string
        ownerAccountId: string
        isActive?: boolean
      }
    }

    if (!renter?.user) return null

    return {
      id: renter.user.id,
      role: 'renter',
      ownerAccountId: renter.user.ownerAccountId,
      email: renter.user.email,
      approvalStatus: 'approved',
      isActive: renter.user.isActive ?? true,
    }
  } catch {
    return null
  }
}

/**
 * Checks if the request should be treated as a portal request.
 * A request is a portal request if:
 * - The x-portal-request header is set to 'true', OR
 * - The URL starts with /api/portal/
 */
function isPortalRequest(request: FastifyRequest): boolean {
  if (request.headers['x-portal-request'] === 'true') return true
  if (request.url.startsWith('/api/portal/')) return true
  return false
}

/**
 * Auth guard preHandler middleware.
 *
 * Extracts the session token from cookie or Authorization header,
 * validates the session via Better Auth, and injects user context
 * (id, role, ownerAccountId, email) into the request.
 *
 * Portal session support:
 * - If the request is a portal request (x-portal-request header or /api/portal/ URL),
 *   portal session authentication takes priority over Better Auth.
 * - If Better Auth fails for a non-portal request, portal session is tried as fallback.
 *
 * Returns 401 for invalid, expired, or missing sessions.
 *
 * Usage:
 * ```typescript
 * import { authGuard } from '../middleware/auth-guard'
 * app.get('/protected', { preHandler: [authGuard] }, handler)
 * ```
 */
export async function authGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply | undefined> {
  const { auth, env } = request.server

  // ── Portal request path ──────────────────────────────────────────────
  // If this is explicitly a portal request, try portal session first
  if (isPortalRequest(request)) {
    const portalUser = await authenticatePortalSession(request)
    if (portalUser) {
      request.user = portalUser
      return
    }
    // Portal session not found/expired — fall through to Better Auth
  }

  const headers = toWebHeaders(request, env.AUTH_BASE_URL)

  try {
    const session = await auth.api.getSession({ headers })

    if (!session?.user) {
      // ── Fallback: try portal session if Better Auth fails ──────
      // This handles non-portal-prefixed requests that carry a portal_session cookie
      // but don't have a valid Better Auth session (e.g. renter accessing via portal)
      if (!isPortalRequest(request)) {
        const portalUser = await authenticatePortalSession(request)
        if (portalUser) {
          request.user = portalUser
          return
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
