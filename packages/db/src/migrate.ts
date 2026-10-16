import { migrate } from "drizzle-orm/postgres-js/migrator";
import { client, db } from "./client";

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./migrations" });
  console.log("Migrations applied successfully.");
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
