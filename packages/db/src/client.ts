import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Database connection configuration options.
 */
export interface DbClientConfig {
  /** Maximum number of connections in the pool (default: 10) */
  poolSize?: number
  /** Idle connection timeout in seconds (default: 30) */
  idleTimeout?: number
  /** Connection timeout in seconds (default: 10) */
  connectionTimeout?: number
}

const DEFAULT_CONFIG: Required<DbClientConfig> = {
  poolSize: 10,
  idleTimeout: 30,
  connectionTimeout: 10,
}

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
        ? parseInt(process.env.DB_IDLE_TIMEOUT, 10) / 1000
        : DEFAULT_CONFIG.idleTimeout),
    connectionTimeout:
      options?.connectionTimeout ??
      (process.env.DB_CONNECTION_TIMEOUT
        ? parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) / 1000
        : DEFAULT_CONFIG.connectionTimeout),
  }
}

/**
 * Creates a Drizzle ORM database client backed by postgres.js.
 *
 * Works with any standard PostgreSQL instance — local Docker, managed cloud
 * (Supabase, Railway, Render, etc.), or self-hosted. No platform-specific
 * drivers or SDKs required.
 *
 * SSL is enabled automatically when the connection URL contains `sslmode=require`.
 *
 * @param databaseUrl - PostgreSQL connection URL (falls back to DATABASE_URL env var)
 * @param options - Optional pool/timeout configuration
 *
 * @example
 * const db = createDbClient('postgresql://postgres:postgres@localhost:5432/amarspace')
 */
export function createDbClient(databaseUrl?: string, options?: DbClientConfig) {
  const url = databaseUrl ?? process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'Database URL is required. Provide it as an argument or set the DATABASE_URL environment variable.',
    )
  }

  const config = resolveConfig(options)

  const sql = postgres(url, {
    max: config.poolSize,
    idle_timeout: config.idleTimeout,
    connect_timeout: config.connectionTimeout,
    ssl: url.includes('sslmode=require') ? 'require' : false,
  })

  return drizzle(sql, { schema })
}

/**
 * Validates that the database connection is working by executing a simple query.
 *
 * @param db - Database instance to validate
 * @returns true if connection is valid, throws an error otherwise
 */
export async function validateConnection(db: Database): Promise<boolean> {
  try {
    await db.execute('SELECT 1' as never)
    return true
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown database connection error'
    throw new Error(`Database connection validation failed: ${message}`)
  }
}

/** The database client type for consumers */
export type Database = ReturnType<typeof createDbClient>
