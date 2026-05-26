import { migrate as drizzleMigrate } from 'drizzle-orm/neon-http/migrator'
import { createDbClient, type Database } from './client'

/**
 * Applies all pending database migrations from the migrations directory.
 *
 * Uses the Neon HTTP migrator which reads migration files and applies
 * any that haven't been executed yet. If a migration fails, execution
 * halts and the error is reported with the specific file that caused it.
 *
 * Note: The Neon HTTP driver does not support transactions, so failed
 * migrations won't be rolled back automatically.
 *
 * @param db - The database instance to run migrations against
 * @param migrationsFolder - Path to the migrations directory (default: './migrations')
 *
 * @example
 * ```ts
 * import { runMigrations } from './migrate';
 *
 * // With an existing db instance
 * await runMigrations(db);
 *
 * // Or provide a database URL directly
 * await runMigrations('postgresql://...');
 * ```
 */
export async function runMigrations(
  dbOrUrl?: Database | string,
  migrationsFolder: string = './migrations',
): Promise<void> {
  const db: Database =
    typeof dbOrUrl === 'string'
      ? createDbClient(dbOrUrl)
      : (dbOrUrl ?? createDbClient())

  console.log(`[migrate] Applying pending migrations from: ${migrationsFolder}`)

  try {
    await drizzleMigrate(db, { migrationsFolder })
    console.log('[migrate] All pending migrations applied successfully.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[migrate] Migration failed: ${message}`)
    throw new Error(`Migration failed: ${message}`)
  }
}
