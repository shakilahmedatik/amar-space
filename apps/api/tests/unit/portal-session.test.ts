import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApp } from '../../src/app'

const mockPortalSessionsFindFirst = vi.fn()
const mockFlatSlugsFindFirst = vi.fn()
const mockRenterAccessCodesFindFirst = vi.fn()
const mockRegistrationRequestsFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockInsert = vi.fn()

// Mock @repo/db to avoid real database connections
vi.mock('@repo/db', () => ({
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
      portalSessions: {
        findFirst: mockPortalSessionsFindFirst,
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
    flatId: 'flat_id',
    status: 'status',
  },
  renterAccessCodes: {
    flatId: 'flat_id',
    id: 'id',
  },
  portalSessions: {
    id: 'id',
    flatId: 'flat_id',
    renterId: 'renter_id',
    expiresAt: 'expires_at',
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
}))

describe('Portal Session Route - GET /api/portal/flat/:slug/session', () => {
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
    mockFlatSlugsFindFirst.mockResolvedValue({
      flatId: 'flat-123',
      slug: 'valid-slug',
    })
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  it('should return valid: false when no portal_session cookie is present', async () => {
    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug/session',
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ valid: false })
  })

  it('should return valid: false when session is not found in database', async () => {
    mockPortalSessionsFindFirst.mockResolvedValue(null)

    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug/session',
      cookies: {
        portal_session: 'non-existent-session-id',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ valid: false })
  })

  it('should return valid: false when session has expired', async () => {
    const expiredDate = new Date(Date.now() - 60 * 1000) // 1 minute ago
    mockPortalSessionsFindFirst.mockResolvedValue({
      id: 'session-123',
      expiresAt: expiredDate,
      flatId: 'flat-123',
    })

    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug/session',
      cookies: {
        portal_session: 'session-123',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ valid: false })
  })

  it('should return valid: true when session is active and not expired', async () => {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    mockPortalSessionsFindFirst.mockResolvedValue({
      id: 'session-123',
      expiresAt: futureDate,
      flatId: 'flat-123',
    })

    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug/session',
      cookies: {
        portal_session: 'session-123',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ valid: true })
  })

  it('should return valid: false when session flatId does not match flat slug flatId', async () => {
    const futureDate = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
    mockPortalSessionsFindFirst.mockResolvedValue({
      id: 'session-123',
      expiresAt: futureDate,
      flatId: 'different-flat-id',
    })

    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug/session',
      cookies: {
        portal_session: 'session-123',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ valid: false })
  })

  it('should return valid: false when session expires at exactly the current time', async () => {
    const now = new Date()
    mockPortalSessionsFindFirst.mockResolvedValue({
      id: 'session-123',
      expiresAt: now,
      flatId: 'flat-123',
    })

    const app = await buildApp()

    const response = await app.inject({
      method: 'GET',
      url: '/api/portal/flat/valid-slug/session',
      cookies: {
        portal_session: 'session-123',
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ valid: false })
  })
})
