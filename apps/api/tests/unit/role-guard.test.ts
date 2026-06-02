import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '../../src/middleware/auth-guard'
import { roleGuard } from '../../src/middleware/role-guard'

/**
 * Unit tests for the role guard middleware.
 *
 * Tests validate:
 * - Allowed role passes through
 * - Disallowed role gets 403
 * - Multiple allowed roles work correctly
 * - Response format matches ApiErrorResponse
 *
 */
describe('Role Guard Middleware', () => {
  let app: FastifyInstance

  /**
   * Helper to create a Fastify app with a fake auth guard that injects
   * a given user, followed by the roleGuard under test.
   */
  function buildApp(allowedRoles: AuthUser['role'][]) {
    const instance = Fastify({ logger: false })

    // Decorate request with user placeholder (matches auth-guard declaration)
    instance.decorateRequest('user', null as unknown as AuthUser)

    // Register a test route with roleGuard
    instance.get(
      '/test',
      {
        preHandler: [
          // Fake auth guard that injects user from custom header
          async (request) => {
            const role = request.headers['x-test-role'] as AuthUser['role']
            const userId =
              (request.headers['x-test-user-id'] as string) || 'user-1'
            request.user = {
              id: userId,
              role,
              ownerAccountId: 'owner-account-1',
              email: `${role}@example.com`,
            }
          },
          roleGuard(allowedRoles),
        ],
      },
      async (request) => {
        return { success: true, role: request.user.role }
      },
    )

    return instance
  }

  afterEach(async () => {
    if (app) {
      await app.close()
    }
  })

  describe('allowed role passes through', () => {
    it('should allow owner when owner is in allowed roles', async () => {
      app = buildApp(['owner'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'owner' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.role).toBe('owner')
    })

    it('should allow manager when manager is in allowed roles', async () => {
      app = buildApp(['manager'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'manager' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.role).toBe('manager')
    })

    it('should allow renter when renter is in allowed roles', async () => {
      app = buildApp(['renter'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'renter' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.role).toBe('renter')
    })
  })

  describe('disallowed role gets 403', () => {
    it('should return 403 when manager tries to access owner-only route', async () => {
      app = buildApp(['owner'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'manager' },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 403 when renter tries to access owner-only route', async () => {
      app = buildApp(['owner'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'renter' },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 403 when renter tries to access owner/manager route', async () => {
      app = buildApp(['owner', 'manager'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'renter' },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 403 when owner tries to access renter-only route', async () => {
      app = buildApp(['renter'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'owner' },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('multiple allowed roles work correctly', () => {
    it('should allow owner when allowed roles are owner and manager', async () => {
      app = buildApp(['owner', 'manager'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'owner' },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should allow manager when allowed roles are owner and manager', async () => {
      app = buildApp(['owner', 'manager'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'manager' },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should allow all roles when all three are specified', async () => {
      app = buildApp(['owner', 'manager', 'renter'])
      await app.ready()

      for (const role of ['owner', 'manager', 'renter'] as const) {
        const response = await app.inject({
          method: 'GET',
          url: '/test',
          headers: { 'x-test-role': role },
        })

        expect(response.statusCode).toBe(200)
        const body = response.json()
        expect(body.role).toBe(role)
      }
    })
  })

  describe('response format matches ApiErrorResponse', () => {
    it('should return correct ApiErrorResponse structure on 403', async () => {
      app = buildApp(['owner'])
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'renter' },
      })

      expect(response.statusCode).toBe(403)
      const body = response.json()

      // Validate ApiErrorResponse fields
      expect(body).toHaveProperty('requestId')
      expect(typeof body.requestId).toBe('string')
      expect(body.requestId.length).toBeGreaterThan(0)
      expect(body.statusCode).toBe(403)
      expect(body.error).toBe('Forbidden')
      expect(body.message).toBe('Insufficient permissions')
    })

    it('should include a unique requestId in the error response', async () => {
      app = buildApp(['owner'])
      await app.ready()

      const response1 = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'manager' },
      })

      const response2 = await app.inject({
        method: 'GET',
        url: '/test',
        headers: { 'x-test-role': 'renter' },
      })

      const body1 = response1.json()
      const body2 = response2.json()

      // Both should have requestId but they should be different
      expect(body1.requestId).toBeDefined()
      expect(body2.requestId).toBeDefined()
      expect(body1.requestId).not.toBe(body2.requestId)
    })
  })
})
