import { randomBytes, scrypt } from 'node:crypto'
import {
  accounts,
  buildings,
  type Database,
  managerAssignments,
  permissions,
  rolePermissions,
  staffBuildingAssignments,
  staffRoles,
  userPermissionOverrides,
  users,
} from '@repo/db'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@repo/shared/errors'
import type { PaginationInput, RequestContext } from '@repo/shared/types'
import {
  type CreateStaffInput,
  createStaffSchema,
  type UpdateStaffInput,
  type UpdateStaffPermissionsInput,
  updateStaffPermissionsSchema,
  updateStaffSchema,
  validateOrThrow,
} from '@repo/shared/validation'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import type { AuditLogger } from '../plugins/audit-logger'

const STAFF_ROLES = ['manager', 'security_guard', 'care_taker'] as const

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateStaffResult {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  buildingIds: string[]
  temporaryPassword: string
}

export interface StaffListItem {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  buildingIds: string[]
  createdAt: Date
}

export interface StaffDetail {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  phone: string | null
  buildingIds: string[]
  permissions: string[]
  permissionOverrides: Array<{
    permissionKey: string
    effect: string
  }>
  createdAt: Date
  updatedAt: Date
}

export interface StaffRoleOption {
  slug: string
  name: string
  description: string | null
  permissions: string[]
}

export class StaffService {
  private db: Database
  private auditLogger: AuditLogger

  constructor(db: Database, auditLogger: AuditLogger) {
    this.db = db
    this.auditLogger = auditLogger
  }

