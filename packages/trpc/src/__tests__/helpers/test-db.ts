import { createDbClient, type Database } from "@omniheaven/db";
import { appRouter } from "../../routers/app";
import type { TRPCContext } from "../../trpc";

const TEST_DB_URL =
  process.env.DATABASE_TEST_URL ||
  "postgresql://omniheaven:omniheaven_secret_pass@localhost:5433/omniheaven_test";

let testDbInstance: {
  db: Database;
  client: ReturnType<typeof createDbClient>["client"];
} | null = null;

/**
 * Returns the singleton Drizzle instance connected to the test database.
 */
export function getTestDb() {
  if (!testDbInstance) {
    testDbInstance = createDbClient(TEST_DB_URL, {
      max: 10,
      idle_timeout: 10,
    });
  }
  return testDbInstance;
}

/**
 * Truncates all application tables with CASCADE to ensure test isolation.
 */
export async function truncateAllTables() {
  const { client } = getTestDb();
  await client.unsafe(`
    TRUNCATE TABLE 
      verifications,
      users,
      accounts,
      sessions,
      organizations,
      members,
      invitations,
      buildings,
      flats,
      renters,
      emergency_contacts,
      rental_contracts,
      bills,
      payments,
      advance_adjustments,
      maintenance_requests,
      notices,
      audit_logs,
      room_types,
      rooms,
      bookings,
      subscription_plans,
      subscriptions,
      website_configs
    CASCADE;
  `);
}

/**
 * Checks if the test database container is reachable.
 */
export async function isTestDbAvailable(): Promise<boolean> {
  try {
    const { client } = getTestDb();
    const result = await client`SELECT 1 as alive`;
    return result.length > 0 && result[0]?.alive === 1;
  } catch {
    return false;
  }
}

/**
 * Closes test database connection pool.
 */
export async function closeTestDb() {
  if (testDbInstance) {
    await testDbInstance.client.end();
    testDbInstance = null;
  }
}

export interface CreateTestContextOptions {
  user?: {
    id: string;
    email: string;
    name: string;
    role?: string;
  } | null;
  organizationId?: string | null;
  requestId?: string;
}

/**
 * Helper to construct an authenticated or guest TRPCContext for testing.
 */
export function createTestContext(options?: CreateTestContextOptions): TRPCContext {
  const { db } = getTestDb();
  const session = options?.user
    ? {
        user: {
          id: options.user.id,
          email: options.user.email,
          name: options.user.name,
          role: options.user.role || "user",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: `sess-${options.user.id}`,
          userId: options.user.id,
          token: `token-${options.user.id}`,
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          updatedAt: new Date(),
          activeOrganizationId: options?.organizationId ?? null,
        },
      }
    : null;

  return {
    db,
    session: session as any,
    organizationId: options?.organizationId ?? null,
    requestId: options?.requestId || crypto.randomUUID(),
  };
}

/**
 * Creates a typed caller bound to a test context.
 */
export function createTestCaller(options?: CreateTestContextOptions) {
  const ctx = createTestContext(options);
  return appRouter.createCaller(ctx);
}
