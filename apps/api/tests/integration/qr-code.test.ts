/**
 * Integration tests for QR code generation endpoints.
 *
 * Tests the full request lifecycle through the Fastify middleware pipeline
 * using app.inject(). Mocks the auth session layer to simulate different
 * user roles and states, while testing the real middleware chain.
 *
 * Endpoints tested:
 * - GET /api/flats/:id/qr-code (single flat QR code)
 * - GET /api/buildings/:id/qr-codes (bulk building QR codes)
 *
 */

import type { Database } from '@repo/db'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { afterEach, describe, expect, it, vi } from 'vitest'
import buildingQrCodeRoutes from '../../src/routes/property/building-qr-codes'
import flatQrCodeRoutes from '../../src/routes/property/flat-qr-code'

// --- Test Constants ---

const OWNER_ID = 'owner-00000000-0000-0000-0000-000000000001'
const MANAGER_ID = 'manager-0000-0000-0000-0000-000000000001'
const BUILDING_ID = '550e8400-e29b-41d4-a716-446655440001'
const BUILDING_ID_2 = '550e8400-e29b-41d4-a716-446655440002'
const FLAT_ID = '660e8400-e29b-41d4-a716-446655440001'
const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000'

// --- Test Helpers ---

interface MockSessionUser {
  id: string
  role: 'superadmin' | 'owner' | 'manager' | 'renter'
  ownerAccountId: string
  email: string
  approvalStatus?: 'pending' | 'approved' | 'rejected' | null
  isActive?: boolean
}

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: {
      flats: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      buildings: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      flatSlugs: {
        findFirst: vi.fn().mockResolvedValue({ slug: 'test-slug' }),
      },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    ...overrides,
  }
}

/**
 * Builds a test Fastify app with the real QR code routes and middleware chain.
 * Mocks the auth session layer and database queries.
 */
async function buildTestApp(options: {
  sessionUser: MockSessionUser | null
  db?: Record<string, unknown>
  managerAssignments?: string[]
}) {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  const mockDb = options.db ?? createMockDb()

  // Mock auth that returns the configured session user
  const mockAuth = {
    api: {
      getSession: vi.fn().mockResolvedValue(
        options.sessionUser
          ? {
              user: {
                ...options.sessionUser,
                name: options.sessionUser.email.split('@')[0],
              },
              session: { token: 'test-session-token', id: 'session-1' },
            }
          : null,
      ),
      revokeSession: vi.fn().mockResolvedValue(undefined),
    },
  }

  // Decorate with mocked plugins
  app.decorate('env', {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    AUTH_SECRET: 'a'.repeat(32),
    AUTH_BASE_URL: 'http://localhost:3001',
    AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
  })
  app.decorate('db', mockDb)
  app.decorate('auth', mockAuth)

  // Mock tenant scope DB queries for manager assignments
  if (options.sessionUser?.role === 'manager') {
    const assignedBuildings = (options.managerAssignments ?? []).map((id) => ({
      buildingId: id,
    }))
    const selectFn = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(assignedBuildings),
      }),
    })
    ;(mockDb as unknown as Database).select = selectFn
  }

  // Register the actual QR code route plugins
  app.register(flatQrCodeRoutes, { prefix: '/api/flats' })
  app.register(buildingQrCodeRoutes, { prefix: '/api/buildings' })

  await app.ready()
  return { app, mockDb, mockAuth }
}

// --- Test Suites ---

