import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'

describe('Auth Routes', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3001',
  }

  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Route Registration', () => {
    it('should register auth routes under /api/auth prefix', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // The auth routes plugin should be registered
      expect(app.hasPlugin('auth-routes')).toBe(true)

      await app.close()
    })
  })

  describe('Error Response Sanitization', () => {
    it('should return generic error for invalid credentials (wrong password)', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // Mock the auth handler to simulate a "wrong password" response from Better Auth
      const originalHandler = app.auth.handler
      app.auth.handler = async () => {
        return new Response(
          JSON.stringify({
            code: 'INVALID_PASSWORD',
            message: 'Invalid password',
          }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        )
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'test@example.com', password: 'wrong' },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Invalid credentials')
      // Should NOT reveal that the password was wrong
      expect(body.message).not.toContain('password')

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should return generic error for non-existent email', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler
      app.auth.handler = async () => {
        return new Response(
          JSON.stringify({ code: 'USER_NOT_FOUND', message: 'User not found' }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        )
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'nonexistent@example.com', password: 'test123' },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Invalid credentials')
      // Should NOT reveal that the user doesn't exist
      expect(body.message).not.toContain('not found')
      expect(body.message).not.toContain('user')

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should return identical error for wrong email and wrong password', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler

      // Simulate wrong email
      app.auth.handler = async () => {
        return new Response(
          JSON.stringify({ code: 'USER_NOT_FOUND', message: 'User not found' }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        )
      }

      const wrongEmailResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'wrong@example.com', password: 'test123' },
      })

      // Simulate wrong password
      app.auth.handler = async () => {
        return new Response(
          JSON.stringify({
            code: 'INVALID_PASSWORD',
            message: 'Invalid password',
          }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        )
      }

      const wrongPasswordResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'test@example.com', password: 'wrong' },
      })

      const wrongEmailBody = wrongEmailResponse.json()
      const wrongPasswordBody = wrongPasswordResponse.json()

      // Both responses should be identical
      expect(wrongEmailResponse.statusCode).toBe(
        wrongPasswordResponse.statusCode,
      )
      expect(wrongEmailBody).toEqual(wrongPasswordBody)

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should return rate limit error for 429 responses', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler
      app.auth.handler = async () => {
        return new Response(
          JSON.stringify({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
          }),
          { status: 429, headers: { 'content-type': 'application/json' } },
        )
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'test@example.com', password: 'test123' },
      })

      const body = response.json()

      expect(response.statusCode).toBe(429)
      expect(body.statusCode).toBe(429)
      expect(body.error).toBe('Too Many Requests')
      expect(body.message).toBe('Too many attempts, please try again later')

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should return session invalid error for expired sessions', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler
      app.auth.handler = async () => {
        return new Response(
          JSON.stringify({
            code: 'SESSION_EXPIRED',
            message: 'Session has expired',
          }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        )
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/get-session',
        headers: { authorization: 'Bearer expired-token' },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Session is invalid or has expired')

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should return session invalid error for invalid tokens', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler
      app.auth.handler = async () => {
        return new Response(
          JSON.stringify({
            code: 'INVALID_TOKEN',
            message: 'Token is invalid',
          }),
          { status: 401, headers: { 'content-type': 'application/json' } },
        )
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/get-session',
        headers: { authorization: 'Bearer invalid-token-xyz' },
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Session is invalid or has expired')

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should pass through successful responses from Better Auth', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler
      const successPayload = {
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
        session: { token: 'abc123', expiresAt: '2025-01-01T00:00:00Z' },
      }

      app.auth.handler = async () => {
        return new Response(JSON.stringify(successPayload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'test@example.com', password: 'correct-password' },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.user.email).toBe('test@example.com')
      expect(body.session.token).toBe('abc123')

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should handle non-JSON error bodies safely', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler
      app.auth.handler = async () => {
        return new Response('Unauthorized', {
          status: 401,
          headers: { 'content-type': 'text/plain' },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'test@example.com', password: 'test' },
      })

      const body = response.json()

      // Non-JSON 401 bodies should be sanitized to generic error
      expect(response.statusCode).toBe(401)
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Invalid credentials')

      app.auth.handler = originalHandler
      await app.close()
    })

    it('should copy response headers from successful Better Auth responses', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const originalHandler = app.auth.handler
      app.auth.handler = async () => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'set-cookie': 'session=abc123; HttpOnly; Secure',
          },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/email',
        payload: { email: 'test@example.com', password: 'correct' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['set-cookie']).toBe(
        'session=abc123; HttpOnly; Secure',
      )

      app.auth.handler = originalHandler
      await app.close()
    })
  })
})
