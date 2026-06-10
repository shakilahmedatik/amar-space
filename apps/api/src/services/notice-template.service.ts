import type { noticeTemplates } from '@repo/db'
import { NotFoundError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import {
  type CreateNoticeTemplateInput,
  createNoticeTemplateSchema,
  type UpdateNoticeTemplateInput,
  updateNoticeTemplateSchema,
  validateOrThrow,
} from '@repo/shared/validation'
import type { AuditLogger } from '../plugins/audit-logger'
import type { NoticeTemplateRepository } from '../repositories/notice-template.repository'

export interface NoticeTemplateResult {
  id: string
  name: string
  title: string
  body: string
  targetAudience: string
  createdAt: Date
  updatedAt: Date
}

export interface PaginatedTemplates {
  data: NoticeTemplateResult[]
  total: number
}

export class NoticeTemplateService {
  constructor(
    private auditLogger: AuditLogger,
    private repo: NoticeTemplateRepository,
  ) {}

  async listTemplates(ctx: RequestContext): Promise<PaginatedTemplates> {
    const [data, totalResult] = await this.repo.list(ctx.ownerAccountId)

    return {
      data: data.map((row) => this.mapToResult(row)),
      total: totalResult[0]?.count ?? 0,
    }
  }

  async getTemplate(
    ctx: RequestContext,
    templateId: string,
  ): Promise<NoticeTemplateResult> {
    const template = await this.repo.findById(templateId, ctx.ownerAccountId)

    if (!template) {
      throw new NotFoundError('NoticeTemplate')
    }

    return this.mapToResult(template)
  }

  async createTemplate(
    ctx: RequestContext,
    input: CreateNoticeTemplateInput,
  ): Promise<NoticeTemplateResult> {
    const validated = validateOrThrow(createNoticeTemplateSchema, input)

    const [created] = await this.repo.create({
      ownerAccountId: ctx.ownerAccountId,
      name: validated.name,
      title: validated.title,
      body: validated.body,
      targetAudience: validated.targetAudience,
    })

    if (!created) {
      throw new Error('Failed to create notice template')
    }

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'notice_template_created',
      entityType: 'notice_template',
      entityId: created.id,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        name: validated.name,
        title: validated.title,
        targetAudience: validated.targetAudience,
      },
    })

    return this.mapToResult(created)
  }

  async updateTemplate(
    ctx: RequestContext,
    templateId: string,
    input: UpdateNoticeTemplateInput,
  ): Promise<NoticeTemplateResult> {
    const validated = validateOrThrow(updateNoticeTemplateSchema, input)

    const existing = await this.repo.findById(templateId, ctx.ownerAccountId)
    if (!existing) {
      throw new NotFoundError('NoticeTemplate')
    }

    const updatePayload: Record<string, unknown> = {}
    if (validated.name !== undefined) updatePayload.name = validated.name
    if (validated.title !== undefined) updatePayload.title = validated.title
    if (validated.body !== undefined) updatePayload.body = validated.body
    if (validated.targetAudience !== undefined) {
      updatePayload.targetAudience = validated.targetAudience
    }

    const [updated] = await this.repo.update(
      templateId,
      updatePayload,
      ctx.ownerAccountId,
    )

    if (!updated) {
      throw new Error('Failed to update notice template')
    }

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'notice_template_updated',
      entityType: 'notice_template',
      entityId: templateId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        name: existing.name,
        title: existing.title,
        targetAudience: existing.targetAudience,
      },
      newValues: updatePayload,
    })

    return this.mapToResult(updated)
  }

  async deleteTemplate(ctx: RequestContext, templateId: string): Promise<void> {
    const existing = await this.repo.findById(templateId, ctx.ownerAccountId)
    if (!existing) {
      throw new NotFoundError('NoticeTemplate')
    }

    await this.repo.delete(templateId, ctx.ownerAccountId)

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'notice_template_deleted',
      entityType: 'notice_template',
      entityId: templateId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        name: existing.name,
        title: existing.title,
        targetAudience: existing.targetAudience,
      },
    })
  }

  private mapToResult(
    row: typeof noticeTemplates.$inferSelect,
  ): NoticeTemplateResult {
    return {
      id: row.id,
      name: row.name,
      title: row.title,
      body: row.body,
      targetAudience: row.targetAudience,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}
