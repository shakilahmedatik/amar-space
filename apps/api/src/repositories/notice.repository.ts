import { buildings, type Database, flats, notices } from '@repo/db'
import { and, count, desc, eq, inArray, type SQL } from 'drizzle-orm'
import { BaseRepository, type ScopeContext } from './scoped-query'

export class NoticeRepository extends BaseRepository {
  findById(id: string, ownerAccountId: string, tx?: Database) {
    const client = this.txOrDb(tx)
    return client.query.notices.findFirst({
      where: and(
        eq(notices.id, id),
        eq(notices.ownerAccountId, ownerAccountId),
      ),
    })
  }

  findByIdWithAccess(id: string, scope: ScopeContext) {
    const conditions: SQL[] = [eq(notices.id, id)]
    if (scope.role !== 'superadmin') {
      conditions.push(eq(notices.ownerAccountId, scope.ownerAccountId))
    }
    return this.db.query.notices.findFirst({
      where: and(...conditions),
    })
  }

  list(
    scope: ScopeContext,
    filters: {
      targetAudience?: string
      isPinned?: boolean
      buildingId?: string
    },
    page: number,
    pageSize: number,
  ) {
    const client = this.db
    const offset = (page - 1) * pageSize

    const conditions: SQL[] = []
    if (scope.role !== 'superadmin') {
      conditions.push(eq(notices.ownerAccountId, scope.ownerAccountId))
    }
    if (
      scope.role === 'manager' &&
      scope.assignedBuildingIds &&
      scope.assignedBuildingIds.length > 0
    ) {
      conditions.push(
        inArray(notices.targetBuildingId, scope.assignedBuildingIds),
      )
    }
    if (filters.targetAudience) {
      conditions.push(eq(notices.targetAudience, filters.targetAudience))
    }
    if (filters.isPinned !== undefined) {
      conditions.push(eq(notices.isPinned, filters.isPinned))
    }
    if (filters.buildingId) {
      conditions.push(eq(notices.targetBuildingId, filters.buildingId))
    }

    const whereClause = conditions.length > 0 ? and(...conditions)! : undefined

    return Promise.all([
      client
        .select()
        .from(notices)
        .where(whereClause)
        .orderBy(desc(notices.isPinned), desc(notices.createdAt))
        .limit(pageSize)
        .offset(offset),
      client.select({ count: count() }).from(notices).where(whereClause),
    ])
  }

  create(data: typeof notices.$inferInsert, tx?: Database) {
    const client = this.txOrDb(tx)
    return client.insert(notices).values(data).returning()
  }

  update(
    id: string,
    data: Partial<typeof notices.$inferInsert>,
    tx?: Database,
  ) {
    const client = this.txOrDb(tx)
    return client
      .update(notices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notices.id, id))
      .returning()
  }

  delete(id: string, tx?: Database) {
    const client = this.txOrDb(tx)
    return client.delete(notices).where(eq(notices.id, id))
  }

  countPinnedForScope(
    ownerAccountId: string,
    targetAudience: string,
    targetBuildingId?: string | null,
    targetFlatId?: string | null,
  ) {
    const conditions: SQL[] = [
      eq(notices.ownerAccountId, ownerAccountId),
      eq(notices.isPinned, true),
      eq(notices.targetAudience, targetAudience),
    ]
    if (targetBuildingId) {
      conditions.push(eq(notices.targetBuildingId, targetBuildingId))
    }
    if (targetFlatId) {
      conditions.push(eq(notices.targetFlatId, targetFlatId))
    }
    return this.db
      .select({ count: count() })
      .from(notices)
      .where(and(...conditions))
  }

  findBuildingById(buildingId: string, ownerAccountId: string) {
    return this.db.query.buildings.findFirst({
      where: and(
        eq(buildings.id, buildingId),
        eq(buildings.ownerAccountId, ownerAccountId),
      ),
    })
  }

  findFlatById(flatId: string, ownerAccountId: string) {
    return this.db.query.flats.findFirst({
      where: and(
        eq(flats.id, flatId),
        eq(flats.ownerAccountId, ownerAccountId),
      ),
    })
  }
}
