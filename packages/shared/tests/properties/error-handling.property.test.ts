import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../../src/errors/index.js'
import type { FieldError } from '../../src/types/index.js'

/**
 * Property 20: API error response structure
 *
 * For any failed API request, the error response SHALL contain a requestId field.
 * Validation errors (400) SHALL include an errors array with field path, rule, and message.
 * Permission errors (403) SHALL not reveal required permissions.
 * Server errors (500) SHALL not expose internal details.
 */

// --- Generators ---

const requestIdArb = fc.uuid()

const fieldErrorArb: fc.Arbitrary<FieldError> = fc.record({
  field: fc.stringMatching(/^[a-z][a-z_.]{0,49}$/),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  rule: fc.option(fc.stringMatching(/^[a-z]{1,30}$/), { nil: undefined }),
})

const fieldErrorsArb = fc.array(fieldErrorArb, { minLength: 1, maxLength: 50 })

const statusCodeArb = fc.constantFrom(400, 403, 404, 409, 413, 429, 500, 503)

const entityTypeArb = fc.constantFrom(
  'Building',
  'Flat',
  'Renter',
  'Bill',
  'Payment',
  'Contract',
  'Notice',
  'Issue',
  'MaintenanceRequest',
)

const entityIdArb = fc.uuid()

const retryAfterArb = fc.integer({ min: 1, max: 3600 })

// --- Property Tests ---

describe('Property 20: API error response structure', () => {
  /**
   *
   * Property 1: Every error's toResponse always includes requestId, statusCode,
   * error (HTTP status text), and message.
   */
  describe('1. All errors include required response fields', () => {
    it('AppError toResponse always includes requestId, statusCode, error, and message', () => {
      fc.assert(
        fc.property(
          statusCodeArb,
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          requestIdArb,
          (statusCode, code, message, requestId) => {
            const error = new AppError(statusCode, code, message)
            const response = error.toResponse(requestId)

            expect(response).toHaveProperty('requestId')
            expect(response).toHaveProperty('statusCode')
            expect(response).toHaveProperty('error')
            expect(response).toHaveProperty('message')
            expect(typeof response.requestId).toBe('string')
            expect(typeof response.statusCode).toBe('number')
            expect(typeof response.error).toBe('string')
            expect(typeof response.message).toBe('string')
            expect(response.error.length).toBeGreaterThan(0)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   *
   * Property 2: ValidationError always includes errors array with field, message,
   * and optional rule for each entry.
   */
  describe('2. ValidationError includes errors array with correct structure', () => {
    it('ValidationError toResponse always includes errors array with field and message per entry', () => {
      fc.assert(
        fc.property(fieldErrorsArb, requestIdArb, (errors, requestId) => {
          const error = new ValidationError(errors)
          const response = error.toResponse(requestId)

          expect(response.errors).toBeDefined()
          expect(Array.isArray(response.errors)).toBe(true)
          expect(response.errors!.length).toBeGreaterThan(0)
          expect(response.errors!.length).toBeLessThanOrEqual(50)

          for (const fieldError of response.errors!) {
            expect(fieldError).toHaveProperty('field')
            expect(fieldError).toHaveProperty('message')
            expect(typeof fieldError.field).toBe('string')
            expect(typeof fieldError.message).toBe('string')
            expect(fieldError.field.length).toBeGreaterThan(0)
            expect(fieldError.message.length).toBeGreaterThan(0)
            // rule is optional but if present must be a string
            if (fieldError.rule !== undefined) {
              expect(typeof fieldError.rule).toBe('string')
            }
          }
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   *
   * Property 3: NotFoundError never exposes the entity ID in the response message.
   */
  describe('3. NotFoundError never exposes entity ID', () => {
    it('NotFoundError response message never contains the entity ID', () => {
      fc.assert(
        fc.property(
          entityTypeArb,
          entityIdArb,
          requestIdArb,
          (entityType, entityId, requestId) => {
            const error = new NotFoundError(entityType, entityId)
            const response = error.toResponse(requestId)

            expect(response.message).not.toContain(entityId)
            expect(response.statusCode).toBe(404)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   *
   * Property 4: ForbiddenError never reveals permission details.
   */
  describe('4. ForbiddenError never reveals permission details', () => {
    it('ForbiddenError response does not reveal role names or permission details', () => {
      fc.assert(
        fc.property(requestIdArb, (requestId) => {
          const error = new ForbiddenError()
          const response = error.toResponse(requestId)

          // The message must not reveal specific role names or what permissions are needed
          const sensitiveTerms = [
            'owner',
            'manager',
            'renter',
            'admin',
            'role',
            'require',
            'need',
            'must have',
            'allowed',
            'denied',
            'grant',
          ]

          const messageLower = response.message.toLowerCase()
          for (const term of sensitiveTerms) {
            expect(messageLower).not.toContain(term)
          }

          expect(response.statusCode).toBe(403)
          expect(response.errors).toBeUndefined()
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   *
   * Property 5: RateLimitError always has statusCode 429.
   */
  describe('5. RateLimitError always has statusCode 429', () => {
    it('RateLimitError always produces a response with statusCode 429', () => {
      fc.assert(
        fc.property(retryAfterArb, requestIdArb, (retryAfter, requestId) => {
          const error = new RateLimitError(retryAfter)
          const response = error.toResponse(requestId)

          expect(response.statusCode).toBe(429)
          expect(error.retryAfter).toBe(retryAfter)
          expect(response.error).toBe('Too Many Requests')
        }),
        { numRuns: 100 },
      )
    })
  })

  /**
   *
   * Property 6: The requestId in the response always matches the one passed to toResponse.
   */
  describe('6. requestId in response matches input', () => {
    it('requestId in response always matches the requestId passed to toResponse', () => {
      fc.assert(
        fc.property(
          statusCodeArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          requestIdArb,
          (statusCode, code, message, requestId) => {
            const error = new AppError(statusCode, code, message)
            const response = error.toResponse(requestId)

            expect(response.requestId).toBe(requestId)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  /**
   *
   * Property 7: statusCode in response always matches the error's statusCode property.
   */
  describe('7. statusCode in response matches error statusCode', () => {
    it('response statusCode always matches the error instance statusCode', () => {
      fc.assert(
        fc.property(
          statusCodeArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          requestIdArb,
          (statusCode, code, message, requestId) => {
            const error = new AppError(statusCode, code, message)
            const response = error.toResponse(requestId)

            expect(response.statusCode).toBe(error.statusCode)
            expect(response.statusCode).toBe(statusCode)
          },
        ),
        { numRuns: 100 },
      )
    })

    it('all error subclasses maintain statusCode consistency', () => {
      fc.assert(
        fc.property(
          requestIdArb,
          fieldErrorsArb,
          retryAfterArb,
          entityTypeArb,
          entityIdArb,
          (requestId, errors, retryAfter, entityType, entityId) => {
            const validationError = new ValidationError(errors)
            const notFoundError = new NotFoundError(entityType, entityId)
            const forbiddenError = new ForbiddenError()
            const conflictError = new ConflictError('conflict message')
            const rateLimitError = new RateLimitError(retryAfter)

            expect(validationError.toResponse(requestId).statusCode).toBe(400)
            expect(notFoundError.toResponse(requestId).statusCode).toBe(404)
            expect(forbiddenError.toResponse(requestId).statusCode).toBe(403)
            expect(conflictError.toResponse(requestId).statusCode).toBe(409)
            expect(rateLimitError.toResponse(requestId).statusCode).toBe(429)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
