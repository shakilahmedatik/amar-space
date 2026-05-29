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

  await db
    .insert(users)
    .values([
      {
        id: crypto.randomUUID(),
        email: 'admin@amarspace.local',
        name: 'Admin User',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        email: 'manager@amarspace.local',
        name: 'Property Manager',
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: crypto.randomUUID(),
        email: 'tenant@amarspace.local',
        name: 'Tenant User',
        emailVerified: true,
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
