import type { Database } from '@repo/db'
import type { ApiErrorResponse } from '@repo/shared/types'
import type { FastifyReply, FastifyRequest } from 'fastify'
import {
  type Permission,
  PermissionService,
} from '../services/permission.service'
import type { AuthUser } from './auth-guard'

type RequiredPermissions = Permission | Permission[]

declare module 'fastify' {
  interface FastifyRequest {
    resolvedPermissions?: Set<string>
  }
}

export interface PermissionGuardConfig {
  db: unknown
}

export function permissionGuard(required: RequiredPermissions) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply | undefined> => {
    const user = request.user as AuthUser | undefined
    if (!user) {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      }
      return reply.status(401).send(response)
    }

    // Superadmin always passes
    if (user.role === 'superadmin') {
      return
    }

    const db = (request.server as { db: Database }).db
    const permissionService = new PermissionService(db)

    const requiredPerms = Array.isArray(required) ? required : [required]

    const resolved = await permissionService.resolvePermissions(
      user.id,
      user.role,
      user.ownerAccountId,
    )

    // Cache on request for later use
    request.resolvedPermissions = resolved.permissions

    const hasPermission = requiredPerms.every((perm) =>
      resolved.permissions.has(perm),
    )

    if (!hasPermission) {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      }
      return reply.status(403).send(response)
    }
  }
}

export function permissionGuardAny(required: RequiredPermissions) {
  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply | undefined> => {
    const user = request.user as AuthUser | undefined
    if (!user) {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      }
      return reply.status(401).send(response)
    }

    // Superadmin always passes
    if (user.role === 'superadmin') {
      return
    }

    const db = (request.server as { db: Database }).db
    const permissionService = new PermissionService(db)

    const requiredPerms = Array.isArray(required) ? required : [required]

    const resolved = await permissionService.resolvePermissions(
      user.id,
      user.role,
      user.ownerAccountId,
    )

    request.resolvedPermissions = resolved.permissions

    const hasAny = requiredPerms.some((perm) => resolved.permissions.has(perm))

    if (!hasAny) {
      const response: ApiErrorResponse = {
        requestId: request.id,
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions',
      }
      return reply.status(403).send(response)
    }
  }
}
