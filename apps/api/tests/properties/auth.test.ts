import fc from 'fast-check'
import type { FastifyInstance } from 'fastify'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app'

/**
 * Feature: amarspace-infrastructure-setup
 * Property 4: Authentication Error Opacity
 *
 * For any failed authentication attempt — whether the email does not exist in the
 * system or the password is incorrect — the error response SHALL be identical in
 * structure, message content, and HTTP status code, revealing no information about
 * which credential was wrong.
 *
 * Validates: Requirements 5.6
 */

/**
 * Feature: amarspace-infrastructure-setup
 * Property 5: Rate Limiting Enforcement
 *
 * For any email address, after exactly 5 consecutive failed authentication attempts,
 * all subsequent authentication attempts for that email SHALL be rejected with a
 * rate-limit error for 15 minutes, regardless of whether the credentials provided
 * are valid.
 *
 * Validates: Requirements 5.8
 */

// --- Generators ---

/** Generate a random email address */
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,15}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{1,8}$/),
    fc.constantFrom('.com', '.io', '.org', '.net', '.dev', '.bd'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}${tld}`)

/** Generate a random password (non-empty string) */
const passwordArb = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0)

/**
 * Better Auth error codes and messages that indicate "user not found" scenarios.
 * These represent the various ways Better Auth might signal that an email doesn't exist.
 */
const userNotFoundResponseArb = fc.constantFrom(
  { code: 'USER_NOT_FOUND', message: 'User not found' },
  { code: 'INVALID_EMAIL', message: 'Invalid email' },
  { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
)

/**
 * Better Auth error codes and messages that indicate "wrong password" scenarios.
 * These represent the various ways Better Auth might signal that the password is wrong.
 */
const wrongPasswordResponseArb = fc.constantFrom(
  { code: 'INVALID_PASSWORD', message: 'Invalid password' },
  { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
)

/**
 * HTTP status codes that Better Auth might use for auth failures.
 * The auth routes sanitize 401, 403, and 422 responses.
 */
const authFailureStatusArb = fc.constantFrom(401, 403, 422)

// --- Test Setup ---

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  AUTH_SECRET: 'a'.repeat(32),
  AUTH_BASE_URL: 'http://localhost:3001',
  R2_ACCOUNT_ID: 'test-account-id',
  R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key',
  R2_BUCKET_NAME: 'test-bucket',
}

describe('Feature: amarspace-infrastructure-setup, Property 4: Authentication Error Opacity', () => {
  let app: FastifyInstance
  let originalEnv: NodeJS.ProcessEnv
  let originalHandler: typeof app.auth.handler

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }

    app = buildApp({ logger: false })
    await app.ready()
    originalHandler = app.auth.handler
  })

  afterEach(async () => {
    app.auth.handler = originalHandler
    await app.close()
    process.env = originalEnv
  })

  describe('Error responses are identical regardless of failure reason', () => {
    it('non-existent email and wrong password produce identical error responses for any email/password combination', () => {
      return fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          userNotFoundResponseArb,
          wrongPasswordResponseArb,
          authFailureStatusArb,
          async (
            email,
            password,
            userNotFoundError,
            wrongPasswordError,
            status,
          ) => {
            // Simulate "email not found" response from Better Auth
            app.auth.handler = async () => {
              return new Response(JSON.stringify(userNotFoundError), {
                status,
                headers: { 'content-type': 'application/json' },
              })
            }

            const emailNotFoundResponse = await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/email',
              payload: { email, password },
            })

            // Simulate "wrong password" response from Better Auth
            app.auth.handler = async () => {
              return new Response(JSON.stringify(wrongPasswordError), {
                status,
                headers: { 'content-type': 'application/json' },
              })
            }

            const wrongPasswordResponse = await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/email',
              payload: { email, password },
            })

            // Parse response bodies
            const emailNotFoundBody = emailNotFoundResponse.json()
            const wrongPasswordBody = wrongPasswordResponse.json()

            // Property: HTTP status codes MUST be identical
            expect(emailNotFoundResponse.statusCode).toBe(
              wrongPasswordResponse.statusCode,
            )

            // Property: Response bodies MUST be identical in structure and content
            expect(emailNotFoundBody).toEqual(wrongPasswordBody)

            // Property: Response MUST NOT reveal which credential was wrong
            const bodyStr = JSON.stringify(emailNotFoundBody).toLowerCase()
            expect(bodyStr).not.toContain('not found')
            expect(bodyStr).not.toContain('user not found')
            expect(bodyStr).not.toContain('invalid password')
            expect(bodyStr).not.toContain('invalid email')
            expect(bodyStr).not.toContain('email does not exist')
            expect(bodyStr).not.toContain('wrong password')
            expect(bodyStr).not.toContain('no account')

            // Property: Response MUST have the expected generic error structure
            expect(emailNotFoundBody).toHaveProperty('statusCode')
            expect(emailNotFoundBody).toHaveProperty('error')
            expect(emailNotFoundBody).toHaveProperty('message')
          },
        ),
        { numRuns: 100 },
      )
    })

    it('non-JSON error bodies from Better Auth also produce the same generic error', () => {
      return fc.assert(
        fc.asyncProperty(
          emailArb,
          passwordArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          authFailureStatusArb,
          async (email, password, randomBody, status) => {
            // Simulate non-JSON "email not found" response
            app.auth.handler = async () => {
              return new Response(randomBody, {
                status,
                headers: { 'content-type': 'text/plain' },
              })
            }

            const nonJsonResponse = await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/email',
              payload: { email, password },
            })

            // Simulate JSON "wrong password" response
            app.auth.handler = async () => {
              return new Response(
                JSON.stringify({
                  code: 'INVALID_PASSWORD',
                  message: 'Invalid password',
                }),
                { status, headers: { 'content-type': 'application/json' } },
              )
            }

            const jsonResponse = await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/email',
              payload: { email, password },
            })

            const nonJsonBody = nonJsonResponse.json()
            const jsonBody = jsonResponse.json()

            // Property: Both responses MUST be identical
            expect(nonJsonResponse.statusCode).toBe(jsonResponse.statusCode)
            expect(nonJsonBody).toEqual(jsonBody)

            // Property: Response MUST NOT contain any revealing information
            const bodyStr = JSON.stringify(nonJsonBody).toLowerCase()
            expect(bodyStr).not.toContain('not found')
            expect(bodyStr).not.toContain('invalid password')
            expect(bodyStr).not.toContain('invalid email')
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})

/**
 * Feature: amarspace-infrastructure-setup, Property 5: Rate Limiting Enforcement
 *
 * For any email address, after exactly 5 consecutive failed authentication attempts,
 * all subsequent authentication attempts for that email SHALL be rejected with a
 * rate-limit error for 15 minutes, regardless of whether the credentials provided
 * are valid.
 *
 * Validates: Requirements 5.8
 */

/**
 * Feature: amarspace-infrastructure-setup
 * Property 6: Session Token Validation
 *
 * For any session token that is expired (past its expiresAt timestamp) or does not
 * exist in the sessions table, the system SHALL reject the request with an
 * authentication error response, and the rejected token SHALL NOT grant access to
 * any protected resource.
 *
 * Validates: Requirements 5.9
 */

// --- Property 5 Generators ---

/** Generate a random email address for rate limiting tests */
const rateLimitEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{1,6}$/),
    fc.constantFrom('.com', '.io', '.org', '.net', '.dev', '.bd'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}${tld}`)

