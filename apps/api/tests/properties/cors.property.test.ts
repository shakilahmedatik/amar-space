import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { resolveCorsOrigin } from '../../src/app'

/**
 * Feature: amarspace-fixes-and-ui-overhaul
 * Property 5: CORS allows localhost only in development
 *
 * For the CORS origin resolver: any origin string that is not
 * `http://localhost:3000` or `http://127.0.0.1:3000` is rejected when
 * `NODE_ENV === 'development'`. In production, only the value of
 * `ALLOWED_ORIGIN` is permitted.
 *
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Synchronously invoke resolveCorsOrigin and capture the callback arguments.
 */
function callResolver(
  origin: string | undefined,
  env: { NODE_ENV?: string; ALLOWED_ORIGIN?: string },
): { err: Error | null; allow: string | boolean | RegExp | undefined } {
  let result: {
    err: Error | null
    allow: string | boolean | RegExp | undefined
  } = {
    err: null,
    allow: undefined,
  }
  resolveCorsOrigin(
    origin,
    (err, allow) => {
      result = { err, allow }
    },
    env,
  )
  return result
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Any non-empty string that is NOT one of the allowed dev origins */
const nonLocalhostOriginArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter(
    (s) =>
      s !== 'http://localhost:3000' &&
      s !== 'http://127.0.0.1:3000' &&
      s !== 'http://localhost:3001' &&
      s !== 'http://127.0.0.1:3001',
  )

/** Any string that looks like a plausible production origin (https scheme) */
const productionOriginArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9-]{1,20}$/),
    fc.constantFrom('.com', '.io', '.org', '.net', '.app', '.dev', '.bd'),
  )
  .map(([host, tld]) => `https://${host}${tld}`)

/** Any string that is NOT the configured ALLOWED_ORIGIN */
const nonAllowedOriginArb = (allowedOrigin: string) =>
  fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s !== allowedOrigin)

// ---------------------------------------------------------------------------
// Property 5a: Development — non-localhost origins are rejected
// ---------------------------------------------------------------------------

