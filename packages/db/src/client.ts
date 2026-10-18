import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://omniheaven:omniheaven_secret_pass@localhost:5432/omniheaven_prod";

// Use a connection pool for general queries
const client = postgres(connectionString, {
  max: Number(process.env.DB_POOL_SIZE || 20),
  idle_timeout: Number(process.env.DB_IDLE_TIMEOUT || 20),
  connect_timeout: Number(process.env.DB_CONNECTION_TIMEOUT || 10),
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { client, schema };
