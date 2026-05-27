import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import envPlugin, { envSchema } from '../../src/plugins/env'

describe('Environment Validation Plugin', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3001',
    R2_ACCOUNT_ID: 'test-account-id',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET_NAME: 'test-bucket',
  }

  let originalEnv: NodeJS.ProcessEnv
  let exitSpy: ReturnType<typeof vi.spyOn>
  let stderrSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    originalEnv = { ...process.env }
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should decorate fastify instance with validated env on valid config', async () => {
    process.env = { ...originalEnv, ...validEnv }

    const app = Fastify()
    await app.register(envPlugin)
    await app.ready()

    expect(app.env).toBeDefined()
    expect(app.env.DATABASE_URL).toBe(validEnv.DATABASE_URL)
    expect(app.env.AUTH_SECRET).toBe(validEnv.AUTH_SECRET)
    expect(app.env.AUTH_BASE_URL).toBe(validEnv.AUTH_BASE_URL)
    expect(app.env.DB_POOL_SIZE).toBe(10)
    expect(app.env.DB_IDLE_TIMEOUT).toBe(30000)
    expect(app.env.DB_CONNECTION_TIMEOUT).toBe(10000)
    expect(app.env.NODE_ENV).toBe('test')

    await app.close()
  })

  it('should use provided values over defaults', async () => {
    process.env = {
      ...originalEnv,
      ...validEnv,
      DB_POOL_SIZE: '5',
      DB_IDLE_TIMEOUT: '15000',
      DB_CONNECTION_TIMEOUT: '5000',
      NODE_ENV: 'production',
    }

    const app = Fastify()
    await app.register(envPlugin)
    await app.ready()

    expect(app.env.DB_POOL_SIZE).toBe(5)
    expect(app.env.DB_IDLE_TIMEOUT).toBe(15000)
    expect(app.env.DB_CONNECTION_TIMEOUT).toBe(5000)
    expect(app.env.NODE_ENV).toBe('production')

    await app.close()
  })

  it('should exit with non-zero code when DATABASE_URL is missing', async () => {
    process.env = {
      ...originalEnv,
      AUTH_SECRET: validEnv.AUTH_SECRET,
      AUTH_BASE_URL: validEnv.AUTH_BASE_URL,
    }

    const app = Fastify()

    await expect(app.register(envPlugin).ready()).rejects.toThrow(
      'process.exit called',
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalled()
  })

  it('should exit with non-zero code when AUTH_SECRET is too short', async () => {
    process.env = { ...originalEnv, ...validEnv, AUTH_SECRET: 'tooshort' }

    const app = Fastify()

    await expect(app.register(envPlugin).ready()).rejects.toThrow(
      'process.exit called',
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalled()
  })

  it('should exit with non-zero code when AUTH_BASE_URL is not a valid URL', async () => {
    process.env = { ...originalEnv, ...validEnv, AUTH_BASE_URL: 'not-a-url' }

    const app = Fastify()

    await expect(app.register(envPlugin).ready()).rejects.toThrow(
      'process.exit called',
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(stderrSpy).toHaveBeenCalled()
  })

  it('should log each missing variable to stderr', async () => {
    process.env = { ...originalEnv }
    // Remove all required vars
    delete process.env.DATABASE_URL
    delete process.env.AUTH_SECRET
    delete process.env.AUTH_BASE_URL

    const app = Fastify()

    await expect(app.register(envPlugin).ready()).rejects.toThrow(
      'process.exit called',
    )

    const stderrOutput = stderrSpy.mock.calls
      .map((call: unknown[]) => call[0])
      .join('')
    expect(stderrOutput).toContain('DATABASE_URL')
    expect(stderrOutput).toContain('AUTH_SECRET')
    expect(stderrOutput).toContain('AUTH_BASE_URL')
  })

  it('should log format error for invalid DATABASE_URL', async () => {
    process.env = { ...originalEnv, ...validEnv, DATABASE_URL: 'not-a-url' }

    const app = Fastify()

    await expect(app.register(envPlugin).ready()).rejects.toThrow(
      'process.exit called',
    )

    const stderrOutput = stderrSpy.mock.calls
      .map((call: unknown[]) => call[0])
      .join('')
    expect(stderrOutput).toContain('DATABASE_URL')
    expect(stderrOutput).toContain('invalid')
  })

  it('should reject invalid NODE_ENV values', async () => {
    process.env = { ...originalEnv, ...validEnv, NODE_ENV: 'staging' }

    const app = Fastify()

    await expect(app.register(envPlugin).ready()).rejects.toThrow(
      'process.exit called',
    )
    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  describe('envSchema', () => {
    it('should parse valid env correctly', () => {
      const result = envSchema.safeParse(validEnv)
      expect(result.success).toBe(true)
    })

    it('should reject DB_POOL_SIZE outside range', () => {
      const result = envSchema.safeParse({ ...validEnv, DB_POOL_SIZE: '25' })
      expect(result.success).toBe(false)
    })

    it('should reject DB_IDLE_TIMEOUT outside range', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        DB_IDLE_TIMEOUT: '100',
      })
      expect(result.success).toBe(false)
    })

    it('should reject DB_CONNECTION_TIMEOUT outside range', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        DB_CONNECTION_TIMEOUT: '20000',
      })
      expect(result.success).toBe(false)
    })
  })
})
