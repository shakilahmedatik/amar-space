import { validateConnection } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { dateTimeResponseSchema } from '../../utils/schemas'

/**
 * Health check route plugin.
 *
 * Provides a `/api/health` endpoint that returns:
 * - Service status (ok/degraded)
 * - Database connectivity check
 * - Process uptime
 *
 * Used by Docker health checks and monitoring systems.
 * NOT wrapped in fp() so the route stays encapsulated within its prefix.
 */
async function healthRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        description:
          'Returns service status, database connectivity, and process uptime. Used by Docker health checks and monitoring systems.',
        response: {
          200: z.object({
            status: z.enum(['ok', 'degraded']),
            timestamp: dateTimeResponseSchema,
            uptime: z.number(),
            responseTime: z.string(),
            checks: z.object({
              database: z.object({
                status: z.enum(['connected', 'disconnected']),
                latency: z.string().nullable(),
                error: z.string().nullable(),
              }),
            }),
          }),
          503: z.object({
            status: z.enum(['degraded']),
            timestamp: dateTimeResponseSchema,
            uptime: z.number(),
            responseTime: z.string(),
            checks: z.object({
              database: z.object({
                status: z.enum(['disconnected']),
                latency: z.string().nullable(),
                error: z.string().nullable(),
              }),
            }),
          }),
        },
      },
    },
    async (_request, reply) => {
      const startTime = Date.now()
      let dbStatus: 'connected' | 'disconnected' = 'disconnected'
      let dbLatencyMs: number | null = null
      let dbError: string | null = null

      try {
        const dbCheckStart = Date.now()
        await validateConnection(fastify.db)
        dbLatencyMs = Date.now() - dbCheckStart
        dbStatus = 'connected'
      } catch (error) {
        dbError =
          error instanceof Error ? error.message : 'Unknown database error'
      }

      const status = dbStatus === 'connected' ? 'ok' : 'degraded'
      const responseTime = Date.now() - startTime

      const response = {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`,
        checks: {
          database: {
            status: dbStatus,
            latency: dbLatencyMs !== null ? `${dbLatencyMs}ms` : null,
            error: dbError,
          },
        },
      }

      const statusCode = status === 'ok' ? 200 : 503
      return reply.status(statusCode).send(response)
    },
  )
}

export default healthRoutes