describe('Integration: QR Code Endpoints', () => {
  let app: FastifyInstance

  afterEach(async () => {
    if (app) {
      await app.close()
    }
  })

  describe('GET /api/flats/:id/qr-code', () => {
    it('should return 401 for unauthenticated request', async () => {
      const { app: testApp } = await buildTestApp({ sessionUser: null })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/flats/${FLAT_ID}/qr-code`,
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toContain('Authentication required')
    })

    it('should return 403 for renter role (unauthorized role)', async () => {
      const renter: MockSessionUser = {
        id: 'renter-1',
        role: 'renter',
        ownerAccountId: OWNER_ID,
        email: 'renter@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const { app: testApp } = await buildTestApp({ sessionUser: renter })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/flats/${FLAT_ID}/qr-code`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(403)
      const body = response.json()
      expect(body.error).toBe('Forbidden')
      expect(body.message).toContain('Insufficient permissions')
    })

    it('should return 200 with Content-Type image/png for authenticated owner requesting own flat', async () => {
      const owner: MockSessionUser = {
        id: OWNER_ID,
        role: 'owner',
        ownerAccountId: OWNER_ID,
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.flats.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: FLAT_ID,
        flatNumber: '101',
        buildingId: BUILDING_ID,
        ownerAccountId: OWNER_ID,
        building: { id: BUILDING_ID, name: 'Test Building' },
      })

      const { app: testApp } = await buildTestApp({
        sessionUser: owner,
        db: mockDb,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/flats/${FLAT_ID}/qr-code`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toBe('image/png')
    })

    it('should return 200 with Content-Type application/json for metadata format', async () => {
      const owner: MockSessionUser = {
        id: OWNER_ID,
        role: 'owner',
        ownerAccountId: OWNER_ID,
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.flats.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: FLAT_ID,
        flatNumber: '101',
        buildingId: BUILDING_ID,
        ownerAccountId: OWNER_ID,
        building: { id: BUILDING_ID, name: 'Test Building' },
      })

      const { app: testApp } = await buildTestApp({
        sessionUser: owner,
        db: mockDb,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/flats/${FLAT_ID}/qr-code?format=metadata`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/json')
      const body = response.json()
      expect(body.flatId).toBe(FLAT_ID)
      expect(body.flatNumber).toBe('101')
      expect(body.buildingName).toBe('Test Building')
      expect(body.encodedUrl).toContain(`/f/test-slug`)
      expect(body.imageBase64).toContain('data:image/png;base64,')
    })

    it('should return 200 for authenticated manager requesting flat in assigned building', async () => {
      const manager: MockSessionUser = {
        id: MANAGER_ID,
        role: 'manager',
        ownerAccountId: OWNER_ID,
        email: 'manager@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.flats.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: FLAT_ID,
        flatNumber: '101',
        buildingId: BUILDING_ID,
        ownerAccountId: OWNER_ID,
        building: { id: BUILDING_ID, name: 'Test Building' },
      })

      const { app: testApp } = await buildTestApp({
        sessionUser: manager,
        db: mockDb,
        managerAssignments: [BUILDING_ID],
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/flats/${FLAT_ID}/qr-code`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toBe('image/png')
    })

    it('should return 403 for authenticated manager requesting flat NOT in assigned building', async () => {
      const manager: MockSessionUser = {
        id: MANAGER_ID,
        role: 'manager',
        ownerAccountId: OWNER_ID,
        email: 'manager@example.com',
        approvalStatus: null,
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.flats.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: FLAT_ID,
        flatNumber: '101',
        buildingId: BUILDING_ID,
        ownerAccountId: OWNER_ID,
        building: { id: BUILDING_ID, name: 'Test Building' },
      })

      const { app: testApp } = await buildTestApp({
        sessionUser: manager,
        db: mockDb,
        managerAssignments: [BUILDING_ID_2], // Different building
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/flats/${FLAT_ID}/qr-code`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(403)
      const body = response.json()
      expect(body.error).toBe('Forbidden')
      expect(body.message).toContain('Insufficient permissions')
    })

    it('should return 404 for non-existent flat', async () => {
      const owner: MockSessionUser = {
        id: OWNER_ID,
        role: 'owner',
        ownerAccountId: OWNER_ID,
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.flats.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null)

      const { app: testApp } = await buildTestApp({
        sessionUser: owner,
        db: mockDb,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/flats/${NON_EXISTENT_ID}/qr-code`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('Flat not found')
    })
  })

  describe('GET /api/buildings/:id/qr-codes', () => {
    it('should return 401 for unauthenticated request', async () => {
      const { app: testApp } = await buildTestApp({ sessionUser: null })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/buildings/${BUILDING_ID}/qr-codes`,
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.statusCode).toBe(401)
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toContain('Authentication required')
    })

    it('should return 200 with Content-Type application/zip for authenticated owner requesting own building', async () => {
      const owner: MockSessionUser = {
        id: OWNER_ID,
        role: 'owner',
        ownerAccountId: OWNER_ID,
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.buildings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: BUILDING_ID,
        name: 'Test Building',
        ownerAccountId: OWNER_ID,
      })
      ;(
        mockDb.query.flats.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        { id: FLAT_ID, flatNumber: '101' },
        { id: '660e8400-e29b-41d4-a716-446655440002', flatNumber: '102' },
      ])

      const { app: testApp } = await buildTestApp({
        sessionUser: owner,
        db: mockDb,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/buildings/${BUILDING_ID}/qr-codes`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toBe('application/zip')
      expect(response.headers['content-disposition']).toContain(
        'Test Building_qr_codes.zip',
      )
    })

    it('should return 404 for non-existent building', async () => {
      const owner: MockSessionUser = {
        id: OWNER_ID,
        role: 'owner',
        ownerAccountId: OWNER_ID,
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.buildings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null)

      const { app: testApp } = await buildTestApp({
        sessionUser: owner,
        db: mockDb,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/buildings/${NON_EXISTENT_ID}/qr-codes`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(404)
      const body = response.json()
      expect(body.error).toBe('Not Found')
      expect(body.message).toBe('Building not found')
    })

    it('should return 400 for building with no flats', async () => {
      const owner: MockSessionUser = {
        id: OWNER_ID,
        role: 'owner',
        ownerAccountId: OWNER_ID,
        email: 'owner@example.com',
        approvalStatus: 'approved',
        isActive: true,
      }

      const mockDb = createMockDb()
      ;(
        mockDb.query.buildings.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: BUILDING_ID,
        name: 'Empty Building',
        ownerAccountId: OWNER_ID,
      })
      ;(
        mockDb.query.flats.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([])

      const { app: testApp } = await buildTestApp({
        sessionUser: owner,
        db: mockDb,
      })
      app = testApp

      const response = await app.inject({
        method: 'GET',
        url: `/api/buildings/${BUILDING_ID}/qr-codes`,
        headers: { authorization: 'Bearer test-token' },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error).toBe('Bad Request')
      expect(body.message).toBe(
        'Building has no flats to generate QR codes for',
      )
    })
  })
})
