import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from "./client";

async function main() {
  console.log("Running migrations...");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(__dirname, "../migrations");
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
