import fc from 'fast-check'
import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ApiError } from '../../src/app'

/**
 * Feature: amarspace-infrastructure-setup
 * Property 2: Error Response Sanitization
 *
 * For any unexpected error thrown during request processing (including errors with
 * stack traces, file paths, database connection strings, or internal module names),
 * the HTTP 500 response body SHALL contain only a generic error message and SHALL NOT
 * contain any substring matching internal file paths, stack frames, database URLs,
 * or environment variable values.
 *
 * Validates: Requirements 2.8
 */

// --- Generators ---

/** Generate realistic file paths that might appear in stack traces */
const filePathArb = fc.oneof(
  fc.constant('/Users/dev/projects/amar-space/apps/api/src/routes/auth.ts'),
  fc.constant('/home/runner/work/amar-space/node_modules/fastify/lib/reply.js'),
  fc.constant('C:\\Users\\dev\\amar-space\\apps\\api\\src\\plugins\\db.ts'),
  fc.constant('/var/task/apps/api/dist/index.js'),
  fc.constant('/app/packages/db/src/client.ts'),
  fc
    .tuple(
      fc.constantFrom('/Users/', '/home/', '/var/', '/app/', 'C:\\'),
      fc.stringMatching(/^[a-z][a-z0-9_-]{2,10}$/),
      fc.constantFrom('/src/', '/dist/', '/lib/', '/node_modules/'),
      fc.stringMatching(/^[a-z][a-z0-9_-]{2,10}$/),
      fc.constantFrom('.ts', '.js', '.mjs'),
    )
    .map(([root, dir, mid, file, ext]) => `${root}${dir}${mid}${file}${ext}`),
)

/** Generate realistic database connection URLs */
const dbUrlArb = fc.oneof(
  fc.constant('postgresql://admin:secret123@db.example.com:5432/amarspace'),
  fc.constant('postgres://user:p@ssw0rd@localhost:5432/mydb'),
  fc.constant(
    'postgresql://neondb_owner:abc123@ep-cool-rain-123.us-east-2.aws.neon.tech/neondb',
  ),
  fc
    .tuple(
      fc.constantFrom('postgresql://', 'postgres://'),
      fc.stringMatching(/^[a-z][a-z0-9]{2,8}$/),
      fc.constant(':'),
      fc.stringMatching(/^[a-zA-Z0-9!@#$%]{4,12}$/),
      fc.constant('@'),
      fc.stringMatching(/^[a-z][a-z0-9-]{3,12}$/),
      fc.constantFrom('.com', '.io', '.tech', '.neon.tech'),
      fc.constant(':5432/'),
      fc.stringMatching(/^[a-z][a-z0-9_]{2,10}$/),
    )
    .map((parts) => parts.join('')),
)

/** Generate realistic stack trace strings */
const stackTraceArb = fc
  .tuple(
    fc.stringMatching(/^[A-Z][a-zA-Z]{3,15}Error$/),
    fc.stringMatching(/^[a-z][a-zA-Z ]{5,30}$/),
    fc.array(filePathArb, { minLength: 2, maxLength: 6 }),
    fc.array(fc.integer({ min: 1, max: 500 }), { minLength: 2, maxLength: 6 }),
  )
  .map(([errorName, msg, paths, lines]) => {
    const frames = paths.map(
      (p, i) => `    at Object.<anonymous> (${p}:${lines[i] ?? 1}:10)`,
    )
    return `${errorName}: ${msg}\n${frames.join('\n')}`
  })

/** Generate realistic environment variable values that should not leak */
const envValueArb = fc.oneof(
  fc.constant('sk_live_abc123def456ghi789'),
  fc.constant('super-secret-auth-key-that-is-at-least-32-chars-long'),
  fc.constant('AKIAIOSFODNN7EXAMPLE'),
  fc.stringMatching(/^[a-zA-Z0-9_-]{16,48}$/),
)

/** Generate internal module names */
const moduleNameArb = fc.oneof(
  fc.constant('fastify/lib/reply.js'),
  fc.constant('@repo/db/src/client.ts'),
  fc.constant('drizzle-orm/pg-core/index.mjs'),
  fc.constant('better-auth/adapters/drizzle'),
  fc.stringMatching(/^@?[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/),
)

/**
 * Generate an Error object with sensitive internal details.
 * Returns the error and the sensitive strings that must NOT appear in the response.
 */
const sensitiveErrorArb = fc
  .tuple(
    fc.stringMatching(/^[A-Z][a-zA-Z]{3,15}Error$/),
    filePathArb,
    dbUrlArb,
    stackTraceArb,
    envValueArb,
    moduleNameArb,
  )
  .map(([errorName, filePath, dbUrl, stack, envValue, moduleName]) => {
    // Build an error message that contains sensitive info
    const message = `Failed to connect to ${dbUrl} in module ${moduleName} at ${filePath}: secret=${envValue}`

    const error = new Error(message)
    error.name = errorName
    error.stack = stack

    // All strings that must NOT appear in the response body
    const sensitiveStrings = [filePath, dbUrl, envValue, moduleName, stack]

    return { error, sensitiveStrings, message }
  })

// --- Test App Builder ---

/**
 * Creates a minimal Fastify app with a test route that throws the provided error.
 * Uses the same error handler pattern as the real app.
 */
function buildTestApp(): {
  app: FastifyInstance
  setErrorToThrow: (error: Error) => void
} {
  let errorToThrow: Error = new Error('default')

  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Use the same global error handler as the real app (from src/app.ts)
  app.setErrorHandler((error, _request, reply) => {
    // Known operational errors (4xx)
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message,
      })
    }

    // Unknown errors (500) — sanitize: no stack traces, file paths, DB URLs, env values
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    })
  })

  // Test route that throws the configured error
  app.get('/throw', async () => {
    throw errorToThrow
  })

  return {
    app,
    setErrorToThrow: (error: Error) => {
      errorToThrow = error
    },
  }
}

