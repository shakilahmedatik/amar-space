import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app'

// Mock the access-code-hash utility
vi.mock('../../src/utils/access-code-hash', () => ({
  compareAccessCode: vi.fn(),
  hashAccessCode: vi.fn(),
}))

// Mock the R2 plugin to avoid real S3 connections
vi.mock('../../src/plugins/r2', () => {
  const fp = (
    fn: (fastify: {
      decorate: (name: string, value: unknown) => void
    }) => Promise<void>,
  ) => {
    const wrapped = fn
    ;(wrapped as Record<string, unknown>)[Symbol.for('skip-override')] = true
    ;(wrapped as Record<string, unknown>)[Symbol.for('fastify.display-name')] =
      'r2'
    return wrapped
  }
  return {
    default: fp(
      async (fastify: { decorate: (name: string, value: unknown) => void }) => {
        fastify.decorate('r2', {
          upload: vi.fn().mockResolvedValue('mock-storage-key/file.png'),
          getPresignedUrl: vi
            .fn()
            .mockResolvedValue('https://mock-url.com/file.png'),
          delete: vi.fn().mockResolvedValue(undefined),
        })
      },
    ),
  }
})

// Mock @repo/db to avoid real database connections
vi.mock('@repo/db', () => {
  const mockDb = {
    execute: vi.fn(),
    query: {
      flatSlugs: {
        findFirst: vi.fn(),
      },
      registrationRequests: {
        findFirst: vi.fn(),
      },
      renterAccessCodes: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => [{ id: 'mock-registration-id' }]),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({})),
      })),
    })),
  }

  return {
    createDbClient: vi.fn(() => mockDb),
    validateConnection: vi.fn(),
    emergencyContacts: {
      name: 'name',
      role: 'role',
      phone: 'phone',
      type: 'type',
      sortOrder: 'sort_order',
      buildingId: 'building_id',
    },
    flatSlugs: {
      slug: 'slug',
      flatId: 'flat_id',
    },
    registrationRequests: {
      id: 'id',
      flatId: 'flat_id',
      phone: 'phone',
      status: 'status',
    },
    flats: {},
    buildings: {},
    notices: {
      id: 'id',
      title: 'title',
      body: 'body',
      createdAt: 'created_at',
      isPinned: 'is_pinned',
      ownerAccountId: 'owner_account_id',
      targetAudience: 'target_audience',
      targetBuildingId: 'target_building_id',
    },
    renterAccessCodes: {
      id: 'id',
      flatId: 'flat_id',
      renterId: 'renter_id',
      codeHash: 'code_hash',
      failedAttempts: 'failed_attempts',
      lockedUntil: 'locked_until',
    },
    portalSessions: {
      id: 'id',
      flatId: 'flat_id',
      renterId: 'renter_id',
      expiresAt: 'expires_at',
    },
  }
})

describe('Portal Register Route - POST /api/portal/flat/:slug/register', () => {
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

  // Valid registration body for testing
  const validBody = {
    fullName: 'রহিম উদ্দিন',
    phone: '01712345678',
    nidNumber: '1234567890',
    bloodGroup: 'A+',
    occupation: 'ব্যবসায়ী',
    familyMembers: 4,
    emergencyContact: '01798765432',
    rentalStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    advanceAmount: 50000,
    digitalSignature:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  }

  const mockFlatSlugRecord = {
    id: 'slug-id-1',
    flatId: 'flat-id-1',
    slug: 'building-a-flat-4a',
    createdAt: new Date(),
    flat: {
      id: 'flat-id-1',
      flatNumber: '4A',
      status: 'vacant',
      buildingId: 'building-id-1',
      ownerAccountId: 'owner-1',
      floor: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      building: {
        id: 'building-id-1',
        name: 'Building A',
        address: '123 Street',
        totalFloors: 5,
        ownerAccountId: 'owner-1',
        whatsappGroupLink: null,
        managerPhone: null,
        logoUrl: null,
        coverImageUrl: null,
        rules: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  }

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env = { ...originalEnv, ...validEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should return 400 for invalid slug', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/INVALID-Slug/register',
      payload: validBody,
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_SLUG')
    expect(body.message).toBe('অবৈধ QR কোড')

    await app.close()
  })

  it('should return 400 for invalid registration body', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/register',
      payload: {
        fullName: '',
        phone: '123',
        nidNumber: '12345',
        bloodGroup: 'X+',
        occupation: '',
        familyMembers: 0,
        emergencyContact: '123',
        rentalStartDate: '2020-01-01',
        advanceAmount: -1,
        digitalSignature: '',
      },
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('VALIDATION_ERROR')
    expect(body.message).toBe('ফর্মে ত্রুটি রয়েছে')
    expect(body.errors).toBeDefined()

    await app.close()
  })

  it('should return 400 when flat slug is not found', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()
    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/valid-slug/register',
      payload: validBody,
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_SLUG')
    expect(body.message).toBe('ফ্ল্যাটটি পাওয়া যায়নি')

    await app.close()
  })

  it('should return 409 for duplicate pending registration', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()
    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFlatSlugRecord)
    ;(
      mockDb.query.registrationRequests.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ id: 'existing-request-id' })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/building-a-flat-4a/register',
      payload: validBody,
    })

    const body = response.json()
    expect(response.statusCode).toBe(409)
    expect(body.error).toBe('DUPLICATE_REQUEST')
    expect(body.message).toContain('ইতিমধ্যে')

    await app.close()
  })

  it('should return 201 with Bangla confirmation on successful registration', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()
    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFlatSlugRecord)
    ;(
      mockDb.query.registrationRequests.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/building-a-flat-4a/register',
      payload: validBody,
    })

    const body = response.json()
    expect(response.statusCode).toBe(201)
    expect(body.success).toBe(true)
    expect(body.message).toContain('সফলভাবে জমা হয়েছে')
    expect(body.requestId).toBe('mock-registration-id')

    await app.close()
  })

  it('should return 201 with optional NID photo', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()
    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFlatSlugRecord)
    ;(
      mockDb.query.registrationRequests.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'POST',
      url: '/api/portal/flat/building-a-flat-4a/register',
      payload: {
        ...validBody,
        nidPhoto:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    })

    const body = response.json()
    expect(response.statusCode).toBe(201)
    expect(body.success).toBe(true)
    expect(body.requestId).toBe('mock-registration-id')

    await app.close()
  })
})
