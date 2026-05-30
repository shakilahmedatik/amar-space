import { analyticsEvents } from '@repo/db'
import { analyticsEventSchema } from '@repo/shared/portal'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

/**
 * Portal analytics route plugin.
 *
 * Provides:
 * - POST /api/portal/analytics — Track portal analytics events
 *
 * Access control:
 * - None (public, unauthenticated endpoint)
 *
 * Design:
 * - Validates event payload using shared analytics schema (analyticsEventSchema)
 * - Inserts into analytics_events table asynchronously (fire-and-forget)
 * - Always returns 200 OK regardless of validation or insertion outcome
 * - Never displays errors to the user
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */
async function portalAnalyticsRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Portal'],
        summary: 'Track portal analytics event',
        description:
          'Accepts analytics events from the portal. Always returns 200 regardless of outcome. Events are validated and inserted asynchronously.',
        body: z.any(),
        response: {
          200: z.object({
            success: z.boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const parsed = analyticsEventSchema.safeParse(request.body)

        if (parsed.success) {
          // Fire-and-forget: insert asynchronously without awaiting
          fastify.db
            .insert(analyticsEvents)
            .values({
              eventName: parsed.data.event,
              flatSlug: parsed.data.flatSlug,
              userAgent: parsed.data.userAgent,
              metadata: parsed.data.metadata ?? null,
            })
            .catch(() => {
              // Silently discard insertion errors — never fail visibly
            })
        }
      } catch {
        // Silently discard any unexpected errors — never fail visibly
      }

      return reply.status(200).send({ success: true })
    },
  )
}

export default portalAnalyticsRoutes
