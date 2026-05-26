import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app'

// Mock @repo/db to avoid real database connections in unit tests
vi.mock('@repo/db', () => ({
  createDbClient: vi.fn(() => ({
    execute: vi.fn(),
  })),
  validateConnection: vi.fn(),
}))

describe('Health Check Route', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3001',
  }

  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should return 200 with status ok when database is healthy', async () => {
    const { validateConnection } = await import('@repo/db')
    vi.mocked(validateConnection).mockResolvedValue(true)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = response.json()

    expect(response.statusCode).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
    expect(body.uptime).toBeTypeOf('number')
    expect(body.responseTime).toBeDefined()
    expect(body.checks.database.status).toBe('connected')
    expect(body.checks.database.latency).toBeDefined()
    expect(body.checks.database.error).toBeNull()

    await app.close()
  })

  it('should return 503 with status degraded when database is unreachable', async () => {
    const { validateConnection } = await import('@repo/db')
    vi.mocked(validateConnection).mockRejectedValue(
      new Error('Database connection validation failed: connection refused'),
    )

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = response.json()

    expect(response.statusCode).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks.database.status).toBe('disconnected')
    expect(body.checks.database.latency).toBeNull()
    expect(body.checks.database.error).toContain('connection')

    await app.close()
  })

  it('should include uptime in seconds', async () => {
    const { validateConnection } = await import('@repo/db')
    vi.mocked(validateConnection).mockResolvedValue(true)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = response.json()

    expect(body.uptime).toBeGreaterThan(0)

    await app.close()
  })

  it('should include a valid ISO timestamp', async () => {
    const { validateConnection } = await import('@repo/db')
    vi.mocked(validateConnection).mockResolvedValue(true)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    })

    const body = response.json()

    // Verify it's a valid ISO date string
    const date = new Date(body.timestamp)
    expect(date.toISOString()).toBe(body.timestamp)

    await app.close()
  })
})
