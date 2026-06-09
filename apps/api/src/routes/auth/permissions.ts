import type { Database } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../middleware/auth-guard'
import { PermissionService } from '../../services/permission.service'

export default async function permissionsRoutes(app: FastifyInstance) {
  app.get(
    '/api/auth/permissions',
    {
      preHandler: [authGuard],
    },
    async (request) => {
      const user = request.user
      const db = (request.server as { db: Database }).db
      const permissionService = new PermissionService(db)

      const resolved = await permissionService.resolvePermissions(
        user.id,
        user.role,
        user.ownerAccountId,
      )

      return {
        role: user.role,
        permissions: Array.from(resolved.permissions),
        overrides: resolved.overrides,
      }
    },
  )
}
