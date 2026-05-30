import { randomUUID } from 'node:crypto'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import fastifySwagger from '@fastify/swagger'
import { AppError, RateLimitError } from '@repo/shared/errors'
import type { ApiErrorResponse } from '@repo/shared/types'
import apiReference from '@scalar/fastify-api-reference'
import type { FastifyError } from 'fastify'
import Fastify from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { z } from 'zod'

/**
 * Shared schema for datetime fields in response objects.
 * Accepts both ISO string (from manual construction) and Date objects (from Drizzle ORM).
 * Outputs ISO 8601 string in both cases.
 */
export const dateTimeResponseSchema = z
  .string()
  .or(z.date().transform((d) => d.toISOString()))

/**
 * Shared OpenAPI error response schema.
 * Used across all route files to document 400/401/403/404/429/500 responses.
 */
export const errorResponseSchema = z.object({
  requestId: z.string(),
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  errors: z
    .array(
      z.object({
        field: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
})

/**
 * Pure CORS origin resolver function — extracted for testability.
 *
 * Determines whether an incoming request origin is allowed based on the
 * current NODE_ENV and configured ALLOWED_ORIGIN.
 *
 * - In development: allows http://localhost:3000 and http://127.0.0.1:3000
 * - In production: allows only the value of process.env.ALLOWED_ORIGIN
 * - No origin header (same-origin / server-to-server): always allowed
 *
 * @param origin - The Origin header value from the incoming request, or undefined
 * @param cb - The @fastify/cors callback: cb(error, allow)
 * @param env - Optional env override for testing (defaults to process.env)
 */
export function resolveCorsOrigin(
  origin: string | undefined,
  cb: (err: Error | null, origin: string | boolean | RegExp) => void,
  env: { NODE_ENV?: string; ALLOWED_ORIGIN?: string } = process.env as {
    NODE_ENV?: string
    ALLOWED_ORIGIN?: string
  },
): void {
  const allowedOrigins =
    env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3001',
        ]
      : [env.ALLOWED_ORIGIN ?? '']

  if (!origin || allowedOrigins.includes(origin)) {
    cb(null, true)
  } else {
    cb(new Error('Not allowed by CORS'), false)
  }
}

/**
 * Builds and configures the Fastify application instance.
 *
 * - Registers Zod type provider for schema validation
 * - Registers CORS, cookie, and multipart plugins
 * - Adds requestId (UUID v4) to every response
 * - Configures 1MB body size limit
 * - Maps AppError subclasses to structured HTTP error responses
 */
export function buildApp(opts: Record<string, unknown> = {}) {
  const app = Fastify({
    bodyLimit: 1_048_576, // 1MB
    genReqId: () => randomUUID(),
    ...opts,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Register CORS plugin with environment-aware origin callback
  app.register(fastifyCors, {
    origin: (origin, cb) => resolveCorsOrigin(origin, cb),
    credentials: true,
  })

  // Register cookie plugin
  app.register(fastifyCookie)

  // Register multipart plugin (for file uploads)
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 5_242_880, // 5MB per file
      files: 5, // max 5 files per request
    },
  })

  // Add requestId header to every response
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const requestId = request.id

    // Log full error server-side for debugging (Requirement 19.7)
    request.log.error({
      err: error,
      requestId,
      method: request.method,
      url: request.url,
      userId: (request as unknown as { user?: { id?: string } }).user?.id,
      ip: request.ip,
    })

    // Handle AppError subclasses from @repo/shared
    if (error instanceof AppError) {
      const response = error.toResponse(requestId)

      // Add Retry-After header for rate limit errors
      if (error instanceof RateLimitError) {
        reply.header('retry-after', String(error.retryAfter))
      }

      return reply.status(error.statusCode).send(response)
    }

    // Zod validation errors from fastify-type-provider-zod
    if (hasZodFastifySchemaValidationErrors(error)) {
      const errors = error.validation.map((v) => {
        const instancePath = v.instancePath
          .replace(/^\//, '')
          .replace(/\//g, '.')
        const params = v.params as Record<string, unknown> | undefined
        const field =
          instancePath || String(params?.missingProperty ?? 'unknown')

        return {
          field,
          message: v.message ?? 'Validation failed',
        }
      })

      const response: ApiErrorResponse = {
        requestId,
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        errors,
      }

      return reply.status(400).send(response)
    }

    // Body too large (Fastify returns this as a 413 with FST_ERR_CTP_BODY_TOO_LARGE)
    if (error.statusCode === 413) {
      const response: ApiErrorResponse = {
        requestId,
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'Request body exceeds the 1MB size limit',
      }
      return reply.status(413).send(response)
    }

    // Known operational errors (4xx)
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      const response: ApiErrorResponse = {
        requestId,
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message,
      }

      return reply.status(error.statusCode).send(response)
    }

    // Unknown errors (500) — sanitize: no stack traces, file paths, DB URLs, env values
    const response: ApiErrorResponse = {
      requestId,
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }

    return reply.status(500).send(response)
  })

  // Custom 404 handler for consistent JSON responses
  app.setNotFoundHandler((request, reply) => {
    const requestId = request.id
    const response: ApiErrorResponse = {
      requestId,
      statusCode: 404,
      error: 'Not Found',
      message: 'Route not found',
    }
    return reply.status(404).send(response)
  })

  // Register plugins
  app.register(import('./plugins/env'))
  app.register(import('./plugins/db'))
  app.register(import('./plugins/auth'))
  app.register(import('./plugins/audit-logger'))
  app.register(import('./plugins/r2'))

  // Register OpenAPI spec generation (must be before routes)
  app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'AmarSpace API',
        version: '1.0.0',
        description:
          'Property management API for AmarSpace — handles buildings, flats, renters, billing, payments, deposits, maintenance, issues, notices, and audit logs.',
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description:
              'Bearer token obtained from POST /api/auth/sign-in/email or POST /api/register.',
          },
          CookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'better-auth.session_token',
            description:
              'Session cookie set automatically by Better Auth on sign-in.',
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Service health and readiness checks' },
        {
          name: 'Authentication',
          description:
            'User registration, sign-in, sign-out, and session management',
        },
        { name: 'Users', description: 'User role assignment' },
        {
          name: 'Buildings',
          description: 'Building management (create, list, update)',
        },
        {
          name: 'Flats',
          description: 'Flat management including status transitions',
        },
        {
          name: 'Renters',
          description: 'Renter registration and profile management',
        },
        {
          name: 'Bills',
          description:
            'Monthly bill generation, line items, and status tracking',
        },
        {
          name: 'Payments',
          description: 'Payment recording and receipt retrieval',
        },
        {
          name: 'Deposits',
          description: 'Advance deposit balance and adjustment history',
        },
        {
          name: 'Maintenance',
          description: 'Maintenance request lifecycle and comments',
        },
        {
          name: 'Issues',
          description: 'Building-level issue tracking and assignment',
        },
        {
          name: 'Notices',
          description: 'Notice board with pinning and audience targeting',
        },
        {
          name: 'Settings',
          description: 'User profile and language preference settings',
        },
        { name: 'Audit', description: 'Immutable audit log query interface' },
        { name: 'Dashboard', description: 'Role-specific summary dashboards' },
        {
          name: 'Admin',
          description:
            'Superadmin platform management — owner approvals, user management, and platform dashboard',
        },
        {
          name: 'Managers',
          description:
            'Manager creation and building assignment management by owners',
        },
        {
          name: 'QR Codes',
          description: 'QR code generation for flats and buildings',
        },
      ],
    },
    transform: jsonSchemaTransform,
  })

  // Expose OpenAPI spec at /api/openapi.json for convenience (redirects to /api/openapi/json)
  app.get('/api/openapi.json', async (_request, reply) => {
    const spec = app.swagger()
    return reply.send(spec)
  })

  // Register Scalar interactive UI at /api/docs
  app.register(apiReference, {
    routePrefix: '/api/docs',
    configuration: {
      spec: { url: '/api/openapi.json' },
      title: 'AmarSpace API Reference',
    },
  })

  // Register routes
  app.register(import('./routes/health'), { prefix: '/api/health' })
  app.register(import('./routes/auth'), { prefix: '/api/auth' })
  app.register(import('./routes/register'), { prefix: '/api/register' })
  app.register(import('./routes/audit'), { prefix: '/api/audit' })
  app.register(import('./routes/roles'), { prefix: '/api/users' })
  app.register(import('./routes/buildings'), { prefix: '/api/buildings' })
  app.register(import('./routes/flats'), { prefix: '/api/flats' })
  app.register(import('./routes/renters'), { prefix: '/api/renters' })
  app.register(import('./routes/bills'), { prefix: '/api/bills' })
  app.register(import('./routes/payments'), { prefix: '/api/payments' })
  app.register(import('./routes/deposits'), { prefix: '/api/deposits' })
  app.register(import('./routes/maintenance'), { prefix: '/api/maintenance' })
  app.register(import('./routes/issues'), { prefix: '/api/issues' })
  app.register(import('./routes/notices'), { prefix: '/api/notices' })
  app.register(import('./routes/settings'), { prefix: '/api/settings' })
  app.register(import('./routes/dashboard'), { prefix: '/api/dashboard' })
  app.register(import('./routes/admin/owners'), { prefix: '/api/admin/owners' })
  app.register(import('./routes/admin/users'), { prefix: '/api/admin/users' })
  app.register(import('./routes/admin/dashboard'), {
    prefix: '/api/admin/dashboard',
  })
  app.register(import('./routes/managers'), { prefix: '/api/managers' })
  app.register(import('./routes/flat-qr-code'), { prefix: '/api/flats' })
  app.register(import('./routes/building-qr-codes'), {
    prefix: '/api/buildings',
  })

  return app
}