describe('Feature: amarspace-fixes-and-ui-overhaul, Property 5: CORS allows localhost only in development', () => {
  describe('5a — In development, any origin that is not localhost:3000 or 127.0.0.1:3000 is rejected', () => {
    it('for any non-localhost origin string, the callback receives an error in development', () => {
      fc.assert(
        fc.property(nonLocalhostOriginArb, (origin) => {
          const { err, allow } = callResolver(origin, {
            NODE_ENV: 'development',
          })

          // Property: callback MUST be called with an error
          expect(err).toBeInstanceOf(Error)
          expect(err?.message).toBe('Not allowed by CORS')

          // Property: allow MUST be false
          expect(allow).toBe(false)
        }),
        { numRuns: 200 },
      )
    })
  })

  // -------------------------------------------------------------------------
  // Property 5b: Development — localhost:3000 is always allowed
  // -------------------------------------------------------------------------

  describe('5b — In development, http://localhost:3000 is always allowed', () => {
    it('the callback receives (null, true) for http://localhost:3000 in development', () => {
      const { err, allow } = callResolver('http://localhost:3000', {
        NODE_ENV: 'development',
      })

      expect(err).toBeNull()
      expect(allow).toBe(true)
    })

    it('the callback receives (null, true) for http://127.0.0.1:3000 in development', () => {
      const { err, allow } = callResolver('http://127.0.0.1:3000', {
        NODE_ENV: 'development',
      })

      expect(err).toBeNull()
      expect(allow).toBe(true)
    })

    it('the callback receives (null, true) for http://localhost:3001 in development', () => {
      const { err, allow } = callResolver('http://localhost:3001', {
        NODE_ENV: 'development',
      })

      expect(err).toBeNull()
      expect(allow).toBe(true)
    })

    it('the callback receives (null, true) for http://127.0.0.1:3001 in development', () => {
      const { err, allow } = callResolver('http://127.0.0.1:3001', {
        NODE_ENV: 'development',
      })

      expect(err).toBeNull()
      expect(allow).toBe(true)
    })

    it('property: for any env that sets NODE_ENV=development, localhost:3000 is always allowed', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary extra env keys to ensure they don't interfere
          fc.record({
            ALLOWED_ORIGIN: fc.option(productionOriginArb, { nil: undefined }),
          }),
          (extraEnv) => {
            const env = {
              NODE_ENV: 'development' as const,
              ...extraEnv,
            }

            const result = callResolver('http://localhost:3000', env)
            expect(result.err).toBeNull()
            expect(result.allow).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // -------------------------------------------------------------------------
  // Property 5c: Development — no origin header (same-origin) is always allowed
  // -------------------------------------------------------------------------

  describe('5c — In development, a missing origin (same-origin / server-to-server) is always allowed', () => {
    it('the callback receives (null, true) when origin is undefined in development', () => {
      const { err, allow } = callResolver(undefined, {
        NODE_ENV: 'development',
      })

      expect(err).toBeNull()
      expect(allow).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Property 5d: Production — only ALLOWED_ORIGIN is permitted
  // -------------------------------------------------------------------------

  describe('5d — In production, only the ALLOWED_ORIGIN value is permitted; all others are rejected', () => {
    it('for any production origin matching ALLOWED_ORIGIN, the callback receives (null, true)', () => {
      fc.assert(
        fc.property(productionOriginArb, (allowedOrigin) => {
          const { err, allow } = callResolver(allowedOrigin, {
            NODE_ENV: 'production',
            ALLOWED_ORIGIN: allowedOrigin,
          })

          expect(err).toBeNull()
          expect(allow).toBe(true)
        }),
        { numRuns: 100 },
      )
    })

    it('for any origin that does not match ALLOWED_ORIGIN in production, the callback receives an error', () => {
      fc.assert(
        fc.property(
          productionOriginArb,
          productionOriginArb,
          (allowedOrigin, requestOrigin) => {
            // Ensure the two origins are different
            fc.pre(allowedOrigin !== requestOrigin)

            const { err, allow } = callResolver(requestOrigin, {
              NODE_ENV: 'production',
              ALLOWED_ORIGIN: allowedOrigin,
            })

            expect(err).toBeInstanceOf(Error)
            expect(err?.message).toBe('Not allowed by CORS')
            expect(allow).toBe(false)
          },
        ),
        { numRuns: 200 },
      )
    })

    it('for any arbitrary non-matching origin in production, the callback receives an error', () => {
      fc.assert(
        fc.property(productionOriginArb, (allowedOrigin) => {
          const nonMatchingArb = nonAllowedOriginArb(allowedOrigin)

          return fc.assert(
            fc.property(nonMatchingArb, (requestOrigin) => {
              const { err, allow } = callResolver(requestOrigin, {
                NODE_ENV: 'production',
                ALLOWED_ORIGIN: allowedOrigin,
              })

              expect(err).toBeInstanceOf(Error)
              expect(err?.message).toBe('Not allowed by CORS')
              expect(allow).toBe(false)
            }),
            { numRuns: 50 },
          )
        }),
        { numRuns: 20 },
      )
    })

    it('localhost origins are rejected in production even if they were allowed in development', () => {
      const devOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']

      for (const origin of devOrigins) {
        const { err, allow } = callResolver(origin, {
          NODE_ENV: 'production',
          ALLOWED_ORIGIN: 'https://amarspace.com',
        })

        expect(err).toBeInstanceOf(Error)
        expect(err?.message).toBe('Not allowed by CORS')
        expect(allow).toBe(false)
      }
    })

    it('no origin header (same-origin) is allowed in production', () => {
      const { err, allow } = callResolver(undefined, {
        NODE_ENV: 'production',
        ALLOWED_ORIGIN: 'https://amarspace.com',
      })

      expect(err).toBeNull()
      expect(allow).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Property 5e: Callback is always called exactly once
  // -------------------------------------------------------------------------

  describe('5e — The callback is always called exactly once', () => {
    it('for any origin and any NODE_ENV, the callback is invoked exactly once', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 0, maxLength: 100 }), {
            nil: undefined,
          }),
          fc.constantFrom('development', 'production', 'test'),
          fc.option(productionOriginArb, { nil: undefined }),
          (origin, nodeEnv, allowedOrigin) => {
            let callCount = 0
            resolveCorsOrigin(
              origin,
              (_err, _allow) => {
                callCount++
              },
              { NODE_ENV: nodeEnv, ALLOWED_ORIGIN: allowedOrigin },
            )

            expect(callCount).toBe(1)
          },
        ),
        { numRuns: 200 },
      )
    })
  })
})
