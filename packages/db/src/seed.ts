import type { Database } from './client'
import { createDbClient } from './client'
import { users } from './schema'

/**
 * Seeds the database with initial development data.
 *
 * This function is idempotent — running it multiple times produces the same
 * database state without duplicating records. It uses `onConflictDoNothing`
 * on the email unique constraint to skip existing entries.
 *
 * @param db - The database instance to seed
 *
 * @example
 * ```ts
 * import { createDbClient } from './client';
 * import { seed } from './seed';
 *
 * const db = createDbClient(process.env.DATABASE_URL!);
 * await seed(db);
 * ```
 */
export async function seed(db: Database): Promise<void> {
  console.log('[seed] Seeding database with development data...')

  const now = new Date()

  const ownerId = 'd0c5a210-9b37-4d92-bb8a-986c757c9172'

  await db
    .insert(users)
    .values([
      {
        id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        email: 'admin@amarspace.local',
        name: 'Admin User',
        emailVerified: true,
        role: 'superadmin',
        approvalStatus: 'approved',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ownerId,
        email: 'owner@amarspace.local',
        name: 'Property Owner',
        emailVerified: true,
        role: 'owner',
        approvalStatus: 'approved',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'f9e8d7c6-b5a4-3210-fe12-34567890abcd',
        email: 'manager@amarspace.local',
        name: 'Property Manager',
        emailVerified: true,
        role: 'manager',
        ownerAccountId: ownerId,
        approvalStatus: 'approved',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'e8d7c6b5-a432-10fe-1234-567890abcdef',
        email: 'tenant@amarspace.local',
        name: 'Tenant User',
        emailVerified: true,
        role: 'renter',
        ownerAccountId: ownerId,
        approvalStatus: 'approved',
        createdAt: now,
        updatedAt: now,
      },
    ])
    .onConflictDoNothing({ target: users.email })

  console.log('[seed] Database seeded successfully.')
}

// Main block: runs seed when this file is executed directly (e.g., `bun run src/seed.ts`)
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('seed.ts')
) {
  const db = createDbClient()
  seed(db)
    .then(() => {
      console.log('[seed] Done.')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[seed] Seed failed:', error)
      process.exit(1)
    })
}
