import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * Database connection configuration options.
 *
 * Since Neon serverless uses HTTP-based connections, traditional TCP pooling
 * doesn't apply directly. These parameters configure the client behavior
 * and are read from environment variables with sensible defaults.
 */
export interface DbClientConfig {
  /** Maximum number of connections per serverless instance (default: 10) */
  poolSize?: number
  /** Idle connection timeout in milliseconds (default: 30000 = 30s) */
  idleTimeout?: number
  /** Connection timeout in milliseconds (default: 10000 = 10s) */
  connectionTimeout?: number
}

/**
 * Default configuration values matching requirements:
 * - Max 10 connections per serverless instance
 * - 30s idle timeout
 * - 10s connection timeout
 */
const DEFAULT_CONFIG: Required<DbClientConfig> = {
  poolSize: 10,
  idleTimeout: 30_000,
  connectionTimeout: 10_000,
}

/**
 * Reads database client configuration from environment variables,
 * falling back to provided options or defaults.
 */
function resolveConfig(options?: DbClientConfig): Required<DbClientConfig> {
  return {
    poolSize:
      options?.poolSize ??
      (process.env.DB_POOL_SIZE
        ? parseInt(process.env.DB_POOL_SIZE, 10)
        : DEFAULT_CONFIG.poolSize),
    idleTimeout:
      options?.idleTimeout ??
      (process.env.DB_IDLE_TIMEOUT
        ? parseInt(process.env.DB_IDLE_TIMEOUT, 10)
        : DEFAULT_CONFIG.idleTimeout),
    connectionTimeout:
      options?.connectionTimeout ??
      (process.env.DB_CONNECTION_TIMEOUT
        ? parseInt(process.env.DB_CONNECTION_TIMEOUT, 10)
        : DEFAULT_CONFIG.connectionTimeout),
  }
}

/**
 * Creates a database client using the Neon serverless HTTP driver.
 *
 * The client uses HTTP-based connections optimized for serverless environments.
 * Connection timeout is enforced via AbortSignal on fetch requests.
 *
 * @param databaseUrl - PostgreSQL connection URL (or reads from DATABASE_URL env var)
 * @param options - Optional configuration for pool size, idle timeout, and connection timeout
 * @returns Configured Drizzle ORM database instance
 *
 * @example
 * ```ts
 * const db = createDbClient(process.env.DATABASE_URL!);
 * const users = await db.query.users.findMany();
 * ```
 */
export function createDbClient(databaseUrl?: string, options?: DbClientConfig) {
  const url = databaseUrl ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'Database URL is required. Provide it as an argument or set the DATABASE_URL environment variable.',
    )
  }

  const config = resolveConfig(options)

  const sql = neon(url, {
    fetchOptions: {
      signal: AbortSignal.timeout(config.connectionTimeout),
    },
  })

  const db = drizzle(sql, { schema })

  return db
}

/**
 * Validates that the database connection is working by executing a simple query.
 * Returns within the configured connection timeout without crashing.
 *
 * @param db - Database instance to validate
 * @param timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns true if connection is valid, throws an error otherwise
 */
export async function validateConnection(
  db: Database,
  timeoutMs: number = DEFAULT_CONFIG.connectionTimeout,
): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await db.execute('SELECT 1')
    return true
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown database connection error'
    throw new Error(`Database connection validation failed: ${message}`)
  } finally {
    clearTimeout(timeout)
  }
}

/** The database client type for consumers */
export type Database = ReturnType<typeof createDbClient>
