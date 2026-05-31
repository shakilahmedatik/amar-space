import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'
import { rateLimitStore } from '../../src/routes/auth/register'
import { validateRegistrationInput } from '../../src/services/registration'

describe('Registration Endpoint', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3001',
    R2_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET_NAME: 'test-bucket',
  }

  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }
    rateLimitStore.clear()
  })

  afterEach(() => {
    process.env = originalEnv
    rateLimitStore.clear()
  })

  describe('Input Validation (validateRegistrationInput)', () => {
    it('should accept valid email and password', () => {
      const result = validateRegistrationInput({
        email: 'Test@Example.COM',
        password: 'ValidPass1',
      })

      expect(result.email).toBe('test@example.com') // normalized to lowercase
      expect(result.password).toBe('ValidPass1')
    })

    it('should reject email exceeding 254 characters', () => {
      const longEmail = `${'a'.repeat(243)}@example.com` // 255 chars
      expect(() =>
        validateRegistrationInput({
          email: longEmail,
          password: 'ValidPass1',
        }),
      ).toThrow()
    })

    it('should reject invalid email format', () => {
      expect(() =>
        validateRegistrationInput({
          email: 'not-an-email',
          password: 'ValidPass1',
        }),
      ).toThrow()
    })

    it('should reject password shorter than 8 characters', () => {
      expect(() =>
        validateRegistrationInput({
          email: 'test@example.com',
          password: 'Ab1',
        }),
      ).toThrow()
    })

    it('should reject password longer than 128 characters', () => {
      const longPassword = `Ab1${'a'.repeat(126)}`
      expect(() =>
        validateRegistrationInput({
          email: 'test@example.com',
          password: longPassword,
        }),
      ).toThrow()
    })

    it('should reject password without uppercase letter', () => {
      expect(() =>
        validateRegistrationInput({
          email: 'test@example.com',
          password: 'lowercase1',
        }),
      ).toThrow()
    })

    it('should reject password without lowercase letter', () => {
      expect(() =>
        validateRegistrationInput({
          email: 'test@example.com',
          password: 'UPPERCASE1',
        }),
      ).toThrow()
    })

    it('should reject password without digit', () => {
      expect(() =>
        validateRegistrationInput({
          email: 'test@example.com',
          password: 'NoDigitHere',
        }),
      ).toThrow()
    })

    it('should normalize email to lowercase', () => {
      const result = validateRegistrationInput({
        email: 'USER@DOMAIN.COM',
        password: 'ValidPass1',
      })
      expect(result.email).toBe('user@domain.com')
    })

    it('should return field-level errors for multiple invalid fields', () => {
      try {
        validateRegistrationInput({
          email: 'invalid',
          password: 'short',
        })
        expect.fail('Should have thrown')
      } catch (error: unknown) {
        const err = error as { details: Array<{ field: string }> }
        expect(err.details).toBeDefined()
        const fields = err.details.map((e: { field: string }) => e.field)
        expect(fields).toContain('email')
        expect(fields).toContain('password')
      }
    })
  })

  describe('Route Registration', () => {
    it('should register POST /api/register route', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // Verify the route exists (not returning our custom 404)
      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: { email: 'test@example.com', password: 'ValidPass1' },
      })

      // Should not be 404 (route not found)
      expect(response.statusCode).not.toBe(404)

      await app.close()
    }, 15000)
  })

  describe('Rate Limiting', () => {
    it('should allow up to 10 registration attempts per IP', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // Mock auth to avoid actual DB calls
      const authApi = app.auth.api as Record<string, unknown>
      const originalSignUp = authApi.signUpEmail
      authApi.signUpEmail = async () => {
        return {
          token: 'test-token',
          user: { id: 'test-id', email: 'test@example.com', name: 'test' },
        }
      }

      // Mock signInEmail
      const originalSignIn = authApi.signInEmail
      authApi.signInEmail = async () => {
        return {
          redirect: false,
          token: 'session-token',
          user: { id: 'test-id', email: 'test@example.com' },
        }
      }

      // Mock db query to simulate no existing user
      const originalFindFirst = app.db.query.users.findFirst
      app.db.query.users.findFirst = (async () =>
        undefined) as unknown as typeof app.db.query.users.findFirst

      // Mock db update
      const originalUpdate = app.db.update
      app.db.update = (() => ({
        set: () => ({
          where: async () => undefined,
        }),
      })) as unknown as typeof app.db.update

      // Make 10 requests (should all succeed or fail for non-rate-limit reasons)
      for (let i = 0; i < 10; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/register',
          payload: {
            email: `user${i}@example.com`,
            password: 'ValidPass1',
          },
          remoteAddress: '192.168.1.1',
        })
        expect(response.statusCode).not.toBe(429)
      }

      // 11th request should be rate limited
      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: {
          email: 'user11@example.com',
          password: 'ValidPass1',
        },
        remoteAddress: '192.168.1.1',
      })

      expect(response.statusCode).toBe(429)

      authApi.signUpEmail = originalSignUp
      authApi.signInEmail = originalSignIn
      app.db.query.users.findFirst = originalFindFirst
      app.db.update = originalUpdate
      await app.close()
    }, 15000)

    it('should not rate limit different IPs', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // Mock auth
      const authApi = app.auth.api as Record<string, unknown>
      const originalSignUp = authApi.signUpEmail
      authApi.signUpEmail = async () => {
        return {
          token: 'test-token',
          user: { id: 'test-id', email: 'test@example.com', name: 'test' },
        }
      }

      const originalSignIn = authApi.signInEmail
      authApi.signInEmail = async () => {
        return {
          redirect: false,
          token: 'session-token',
          user: { id: 'test-id', email: 'test@example.com' },
        }
      }

      const originalFindFirst = app.db.query.users.findFirst
      app.db.query.users.findFirst = (async () =>
        undefined) as unknown as typeof app.db.query.users.findFirst

      const originalUpdate = app.db.update
      app.db.update = (() => ({
        set: () => ({
          where: async () => undefined,
        }),
      })) as unknown as typeof app.db.update

      // Fill up rate limit for IP 1
      for (let i = 0; i < 10; i++) {
        await app.inject({
          method: 'POST',
          url: '/api/register',
          payload: {
            email: `user${i}@example.com`,
            password: 'ValidPass1',
          },
          remoteAddress: '10.0.0.1',
        })
      }

      // Different IP should not be rate limited
      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: {
          email: 'user@example.com',
          password: 'ValidPass1',
        },
        remoteAddress: '10.0.0.2',
      })

      expect(response.statusCode).not.toBe(429)

      authApi.signUpEmail = originalSignUp
      authApi.signInEmail = originalSignIn
      app.db.query.users.findFirst = originalFindFirst
      app.db.update = originalUpdate
      await app.close()
    })
  })

  describe('Validation Error Responses', () => {
    it('should return 400 with field-level errors for invalid email', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: {
          email: 'not-valid',
          password: 'ValidPass1',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.message).toContain('Validation')

      await app.close()
    })

    it('should return 400 with field-level errors for invalid password', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: {
          email: 'valid@example.com',
          password: 'short',
        },
      })

      expect(response.statusCode).toBe(400)

      await app.close()
    })
  })

  describe('Duplicate Email Handling', () => {
    it('should return 409 for duplicate email', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // Mock db query to simulate existing user
      const originalFindFirst = app.db.query.users.findFirst
      app.db.query.users.findFirst = (async () => ({
        id: 'existing-id',
        email: 'test@example.com',
        name: 'Existing User',
        hashedPassword: 'hashed',
        emailVerified: false,
        role: 'owner',
        ownerAccountId: null,
        phone: null,
        languagePreference: 'bn',
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as unknown as typeof app.db.query.users.findFirst

      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: {
          email: 'test@example.com',
          password: 'ValidPass1',
        },
      })

      expect(response.statusCode).toBe(409)
      const body = response.json()
      expect(body.message).toContain('already exists')

      app.db.query.users.findFirst = originalFindFirst
      await app.close()
    })
  })

  describe('Successful Registration', () => {
    it('should return 201 with user and session on success', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // Mock db query - no existing user
      const originalFindFirst = app.db.query.users.findFirst
      app.db.query.users.findFirst = (async () =>
        undefined) as unknown as typeof app.db.query.users.findFirst

      // Mock Better Auth signUpEmail
      const authApi = app.auth.api as Record<string, unknown>
      const originalSignUp = authApi.signUpEmail
      authApi.signUpEmail = async () => {
        return {
          token: 'signup-token',
          user: { id: 'new-user-id', email: 'new@example.com', name: 'new' },
        }
      }

      // Mock Better Auth signInEmail for session creation
      const originalSignIn = authApi.signInEmail
      authApi.signInEmail = async () => {
        return {
          redirect: false,
          token: 'session-token-123',
          user: { id: 'new-user-id', email: 'new@example.com' },
        }
      }

      // Mock db update for role assignment
      const originalUpdate = app.db.update
      app.db.update = (() => ({
        set: () => ({
          where: async () => undefined,
        }),
      })) as unknown as typeof app.db.update

      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: {
          email: 'new@example.com',
          password: 'ValidPass1',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.user).toBeDefined()
      expect(body.user.id).toBe('new-user-id')
      expect(body.user.email).toBe('new@example.com')
      expect(body.user.role).toBe('owner')
      expect(body.session).toBeDefined()
      expect(body.session.token).toBe('session-token-123')

      app.db.query.users.findFirst = originalFindFirst
      authApi.signUpEmail = originalSignUp
      authApi.signInEmail = originalSignIn
      app.db.update = originalUpdate
      await app.close()
    })

    it('should return 201 with session error message when session creation fails', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      // Mock db query - no existing user
      const originalFindFirst = app.db.query.users.findFirst
      app.db.query.users.findFirst = (async () =>
        undefined) as unknown as typeof app.db.query.users.findFirst

      // Mock Better Auth signUpEmail - success
      const authApi = app.auth.api as Record<string, unknown>
      const originalSignUp = authApi.signUpEmail
      authApi.signUpEmail = async () => {
        return {
          token: null,
          user: { id: 'new-user-id', email: 'new@example.com', name: 'new' },
        }
      }

      // Mock Better Auth signInEmail - fails
      const originalSignIn = authApi.signInEmail
      authApi.signInEmail = async () => {
        throw new Error('Session creation failed')
      }

      // Mock db update
      const originalUpdate = app.db.update
      app.db.update = (() => ({
        set: () => ({
          where: async () => undefined,
        }),
      })) as unknown as typeof app.db.update

      const response = await app.inject({
        method: 'POST',
        url: '/api/register',
        payload: {
          email: 'new@example.com',
          password: 'ValidPass1',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.user).toBeDefined()
      expect(body.user.role).toBe('owner')
      expect(body.message).toContain('sign in manually')

      app.db.query.users.findFirst = originalFindFirst
      authApi.signUpEmail = originalSignUp
      authApi.signInEmail = originalSignIn
      app.db.update = originalUpdate
      await app.close()
    })
  })
})
