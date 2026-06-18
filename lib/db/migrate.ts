import { migrate } from "drizzle-orm/postgres-js/migrator";
import { type Database, createDbClient } from "./client";

/**
 * Applies all pending database migrations from the migrations directory.
 *
 * Works with any standard PostgreSQL instance — local Docker, managed cloud,
 * or self-hosted. Uses the postgres-js migrator under the hood.
 *
 * @param dbOrUrl - An existing Database instance, a connection URL string,
 *                  or undefined (reads DATABASE_URL from env)
 * @param migrationsFolder - Path to the migrations directory (default: './migrations')
 *
 * @example
 * await runMigrations('postgresql://postgres:postgres@localhost:5432/amarspace')
 */
export async function runMigrations(
	dbOrUrl?: Database | string,
	migrationsFolder = "./lib/db/migrations",
): Promise<void> {
	const db: Database =
		typeof dbOrUrl === "string"
			? createDbClient(dbOrUrl)
			: (dbOrUrl ?? createDbClient());

	console.log(
		`[migrate] Applying pending migrations from: ${migrationsFolder}`,
	);

	try {
		await migrate(db, { migrationsFolder });
		console.log("[migrate] All pending migrations applied successfully.");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[migrate] Migration failed: ${message}`);
		throw new Error(`Migration failed: ${message}`);
	}
}