/** Generate a random password for rate limiting tests */
const rateLimitPasswordArb = fc
  .string({ minLength: 1, maxLength: 64 })
  .filter((s) => s.trim().length > 0)

/** Generate a number of additional attempts after rate limit is reached (1-10) */
const additionalAttemptsArb = fc.integer({ min: 1, max: 10 })

describe('Feature: amarspace-infrastructure-setup, Property 5: Rate Limiting Enforcement', () => {
  let app: FastifyInstance
  let originalEnv: NodeJS.ProcessEnv
  let originalHandler: typeof app.auth.handler

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }

    app = buildApp({ logger: false })
    await app.ready()
    originalHandler = app.auth.handler
  })

  afterEach(async () => {
    app.auth.handler = originalHandler
    await app.close()
    process.env = originalEnv
  })

  describe('Rate limiting blocks further attempts after 5 consecutive failures', () => {
    it('after 5 consecutive failed attempts for any email, subsequent attempts are rejected with rate-limit error regardless of credential validity', () => {
      return fc.assert(
        fc.asyncProperty(
          rateLimitEmailArb,
          rateLimitPasswordArb,
          additionalAttemptsArb,
          async (email, password, additionalAttempts) => {
            // Track attempt count per email to simulate Better Auth's rate limiting behavior
            const attemptCounts = new Map<string, number>()
            const MAX_ATTEMPTS = 5

            app.auth.handler = async (request: Request) => {
              const body = await request.text()
              let requestEmail: string | undefined
              try {
                const parsed = JSON.parse(body)
                requestEmail = parsed.email
              } catch {
                requestEmail = undefined
              }

              const targetEmail = requestEmail || email
              const currentCount = attemptCounts.get(targetEmail) || 0
              attemptCounts.set(targetEmail, currentCount + 1)

              // After 5 failed attempts, Better Auth returns 429 (rate limited)
              if (currentCount >= MAX_ATTEMPTS) {
                return new Response(
                  JSON.stringify({
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Too many requests',
                  }),
                  {
                    status: 429,
                    headers: { 'content-type': 'application/json' },
                  },
                )
              }

              // First 5 attempts: return auth failure (wrong credentials)
              return new Response(
                JSON.stringify({
                  code: 'INVALID_EMAIL_OR_PASSWORD',
                  message: 'Invalid email or password',
                }),
                {
                  status: 401,
                  headers: { 'content-type': 'application/json' },
                },
              )
            }

            // Make 5 consecutive failed attempts
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
              const response = await app.inject({
                method: 'POST',
                url: '/api/auth/sign-in/email',
                payload: { email, password: `wrong-password-${i}` },
              })

              // First 5 attempts should return 401 (generic auth error)
              expect(response.statusCode).toBe(401)
              const body = response.json()
              expect(body.message).toBe('Invalid credentials')
            }

            // Make additional attempts after rate limit is reached
            for (let i = 0; i < additionalAttempts; i++) {
              const response = await app.inject({
                method: 'POST',
                url: '/api/auth/sign-in/email',
                payload: { email, password },
              })

              // Property: All subsequent attempts MUST be rejected with 429
              expect(response.statusCode).toBe(429)

              const body = response.json()

              // Property: Response MUST have rate-limit error structure
              expect(body).toHaveProperty('statusCode', 429)
              expect(body).toHaveProperty('error', 'Too Many Requests')
              expect(body).toHaveProperty('message')

              // Property: Message should indicate rate limiting without revealing details
              expect(body.message.toLowerCase()).toContain('too many')
            }
          },
        ),
        { numRuns: 100 },
      )
    })

    it('rate limiting applies per-email: different emails have independent attempt counters', () => {
      return fc.assert(
        fc.asyncProperty(
          rateLimitEmailArb,
          rateLimitEmailArb,
          rateLimitPasswordArb,
          async (email1, email2, password) => {
            // Ensure we have two distinct emails
            fc.pre(email1 !== email2)

            const attemptCounts = new Map<string, number>()
            const MAX_ATTEMPTS = 5

            app.auth.handler = async (request: Request) => {
              const body = await request.text()
              let requestEmail: string | undefined
              try {
                const parsed = JSON.parse(body)
                requestEmail = parsed.email
              } catch {
                requestEmail = undefined
              }

              const targetEmail = requestEmail || 'unknown'
              const currentCount = attemptCounts.get(targetEmail) || 0
              attemptCounts.set(targetEmail, currentCount + 1)

              // After 5 failed attempts for this specific email, return 429
              if (currentCount >= MAX_ATTEMPTS) {
                return new Response(
                  JSON.stringify({
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Too many requests',
                  }),
                  {
                    status: 429,
                    headers: { 'content-type': 'application/json' },
                  },
                )
              }

              // Return auth failure
              return new Response(
                JSON.stringify({
                  code: 'INVALID_EMAIL_OR_PASSWORD',
                  message: 'Invalid email or password',
                }),
                {
                  status: 401,
                  headers: { 'content-type': 'application/json' },
                },
              )
            }

            // Exhaust rate limit for email1 (5 failed attempts)
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
              await app.inject({
                method: 'POST',
                url: '/api/auth/sign-in/email',
                payload: { email: email1, password: `wrong-${i}` },
              })
            }

            // email1 should now be rate limited
            const rateLimitedResponse = await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/email',
              payload: { email: email1, password },
            })
            expect(rateLimitedResponse.statusCode).toBe(429)

            // email2 should NOT be rate limited (independent counter)
            const email2Response = await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/email',
              payload: { email: email2, password },
            })

            // Property: email2 should still get normal auth error (401), not rate limited (429)
            expect(email2Response.statusCode).toBe(401)
            const body = email2Response.json()
            expect(body.statusCode).not.toBe(429)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('valid credentials are still rejected after rate limit is reached', () => {
      return fc.assert(
        fc.asyncProperty(
          rateLimitEmailArb,
          rateLimitPasswordArb,
          async (email, validPassword) => {
            const attemptCounts = new Map<string, number>()
            const MAX_ATTEMPTS = 5

            app.auth.handler = async (request: Request) => {
              const body = await request.text()
              let requestEmail: string | undefined
              let requestPassword: string | undefined
              try {
                const parsed = JSON.parse(body)
                requestEmail = parsed.email
                requestPassword = parsed.password
              } catch {
                requestEmail = undefined
                requestPassword = undefined
              }

              const targetEmail = requestEmail || email
              const currentCount = attemptCounts.get(targetEmail) || 0
              attemptCounts.set(targetEmail, currentCount + 1)

              // After 5 failed attempts, reject ALL attempts regardless of credentials
              if (currentCount >= MAX_ATTEMPTS) {
                return new Response(
                  JSON.stringify({
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Too many requests',
                  }),
                  {
                    status: 429,
                    headers: { 'content-type': 'application/json' },
                  },
                )
              }

              // Simulate: if password matches validPassword, it would succeed
              // But for the first 5 attempts we use wrong passwords
              if (requestPassword === validPassword) {
                return new Response(
                  JSON.stringify({
                    token: 'session-token-123',
                    user: { id: 'user-1', email: targetEmail },
                  }),
                  {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                  },
                )
              }

              return new Response(
                JSON.stringify({
                  code: 'INVALID_EMAIL_OR_PASSWORD',
                  message: 'Invalid email or password',
                }),
                {
                  status: 401,
                  headers: { 'content-type': 'application/json' },
                },
              )
            }

            // Make 5 consecutive failed attempts with wrong passwords
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
              const response = await app.inject({
                method: 'POST',
                url: '/api/auth/sign-in/email',
                payload: { email, password: `definitely-wrong-${i}` },
              })
              expect(response.statusCode).toBe(401)
            }

            // Now try with VALID credentials — should still be rejected due to rate limit
            const validAttemptResponse = await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/email',
              payload: { email, password: validPassword },
            })

            // Property: Even valid credentials MUST be rejected after rate limit
            expect(validAttemptResponse.statusCode).toBe(429)
            const body = validAttemptResponse.json()
            expect(body).toHaveProperty('statusCode', 429)
            expect(body).toHaveProperty('error', 'Too Many Requests')
            expect(body.message.toLowerCase()).toContain('too many')
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})

/**
 * Feature: amarspace-infrastructure-setup, Property 6: Session Token Validation
 *
 * For any session token that is expired (past its expiresAt timestamp) or does not
 * exist in the sessions table, the system SHALL reject the request with an
 * authentication error response, and the rejected token SHALL NOT grant access to
 * any protected resource.
 *
 * Validates: Requirements 5.9
 */

// --- Property 6 Generators ---

/** Generate a random token string (simulating a non-existent session token) */
const randomTokenArb = fc
  .string({ minLength: 1, maxLength: 256 })
  .filter((s) => s.trim().length > 0)

/** Generate a malformed token (special characters, very long, partial UUIDs, etc.)
 * Note: Tokens must be valid HTTP header values (printable ASCII, no control chars)
 * to test session validation logic rather than HTTP parsing. */
const malformedTokenArb = fc.oneof(
  // Tokens with special characters (valid in HTTP headers)
  fc.stringMatching(/^[!@#$%^&*(){}[\]<>]{1,50}$/),
  // Very long tokens (exceeding typical session token length)
  fc.stringMatching(/^[a-zA-Z0-9]{100,256}$/),
  // Partial/truncated UUID-like tokens
  fc.stringMatching(/^[0-9a-f]{1,15}$/),
  // Random base64-like strings that aren't real tokens
  fc.stringMatching(/^[A-Za-z0-9+/=]{10,64}$/),
  // Tokens with dots and dashes (JWT-like but invalid)
  fc.stringMatching(/^[a-z0-9]{3,10}\.[a-z0-9]{3,10}\.[a-z0-9]{3,10}$/),
)

/** Generate an expired session token scenario code from Better Auth */
const expiredSessionResponseArb = fc.constantFrom(
  { code: 'SESSION_EXPIRED', message: 'Session has expired' },
  { code: 'INVALID_SESSION', message: 'Session is invalid' },
  { code: 'INVALID_TOKEN', message: 'Invalid token' },
  { code: 'SESSION_EXPIRED', message: 'session expired' },
  { code: 'INVALID_SESSION', message: 'invalid session token' },
)

/** Generate a non-existent session token scenario code from Better Auth */
const nonExistentSessionResponseArb = fc.constantFrom(
  { code: 'INVALID_SESSION', message: 'Session not found' },
  { code: 'INVALID_TOKEN', message: 'Token does not exist' },
  { code: 'INVALID_SESSION', message: 'No session found for token' },
  { code: 'SESSION_EXPIRED', message: 'Session expired or not found' },
)

/** Generate HTTP status codes Better Auth might use for session failures */
const sessionFailureStatusArb = fc.constantFrom(401, 403, 422)

/** Generate a random authorization header format */
// const authHeaderArb = (token: string) =>
//   fc.constantFrom(
//     `Bearer ${token}`,
//     token, // raw token without Bearer prefix
//   )

describe('Feature: amarspace-infrastructure-setup, Property 6: Session Token Validation', () => {
  let app: FastifyInstance
  let originalEnv: NodeJS.ProcessEnv
  let originalHandler: typeof app.auth.handler

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }

    app = buildApp({ logger: false })
    await app.ready()
    originalHandler = app.auth.handler
  })

  afterEach(async () => {
    app.auth.handler = originalHandler
    await app.close()
    process.env = originalEnv
  })

  describe('Expired session tokens are rejected with authentication error', () => {
    it('any expired session token is rejected when accessing session retrieval endpoint', () => {
      return fc.assert(
        fc.asyncProperty(
          randomTokenArb,
          expiredSessionResponseArb,
          sessionFailureStatusArb,
          async (token, expiredError, status) => {
            // Mock Better Auth to simulate expired session token response
            app.auth.handler = async () => {
              return new Response(JSON.stringify(expiredError), {
                status,
                headers: { 'content-type': 'application/json' },
              })
            }

            const response = await app.inject({
              method: 'GET',
              url: '/api/auth/get-session',
              headers: {
                authorization: `Bearer ${token}`,
              },
            })

            // Property: Expired tokens MUST be rejected with 401
            expect(response.statusCode).toBe(401)

            const body = response.json()

            // Property: Response MUST have proper error structure
            expect(body).toHaveProperty('statusCode', 401)
            expect(body).toHaveProperty('error', 'Unauthorized')
            expect(body).toHaveProperty('message')

            // Property: Response MUST indicate session is invalid
            expect(body.message).toBe('Session is invalid or has expired')

            // Property: Response MUST NOT contain session data (no access granted)
            expect(body).not.toHaveProperty('user')
            expect(body).not.toHaveProperty('session')
            expect(body).not.toHaveProperty('token')
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Non-existent session tokens are rejected with authentication error', () => {
    it('any token that does not exist in the sessions table is rejected', () => {
      return fc.assert(
        fc.asyncProperty(
          randomTokenArb,
          nonExistentSessionResponseArb,
          sessionFailureStatusArb,
          async (token, nonExistentError, status) => {
            // Mock Better Auth to simulate non-existent session token response
            app.auth.handler = async () => {
              return new Response(JSON.stringify(nonExistentError), {
                status,
                headers: { 'content-type': 'application/json' },
              })
            }

            const response = await app.inject({
              method: 'GET',
              url: '/api/auth/get-session',
              headers: {
                authorization: `Bearer ${token}`,
              },
            })

            // Property: Non-existent tokens MUST be rejected with 401
            expect(response.statusCode).toBe(401)

            const body = response.json()

            // Property: Response MUST have proper error structure
            expect(body).toHaveProperty('statusCode', 401)
            expect(body).toHaveProperty('error', 'Unauthorized')
            expect(body).toHaveProperty('message')

            // Property: Response MUST indicate session is invalid
            expect(body.message).toBe('Session is invalid or has expired')

            // Property: Response MUST NOT grant access (no user/session data)
            expect(body).not.toHaveProperty('user')
            expect(body).not.toHaveProperty('session')
            expect(body).not.toHaveProperty('token')
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Malformed tokens are rejected and grant no access', () => {
    it('any malformed token is rejected when accessing session retrieval endpoint', () => {
      return fc.assert(
        fc.asyncProperty(
          malformedTokenArb,
          expiredSessionResponseArb,
          sessionFailureStatusArb,
          async (malformedToken, errorResponse, status) => {
            // Mock Better Auth to simulate rejection of malformed tokens
            app.auth.handler = async () => {
              return new Response(JSON.stringify(errorResponse), {
                status,
                headers: { 'content-type': 'application/json' },
              })
            }

            const response = await app.inject({
              method: 'GET',
              url: '/api/auth/get-session',
              headers: {
                authorization: `Bearer ${malformedToken}`,
              },
            })

            // Property: Malformed tokens MUST be rejected with 401
            expect(response.statusCode).toBe(401)

            const body = response.json()

            // Property: Response MUST have proper error structure
            expect(body).toHaveProperty('statusCode', 401)
            expect(body).toHaveProperty('error', 'Unauthorized')
            expect(body).toHaveProperty('message')

            // Property: Malformed tokens MUST NOT grant access to any resource
            expect(body).not.toHaveProperty('user')
            expect(body).not.toHaveProperty('session')
            expect(body).not.toHaveProperty('token')
            expect(body).not.toHaveProperty('data')
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  describe('Invalid tokens grant no access to protected resources', () => {
    it('expired/invalid/malformed tokens produce identical rejection responses regardless of token content', () => {
      return fc.assert(
        fc.asyncProperty(
          randomTokenArb,
          malformedTokenArb,
          expiredSessionResponseArb,
          nonExistentSessionResponseArb,
          sessionFailureStatusArb,
          async (
            randomToken,
            malformedToken,
            expiredError,
            nonExistentError,
            status,
          ) => {
            // Test with expired token
            app.auth.handler = async () => {
              return new Response(JSON.stringify(expiredError), {
                status,
                headers: { 'content-type': 'application/json' },
              })
            }

            const expiredResponse = await app.inject({
              method: 'GET',
              url: '/api/auth/get-session',
              headers: { authorization: `Bearer ${randomToken}` },
            })

            // Test with non-existent token
            app.auth.handler = async () => {
              return new Response(JSON.stringify(nonExistentError), {
                status,
                headers: { 'content-type': 'application/json' },
              })
            }

            const nonExistentResponse = await app.inject({
              method: 'GET',
              url: '/api/auth/get-session',
              headers: { authorization: `Bearer ${malformedToken}` },
            })

            // Property: Both expired and non-existent tokens produce the SAME error response
            expect(expiredResponse.statusCode).toBe(
              nonExistentResponse.statusCode,
            )

            const expiredBody = expiredResponse.json()
            const nonExistentBody = nonExistentResponse.json()

            // Property: Response structure and content MUST be identical
            expect(expiredBody).toEqual(nonExistentBody)

            // Property: The consistent error response format
            expect(expiredBody).toEqual({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Session is invalid or has expired',
            })
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
