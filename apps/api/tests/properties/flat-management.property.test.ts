import {
  FLAT_STATUS,
  FLAT_STATUS_TRANSITIONS,
  type FlatStatus,
} from '@repo/shared/constants'
import { ConflictError, ValidationError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import { FlatService } from '../../src/services/flat'

/**
 * Feature: amarspace-full-implementation
 * Property 8: Flat number uniqueness within building
 *
 * For any building, creating a flat with a flat number that already exists within
 * that building SHALL be rejected. The same flat number in different buildings is allowed.
 *
 */

/**
 * Feature: amarspace-full-implementation
 * Property 9: Flat status transition validity
 *
 * For any flat in any status, the only valid transitions are:
 * Vacant → Occupied (renter assigned), Occupied → Vacant (contract ended),
 * Vacant → Under_Maintenance, Under_Maintenance → Vacant.
 * All other transitions SHALL be rejected. Occupied flats cannot be deleted.
 *
 */

// --- Generators ---

/** Generate a valid flat number: alphanumeric with hyphens/underscores, 1-20 chars */
const validFlatNumberArb = fc
  .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9\-_]{0,19}$/)
  .filter((s) => s.length >= 1 && s.length <= 20)

/** Generate a valid floor number: integer between 1 and 200 */
const validFloorArb = fc.integer({ min: 1, max: 200 })

/** Generate a UUID-like string for IDs */
const uuidArb = fc.uuid()

/** Generate a flat status from the defined constants */
const flatStatusArb = fc.constantFrom(
  FLAT_STATUS.VACANT,
  FLAT_STATUS.OCCUPIED,
  FLAT_STATUS.UNDER_MAINTENANCE,
)

// --- Mock Helpers ---

function createMockAuditLogger() {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  }
}

function createOwnerContext(ownerAccountId = 'owner-1'): RequestContext {
  return {
    userId: ownerAccountId,
    role: 'owner',
    ownerAccountId,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  }
}

// --- Property 8: Flat number uniqueness within building ---

describe('Feature: amarspace-full-implementation, Property 8: Flat number uniqueness within building', () => {
  it('creating a flat with a flat number that already exists in the same building SHALL be rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        validFlatNumberArb,
        validFloorArb,
        uuidArb,
        async (flatNumber, floor, buildingId) => {
          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const auditLogger = createMockAuditLogger()

          // Create a mock DB where the flat number already exists in this building
          const db = {
            query: {
              buildings: {
                findFirst: vi.fn().mockResolvedValue({
                  id: buildingId,
                  ownerAccountId,
                  name: 'Test Building',
                }),
              },
              flats: {
                findFirst: vi.fn().mockResolvedValue({
                  id: 'existing-flat-id',
                  buildingId,
                  flatNumber,
                  ownerAccountId,
                }),
              },
            },
            insert: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            select: vi.fn(),
          } as unknown

          const service = new FlatService(db as never, auditLogger as never)

          // Property: Creating a flat with a duplicate flat number in the same building is rejected
          await expect(
            service.createFlat(ctx, { buildingId, flatNumber, floor }),
          ).rejects.toThrow(ConflictError)
        },
      ),
      { numRuns: 200 },
    )
  })

  it('the same flat number CAN exist in different buildings', async () => {
    await fc.assert(
      fc.asyncProperty(
        validFlatNumberArb,
        validFloorArb,
        uuidArb,
        uuidArb,
        async (flatNumber, floor, buildingId1, buildingId2) => {
          // Ensure different building IDs
          fc.pre(buildingId1 !== buildingId2)

          const ownerAccountId = 'owner-1'
          const ctx = createOwnerContext(ownerAccountId)
          const auditLogger = createMockAuditLogger()

          // Mock DB where the flat number does NOT exist in building2
          const createdFlat = {
            id: 'new-flat-id',
            ownerAccountId,
            buildingId: buildingId2,
            flatNumber,
            floor,
            status: 'vacant',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          }

          const db = {
            query: {
              buildings: {
                findFirst: vi.fn().mockResolvedValue({
                  id: buildingId2,
                  ownerAccountId,
                  name: 'Building 2',
                }),
              },
              flats: {
                // No existing flat with this number in building2
                findFirst: vi.fn().mockResolvedValue(null),
              },
            },
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([createdFlat]),
              }),
            }),
            update: vi.fn(),
            delete: vi.fn(),
            select: vi.fn(),
          } as unknown

          const service = new FlatService(db as never, auditLogger as never)

          // Property: Creating a flat with the same number in a different building succeeds
          const result = await service.createFlat(ctx, {
            buildingId: buildingId2,
            flatNumber,
            floor,
          })

          expect(result.flatNumber).toBe(flatNumber)
          expect(result.buildingId).toBe(buildingId2)
        },
      ),
      { numRuns: 200 },
    )
  })
})

