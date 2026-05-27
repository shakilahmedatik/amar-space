import fc from 'fast-check'
import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import envPlugin, { envSchema } from '../../src/plugins/env'

/**
 * Feature: amarspace-infrastructure-setup
 * Property 10: Environment Validation Completeness
 *
 * For any set of environment variables: if all required variables are present
 * with valid formats, startup SHALL succeed; if any required variable is missing
 * or has an invalid format, the system SHALL log each specific issue to stderr
 * and terminate with a non-zero exit code. Additionally, for any variable defined
 * at both root and application level, the application-level value SHALL take precedence.
 *
 * Validates: Requirements 8.1, 8.3, 8.5, 8.6
 */

// --- Generators ---

/** Generate a valid URL string (http/https only, which Zod accepts) */
const validUrlArb = fc.oneof(
  fc
    .tuple(
      fc.constantFrom('http', 'https'),
      fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
      fc.constantFrom('.com', '.io', '.dev', '.local', '.org'),
      fc.option(
        fc.integer({ min: 1, max: 65535 }).map((p) => `:${p}`),
        {
          nil: undefined,
        },
      ),
    )
    .map(
      ([scheme, host, tld, port]) => `${scheme}://${host}${tld}${port ?? ''}`,
    ),
  fc.constant('postgresql://user:pass@localhost:5432/db'),
)

/** Generate a valid AUTH_SECRET (min 32 chars) */
const validAuthSecretArb = fc
  .string({ minLength: 32, maxLength: 64, unit: 'grapheme' })
  .map((s) => s.replace(/[^a-zA-Z0-9]/g, 'x'))
  .filter((s) => s.length >= 32)

/** Generate a valid DB_POOL_SIZE (1-20) */
const validPoolSizeArb = fc.integer({ min: 1, max: 20 }).map(String)

/** Generate a valid DB_IDLE_TIMEOUT (1000-60000) */
const validIdleTimeoutArb = fc.integer({ min: 1000, max: 60000 }).map(String)

/** Generate a valid DB_CONNECTION_TIMEOUT (1000-10000) */
const validConnectionTimeoutArb = fc
  .integer({ min: 1000, max: 10000 })
  .map(String)

/** Generate a valid NODE_ENV */
const validNodeEnvArb = fc.constantFrom('development', 'production', 'test')

/** Generate a complete valid env var set */
const validEnvArb = fc
  .tuple(
    validUrlArb,
    validAuthSecretArb,
    validUrlArb,
    fc.option(validPoolSizeArb, { nil: undefined }),
    fc.option(validIdleTimeoutArb, { nil: undefined }),
    fc.option(validConnectionTimeoutArb, { nil: undefined }),
    fc.option(validNodeEnvArb, { nil: undefined }),
  )
  .map(
    ([
      databaseUrl,
      authSecret,
      authBaseUrl,
      poolSize,
      idleTimeout,
      connTimeout,
      nodeEnv,
    ]) => {
      const env: Record<string, string> = {
        DATABASE_URL: databaseUrl,
        AUTH_SECRET: authSecret,
        AUTH_BASE_URL: authBaseUrl,
        R2_ACCOUNT_ID: 'test-account-id',
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
        R2_BUCKET_NAME: 'test-bucket',
      }
      if (poolSize !== undefined) env.DB_POOL_SIZE = poolSize
      if (idleTimeout !== undefined) env.DB_IDLE_TIMEOUT = idleTimeout
      if (connTimeout !== undefined) env.DB_CONNECTION_TIMEOUT = connTimeout
      if (nodeEnv !== undefined) env.NODE_ENV = nodeEnv
      return env
    },
  )

/**
 * Generate a string that is NOT a valid URL.
 * Zod uses `new URL()` internally, so we need strings that truly fail URL parsing.
 */