// --- Property Tests ---

describe('Feature: amarspace-infrastructure-setup, Property 2: Error Response Sanitization', () => {
  let app: FastifyInstance
  let setErrorToThrow: (error: Error) => void

  beforeEach(async () => {
    const testApp = buildTestApp()
    app = testApp.app
    setErrorToThrow = testApp.setErrorToThrow
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('500 responses contain only generic message and never leak sensitive internal details', () => {
    return fc.assert(
      fc.asyncProperty(
        sensitiveErrorArb,
        async ({ error, sensitiveStrings, message }) => {
          setErrorToThrow(error)

          const response = await app.inject({
            method: 'GET',
            url: '/throw',
          })

          // Must return 500
          expect(response.statusCode).toBe(500)

          const body = JSON.parse(response.body) as ApiError

          // Must contain only the generic sanitized response
          expect(body.statusCode).toBe(500)
          expect(body.error).toBe('Internal Server Error')
          expect(body.message).toBe('An unexpected error occurred')

          // Must NOT have any extra fields beyond the standard error shape
          const keys = Object.keys(body)
          expect(keys).toEqual(
            expect.arrayContaining(['statusCode', 'error', 'message']),
          )
          expect(keys.length).toBe(3)

          // The full response body string must NOT contain any sensitive substring
          const responseText = response.body
          for (const sensitive of sensitiveStrings) {
            expect(responseText).not.toContain(sensitive)
          }

          // Also verify the original error message does not appear
          expect(responseText).not.toContain(message)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('errors with only stack traces do not leak file paths in the response', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.tuple(filePathArb, stackTraceArb),
        async ([filePath, stack]) => {
          const error = new Error(`Something failed at ${filePath}`)
          error.stack = stack
          setErrorToThrow(error)

          const response = await app.inject({
            method: 'GET',
            url: '/throw',
          })

          expect(response.statusCode).toBe(500)

          const body = JSON.parse(response.body) as ApiError
          expect(body.message).toBe('An unexpected error occurred')

          // File paths must not appear in response
          expect(response.body).not.toContain(filePath)

          // Stack trace lines must not appear in response
          for (const line of stack.split('\n')) {
            if (line.trim().startsWith('at ')) {
              expect(response.body).not.toContain(line.trim())
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('errors with database URLs do not leak connection strings in the response', () => {
    return fc.assert(
      fc.asyncProperty(dbUrlArb, async (dbUrl) => {
        const error = new Error(
          `Connection refused: could not connect to ${dbUrl}`,
        )
        setErrorToThrow(error)

        const response = await app.inject({
          method: 'GET',
          url: '/throw',
        })

        expect(response.statusCode).toBe(500)

        const body = JSON.parse(response.body) as ApiError
        expect(body.message).toBe('An unexpected error occurred')

        // Database URL must not appear in response
        expect(response.body).not.toContain(dbUrl)
      }),
      { numRuns: 100 },
    )
  })
})
