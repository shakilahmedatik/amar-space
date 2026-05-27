import { users } from '@repo/db'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authGuard } from '../middleware/auth-guard'

/**
 * Settings routes plugin.
 *
 * Provides:
 * - PUT /api/settings/language — Update user language preference
 * - GET /api/settings/profile — Get current user profile info
 *
 * Access control:
 * - All authenticated users can access their own settings
 *
 * Requirements: 15.5, 15.6
 */
async function settingsRoutes(fastify: FastifyInstance) {
  /**
   * PUT /api/settings/language
   * Updates the authenticated user's language preference.
   * Persists the preference server-side for authenticated users (Requirement 15.5).
   */
  fastify.put(
    '/language',
    {
      preHandler: [authGuard],
      schema: {
        body: z.object({
          language: z.enum(['bn', 'en']),
        }),
      },
    },
    async (request, reply) => {
      const { language } = request.body as { language: 'bn' | 'en' }
      const userId = request.user.id

      await fastify.db
        .update(users)
        .set({
          languagePreference: language,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))

      return reply.status(200).send({
        success: true,
        language,
      })
    },
  )

  /**
   * GET /api/settings/profile
   * Returns the current user's profile information including role and account details.
   */
  fastify.get(
    '/profile',
    {
      preHandler: [authGuard],
    },
    async (request, reply) => {
      const userId = request.user.id

      const user = await fastify.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          languagePreference: true,
          createdAt: true,
        },
      })

      if (!user) {
        return reply.status(404).send({
          requestId: request.id,
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        })
      }

      return reply.status(200).send({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        languagePreference: user.languagePreference || 'bn',
        createdAt: user.createdAt,
      })
    },
  )
}

export default settingsRoutes
