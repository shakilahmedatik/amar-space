import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '@repo/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildApp } from '../../src/app'

describe('App Factory and Global Error Handler', () => {
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
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('buildApp', () => {
    it('should create a Fastify instance', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      expect(app).toBeDefined()
      expect(app.env).toBeDefined()

      await app.close()
    })

    it('should register the env plugin and decorate with env', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      expect(app.env.DATABASE_URL).toBe(validEnv.DATABASE_URL)
      expect(app.env.AUTH_SECRET).toBe(validEnv.AUTH_SECRET)

      await app.close()
    })
  })

  describe('requestId generation', () => {
    it('should include x-request-id header in every response', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', { handler: async () => ({ ok: true }) })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const requestId = response.headers['x-request-id']
      expect(requestId).toBeDefined()
      expect(typeof requestId).toBe('string')
      // UUID v4 format
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )

      await app.close()
    })

    it('should include requestId in error response bodies', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new NotFoundError('Widget')
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const body = response.json()
      expect(body.requestId).toBeDefined()
      expect(body.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
      expect(body.requestId).toBe(response.headers['x-request-id'])

      await app.close()
    })

    it('should generate unique requestIds for different requests', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', { handler: async () => ({ ok: true }) })

      await app.ready()

      const response1 = await app.inject({ method: 'GET', url: '/test' })
      const response2 = await app.inject({ method: 'GET', url: '/test' })

      expect(response1.headers['x-request-id']).not.toBe(
        response2.headers['x-request-id'],
      )

      await app.close()
    })
  })

  describe('AppError subclass mapping', () => {
    it('should map ValidationError to 400 with field errors', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new ValidationError([
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Too short' },
          ])
        },
      })

      await app.ready()

      const response = await app.inject({ method: 'GET', url: '/test' })
      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.statusCode).toBe(400)
      expect(body.error).toBe('Bad Request')
      expect(body.message).toBe('Validation failed')
      expect(body.requestId).toBeDefined()
      expect(body.errors).toHaveLength(2)
      expect(body.errors[0].field).toBe('email')
      expect(body.errors[0].message).toBe('Invalid email format')

      await app.close()
    })

    it('should map NotFoundError to 404', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new NotFoundError('Building', '123')
        },
      })

      await app.ready()

      const response = await app.inject({ method: 'GET', url: '/test' })
      const body = response.json()

      expect(response.statusCode).toBe(404)
      expect(body.statusCode).toBe(404)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('Building not found')
      expect(body.requestId).toBeDefined()

      await app.close()
    })

    it('should map ForbiddenError to 403', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new ForbiddenError()
        },
      })

      await app.ready()

      const response = await app.inject({ method: 'GET', url: '/test' })
      const body = response.json()

      expect(response.statusCode).toBe(403)
      expect(body.statusCode).toBe(403)
      expect(body.error).toBe('Forbidden')
      expect(body.message).toBe('Insufficient permissions')
      expect(body.requestId).toBeDefined()

      await app.close()
    })

    it('should map ConflictError to 409', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new ConflictError('Email already in use')
        },
      })

      await app.ready()

      const response = await app.inject({ method: 'GET', url: '/test' })
      const body = response.json()

      expect(response.statusCode).toBe(409)
      expect(body.statusCode).toBe(409)
      expect(body.error).toBe('Conflict')
      expect(body.message).toBe('Email already in use')
      expect(body.requestId).toBeDefined()

      await app.close()
    })

    it('should map RateLimitError to 429 with Retry-After header', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new RateLimitError(120)
        },
      })

      await app.ready()

      const response = await app.inject({ method: 'GET', url: '/test' })
      const body = response.json()

      expect(response.statusCode).toBe(429)
      expect(body.statusCode).toBe(429)
      expect(body.error).toBe('Too Many Requests')
      expect(body.requestId).toBeDefined()
      expect(response.headers['retry-after']).toBe('120')

      await app.close()
    })

    it('should map generic AppError to its status code', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new AppError(
            503,
            'SERVICE_UNAVAILABLE',
            'Service temporarily unavailable',
          )
        },
      })

      await app.ready()

      const response = await app.inject({ method: 'GET', url: '/test' })
      const body = response.json()

      expect(response.statusCode).toBe(503)
      expect(body.statusCode).toBe(503)
      expect(body.message).toBe('Service temporarily unavailable')
      expect(body.requestId).toBeDefined()

      await app.close()
    })
  })

  describe('Zod Validation Errors', () => {
    it('should return 400 with field-level errors for invalid request body', async () => {
      const app = buildApp({ logger: false })

      app.post('/test', {
        schema: {
          body: z.object({
            email: z.string().email(),
            age: z.number().min(18),
          }),
        },
        handler: async () => ({ ok: true }),
      })

      await app.ready()

      const response = await app.inject({
        method: 'POST',
        url: '/test',
        payload: { email: 'not-an-email', age: 5 },
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.statusCode).toBe(400)
      expect(body.error).toBe('Bad Request')
      expect(body.message).toBe('Validation failed')
      expect(body.requestId).toBeDefined()
      expect(body.errors).toBeDefined()
      expect(Array.isArray(body.errors)).toBe(true)
      expect(body.errors.length).toBeGreaterThan(0)

      for (const err of body.errors) {
        expect(err).toHaveProperty('field')
        expect(err).toHaveProperty('message')
      }

      await app.close()
    })

    it('should return 400 with errors for missing required fields', async () => {
      const app = buildApp({ logger: false })

      app.post('/test', {
        schema: {
          body: z.object({
            name: z.string(),
            email: z.string().email(),
          }),
        },
        handler: async () => ({ ok: true }),
      })

      await app.ready()

      const response = await app.inject({
        method: 'POST',
        url: '/test',
        payload: {},
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.statusCode).toBe(400)
      expect(body.error).toBe('Bad Request')
      expect(body.message).toBe('Validation failed')
      expect(body.requestId).toBeDefined()
      expect(body.errors).toBeDefined()
      expect(body.errors.length).toBeGreaterThan(0)

      await app.close()
    })

    it('should return 400 with errors for invalid query parameters', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        schema: {
          querystring: z.object({
            page: z.coerce.number().min(1),
          }),
        },
        handler: async () => ({ ok: true }),
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test?page=0',
      })

      const body = response.json()

      expect(response.statusCode).toBe(400)
      expect(body.statusCode).toBe(400)
      expect(body.error).toBe('Bad Request')
      expect(body.requestId).toBeDefined()
      expect(body.errors).toBeDefined()

      await app.close()
    })
  })

  describe('Body size limit', () => {
    it('should reject requests exceeding 7MB body size with 413', async () => {
      const app = buildApp({ logger: false })

      app.post('/test', {
        handler: async () => ({ ok: true }),
      })

      await app.ready()

      // Create a payload larger than 7MB (7_340_032 + 1)
      const largeBody = 'x'.repeat(7_340_033)

      const response = await app.inject({
        method: 'POST',
        url: '/test',
        payload: largeBody,
        headers: { 'content-type': 'application/json' },
      })

      const body = response.json()

      expect(response.statusCode).toBe(413)
      expect(body.statusCode).toBe(413)
      expect(body.error).toBe('Payload Too Large')
      expect(body.message).toBe('Request body exceeds the 5MB size limit')
      expect(body.requestId).toBeDefined()

      await app.close()
    })
  })

  describe('Known Operational Errors (4xx)', () => {
    it('should return 404 with consistent structure for unknown routes', async () => {
      const app = buildApp({ logger: false })
      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
      })

      const body = response.json()

      expect(response.statusCode).toBe(404)
      expect(body.statusCode).toBe(404)
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('Route not found')
      expect(body.requestId).toBeDefined()

      await app.close()
    })

    it('should pass through 4xx errors with consistent structure', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          const error = new Error('Resource not found') as Error & {
            statusCode: number
          }
          error.statusCode = 404
          throw error
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const body = response.json()

      expect(response.statusCode).toBe(404)
      expect(body.statusCode).toBe(404)
      expect(body.message).toBe('Resource not found')
      expect(body.requestId).toBeDefined()

      await app.close()
    })

    it('should handle 401 errors with consistent structure', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          const error = new Error('Unauthorized') as Error & {
            statusCode: number
          }
          error.statusCode = 401
          throw error
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const body = response.json()

      expect(response.statusCode).toBe(401)
      expect(body.statusCode).toBe(401)
      expect(body.message).toBe('Unauthorized')
      expect(body.requestId).toBeDefined()

      await app.close()
    })
  })

  describe('500 Error Sanitization', () => {
    it('should not expose stack traces in 500 responses', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new Error(
            'Something went wrong at /Users/dev/project/src/service.ts:42',
          )
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const body = response.json()
      const bodyStr = JSON.stringify(body)

      expect(response.statusCode).toBe(500)
      expect(body.statusCode).toBe(500)
      expect(body.error).toBe('Internal Server Error')
      expect(body.message).toBe('An unexpected error occurred')
      expect(body.requestId).toBeDefined()
      // Should NOT contain file paths
      expect(bodyStr).not.toContain('/Users/')
      expect(bodyStr).not.toContain('.ts:')
      expect(bodyStr).not.toContain('service.ts')

      await app.close()
    })

    it('should not expose database URLs in 500 responses', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new Error(
            'Connection failed: postgresql://admin:secret@db.host.com:5432/production',
          )
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const body = response.json()
      const bodyStr = JSON.stringify(body)

      expect(response.statusCode).toBe(500)
      expect(body.message).toBe('An unexpected error occurred')
      expect(bodyStr).not.toContain('postgresql://')
      expect(bodyStr).not.toContain('admin:secret')
      expect(bodyStr).not.toContain('db.host.com')

      await app.close()
    })

    it('should not expose environment variable values in 500 responses', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new Error(`Failed with secret: ${process.env.AUTH_SECRET}`)
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const body = response.json()
      const bodyStr = JSON.stringify(body)

      expect(response.statusCode).toBe(500)
      expect(body.message).toBe('An unexpected error occurred')
      expect(bodyStr).not.toContain(validEnv.AUTH_SECRET)

      await app.close()
    })

    it('should return generic message for any unhandled error', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          throw new TypeError('Cannot read properties of undefined')
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
      })

      const body = response.json()

      expect(response.statusCode).toBe(500)
      expect(body.statusCode).toBe(500)
      expect(body.error).toBe('Internal Server Error')
      expect(body.message).toBe('An unexpected error occurred')
      expect(body.requestId).toBeDefined()
      expect(body.errors).toBeUndefined()

      await app.close()
    })
  })
})
