import { createDbClient } from "./client";

export * from "./client";
export * from "./migrate";
export * from "./schema";

const globalForDb = globalThis as unknown as {
	db: ReturnType<typeof createDbClient> | undefined;
};

export const db = globalForDb.db ?? createDbClient();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
