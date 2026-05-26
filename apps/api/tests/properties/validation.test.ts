import fc from 'fast-check'
import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { FieldError } from '../../src/app'

/**
 * Feature: amarspace-infrastructure-setup
 * Property 1: Request Validation Correctness
 *
 * For any request payload and its associated Zod schema, if the payload conforms
 * to the schema then the request handler SHALL be invoked, and if the payload does
 * not conform then the system SHALL return an HTTP 400 response containing an error
 * array where each entry includes the failing field name and the validation rule
 * that failed.
 *
 * Validates: Requirements 2.6, 2.7
 */

// --- Test Schema ---
// A known Zod schema used for testing validation behavior
const testBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
})

// --- Generators ---

/** Generate a valid name (non-empty string) */
const validNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0)

/** Generate a valid email */
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/),
    fc.stringMatching(/^[a-z][a-z0-9]{1,6}$/),
    fc.constantFrom('.com', '.io', '.org', '.net', '.dev'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}${tld}`)

/** Generate a valid age (0-150 integer) */
const validAgeArb = fc.integer({ min: 0, max: 150 })

/** Generate a fully valid payload conforming to testBodySchema */
const validPayloadArb = fc
  .tuple(validNameArb, validEmailArb, validAgeArb)
  .map(([name, email, age]) => ({ name, email, age }))

/** Generate an invalid name (empty string) */
const invalidNameArb = fc.constant('')

/** Generate an invalid email (not a valid email format) */
const invalidEmailArb = fc.oneof(
  fc.constant(''),
  fc.constant('not-an-email'),
  fc.constant('missing@'),
  fc.constant('@missing.com'),
  fc.stringMatching(/^[a-z]{1,10}$/).filter((s) => !s.includes('@')),
)

/** Generate an invalid age (non-integer, negative, or > 150) */
const invalidAgeArb = fc.oneof(
  fc.integer({ min: -1000, max: -1 }),
  fc.integer({ min: 151, max: 10000 }),
  fc.double({ min: 0.1, max: 149.9 }).filter((n) => !Number.isInteger(n)),
)

/**
 * Generate a payload with at least one invalid field.
 * Returns the payload and which fields are invalid.
 */
const invalidPayloadArb = fc
  .tuple(
    fc.boolean(), // whether name is invalid
    fc.boolean(), // whether email is invalid
    fc.boolean(), // whether age is invalid
    validNameArb,
    invalidNameArb,
    validEmailArb,
    invalidEmailArb,
    validAgeArb,
    invalidAgeArb,
  )
  .filter(([nameInvalid, emailInvalid, ageInvalid]) => {
    // At least one field must be invalid
    return nameInvalid || emailInvalid || ageInvalid
  })
  .map(
    ([
      nameInvalid,
      emailInvalid,
      ageInvalid,
      validName,
      invalidName,
      validEmail,
      invalidEmail,
      validAge,
      invalidAge,
    ]) => ({
      payload: {
        name: nameInvalid ? invalidName : validName,
        email: emailInvalid ? invalidEmail : validEmail,
        age: ageInvalid ? invalidAge : validAge,
      },
      invalidFields: {
        name: nameInvalid,
        email: emailInvalid,
        age: ageInvalid,
      },
    }),
  )

/** Generate payloads with missing required fields */
const missingFieldPayloadArb = fc
  .tuple(
    fc.boolean(), // include name?
    fc.boolean(), // include email?
    fc.boolean(), // include age?
    validNameArb,
    validEmailArb,
    validAgeArb,
  )
  .filter(([hasName, hasEmail, hasAge]) => {
    // At least one field must be missing
    return !hasName || !hasEmail || !hasAge
  })
  .map(([hasName, hasEmail, hasAge, name, email, age]) => {
    const payload: Record<string, unknown> = {}
    if (hasName) payload.name = name
    if (hasEmail) payload.email = email
    if (hasAge) payload.age = age
    return {
      payload,
      missingFields: {
        name: !hasName,
        email: !hasEmail,
        age: !hasAge,
      },
    }
  })

/** Generate payloads with wrong types for fields */
const wrongTypePayloadArb = fc
  .tuple(
    fc.constantFrom('name', 'email', 'age'),
    validNameArb,
    validEmailArb,
    validAgeArb,
  )
  .map(([wrongField, name, email, age]) => {
    const payload: Record<string, unknown> = { name, email, age }

    // Replace the chosen field with a wrong type
    if (wrongField === 'name') {
      payload.name = fc.sample(fc.integer(), 1)[0]
    } else if (wrongField === 'email') {
      payload.email = fc.sample(fc.integer(), 1)[0]
    } else if (wrongField === 'age') {
      payload.age = fc.sample(fc.string({ minLength: 1, maxLength: 5 }), 1)[0]
    }

    return { payload, wrongField }
  })

// --- Test App Builder ---

/**
 * Creates a minimal Fastify app with a test route that uses the Zod schema.
 * The handler sets a flag to confirm it was invoked.
 */
function buildTestApp(): {
  app: FastifyInstance
  wasHandlerInvoked: () => boolean
} {
  let handlerInvoked = false

  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Use the same error handler as the real app
  app.setErrorHandler((error, _request, reply) => {
    // Check for Zod validation errors from fastify-type-provider-zod
    if (error.validation) {
      const details: FieldError[] = error.validation.map((v) => {
        const instancePath = (v.instancePath || '')
          .replace(/^\//, '')
          .replace(/\//g, '.')
        const params = v.params as Record<string, unknown> | undefined
        const field =
          instancePath || String(params?.missingProperty ?? 'unknown')

        return {
          field,
          rule: v.keyword,
          message: v.message ?? 'Validation failed',
        }
      })

      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details,
      })
    }

    // Fallback for other errors
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    })
  })

  // Test route with Zod schema validation
  app.post(
    '/test',
    {
      schema: {
        body: testBodySchema,
      },
    },
    async (_request, reply) => {
      handlerInvoked = true
      return reply.status(200).send({ success: true })
    },
  )

  return {
    app,
    wasHandlerInvoked: () => {
      const result = handlerInvoked
      handlerInvoked = false
      return result
    },
  }
}

// --- Property Tests ---

describe('Feature: amarspace-infrastructure-setup, Property 1: Request Validation Correctness', () => {
  let app: FastifyInstance
  let wasHandlerInvoked: () => boolean

  beforeEach(async () => {
    const testApp = buildTestApp()
    app = testApp.app
    wasHandlerInvoked = testApp.wasHandlerInvoked
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('Conforming payloads invoke handler', () => {
    it('valid payloads always invoke the route handler and return success', () => {
      return fc.assert(
        fc.asyncProperty(validPayloadArb, async (payload) => {
          const response = await app.inject({
            method: 'POST',
            url: '/test',
            payload,
          })

          expect(response.statusCode).toBe(200)
          expect(wasHandlerInvoked()).toBe(true)

          const body = JSON.parse(response.body)
          expect(body.success).toBe(true)
        }),
        { numRuns: 100 },
      )
    })
  })

  describe('Non-conforming payloads return 400 with field-level errors', () => {
    it('payloads with invalid field values return 400 with structured error details', () => {
      return fc.assert(
        fc.asyncProperty(
          invalidPayloadArb,
          async ({ payload, invalidFields }) => {
            const response = await app.inject({
              method: 'POST',
              url: '/test',
              payload,
            })

            expect(response.statusCode).toBe(400)
            expect(wasHandlerInvoked()).toBe(false)

            const body = JSON.parse(response.body)
            expect(body.statusCode).toBe(400)
            expect(body.error).toBe('Bad Request')
            expect(body.message).toBe('Validation failed')
            expect(body.details).toBeDefined()
            expect(Array.isArray(body.details)).toBe(true)
            expect(body.details.length).toBeGreaterThan(0)

            // Each detail entry must have field, rule, and message
            for (const detail of body.details) {
              expect(detail).toHaveProperty('field')
              expect(detail).toHaveProperty('rule')
              expect(detail).toHaveProperty('message')
              expect(typeof detail.field).toBe('string')
              expect(typeof detail.rule).toBe('string')
              expect(typeof detail.message).toBe('string')
            }

            // Verify that reported fields correspond to actually invalid fields
            const reportedFields = body.details.map((d: FieldError) => d.field)
            if (invalidFields.name) {
              expect(
                reportedFields.some((f: string) => f.includes('name')),
              ).toBe(true)
            }
            if (invalidFields.email) {
              expect(
                reportedFields.some((f: string) => f.includes('email')),
              ).toBe(true)
            }
            if (invalidFields.age) {
              expect(
                reportedFields.some((f: string) => f.includes('age')),
              ).toBe(true)
            }
          },
        ),
        { numRuns: 100 },
      )
    })

    it('payloads with missing required fields return 400 with field-level errors', () => {
      return fc.assert(
        fc.asyncProperty(missingFieldPayloadArb, async ({ payload }) => {
          const response = await app.inject({
            method: 'POST',
            url: '/test',
            payload,
          })

          expect(response.statusCode).toBe(400)
          expect(wasHandlerInvoked()).toBe(false)

          const body = JSON.parse(response.body)
          expect(body.statusCode).toBe(400)
          expect(body.error).toBe('Bad Request')
          expect(body.message).toBe('Validation failed')
          expect(body.details).toBeDefined()
          expect(Array.isArray(body.details)).toBe(true)
          expect(body.details.length).toBeGreaterThan(0)

          // Each detail entry must have field, rule, and message
          for (const detail of body.details) {
            expect(detail).toHaveProperty('field')
            expect(detail).toHaveProperty('rule')
            expect(detail).toHaveProperty('message')
            expect(typeof detail.field).toBe('string')
            expect(typeof detail.rule).toBe('string')
            expect(typeof detail.message).toBe('string')
          }
        }),
        { numRuns: 100 },
      )
    })

    it('payloads with wrong field types return 400 with field-level errors', () => {
      return fc.assert(
        fc.asyncProperty(
          wrongTypePayloadArb,
          async ({ payload, wrongField }) => {
            const response = await app.inject({
              method: 'POST',
              url: '/test',
              payload,
            })

            expect(response.statusCode).toBe(400)
            expect(wasHandlerInvoked()).toBe(false)

            const body = JSON.parse(response.body)
            expect(body.statusCode).toBe(400)
            expect(body.error).toBe('Bad Request')
            expect(body.message).toBe('Validation failed')
            expect(body.details).toBeDefined()
            expect(Array.isArray(body.details)).toBe(true)
            expect(body.details.length).toBeGreaterThan(0)

            // The wrong field should be reported in the error details
            const reportedFields = body.details.map((d: FieldError) => d.field)
            expect(
              reportedFields.some((f: string) => f.includes(wrongField)),
            ).toBe(true)
          },
        ),
        { numRuns: 100 },
      )
    })
  })
})