// --- Property 9: Flat status transition validity ---

describe('Feature: amarspace-full-implementation, Property 9: Flat status transition validity', () => {
  it('only valid transitions are allowed according to the state machine', async () => {
    await fc.assert(
      fc.asyncProperty(
        flatStatusArb,
        flatStatusArb,
        async (currentStatus, newStatus) => {
          const allowedTransitions = FLAT_STATUS_TRANSITIONS[currentStatus]
          const isValidTransition = allowedTransitions.includes(newStatus)

          // Skip self-transitions (same status) as they are implicitly invalid
          fc.pre(currentStatus !== newStatus)

          const ownerAccountId = 'owner-1'
          const flatId = 'flat-1'
          const ctx = createOwnerContext(ownerAccountId)
          const auditLogger = createMockAuditLogger()

          const existingFlat = {
            id: flatId,
            ownerAccountId,
            buildingId: 'building-1',
            flatNumber: 'A101',
            floor: 1,
            status: currentStatus,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          }

          const db = {
            query: {
              buildings: { findFirst: vi.fn() },
              flats: {
                findFirst: vi.fn().mockResolvedValue(existingFlat),
              },
            },
            insert: vi.fn(),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([
                    {
                      ...existingFlat,
                      status: newStatus,
                      updatedAt: new Date(),
                    },
                  ]),
                }),
              }),
            }),
            delete: vi.fn(),
            select: vi.fn(),
          } as unknown

          const service = new FlatService(db as never, auditLogger as never)

          if (isValidTransition) {
            // Property: Valid transitions succeed
            const result = await service.transitionStatus(
              ctx,
              flatId,
              newStatus,
            )
            expect(result).toBeDefined()
            expect(result.status).toBe(newStatus)
          } else {
            // Property: Invalid transitions are rejected with ValidationError
            await expect(
              service.transitionStatus(ctx, flatId, newStatus),
            ).rejects.toThrow(ValidationError)
          }
        },
      ),
      { numRuns: 200 },
    )
  })

  it('all valid transitions are exactly: Vacant→Occupied, Occupied→Vacant, Vacant→Under_Maintenance, Under_Maintenance→Vacant', () => {
    // Exhaustively verify the transition map matches the spec
    const expectedTransitions: [FlatStatus, FlatStatus][] = [
      [FLAT_STATUS.VACANT, FLAT_STATUS.OCCUPIED],
      [FLAT_STATUS.VACANT, FLAT_STATUS.UNDER_MAINTENANCE],
      [FLAT_STATUS.OCCUPIED, FLAT_STATUS.VACANT],
      [FLAT_STATUS.UNDER_MAINTENANCE, FLAT_STATUS.VACANT],
    ]

    return fc.assert(
      fc.property(flatStatusArb, flatStatusArb, (from, to) => {
        fc.pre(from !== to)

        const isExpectedValid = expectedTransitions.some(
          ([f, t]) => f === from && t === to,
        )
        const isActuallyValid =
          FLAT_STATUS_TRANSITIONS[from]?.includes(to) ?? false

        // Property: The transition map matches exactly the expected valid transitions
        expect(isActuallyValid).toBe(isExpectedValid)
      }),
      { numRuns: 200 },
    )
  })

  it('deletion is only allowed when status is Vacant', async () => {
    await fc.assert(
      fc.asyncProperty(flatStatusArb, async (currentStatus) => {
        const ownerAccountId = 'owner-1'
        const flatId = 'flat-1'
        const ctx = createOwnerContext(ownerAccountId)
        const auditLogger = createMockAuditLogger()

        const existingFlat = {
          id: flatId,
          ownerAccountId,
          buildingId: 'building-1',
          flatNumber: 'A101',
          floor: 1,
          status: currentStatus,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        }

        const dbMock = {
          query: {
            buildings: { findFirst: vi.fn() },
            flats: {
              findFirst: vi.fn().mockResolvedValue(existingFlat),
            },
          },
          insert: vi.fn(),
          update: vi.fn(),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
          select: vi.fn(),
          transaction: vi.fn().mockImplementation(async (cb) => {
            return cb(dbMock)
          }),
        }

        const service = new FlatService(dbMock as never, auditLogger as never)

        if (currentStatus === FLAT_STATUS.VACANT) {
          // Property: Deletion succeeds for Vacant flats
          await expect(service.deleteFlat(ctx, flatId)).resolves.toBeUndefined()
        } else {
          // Property: Deletion is rejected for non-Vacant flats
          await expect(service.deleteFlat(ctx, flatId)).rejects.toThrow(
            ValidationError,
          )
        }
      }),
      { numRuns: 200 },
    )
  })
})
