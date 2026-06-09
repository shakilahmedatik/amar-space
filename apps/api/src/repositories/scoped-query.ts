import type { Database } from '@repo/db'

export interface ScopeContext {
  ownerAccountId: string
  role:
    | 'superadmin'
    | 'owner'
    | 'manager'
    | 'security_guard'
    | 'care_taker'
    | 'renter'
  assignedBuildingIds?: string[]
  assignedFlatId?: string
}

export abstract class BaseRepository {
  constructor(protected db: Database) {}

  protected txOrDb(tx?: Database): Database {
    return tx ?? this.db
  }
}
