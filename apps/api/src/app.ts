import type { FastifyError } from 'fastify'
import Fastify from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

export interface FieldError {
  field: string
  rule: string
  message: string
}

export interface ApiError {
  statusCode: number
  error: string
  message: string
  details?: FieldError[]
}

export function buildApp(opts = {}) {
  const app = Fastify(opts).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Log full error server-side for debugging
    request.log.error(error)

    // Zod validation errors from fastify-type-provider-zod
    if (hasZodFastifySchemaValidationErrors(error)) {
      const details: FieldError[] = error.validation.map((v) => {
        const instancePath = v.instancePath
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

      const response: ApiError = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details,
      }

      return reply.status(400).send(response)
    }

    // Known operational errors (4xx)
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      const response: ApiError = {
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message,
      }

      return reply.status(error.statusCode).send(response)
    }

    // Unknown errors (500) — sanitize: no stack traces, file paths, DB URLs, env values
    const response: ApiError = {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }

    return reply.status(500).send(response)
  })

  // Register plugins
  app.register(import('./plugins/env'))

  // Register routes (placeholder for future tasks)

  return app
}