const invalidUrlArb = fc
  .oneof(
    fc.constant(''),
    fc.constant('not-a-url'),
    fc.constant('just-text'),
    fc.constant('://no-scheme.com'),
    fc.constant('missing-colon//host.com'),
    fc.constant('/relative/path'),
    fc.constant('no-dots'),
    fc.stringMatching(/^[a-z]{1,10}$/),
  )
  .filter((s) => {
    try {
      new URL(s)
      return false
    } catch {
      return true
    }
  })

/** Generate an invalid AUTH_SECRET (too short, 0-31 chars) */
const invalidAuthSecretArb = fc.string({ minLength: 0, maxLength: 31 })

/** Generate an invalid DB_POOL_SIZE (outside 1-20) */
// const invalidPoolSizeArb = fc.oneof(
//   fc.integer({ min: -100, max: 0 }).map(String),
//   fc.integer({ min: 21, max: 1000 }).map(String),
//   fc.constant('abc'),
// )

/** Generate an invalid DB_IDLE_TIMEOUT (outside 1000-60000) */
// const invalidIdleTimeoutArb = fc.oneof(
//   fc.integer({ min: 0, max: 999 }).map(String),
//   fc.integer({ min: 60001, max: 100000 }).map(String),
//   fc.constant('abc'),
// )

/** Generate an invalid DB_CONNECTION_TIMEOUT (outside 1000-10000) */
// const invalidConnectionTimeoutArb = fc.oneof(
//   fc.integer({ min: 0, max: 999 }).map(String),
//   fc.integer({ min: 10001, max: 100000 }).map(String),
//   fc.constant('abc'),
// )

/** Generate an invalid NODE_ENV */
// const invalidNodeEnvArb = fc
//   .stringMatching(/^[a-z]{1,20}$/)
//   .filter((s) => !['development', 'production', 'test'].includes(s))

// Required variable names
const REQUIRED_VARS = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'AUTH_BASE_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
] as const

