import { env } from "@omniheaven/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_SIZE,
  idle_timeout: env.DB_IDLE_TIMEOUT,
  connect_timeout: env.DB_CONNECTION_TIMEOUT,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;

export function createDbClient(
  connectionString: string,
  options?: postgres.Options<Record<string, postgres.PostgresType>>,
) {
  const customClient = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ...options,
  });
  const customDb = drizzle(customClient, { schema });
  return { db: customDb, client: customClient };
}

export { client, schema };
