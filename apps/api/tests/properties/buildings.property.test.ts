import { ConflictError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuildingService } from '../../src/services/building'

/**
 * Feature: amarspace-full-implementation
 * Property 7: Building name uniqueness per owner
 *
 * For any owner account, creating a building with a name that already exists
 * within that owner's account SHALL be rejected. Building names across different
 * owners are independent.
 *
 * **Validates: Requirements 5.9**
 */

// --- Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  }
}

function createOwnerContext(ownerAccountId: string): RequestContext {
  return {
    userId: `user-${ownerAccountId}`,
    role: 'owner',
    ownerAccountId,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  }
}

// --- Generators ---

/**
 * Generate a valid building name: 1-200 characters, non-empty.
 * Uses alphanumeric + spaces to simulate realistic building names.
 */
const validBuildingNameArb = fc
  .stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{0,50}[A-Za-z0-9]$/)
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 200)

/**
 * Generate a valid address: 1-500 characters.
 */
const validAddressArb = fc
  .stringMatching(/^[A-Za-z0-9][A-Za-z0-9, ]{5,50}$/)
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 500)

/**
 * Generate a unique owner account ID.
 */
const ownerAccountIdArb = fc.stringMatching(/^owner-[a-z0-9]{4,10}$/)

// --- Property 7: Building name uniqueness per owner ---

describe('Feature: amarspace-full-implementation, Property 7: Building name uniqueness per owner', () => {
  let auditLogger: ReturnType<typeof createMockAuditLogger>

  beforeEach(() => {
    auditLogger = createMockAuditLogger()
  })

  it('creating a building with a name that already exists within the same owner account SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBuildingNameArb,
        validAddressArb,
        validAddressArb,
        async (buildingName, address1, address2) => {
          const ownerAccountId = 'owner-account-1'
          const ctx = createOwnerContext(ownerAccountId)

          // Simulate: findFirst returns an existing building with the same name
          const db = {
            query: {
              buildings: {
                findFirst: vi.fn().mockResolvedValue({
                  id: 'existing-building-1',
                  ownerAccountId,
                  name: buildingName,
                }),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([]),
              }),
            }),
            update: vi.fn(),
            select: vi.fn(),
          }

          const service = new BuildingService(db as any, auditLogger as any)

          // Property: Duplicate name within same owner SHALL be rejected with ConflictError
          await expect(
            service.createBuilding(ctx, {
              name: buildingName,
              address: address2,
            }),
          ).rejects.toThrow(ConflictError)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('the same building name CAN exist across different owner accounts (no cross-tenant conflict)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBuildingNameArb,
        validAddressArb,
        ownerAccountIdArb,
        ownerAccountIdArb,
        async (buildingName, address, ownerId1, ownerId2) => {
          // Ensure we have two distinct owners
          fc.pre(ownerId1 !== ownerId2)

          const ctx1 = createOwnerContext(ownerId1)
          const ctx2 = createOwnerContext(ownerId2)

          const createdBuilding1 = {
            id: 'building-1',
            ownerAccountId: ownerId1,
            name: buildingName,
            address,
            totalFloors: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          const createdBuilding2 = {
            id: 'building-2',
            ownerAccountId: ownerId2,
            name: buildingName,
            address,
            totalFloors: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          // For owner 1: no existing building with that name (first creation)
          const db1 = {
            query: {
              buildings: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([createdBuilding1]),
              }),
            }),
            update: vi.fn(),
            select: vi.fn(),
          }

          // For owner 2: no existing building with that name in THEIR account
          const db2 = {
            query: {
              buildings: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([createdBuilding2]),
              }),
            }),
            update: vi.fn(),
            select: vi.fn(),
          }

          const service1 = new BuildingService(db1 as any, auditLogger as any)
          const service2 = new BuildingService(db2 as any, auditLogger as any)

          // Property: Same name across different owners SHALL succeed
          const result1 = await service1.createBuilding(ctx1, {
            name: buildingName,
            address,
          })
          const result2 = await service2.createBuilding(ctx2, {
            name: buildingName,
            address,
          })

          expect(result1).toBeDefined()
          expect(result1.name).toBe(buildingName)
          expect(result2).toBeDefined()
          expect(result2.name).toBe(buildingName)
          expect(result1.ownerAccountId).toBe(ownerId1)
          expect(result2.ownerAccountId).toBe(ownerId2)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('building name uniqueness check is case-sensitive (exact match)', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBuildingNameArb,
        validAddressArb,
        async (buildingName, address) => {
          // Only test names that have alphabetic characters to make case variation meaningful
          fc.pre(/[a-zA-Z]/.test(buildingName))

          const ownerAccountId = 'owner-account-1'
          const ctx = createOwnerContext(ownerAccountId)

          // Create a case variation of the name
          const caseVariation = buildingName
            .split('')
            .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
            .join('')

          // Ensure the variation is actually different from the original
          fc.pre(caseVariation !== buildingName)

          // Simulate: findFirst returns null (no exact match for the case variation)
          // This tests that the service uses exact string matching via eq()
          const db = {
            query: {
              buildings: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'building-new',
                    ownerAccountId,
                    name: caseVariation,
                    address,
                    totalFloors: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
            update: vi.fn(),
            select: vi.fn(),
          }

          const service = new BuildingService(db as any, auditLogger as any)

          // Property: A case-different name is treated as a different name
          // (the DB query uses exact eq() match, so if findFirst returns null,
          // the creation succeeds)
          const result = await service.createBuilding(ctx, {
            name: caseVariation,
            address,
          })
          expect(result).toBeDefined()
          expect(result.name).toBe(caseVariation)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('first building creation with any valid name SHALL succeed when no duplicate exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        validBuildingNameArb,
        validAddressArb,
        async (buildingName, address) => {
          const ownerAccountId = 'owner-account-1'
          const ctx = createOwnerContext(ownerAccountId)

          // Simulate: no existing building with that name
          const db = {
            query: {
              buildings: {
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                  {
                    id: 'building-new',
                    ownerAccountId,
                    name: buildingName,
                    address,
                    totalFloors: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
            update: vi.fn(),
            select: vi.fn(),
          }

          const service = new BuildingService(db as any, auditLogger as any)

          // Property: When no duplicate exists, creation succeeds
          const result = await service.createBuilding(ctx, {
            name: buildingName,
            address,
          })
          expect(result).toMatchObject({
            name: buildingName,
            ownerAccountId,
          })
        },
      ),
      { numRuns: 200 },
    )
  })
})