describe('Feature: amarspace-infrastructure-setup, Property 10: Environment Validation Completeness', () => {
  describe('Schema validation properties', () => {
    it('valid env vars always pass schema validation', () => {
      fc.assert(
        fc.property(validEnvArb, (env) => {
          const result = envSchema.safeParse(env)
          expect(result.success).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('missing any required variable causes validation failure', () => {
      fc.assert(
        fc.property(
          validEnvArb,
          fc.constantFrom(...REQUIRED_VARS),
          (env, missingVar) => {
            const envWithMissing = { ...env }
            delete envWithMissing[missingVar]

            const result = envSchema.safeParse(envWithMissing)
            expect(result.success).toBe(false)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('invalid DATABASE_URL format causes validation failure', () => {
      fc.assert(
        fc.property(validEnvArb, invalidUrlArb, (env, badUrl) => {
          const envWithBadUrl = { ...env, DATABASE_URL: badUrl }
          const result = envSchema.safeParse(envWithBadUrl)
          expect(result.success).toBe(false)
        }),
        { numRuns: 100 },
      )
    })

    it('invalid AUTH_SECRET (too short) causes validation failure', () => {
      fc.assert(
        fc.property(validEnvArb, invalidAuthSecretArb, (env, badSecret) => {
          const envWithBadSecret = { ...env, AUTH_SECRET: badSecret }
          const result = envSchema.safeParse(envWithBadSecret)
          expect(result.success).toBe(false)
        }),
        { numRuns: 100 },
      )
    })

    it('invalid AUTH_BASE_URL format causes validation failure', () => {
      fc.assert(
        fc.property(validEnvArb, invalidUrlArb, (env, badUrl) => {
          const envWithBadUrl = { ...env, AUTH_BASE_URL: badUrl }
          const result = envSchema.safeParse(envWithBadUrl)
          expect(result.success).toBe(false)
        }),
        { numRuns: 100 },
      )
    })

    it('invalid optional vars cause validation failure when present', () => {
      fc.assert(
        fc.property(
          validEnvArb,
          fc.constantFrom(
            'DB_POOL_SIZE',
            'DB_IDLE_TIMEOUT',
            'DB_CONNECTION_TIMEOUT',
            'NODE_ENV',
          ),
          fc.nat(),
          (env, field, seed) => {
            const envCopy = { ...env }

            if (field === 'DB_POOL_SIZE') {
              envCopy[field] = seed % 2 === 0 ? '0' : '21'
            } else if (field === 'DB_IDLE_TIMEOUT') {
              envCopy[field] = seed % 2 === 0 ? '500' : '70000'
            } else if (field === 'DB_CONNECTION_TIMEOUT') {
              envCopy[field] = seed % 2 === 0 ? '500' : '20000'
            } else if (field === 'NODE_ENV') {
              envCopy[field] = 'staging'
            }

            const result = envSchema.safeParse(envCopy)
            expect(result.success).toBe(false)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('optional vars use defaults when not provided', () => {
      fc.assert(
        fc.property(
          validUrlArb,
          validAuthSecretArb,
          validUrlArb,
          (dbUrl, secret, baseUrl) => {
            const env = {
              DATABASE_URL: dbUrl,
              AUTH_SECRET: secret,
              AUTH_BASE_URL: baseUrl,
              R2_ACCOUNT_ID: 'test-account-id',
              R2_ACCESS_KEY_ID: 'test-access-key',
              R2_SECRET_ACCESS_KEY: 'test-secret-key',
              R2_BUCKET_NAME: 'test-bucket',
            }

            const result = envSchema.safeParse(env)
            expect(result.success).toBe(true)

            if (result.success) {
              expect(result.data.DB_POOL_SIZE).toBe(10)
              expect(result.data.DB_IDLE_TIMEOUT).toBe(30000)
              expect(result.data.DB_CONNECTION_TIMEOUT).toBe(10000)
              expect(result.data.NODE_ENV).toBe('development')
            }
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Application-level override properties', () => {
    it('application-level values override root-level values for all env vars', () => {
      fc.assert(
        fc.property(
          validEnvArb,
          validUrlArb,
          validAuthSecretArb,
          validUrlArb,
          validPoolSizeArb,
          validNodeEnvArb,
          (
            rootEnv,
            appDbUrl,
            appSecret,
            appBaseUrl,
            appPoolSize,
            appNodeEnv,
          ) => {
            // Simulate root-level env
            const rootLevel = { ...rootEnv }

            // Simulate application-level overrides (these take precedence)
            const appLevel: Record<string, string> = {
              DATABASE_URL: appDbUrl,
              AUTH_SECRET: appSecret,
              AUTH_BASE_URL: appBaseUrl,
              DB_POOL_SIZE: appPoolSize,
              NODE_ENV: appNodeEnv,
            }

            // Merged env: app-level overrides root-level (spread order matters)
            const mergedEnv = { ...rootLevel, ...appLevel }

            const result = envSchema.safeParse(mergedEnv)
            expect(result.success).toBe(true)

            if (result.success) {
              // Application-level values should be the ones used
              expect(result.data.DATABASE_URL).toBe(appDbUrl)
              expect(result.data.AUTH_SECRET).toBe(appSecret)
              expect(result.data.AUTH_BASE_URL).toBe(appBaseUrl)
              expect(result.data.DB_POOL_SIZE).toBe(Number(appPoolSize))
              expect(result.data.NODE_ENV).toBe(appNodeEnv)
            }
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Startup behavior properties', () => {
    let originalEnv: NodeJS.ProcessEnv
    let exitSpy: ReturnType<typeof vi.spyOn>
    let stderrSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      originalEnv = { ...process.env }
      exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called')
      }) as () => never)
      stderrSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true)
    })

    afterEach(() => {
      process.env = originalEnv
      vi.restoreAllMocks()
    })

    it('startup logs missing variable names to stderr and exits with non-zero code', async () => {
      // Test each combination of missing required vars
      const missingVarCombinations: (typeof REQUIRED_VARS)[number][][] = [
        ['DATABASE_URL'],
        ['AUTH_SECRET'],
        ['AUTH_BASE_URL'],
        ['DATABASE_URL', 'AUTH_SECRET'],
        ['DATABASE_URL', 'AUTH_BASE_URL'],
        ['AUTH_SECRET', 'AUTH_BASE_URL'],
        ['DATABASE_URL', 'AUTH_SECRET', 'AUTH_BASE_URL'],
      ]

      for (const missingVars of missingVarCombinations) {
        exitSpy.mockClear()
        stderrSpy.mockClear()

        const validBase: Record<string, string> = {
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          AUTH_SECRET: 'a'.repeat(32),
          AUTH_BASE_URL: 'http://localhost:3001',
          R2_ACCOUNT_ID: 'test-account-id',
          R2_ACCESS_KEY_ID: 'test-access-key',
          R2_SECRET_ACCESS_KEY: 'test-secret-key',
          R2_BUCKET_NAME: 'test-bucket',
        }

        for (const v of missingVars) {
          delete validBase[v]
        }

        process.env = { ...originalEnv, ...validBase }

        const app = Fastify()

        try {
          await app.register(envPlugin)
          await app.ready()
          expect.fail('Expected process.exit to be called')
        } catch {
          // Expected: process.exit mock throws
        }

        expect(exitSpy).toHaveBeenCalledWith(1)

        const stderrOutput = stderrSpy.mock.calls
          .map((call: unknown[]) => call[0])
          .join('')

        for (const v of missingVars) {
          expect(stderrOutput).toContain(v)
        }

        await app.close().catch(() => {})
      }
    })

    it('startup logs format errors for malformed values and exits with non-zero code', async () => {
      const malformedCases = [
        { var: 'DATABASE_URL', value: 'not-a-url' },
        { var: 'DATABASE_URL', value: '' },
        { var: 'DATABASE_URL', value: 'just-text' },
        { var: 'AUTH_BASE_URL', value: 'not-a-url' },
        { var: 'AUTH_BASE_URL', value: '' },
        { var: 'AUTH_SECRET', value: 'short' },
        { var: 'AUTH_SECRET', value: '' },
      ]

      for (const { var: varName, value } of malformedCases) {
        exitSpy.mockClear()
        stderrSpy.mockClear()

        process.env = {
          ...originalEnv,
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          AUTH_SECRET: 'a'.repeat(32),
          AUTH_BASE_URL: 'http://localhost:3001',
          R2_ACCOUNT_ID: 'test-account-id',
          R2_ACCESS_KEY_ID: 'test-access-key',
          R2_SECRET_ACCESS_KEY: 'test-secret-key',
          R2_BUCKET_NAME: 'test-bucket',
          [varName]: value,
        }

        const app = Fastify()

        try {
          await app.register(envPlugin)
          await app.ready()
          expect.fail('Expected process.exit to be called')
        } catch {
          // Expected
        }

        expect(exitSpy).toHaveBeenCalledWith(1)

        const stderrOutput = stderrSpy.mock.calls
          .map((call: unknown[]) => call[0])
          .join('')
        expect(stderrOutput).toContain(varName)

        await app.close().catch(() => {})
      }
    })

    it('startup succeeds with valid env and decorates fastify instance', async () => {
      process.env = {
        ...originalEnv,
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        AUTH_SECRET: 'a'.repeat(32),
        AUTH_BASE_URL: 'http://localhost:3001',
        R2_ACCOUNT_ID: 'test-account-id',
        R2_ACCESS_KEY_ID: 'test-access-key',
        R2_SECRET_ACCESS_KEY: 'test-secret-key',
        R2_BUCKET_NAME: 'test-bucket',
      }

      const app = Fastify()
      await app.register(envPlugin)
      await app.ready()

      expect(app.env).toBeDefined()
      expect(app.env.DATABASE_URL).toBe(
        'postgresql://user:pass@localhost:5432/db',
      )
      expect(exitSpy).not.toHaveBeenCalled()

      await app.close()
    })
  })
})
