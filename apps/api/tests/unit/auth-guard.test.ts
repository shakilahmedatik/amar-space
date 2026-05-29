import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '../../src/middleware/auth-guard'
import { authGuard } from '../../src/middleware/auth-guard'

/**
 * Unit tests for the auth guard middleware.
 *
 * Tests validate:
 * - Session token extraction from cookie and Authorization header
 * - User context injection on valid session
 * - 401 response for missing/invalid/expired sessions
 * - Correct ownerAccountId resolution for different roles
 *
 * Requirements: 2.4, 2.6, 17.2
 */
describe('Auth Guard Middleware', () => {
  let app: FastifyInstance

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'owner@example.com',
    name: 'Test Owner',
    role: 'owner',
    ownerAccountId: null,
  }

  const mockManagerUser = {
    id: '660e8400-e29b-41d4-a716-446655440001',
    email: 'manager@example.com',
    name: 'Test Manager',
    role: 'manager',
    ownerAccountId: '550e8400-e29b-41d4-a716-446655440000',
  }

  const mockRenterUser = {
    id: '770e8400-e29b-41d4-a716-446655440002',
    email: 'renter@example.com',
    name: 'Test Renter',
    role: 'renter',
    ownerAccountId: '550e8400-e29b-41d4-a716-446655440000',
  }

  let mockGetSession: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    mockGetSession = vi.fn()

    app = Fastify({ logger: false })

    // Decorate with env (required by auth guard)
    app.decorate('env', {
      AUTH_BASE_URL: 'http://localhost:3001',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      AUTH_SECRET: 'a'.repeat(32),
      R2_ACCOUNT_ID: 'test',
      R2_ACCESS_KEY_ID: 'test',
      R2_SECRET_ACCESS_KEY: 'test',
      R2_BUCKET_NAME: 'test',
    })

    // Decorate with mock auth
    app.decorate('auth', {
      api: {
        getSession: mockGetSession,
      },
    })

    // Decorate request with user placeholder
    app.decorateRequest('user', null as unknown as AuthUser)

    // Register a protected test route
    app.get('/protected', { preHandler: [authGuard] }, async (request) => {
      return { user: request.user }
    })

    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    vi.restoreAllMocks()
  })

  describe('successful authentication', () => {
    it('should inject user context for a valid owner session via cookie', async () => {
      mockGetSession.mockResolvedValue({
        user: mockUser,
        session: {
          id: 'session-1',
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          cookie: 'better-auth.session_token=valid-token-123',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.user).toEqual({
        id: mockUser.id,
        role: 'owner',
        ownerAccountId: mockUser.id, // Owner's ownerAccountId is their own ID
        email: mockUser.email,
      })
    })

    it('should inject user context for a valid session via Authorization header', async () => {
      mockGetSession.mockResolvedValue({
        user: mockUser,
        session: {
          id: 'session-1',
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer valid-token-123',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.user.id).toBe(mockUser.id)
      expect(body.user.role).toBe('owner')
    })

    it('should set ownerAccountId to user ID for owner role', async () => {
      mockGetSession.mockResolvedValue({
        user: mockUser,
        session: {
          id: 'session-1',
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          cookie: 'better-auth.session_token=valid-token',
        },
      })

      const body = response.json()
      expect(body.user.ownerAccountId).toBe(mockUser.id)
    })

    it('should set ownerAccountId from user record for manager role', async () => {
      mockGetSession.mockResolvedValue({
        user: mockManagerUser,
        session: {
          id: 'session-2',
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          cookie: 'better-auth.session_token=valid-token',
        },
      })

      const body = response.json()
      expect(body.user.ownerAccountId).toBe(mockManagerUser.ownerAccountId)
      expect(body.user.role).toBe('manager')
    })

    it('should set ownerAccountId from user record for renter role', async () => {
      mockGetSession.mockResolvedValue({
        user: mockRenterUser,
        session: {
          id: 'session-3',
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          cookie: 'better-auth.session_token=valid-token',
        },
      })

      const body = response.json()
      expect(body.user.ownerAccountId).toBe(mockRenterUser.ownerAccountId)
      expect(body.user.role).toBe('renter')
      expect(body.user.email).toBe(mockRenterUser.email)
    })
  })

  describe('authentication failure', () => {
    it('should return 401 when no session token is provided', async () => {
      mockGetSession.mockResolvedValue(null)

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Authentication required')
      expect(body.requestId).toBeDefined()
    })

    it('should return 401 when session is invalid (null user)', async () => {
      mockGetSession.mockResolvedValue({ user: null, session: null })

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          cookie: 'better-auth.session_token=invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Authentication required')
    })

    it('should return 401 when Better Auth throws an error (expired session)', async () => {
      mockGetSession.mockRejectedValue(new Error('Session expired'))

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          cookie: 'better-auth.session_token=expired-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Session is invalid or has expired')
      expect(body.requestId).toBeDefined()
    })

    it('should return 401 when getSession returns undefined', async () => {
      mockGetSession.mockResolvedValue(undefined)

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer some-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })
  })

  describe('token extraction', () => {
    it('should pass headers to Better Auth getSession', async () => {
      mockGetSession.mockResolvedValue({
        user: mockUser,
        session: {
          id: 'session-1',
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          cookie: 'better-auth.session_token=my-token',
        },
      })

      expect(mockGetSession).toHaveBeenCalledTimes(1)
      const callArgs = mockGetSession.mock.calls[0][0]
      expect(callArgs.headers).toBeInstanceOf(Headers)
      expect(callArgs.headers.get('cookie')).toContain(
        'better-auth.session_token=my-token',
      )
    })

    it('should convert Bearer token to cookie for Better Auth compatibility', async () => {
      mockGetSession.mockResolvedValue({
        user: mockUser,
        session: {
          id: 'session-1',
          expiresAt: new Date(Date.now() + 86400000),
        },
      })

      await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          authorization: 'Bearer my-bearer-token',
        },
      })

      expect(mockGetSession).toHaveBeenCalledTimes(1)
      const callArgs = mockGetSession.mock.calls[0][0]
      expect(callArgs.headers.get('cookie')).toContain(
        'better-auth.session_token=my-bearer-token',
      )
    })
  })
})
