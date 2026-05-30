import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app'

const mockFindFirst = vi.fn()
const mockSelect = vi.fn()

// Mock @repo/db to avoid real database connections
vi.mock('@repo/db', () => ({
  createDbClient: vi.fn(() => ({
    execute: vi.fn(),
    query: {
      flatSlugs: {
        findFirst: mockFindFirst,
      },
      registrationRequests: {
        findFirst: vi.fn(),
      },
    },
    select: mockSelect,
  })),
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
  },
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
  registrationRequests: {
    flatId: 'flat_id',
    status: 'status',
  },
}))

describe('Portal Notices Route - GET /api/portal/flat/:slug/notices', () => {
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
    mockFindFirst.mockReset()
    mockSelect.mockReset()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return 400 for invalid slug', async () => {
    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/INVALID-Slug/notices',
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
      url: '/api/portal/flat/invalid_slug!/notices',
    })

    const body = response.json()
    expect(response.statusCode).toBe(400)
    expect(body.error).toBe('INVALID_SLUG')
    expect(body.message).toBe('অবৈধ QR কোড')

    await app.close()
  })

  it('should return 404 when slug is not found in database', async () => {
    mockFindFirst.mockResolvedValue(null)

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug-123/notices',
    })

    const body = response.json()
    expect(response.statusCode).toBe(404)
    expect(body.error).toBe('FLAT_NOT_FOUND')
    expect(body.message).toBe('ফ্ল্যাটটি পাওয়া যায়নি')

    await app.close()
  })

  it('should return 200 with notices for valid slug', async () => {
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

    mockFindFirst.mockResolvedValue(mockFlatSlugRecord)

    // Mock notices query chain: select().from().where().orderBy().limit()
    const mockNotices = [
      {
        id: 'notice-1',
        title: 'পানি সরবরাহ বন্ধ',
        body: 'আগামীকাল সকাল ১০টা থেকে বিকাল ৪টা পর্যন্ত পানি সরবরাহ বন্ধ থাকবে।',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        isPinned: true,
      },
      {
        id: 'notice-2',
        title: 'লিফট মেরামত',
        body: 'লিফট মেরামতের কাজ চলছে।',
        createdAt: new Date('2024-01-14T08:00:00Z'),
        isPinned: false,
      },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => mockNotices),
          })),
        })),
      })),
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/building-a-flat-4a/notices',
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.notices).toHaveLength(2)
    expect(body.notices[0].id).toBe('notice-1')
    expect(body.notices[0].title).toBe('পানি সরবরাহ বন্ধ')
    expect(body.notices[0].isPinned).toBe(true)
    expect(body.notices[0].createdAt).toBe('2024-01-15T10:00:00.000Z')
    expect(body.notices[1].id).toBe('notice-2')
    expect(body.notices[1].isPinned).toBe(false)

    await app.close()
  })

  it('should truncate notice body to 120 characters with ellipsis', async () => {
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

    mockFindFirst.mockResolvedValue(mockFlatSlugRecord)

    // Create a notice with body longer than 120 characters
    const longBody = 'a'.repeat(200)
    const mockNotices = [
      {
        id: 'notice-long',
        title: 'Long Notice',
        body: longBody,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        isPinned: false,
      },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => mockNotices),
          })),
        })),
      })),
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/test-flat/notices',
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.notices).toHaveLength(1)
    // Body should be truncated to 120 chars + ellipsis character
    expect(body.notices[0].body).toHaveLength(121) // 120 chars + '…' (1 char)
    expect(body.notices[0].body.endsWith('…')).toBe(true)
    expect(body.notices[0].body.startsWith('a'.repeat(120))).toBe(true)

    await app.close()
  })

  it('should not truncate notice body that is exactly 120 characters', async () => {
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

    mockFindFirst.mockResolvedValue(mockFlatSlugRecord)

    const exactBody = 'b'.repeat(120)
    const mockNotices = [
      {
        id: 'notice-exact',
        title: 'Exact Notice',
        body: exactBody,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        isPinned: false,
      },
    ]

    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => mockNotices),
          })),
        })),
      })),
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/test-flat/notices',
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.notices[0].body).toBe(exactBody)
    expect(body.notices[0].body).toHaveLength(120)

    await app.close()
  })

  it('should return empty notices array when no notices exist', async () => {
    const mockFlatSlugRecord = {
      id: 'slug-id-1',
      flatId: 'flat-id-1',
      slug: 'empty-flat',
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
          name: 'Empty Building',
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

    mockFindFirst.mockResolvedValue(mockFlatSlugRecord)

    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => []),
          })),
        })),
      })),
    })

    const app = buildApp({ logger: false })
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/empty-flat/notices',
    })

    const body = response.json()
    expect(response.statusCode).toBe(200)
    expect(body.notices).toHaveLength(0)
    expect(body.notices).toEqual([])

    await app.close()
  })
})
