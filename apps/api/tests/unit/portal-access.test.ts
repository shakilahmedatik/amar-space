import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from '../../../../packages/db/src/schema'
import { buildApp } from '../../src/app'
import { hashAccessCode } from '../../src/utils/access-code-hash'

const mockFlatSlugsFindFirst = vi.fn()
const mockRenterAccessCodesFindFirst = vi.fn()
const mockRegistrationRequestsFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

// Mock @repo/db to avoid real database connections
vi.mock('@repo/db', () => ({
  ...schema,
  createDbClient: vi.fn(() => ({
    execute: vi.fn(),
    query: {
      flatSlugs: {
        findFirst: mockFlatSlugsFindFirst,
      },
      registrationRequests: {
        findFirst: mockRegistrationRequestsFindFirst,
      },
      renterAccessCodes: {
        findFirst: mockRenterAccessCodesFindFirst,
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })),
    update: mockUpdate,
    insert: mockInsert,
  })),
  validateConnection: vi.fn(),
}))

describe('Portal Access Route - POST /api/portal/flat/:slug/access', () => {
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

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }

    // Default mock setup for update/insert
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 'session-id-123' }]),
      }),
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it('should return 400 for invalid slug format', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/INVALID-Slug/access',
      payload: { code: '123456' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_SLUG')
    expect(body.message).toBe('অবৈধ QR কোড')

    await app.close()
  })

  it('should return 400 for non-6-digit code', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '12345' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_CODE_FORMAT')
    expect(body.message).toBe('অ্যাক্সেস কোড ৬ সংখ্যার হতে হবে')

    await app.close()
  })

  it('should return 400 for code with non-numeric characters', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '12ab56' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_CODE_FORMAT')

    await app.close()
  })

  it('should return 400 for code longer than 6 digits', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '1234567' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_CODE_FORMAT')

    await app.close()
  })

  it('should return 400 when slug not found in database', async () => {
    mockFlatSlugsFindFirst.mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '123456' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_SLUG')

    await app.close()
  })

  it('should return 401 when no access code record exists for the flat', async () => {
    mockFlatSlugsFindFirst.mockResolvedValue({ flatId: 'flat-id-1' })
    mockRenterAccessCodesFindFirst.mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '123456' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(401)
    expect(body.error).toBe('INVALID_CODE')
    expect(body.attemptsRemaining).toBe(0)

    await app.close()
  })

  it('should return 429 when account is locked', async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000)
    mockFlatSlugsFindFirst.mockResolvedValue({ flatId: 'flat-id-1' })
    mockRenterAccessCodesFindFirst.mockResolvedValue({
      id: 'access-code-id-1',
      flatId: 'flat-id-1',
      renterId: 'renter-id-1',
      codeHash: hashAccessCode('999999'),
      failedAttempts: 5,
      lockedUntil: futureDate,
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '123456' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(429)
    expect(body.error).toBe('LOCKED')
    expect(body.lockedUntil).toBe(futureDate.toISOString())

    await app.close()
  })

  it('should return 401 with attemptsRemaining on invalid code', async () => {
    mockFlatSlugsFindFirst.mockResolvedValue({ flatId: 'flat-id-1' })
    mockRenterAccessCodesFindFirst.mockResolvedValue({
      id: 'access-code-id-1',
      flatId: 'flat-id-1',
      renterId: 'renter-id-1',
      codeHash: hashAccessCode('999999'),
      failedAttempts: 2,
      lockedUntil: null,
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '123456' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(401)
    expect(body.error).toBe('INVALID_CODE')
    expect(body.attemptsRemaining).toBe(2) // 5 - 3 (was 2, now incremented to 3)

    await app.close()
  })

  it('should return 429 when 5th consecutive failure triggers lockout', async () => {
    mockFlatSlugsFindFirst.mockResolvedValue({ flatId: 'flat-id-1' })
    mockRenterAccessCodesFindFirst.mockResolvedValue({
      id: 'access-code-id-1',
      flatId: 'flat-id-1',
      renterId: 'renter-id-1',
      codeHash: hashAccessCode('999999'),
      failedAttempts: 4, // This will be the 5th attempt
      lockedUntil: null,
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: '123456' },
    })

    const body = response.json()
    expect(response.statusCode).toBe(429)
    expect(body.error).toBe('LOCKED')
    expect(body.lockedUntil).toBeDefined()

    await app.close()
  })

  it('should return 200 with redirect URL on valid code', async () => {
    const validCode = '123456'
    mockFlatSlugsFindFirst.mockResolvedValue({ flatId: 'flat-id-1' })
    mockRenterAccessCodesFindFirst.mockResolvedValue({
      id: 'access-code-id-1',
      flatId: 'flat-id-1',
      renterId: 'renter-id-1',
      codeHash: hashAccessCode(validCode),
      failedAttempts: 0,
      lockedUntil: null,
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: validCode },
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.success).toBe(true)
    expect(body.message).toBe('সফলভাবে লগইন হয়েছে')
    expect(body.redirectUrl).toBe('/dashboard')

    await app.close()
  })

  it('should set HTTP-only session cookie on success', async () => {
    const validCode = '654321'
    mockFlatSlugsFindFirst.mockResolvedValue({ flatId: 'flat-id-1' })
    mockRenterAccessCodesFindFirst.mockResolvedValue({
      id: 'access-code-id-1',
      flatId: 'flat-id-1',
      renterId: 'renter-id-1',
      codeHash: hashAccessCode(validCode),
      failedAttempts: 0,
      lockedUntil: null,
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: validCode },
    })

    expect(response.statusCode).toBe(200)

    // Check that the session cookie is set
    const setCookieHeader = response.headers['set-cookie']
    expect(setCookieHeader).toBeDefined()

    const cookieStr = Array.isArray(setCookieHeader)
      ? setCookieHeader[0]
      : setCookieHeader
    expect(cookieStr).toContain('portal_session=session-id-123')
    expect(cookieStr).toContain('HttpOnly')
    expect(cookieStr).toContain('SameSite=Strict')

    await app.close()
  })

  it('should allow access when lockout has expired', async () => {
    const validCode = '123456'
    const pastDate = new Date(Date.now() - 60 * 1000) // 1 minute ago (expired)
    mockFlatSlugsFindFirst.mockResolvedValue({ flatId: 'flat-id-1' })
    mockRenterAccessCodesFindFirst.mockResolvedValue({
      id: 'access-code-id-1',
      flatId: 'flat-id-1',
      renterId: 'renter-id-1',
      codeHash: hashAccessCode(validCode),
      failedAttempts: 5,
      lockedUntil: pastDate, // Lockout has expired
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/access',
      payload: { code: validCode },
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.success).toBe(true)
    expect(body.redirectUrl).toBe('/dashboard')

    await app.close()
  })
})
