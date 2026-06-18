import { sql } from "drizzle-orm";
import { createDbClient } from "./client";
import { runMigrations } from "./migrate";
import { seed } from "./seed";

async function main() {
	console.log("[reset] Resetting database...");
	const db = createDbClient();

	// Drop all tables in public schema
	console.log("[reset] Dropping all tables in public schema...");
	await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
	// Drop drizzle migrations schema so migrations run from scratch
	await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
	console.log("[reset] All tables dropped.");

	// Run migrations
	await runMigrations(db);

	// Seed data (skip in production unless explicitly requested)
	if (process.env.NODE_ENV !== "production" || process.env.SEED === "true") {
		await seed(db);
	} else {
		console.log("[reset] Skipping seeding in production environment.");
	}

	console.log("[reset] Database reset completed successfully.");
}

main().catch((err) => {
	console.error("[reset] Database reset failed:", err);
	process.exit(1);
});
