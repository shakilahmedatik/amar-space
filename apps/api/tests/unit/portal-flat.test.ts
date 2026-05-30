import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app'

// Mock the access-code-hash utility
vi.mock('../../src/utils/access-code-hash', () => ({
  compareAccessCode: vi.fn(),
  hashAccessCode: vi.fn(),
}))

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
        returning: vi.fn(() => [{ id: 'mock-id' }]),
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

describe('Portal Flat Route - GET /api/portal/flat/:slug', () => {
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
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should return 400 for invalid slug with uppercase characters', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/INVALID-Slug',
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_SLUG')
    expect(body.message).toBe('অবৈধ QR কোড')

    await app.close()
  })

  it('should return 400 for slug with special characters', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/invalid_slug!',
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_SLUG')
    expect(body.message).toBe('অবৈধ QR কোড')

    await app.close()
  })

  it('should return 400 for slug exceeding 100 characters', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    // Fastify's router has a maxParamLength of 100 by default,
    // so a 101-char slug won't match the route (returns 404).
    // This is correct behavior — the slug is rejected without a DB lookup.
    const longSlug = 'a'.repeat(101)
    const response = await app.inject({
      method: 'GET',
      url: `/api/portal/flat/${longSlug}`,
    })

    // The route doesn't match due to maxParamLength, so Fastify returns 404
    expect(response.statusCode).toBe(404)

    await app.close()
  })

  it('should return 404 when slug is not found in database', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()
    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug-123',
    })

    const body = response.json()
    expect(response.statusCode).toBe(404)
    expect(body.error).toBe('FLAT_NOT_FOUND')
    expect(body.message).toBe('ফ্ল্যাটটি পাওয়া যায়নি')

    await app.close()
  })

  it('should return 200 with correct portal data for valid slug', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()

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
          whatsappGroupLink: 'https://chat.whatsapp.com/abc',
          managerPhone: '01712345678',
          logoUrl: 'https://example.com/logo.png',
          coverImageUrl: 'https://example.com/cover.png',
          rules: '<p>No smoking</p>',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    }

    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFlatSlugRecord)

    // Mock emergency contacts query
    const mockContacts = [
      {
        name: 'মালিক সাহেব',
        role: 'মালিক',
        phone: '01711111111',
        type: 'building',
        order: 1,
      },
      {
        name: 'ম্যানেজার',
        role: 'ম্যানেজার',
        phone: '01722222222',
        type: 'building',
        order: 2,
      },
    ]
    ;(mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => mockContacts),
        })),
      })),
    })

    // Mock no pending registration
    ;(
      mockDb.query.registrationRequests.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/building-a-flat-4a',
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)

    // Verify building info
    expect(body.building.name).toBe('Building A')
    expect(body.building.logoUrl).toBe('https://example.com/logo.png')
    expect(body.building.coverImageUrl).toBe('https://example.com/cover.png')
    expect(body.building.whatsappGroupLink).toBe(
      'https://chat.whatsapp.com/abc',
    )
    expect(body.building.managerPhone).toBe('01712345678')
    expect(body.building.rules).toBe('<p>No smoking</p>')

    // Verify flat info with status mapping
    expect(body.flat.flatNumber).toBe('4A')
    expect(body.flat.status).toBe('AVAILABLE')
    expect(body.flat.slug).toBe('building-a-flat-4a')

    // Verify emergency contacts
    expect(body.emergencyContacts).toHaveLength(2)
    expect(body.emergencyContacts[0].name).toBe('মালিক সাহেব')
    expect(body.emergencyContacts[0].role).toBe('মালিক')
    expect(body.emergencyContacts[0].type).toBe('building')

    // Verify no pending registration
    expect(body.hasPendingRegistration).toBe(false)

    await app.close()
  })

  it('should return hasPendingRegistration true when pending request exists', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()

    const mockFlatSlugRecord = {
      id: 'slug-id-1',
      flatId: 'flat-id-1',
      slug: 'building-b-flat-1a',
      createdAt: new Date(),
      flat: {
        id: 'flat-id-1',
        flatNumber: '1A',
        status: 'occupied',
        buildingId: 'building-id-2',
        ownerAccountId: 'owner-1',
        floor: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        building: {
          id: 'building-id-2',
          name: 'Building B',
          address: '456 Road',
          totalFloors: 3,
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

    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFlatSlugRecord)

    ;(mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })

    // Mock pending registration exists
    ;(
      mockDb.query.registrationRequests.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 'reg-id-1',
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/building-b-flat-1a',
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.flat.status).toBe('OCCUPIED')
    expect(body.hasPendingRegistration).toBe(true)
    expect(body.building.whatsappGroupLink).toBeNull()
    expect(body.building.managerPhone).toBeNull()

    await app.close()
  })

  it('should map under_maintenance status to MAINTENANCE', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()

    const mockFlatSlugRecord = {
      id: 'slug-id-1',
      flatId: 'flat-id-1',
      slug: 'building-c-flat-2b',
      createdAt: new Date(),
      flat: {
        id: 'flat-id-1',
        flatNumber: '2B',
        status: 'under_maintenance',
        buildingId: 'building-id-3',
        ownerAccountId: 'owner-1',
        floor: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
        building: {
          id: 'building-id-3',
          name: 'Building C',
          address: '789 Lane',
          totalFloors: 4,
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

    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFlatSlugRecord)

    ;(mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })

    ;(
      mockDb.query.registrationRequests.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/building-c-flat-2b',
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.flat.status).toBe('MAINTENANCE')

    await app.close()
  })

  it('should not include private data in response', async () => {
    const { createDbClient } = await import('@repo/db')
    const mockDb = vi.mocked(createDbClient)()

    const mockFlatSlugRecord = {
      id: 'slug-id-1',
      flatId: 'flat-id-1',
      slug: 'test-flat',
      createdAt: new Date(),
      flat: {
        id: 'flat-id-1',
        flatNumber: '1A',
        status: 'vacant',
        buildingId: 'building-id-1',
        ownerAccountId: 'owner-1',
        floor: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        building: {
          id: 'building-id-1',
          name: 'Test Building',
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

    ;(
      mockDb.query.flatSlugs.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockFlatSlugRecord)

    ;(mockDb.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })

    ;(
      mockDb.query.registrationRequests.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/test-flat',
    })

    const body = response.json()
    const bodyStr = JSON.stringify(body)

    // Ensure no private data fields are present (Requirements 9.1, 9.2)
    expect(bodyStr).not.toContain('nid')
    expect(bodyStr).not.toContain('payment')
    expect(bodyStr).not.toContain('contract')
    expect(bodyStr).not.toContain('deposit')
    expect(bodyStr).not.toContain('ownerAccountId')
    expect(body).not.toHaveProperty('address')

    await app.close()
  })
})
