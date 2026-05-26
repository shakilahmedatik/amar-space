import { createDbClient } from './client';
import { users } from './schema';

import type { Database } from './client';

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
  console.log('[seed] Seeding database with development data...');

  // Placeholder password hashes — replace with real bcrypt hashes in production.
  // These follow the bcrypt format ($2b$rounds$hash) but are NOT real hashes.
  const PLACEHOLDER_HASH = '$2b$10$placeholder_hash_replace_in_production';

  await db
    .insert(users)
    .values([
      {
        email: 'admin@amarspace.local',
        name: 'Admin User',
        hashedPassword: PLACEHOLDER_HASH,
        emailVerified: true,
      },
      {
        email: 'manager@amarspace.local',
        name: 'Property Manager',
        hashedPassword: PLACEHOLDER_HASH,
        emailVerified: true,
      },
      {
        email: 'tenant@amarspace.local',
        name: 'Tenant User',
        hashedPassword: PLACEHOLDER_HASH,
        emailVerified: true,
      },
    ])
    .onConflictDoNothing({ target: users.email });

  console.log('[seed] Database seeded successfully.');
}

// Main block: runs seed when this file is executed directly (e.g., `bun run src/seed.ts`)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seed.ts')) {
  const db = createDbClient();
  seed(db)
    .then(() => {
      console.log('[seed] Done.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[seed] Seed failed:', error);
      process.exit(1);
    });
}
