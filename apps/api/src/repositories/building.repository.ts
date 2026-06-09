import { buildings, type Database } from '@repo/db'
import { and, count, desc, eq, inArray } from 'drizzle-orm'

export class BuildingRepository {
  constructor(private db: Database) {}

  /**
   * Finds a building by ID and owner account.
   */
  async findById(id: string, ownerAccountId: string, tx?: Database) {
    const client = tx ?? this.db
    return client.query.buildings.findFirst({
      where: and(
        eq(buildings.id, id),
        eq(buildings.ownerAccountId, ownerAccountId),
      ),
      with: {
        emergencyContacts: {
          orderBy: (contacts, { asc }) => [asc(contacts.sortOrder)],
        },
      },
    })
  }

  /**
   * Finds a building by name and owner account (for uniqueness validation).
   */
  async findByNameAndOwner(
    name: string,
    ownerAccountId: string,
    tx?: Database,
  ) {
    const client = tx ?? this.db
    return client.query.buildings.findFirst({
      where: and(
        eq(buildings.ownerAccountId, ownerAccountId),
        eq(buildings.name, name),
      ),
    })
  }

  /**
   * Creates a new building.
   */
  async create(data: typeof buildings.$inferInsert, tx?: Database) {
    const client = tx ?? this.db
    const [created] = await client.insert(buildings).values(data).returning()
    if (!created) {
      throw new Error('Failed to create building')
    }
    return created
  }

  /**
   * Updates an existing building.
   */
  async update(
    id: string,
    ownerAccountId: string,
    data: Partial<typeof buildings.$inferInsert>,
    tx?: Database,
  ) {
    const client = tx ?? this.db
    const [updated] = await client
      .update(buildings)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(buildings.id, id), eq(buildings.ownerAccountId, ownerAccountId)),
      )
      .returning()
    return updated
  }

  /**
   * Lists buildings with pagination.
   * Optionally filters to specific building IDs (e.g. for manager scoping).
   */
  async list(
    ownerAccountId: string,
    page: number,
    pageSize: number,
    buildingIds?: string[],
    tx?: Database,
  ) {
    const client = tx ?? this.db
    const offset = (page - 1) * pageSize
    const conditions = [eq(buildings.ownerAccountId, ownerAccountId)]
    if (buildingIds && buildingIds.length > 0) {
      conditions.push(inArray(buildings.id, buildingIds))
    }
    return client
      .select()
      .from(buildings)
      .where(and(...conditions))
      .orderBy(desc(buildings.createdAt))
      .limit(pageSize)
      .offset(offset)
  }

  /**
   * Counts buildings.
   * Optionally filters to specific building IDs (e.g. for manager scoping).
   */
  async count(ownerAccountId: string, buildingIds?: string[], tx?: Database) {
    const client = tx ?? this.db
    const conditions = [eq(buildings.ownerAccountId, ownerAccountId)]
    if (buildingIds && buildingIds.length > 0) {
      conditions.push(inArray(buildings.id, buildingIds))
    }
    const result = await client
      .select({ count: count() })
      .from(buildings)
      .where(and(...conditions))
    return result[0]?.count ?? 0
  }
}
