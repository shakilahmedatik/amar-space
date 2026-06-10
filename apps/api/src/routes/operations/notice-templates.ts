import type { RequestContext, UserRole } from '@repo/shared/types'
import {
  type CreateNoticeTemplateInput,
  createNoticeTemplateSchema,
  type UpdateNoticeTemplateInput,
  updateNoticeTemplateSchema,
} from '@repo/shared/validation'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { approvalGuard } from '../../middleware/approval-guard'
import { authGuard } from '../../middleware/auth-guard'
import { roleGuard } from '../../middleware/role-guard'
import { tenantScope } from '../../middleware/tenant-scope'
import { NoticeTemplateRepository } from '../../repositories/notice-template.repository'
import { NoticeTemplateService } from '../../services/notice-template.service'
import {
  dateTimeResponseSchema,
  errorResponseSchema,
} from '../../utils/schemas'

async function noticeTemplateRoutes(fastify: FastifyInstance) {
  const repo = new NoticeTemplateRepository(fastify.db)
  const templateService = new NoticeTemplateService(fastify.auditLogger, repo)

  function buildRequestContext(request: {
    user: {
      id: string
      role: UserRole
      ownerAccountId: string
    }
    tenantScope: {
      ownerAccountId: string
      assignedBuildingIds?: string[]
      assignedFlatId?: string
    }
    ip: string
    headers: Record<string, string | string[] | undefined>
  }): RequestContext {
    return {
      userId: request.user.id,
      role: request.user.role,
      ownerAccountId: request.tenantScope.ownerAccountId,
      assignedBuildingIds: request.tenantScope.assignedBuildingIds,
      assignedFlatId: request.tenantScope.assignedFlatId,
      ipAddress: request.ip,
      userAgent: (request.headers['user-agent'] as string) || '',
    }
  }

  fastify.get(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notice Templates'],
        summary: 'List notice templates',
        description: 'Returns all notice templates for the owner account.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        response: {
          200: z.object({
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                title: z.string(),
                body: z.string(),
                targetAudience: z.string(),
                createdAt: dateTimeResponseSchema,
                updatedAt: dateTimeResponseSchema,
              }),
            ),
            total: z.number(),
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const result = await templateService.listTemplates(ctx)
      return reply.status(200).send(result)
    },
  )

  fastify.post(
    '/',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notice Templates'],
        summary: 'Create a notice template',
        description: 'Creates a new notice template.',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        body: createNoticeTemplateSchema,
        response: {
          201: z.object({
            id: z.string(),
            name: z.string(),
            title: z.string(),
            body: z.string(),
            targetAudience: z.string(),
            createdAt: dateTimeResponseSchema,
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const ctx = buildRequestContext(request as never)
      const data = request.body as CreateNoticeTemplateInput
      const result = await templateService.createTemplate(ctx, data)
      return reply.status(201).send(result)
    },
  )

  fastify.get(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notice Templates'],
        summary: 'Get notice template by ID',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid template ID format'),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            title: z.string(),
            body: z.string(),
            targetAudience: z.string(),
            createdAt: dateTimeResponseSchema,
            updatedAt: dateTimeResponseSchema,
          }),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)
      const result = await templateService.getTemplate(ctx, id)
      return reply.status(200).send(result)
    },
  )

  fastify.put(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notice Templates'],
        summary: 'Update a notice template',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid template ID format'),
        }),
        body: updateNoticeTemplateSchema,
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            title: z.string(),
            body: z.string(),
            targetAudience: z.string(),
            updatedAt: dateTimeResponseSchema,
          }),
          400: errorResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)
      const data = request.body as UpdateNoticeTemplateInput
      const result = await templateService.updateTemplate(ctx, id, data)
      return reply.status(200).send(result)
    },
  )

  fastify.delete(
    '/:id',
    {
      preHandler: [
        authGuard,
        roleGuard(['owner', 'manager']),
        approvalGuard,
        tenantScope,
      ],
      schema: {
        tags: ['Notice Templates'],
        summary: 'Delete a notice template',
        security: [{ BearerAuth: [] }, { CookieAuth: [] }],
        params: z.object({
          id: z.string().uuid('Invalid template ID format'),
        }),
        response: {
          204: z.null(),
          401: errorResponseSchema,
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ctx = buildRequestContext(request as never)
      await templateService.deleteTemplate(ctx, id)
      return reply.status(204).send(null)
    },
  )
}

export default noticeTemplateRoutes
