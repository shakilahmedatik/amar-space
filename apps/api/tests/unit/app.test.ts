import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildApp } from '../../src/app'

describe('App Factory and Global Error Handler', () => {
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

  describe('Global Error Handler - Zod Validation Errors', () => {
    it('should return 400 with field-level details for invalid request body', async () => {
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
      expect(body.details).toBeDefined()
      expect(Array.isArray(body.details)).toBe(true)
      expect(body.details.length).toBeGreaterThan(0)

      for (const detail of body.details) {
        expect(detail).toHaveProperty('field')
        expect(detail).toHaveProperty('rule')
        expect(detail).toHaveProperty('message')
      }

      await app.close()
    })

    it('should return 400 with details for missing required fields', async () => {
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
      expect(body.details).toBeDefined()
      expect(body.details.length).toBeGreaterThan(0)

      await app.close()
    })

    it('should return 400 with details for invalid query parameters', async () => {
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
      expect(body.details).toBeDefined()

      await app.close()
    })
  })

  describe('Global Error Handler - Known Operational Errors (4xx)', () => {
    it('should return 404 with consistent structure', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async (_request, reply) => {
          return reply.callNotFound()
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/nonexistent',
      })

      const body = response.json()

      expect(response.statusCode).toBe(404)
      expect(body.statusCode).toBe(404)
      expect(body.error).toBeDefined()
      expect(body.message).toBeDefined()
      // Should NOT have details for non-validation errors
      expect(body.details).toBeUndefined()

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
      expect(body.error).toBe('Error')
      expect(body.message).toBe('Resource not found')
      expect(body.details).toBeUndefined()

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

      await app.close()
    })

    it('should handle 403 errors with consistent structure', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          const error = new Error('Insufficient permissions') as Error & {
            statusCode: number
          }
          error.statusCode = 403
          throw error
        },
      })

      await app.ready()

      const response = await app.inject({
        method: 'GET',
        url: '/test',
        headers: {},
      })

      const body = response.json()

      expect(response.statusCode).toBe(403)
      expect(body.statusCode).toBe(403)
      expect(body.message).toBe('Insufficient permissions')

      await app.close()
    })
  })

  describe('Global Error Handler - 500 Error Sanitization', () => {
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

    it('should not expose internal module names in 500 responses', async () => {
      const app = buildApp({ logger: false })

      app.get('/test', {
        handler: async () => {
          const err = new Error('Internal failure')
          err.stack = `Error: Internal failure
    at Object.<anonymous> (/app/node_modules/drizzle-orm/src/query.ts:123:45)
    at Module._compile (node:internal/modules/cjs/loader:1234:14)`
          throw err
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
      expect(bodyStr).not.toContain('node_modules')
      expect(bodyStr).not.toContain('drizzle-orm')
      expect(bodyStr).not.toContain('Module._compile')

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
      expect(body.details).toBeUndefined()

      await app.close()
    })
  })
})
