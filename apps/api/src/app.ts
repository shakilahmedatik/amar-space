import { randomUUID } from 'node:crypto'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import { AppError, RateLimitError, ValidationError } from '@repo/shared/errors'
import type { ApiErrorResponse } from '@repo/shared/types'
import type { FastifyError } from 'fastify'
import Fastify from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

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
    ...opts,
    bodyLimit: 1_048_576, // 1MB
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Register CORS plugin
  app.register(fastifyCors, {
    origin: true,
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

  return app
}