  async createStaff(
    ctx: RequestContext,
    input: CreateStaffInput,
  ): Promise<CreateStaffResult> {
    const validated = validateOrThrow(createStaffSchema, input)

    if (validated.buildingIds.length > 0) {
      const ownedBuildings = await this.db
        .select({ id: buildings.id })
        .from(buildings)
        .where(
          and(
            eq(buildings.ownerAccountId, ctx.ownerAccountId),
            inArray(buildings.id, validated.buildingIds),
          ),
        )

      const ownedBuildingIds = new Set(ownedBuildings.map((b) => b.id))
      const invalidIds = validated.buildingIds.filter(
        (id) => !ownedBuildingIds.has(id),
      )

      if (invalidIds.length > 0) {
        throw new ForbiddenError()
      }
    }

    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.email, validated.email),
    })

    if (existingUser) {
      throw new ConflictError('A user with this email already exists')
    }

    const salt = randomBytes(16).toString('hex')
    const key = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        validated.password.normalize('NFKC'),
        salt,
        64,
        { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
        (err, derivedKey) => {
          if (err) reject(err)
          else resolve(derivedKey)
        },
      )
    })
    const passwordHash = `${salt}:${key.toString('hex')}`

    const now = new Date()
    const staffId = crypto.randomUUID()

    await this.db.insert(users).values({
      id: staffId,
      name: validated.name,
      email: validated.email,
      emailVerified: true,
      role: validated.role,
      phone: validated.phone ?? null,
      ownerAccountId: ctx.ownerAccountId,
      approvalStatus: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })

    await this.db.insert(accounts).values({
      id: crypto.randomUUID(),
      accountId: staffId,
      providerId: 'credential',
      userId: staffId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    })

    if (validated.buildingIds.length > 0) {
      const assignmentValues = validated.buildingIds.map((buildingId) => ({
        ownerAccountId: ctx.ownerAccountId,
        staffId,
        buildingId,
      }))

      await this.db.insert(staffBuildingAssignments).values(assignmentValues)
    }

    if (validated.role === 'manager' && validated.buildingIds.length > 0) {
      const managerAssignmentValues = validated.buildingIds.map(
        (buildingId) => ({
          ownerAccountId: ctx.ownerAccountId,
          managerId: staffId,
          buildingId,
        }),
      )

      await this.db.insert(managerAssignments).values(managerAssignmentValues)
    }

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'staff_created',
      entityType: 'user',
      entityId: staffId,
      ownerAccountId: ctx.ownerAccountId,
      newValues: {
        email: validated.email,
        name: validated.name,
        phone: validated.phone,
        role: validated.role,
        buildingIds: validated.buildingIds,
      },
    })

    return {
      id: staffId,
      email: validated.email,
      name: validated.name,
      phone: validated.phone ?? null,
      role: validated.role,
      buildingIds: validated.buildingIds,
      temporaryPassword: validated.password,
    }
  }

  async listStaff(
    ctx: RequestContext,
    pagination: PaginationInput,
    roleFilter?: string,
  ): Promise<PaginatedResult<StaffListItem>> {
    const pageSize = Math.min(Math.max(pagination.pageSize, 1), 100)
    const page = Math.max(pagination.page, 1)
    const offset = (page - 1) * pageSize

    const conditions = [
      eq(users.ownerAccountId, ctx.ownerAccountId),
      inArray(
        users.role,
        STAFF_ROLES.map((r) => r),
      ),
    ]

    if (
      roleFilter &&
      STAFF_ROLES.includes(roleFilter as (typeof STAFF_ROLES)[number])
    ) {
      conditions.push(eq(users.role, roleFilter))
    }

    const whereClause = and(...conditions)

    const [staffData, totalResult] = await Promise.all([
      this.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: count() }).from(users).where(whereClause),
    ])

    const total = totalResult[0]?.count ?? 0

    let data: StaffListItem[] = []

    if (staffData.length > 0) {
      const staffIds = staffData.map((s) => s.id)
      const assignments = await this.db
        .select({
          staffId: staffBuildingAssignments.staffId,
          buildingId: staffBuildingAssignments.buildingId,
        })
        .from(staffBuildingAssignments)
        .where(inArray(staffBuildingAssignments.staffId, staffIds))

      const assignmentMap = new Map<string, string[]>()
      for (const a of assignments) {
        const existing = assignmentMap.get(a.staffId) ?? []
        existing.push(a.buildingId)
        assignmentMap.set(a.staffId, existing)
      }

      data = staffData.map((staff) => ({
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        isActive: staff.isActive,
        buildingIds: assignmentMap.get(staff.id) ?? [],
        createdAt: staff.createdAt,
      }))
    }

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getStaff(ctx: RequestContext, staffId: string): Promise<StaffDetail> {
    const staff = await this.db.query.users.findFirst({
      where: and(
        eq(users.id, staffId),
        eq(users.ownerAccountId, ctx.ownerAccountId),
        inArray(
          users.role,
          STAFF_ROLES.map((r) => r),
        ),
      ),
    })

    if (!staff) {
      throw new NotFoundError('Staff member')
    }

    const assignments = await this.db
      .select({ buildingId: staffBuildingAssignments.buildingId })
      .from(staffBuildingAssignments)
      .where(eq(staffBuildingAssignments.staffId, staffId))

    const buildingIds = assignments.map((a) => a.buildingId)

    const defaultPermRows = await this.db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(
        eq(
          rolePermissions.roleId,
          sql`(SELECT id FROM staff_roles WHERE slug = ${staff.role} AND is_system_role = true LIMIT 1)`,
        ),
      )

    let defaultPermissions = defaultPermRows.map((p) => p.key)

    const overrideRows = await this.db
      .select({
        key: permissions.key,
        effect: userPermissionOverrides.effect,
      })
      .from(userPermissionOverrides)
      .innerJoin(
        permissions,
        eq(userPermissionOverrides.permissionId, permissions.id),
      )
      .where(eq(userPermissionOverrides.userId, staffId))

    const overrides = overrideRows.map((o) => ({
      permissionKey: o.key,
      effect: o.effect,
    }))

    for (const override of overrides) {
      if (override.effect === 'grant') {
        if (!defaultPermissions.includes(override.permissionKey)) {
          defaultPermissions.push(override.permissionKey)
        }
      } else if (override.effect === 'deny') {
        defaultPermissions = defaultPermissions.filter(
          (p) => p !== override.permissionKey,
        )
      }
    }

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      phone: staff.phone,
      buildingIds,
      permissions: defaultPermissions,
      permissionOverrides: overrides,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    }
  }

  async updateStaff(
    ctx: RequestContext,
    staffId: string,
    input: UpdateStaffInput,
  ): Promise<void> {
    const validated = validateOrThrow(updateStaffSchema, input)

    const staff = await this.db.query.users.findFirst({
      where: and(
        eq(users.id, staffId),
        eq(users.ownerAccountId, ctx.ownerAccountId),
        inArray(
          users.role,
          STAFF_ROLES.map((r) => r),
        ),
      ),
    })

    if (!staff) {
      throw new NotFoundError('Staff member')
    }

    if (validated.buildingIds) {
      if (validated.buildingIds.length > 0) {
        const ownedBuildings = await this.db
          .select({ id: buildings.id })
          .from(buildings)
          .where(
            and(
              eq(buildings.ownerAccountId, ctx.ownerAccountId),
              inArray(buildings.id, validated.buildingIds),
            ),
          )

        const ownedBuildingIds = new Set(ownedBuildings.map((b) => b.id))
        const invalidIds = validated.buildingIds.filter(
          (id) => !ownedBuildingIds.has(id),
        )

        if (invalidIds.length > 0) {
          throw new ForbiddenError()
        }
      }

      await this.db
        .delete(staffBuildingAssignments)
        .where(eq(staffBuildingAssignments.staffId, staffId))

      if (validated.buildingIds.length > 0) {
        const assignmentValues = validated.buildingIds.map((buildingId) => ({
          ownerAccountId: ctx.ownerAccountId,
          staffId,
          buildingId,
        }))

        await this.db.insert(staffBuildingAssignments).values(assignmentValues)
      }

      // Sync manager_assignments — tenantScope relies on this for manager scoping
      const effectiveRole = validated.role ?? staff.role
      if (effectiveRole === 'manager') {
        await this.db
          .delete(managerAssignments)
          .where(eq(managerAssignments.managerId, staffId))

        if (validated.buildingIds.length > 0) {
          const managerValues = validated.buildingIds.map((buildingId) => ({
            ownerAccountId: ctx.ownerAccountId,
            managerId: staffId,
            buildingId,
          }))
          await this.db.insert(managerAssignments).values(managerValues)
        }
      }
    }

    const updateValues: Record<string, unknown> = {}
    if (validated.name !== undefined) updateValues.name = validated.name
    if (validated.phone !== undefined) updateValues.phone = validated.phone
    if (validated.role !== undefined) updateValues.role = validated.role
    if (validated.isActive !== undefined) {
      updateValues.isActive = validated.isActive
      if (!validated.isActive) {
        updateValues.deactivatedAt = new Date()
      } else {
        updateValues.deactivatedAt = null
      }
    }
    updateValues.updatedAt = new Date()

    if (Object.keys(updateValues).length > 0) {
      await this.db.update(users).set(updateValues).where(eq(users.id, staffId))
    }

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'staff_updated',
      entityType: 'user',
      entityId: staffId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        name: staff.name,
        role: staff.role,
        isActive: staff.isActive,
      },
      newValues: validated,
    })
  }

  async deactivateStaff(ctx: RequestContext, staffId: string): Promise<void> {
    const staff = await this.db.query.users.findFirst({
      where: and(
        eq(users.id, staffId),
        eq(users.ownerAccountId, ctx.ownerAccountId),
        inArray(
          users.role,
          STAFF_ROLES.map((r) => r),
        ),
      ),
    })

    if (!staff) {
      throw new NotFoundError('Staff member')
    }

    await this.db
      .update(users)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, staffId))

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'staff_deactivated',
      entityType: 'user',
      entityId: staffId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: { isActive: true },
      newValues: { isActive: false },
    })
  }

  async reactivateStaff(ctx: RequestContext, staffId: string): Promise<void> {
    const staff = await this.db.query.users.findFirst({
      where: and(
        eq(users.id, staffId),
        eq(users.ownerAccountId, ctx.ownerAccountId),
        inArray(
          users.role,
          STAFF_ROLES.map((r) => r),
        ),
      ),
    })

    if (!staff) {
      throw new NotFoundError('Staff member')
    }

    await this.db
      .update(users)
      .set({
        isActive: true,
        deactivatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, staffId))

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'staff_reactivated',
      entityType: 'user',
      entityId: staffId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: { isActive: false },
      newValues: { isActive: true },
    })
  }

  async deleteStaff(ctx: RequestContext, staffId: string): Promise<void> {
    const staff = await this.db.query.users.findFirst({
      where: and(
        eq(users.id, staffId),
        eq(users.ownerAccountId, ctx.ownerAccountId),
        inArray(
          users.role,
          STAFF_ROLES.map((r) => r),
        ),
      ),
    })

    if (!staff) {
      throw new NotFoundError('Staff member')
    }

    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`DELETE FROM staff_building_assignments WHERE staff_id = ${staffId}`,
      )
      await tx.execute(
        sql`DELETE FROM user_permission_overrides WHERE user_id = ${staffId}`,
      )
      await tx.execute(
        sql`DELETE FROM manager_assignments WHERE manager_id = ${staffId}`,
      )
      await tx.execute(sql`DELETE FROM audit_logs WHERE actor_id = ${staffId}`)
      await tx.execute(
        sql`DELETE FROM audit_logs WHERE owner_account_id = ${staffId}`,
      )
      await tx.execute(sql`DELETE FROM accounts WHERE user_id = ${staffId}`)
      await tx.execute(sql`DELETE FROM sessions WHERE user_id = ${staffId}`)
      await tx.execute(sql`DELETE FROM users WHERE id = ${staffId}`)
    })

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'staff_deleted',
      entityType: 'user',
      entityId: staffId,
      ownerAccountId: ctx.ownerAccountId,
      oldValues: {
        email: staff.email,
        name: staff.name,
        role: staff.role,
      },
    })
  }

  async updatePermissions(
    ctx: RequestContext,
    staffId: string,
    input: UpdateStaffPermissionsInput,
  ): Promise<void> {
    const validated = validateOrThrow(updateStaffPermissionsSchema, input)

    const staff = await this.db.query.users.findFirst({
      where: and(
        eq(users.id, staffId),
        eq(users.ownerAccountId, ctx.ownerAccountId),
        inArray(
          users.role,
          STAFF_ROLES.map((r) => r),
        ),
      ),
    })

    if (!staff) {
      throw new NotFoundError('Staff member')
    }

    const permissionKeys = validated.overrides.map((o) => o.permissionKey)
    const permRows = await this.db
      .select({ id: permissions.id, key: permissions.key })
      .from(permissions)
      .where(inArray(permissions.key, permissionKeys))

    const permMap = new Map(permRows.map((p) => [p.key, p.id]))
    const invalidKeys = permissionKeys.filter((k) => !permMap.has(k))

    if (invalidKeys.length > 0) {
      throw new ValidationError([
        {
          field: 'overrides',
          message: `Unknown permission keys: ${invalidKeys.join(', ')}`,
          rule: 'invalid_permission',
        },
      ])
    }

    await this.db
      .delete(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, staffId))

    if (validated.overrides.length > 0) {
      const overrideValues = validated.overrides.map((o) => ({
        userId: staffId,
        permissionId: permMap.get(o.permissionKey) as string,
        effect: o.effect,
      }))

      await this.db.insert(userPermissionOverrides).values(overrideValues)
    }

    this.auditLogger.log({
      actorId: ctx.userId,
      action: 'staff_permissions_updated',
      entityType: 'user',
      entityId: staffId,
      ownerAccountId: ctx.ownerAccountId,
      newValues: { overrides: validated.overrides },
    })
  }

  async listRoles(ctx: RequestContext): Promise<StaffRoleOption[]> {
    const systemRoles = await this.db
      .select({
        slug: staffRoles.slug,
        name: staffRoles.name,
        description: staffRoles.description,
      })
      .from(staffRoles)
      .where(
        and(
          eq(staffRoles.isSystemRole, true),
          sql`${staffRoles.ownerAccountId} IS NULL`,
        ),
      )

    const customRoles = await this.db
      .select({
        slug: staffRoles.slug,
        name: staffRoles.name,
        description: staffRoles.description,
      })
      .from(staffRoles)
      .where(
        and(
          eq(staffRoles.ownerAccountId, ctx.ownerAccountId),
          eq(staffRoles.isSystemRole, false),
        ),
      )

    const allRoles = [...systemRoles, ...customRoles]
    const result: StaffRoleOption[] = []

    for (const role of allRoles) {
      const roleRow = await this.db.query.staffRoles.findFirst({
        where: eq(staffRoles.slug, role.slug),
      })

      if (!roleRow) continue

      const permRows = await this.db
        .select({ key: permissions.key })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id),
        )
        .where(eq(rolePermissions.roleId, roleRow.id))

      result.push({
        slug: role.slug,
        name: role.name,
        description: role.description,
        permissions: permRows.map((p) => p.key),
      })
    }

    return result
  }
}
