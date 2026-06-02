import { ValidationError } from '@repo/shared/errors'
import AdmZip from 'adm-zip'
import fc from 'fast-check'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'
import { QrCodeService } from '../../src/services/qr-code'

/**
 * Feature: flat-qr-code-generation
 * Property 1: QR Code Round-Trip
 *
 * For any valid flat slug and configured frontend URL, generating a QR code and then
 * decoding the resulting PNG image SHALL yield the original URL in the format
 * `{frontend_url}/f/{slug}`.
 *
 */

// --- Helpers ---

const TEST_BASE_URL = 'https://app.amarspace.com'

/**
 * Decodes a PNG buffer into raw RGBA pixel data using pngjs,
 * then uses jsqr to read the QR code content.
 */
function decodeQrFromPngBuffer(pngBuffer: Buffer): string | null {
  const png = PNG.sync.read(pngBuffer)
  const { data, width, height } = png
  const result = jsQR(new Uint8ClampedArray(data.buffer), width, height)
  return result?.data ?? null
}

// --- Property 1: QR Code Round-Trip ---

describe('Feature: flat-qr-code-generation, Property 1: QR Code Round-Trip', () => {
  it('generating a QR code for any flat slug and decoding the PNG SHALL yield the original URL {frontend_url}/f/{slug}', async () => {
    const service = new QrCodeService(TEST_BASE_URL)

    // Generate valid slugs (lowercase alphanumeric + hyphens, 1-100 chars)
    const slugArb = fc
      .array(
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')),
        { minLength: 1, maxLength: 50 },
      )
      .map((chars) => chars.join(''))

    await fc.assert(
      fc.asyncProperty(slugArb, async (slug) => {
        const expectedUrl = `${TEST_BASE_URL}/f/${slug}`

        // Generate QR code PNG buffer
        const pngBuffer = await service.generateQrCode(slug)

        // Decode the QR code from the PNG
        const decodedUrl = decodeQrFromPngBuffer(pngBuffer)

        // Round-trip: decoded URL must match the expected URL
        expect(decodedUrl).toBe(expectedUrl)
      }),
      { numRuns: 200 },
    )
  }, 60_000)
})

/**
 * Feature: flat-qr-code-generation
 * Property 2: Size Parameter Controls Output Dimensions
 *
 * For any integer size value in the range [100, 1000], the generated QR code
 * image SHALL have pixel dimensions equal to the specified size. For any size
 * value outside [100, 1000], the service SHALL reject the request with a
 * validation error.
 *
 */

describe('Feature: flat-qr-code-generation, Property 2: Size Parameter Controls Output Dimensions', () => {
  const service = new QrCodeService(TEST_BASE_URL)

  it('for any valid size in [100, 1000], the generated image dimensions SHALL equal the specified size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
        fc.integer({ min: 100, max: 1000 }),
        async (slug, size) => {
          const pngBuffer = await service.generateQrCode(slug, { size })
          const png = PNG.sync.read(pngBuffer)

          expect(png.width).toBe(size)
          expect(png.height).toBe(size)
        },
      ),
      { numRuns: 100 },
    )
  }, 60_000)

  it('for any size outside [100, 1000], the service SHALL throw a ValidationError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
        fc.oneof(
          fc.integer({ min: -1000, max: 99 }),
          fc.integer({ min: 1001, max: 5000 }),
        ),
        async (slug, invalidSize) => {
          await expect(
            service.generateQrCode(slug, { size: invalidSize }),
          ).rejects.toThrow(ValidationError)
        },
      ),
      { numRuns: 200 },
    )
  })
})

/**
 * Feature: flat-qr-code-generation
 * Property 3: Tenant-Scoped Access Control
 *
 * For any flat and requesting user, QR code generation SHALL be permitted if
 * and only if: (a) the user is an owner and the flat belongs to their
 * `ownerAccountId`, OR (b) the user is a manager and the flat's `buildingId`
 * is in their `assignedBuildingIds`. All other combinations SHALL be denied.
 *
 */

// --- Access Control Decision Logic (extracted from route handler) ---

interface AccessUser {
  role: 'owner' | 'manager'
  ownerAccountId: string
}

interface AccessFlat {
  ownerAccountId: string
  buildingId: string
}

interface TenantScope {
  ownerAccountId: string
  assignedBuildingIds: string[]
}

/**
 * Determines whether a user can access a flat for QR code generation.
 *
 * This mirrors the access control logic in the route handler:
 * 1. The flat must belong to the user's ownerAccountId (tenant scope filter)
 * 2. If user is owner → access granted
 * 3. If user is manager → access granted only if flat's buildingId is in assignedBuildingIds
 * 4. Otherwise → denied
 */
function canAccessFlat(
  user: AccessUser,
  flat: AccessFlat,
  tenantScope: TenantScope,
): boolean {
  // Tenant scope: flat must belong to the same ownerAccountId
  if (flat.ownerAccountId !== tenantScope.ownerAccountId) return false

  if (user.role === 'owner') return true

  if (user.role === 'manager') {
    return tenantScope.assignedBuildingIds.includes(flat.buildingId)
  }

  return false
}

describe('Feature: flat-qr-code-generation, Property 3: Tenant-Scoped Access Control', () => {
  it("access is granted if and only if: (a) flat belongs to owner's account, OR (b) flat belongs to manager's account AND buildingId is in assignedBuildingIds", () => {
    fc.assert(
      fc.property(
        fc.record({
          userRole: fc.constantFrom('owner' as const, 'manager' as const),
          userOwnerAccountId: fc.uuid(),
          flatOwnerAccountId: fc.uuid(),
          flatBuildingId: fc.uuid(),
          assignedBuildingIds: fc.array(fc.uuid(), {
            minLength: 0,
            maxLength: 5,
          }),
        }),
        ({
          userRole,
          userOwnerAccountId,
          flatOwnerAccountId,
          flatBuildingId,
          assignedBuildingIds,
        }) => {
          const user: AccessUser = {
            role: userRole,
            ownerAccountId: userOwnerAccountId,
          }

          const flat: AccessFlat = {
            ownerAccountId: flatOwnerAccountId,
            buildingId: flatBuildingId,
          }

          const scope: TenantScope = {
            ownerAccountId: userOwnerAccountId,
            assignedBuildingIds,
          }

          const result = canAccessFlat(user, flat, scope)

          // Expected: access granted iff
          // (a) flat.ownerAccountId === user.ownerAccountId AND user is owner, OR
          // (b) flat.ownerAccountId === user.ownerAccountId AND user is manager AND buildingId in assignedBuildingIds
          const flatBelongsToUser = flat.ownerAccountId === user.ownerAccountId
          const expectedAccess =
            (flatBelongsToUser && userRole === 'owner') ||
            (flatBelongsToUser &&
              userRole === 'manager' &&
              assignedBuildingIds.includes(flatBuildingId))

          expect(result).toBe(expectedAccess)
        },
      ),
      { numRuns: 200 },
    )
  })
})

/**
 * Feature: flat-qr-code-generation
 * Property 5: Metadata Response Completeness
 *
 * For any flat with a valid building association, requesting QR code generation
 * in metadata format SHALL return a JSON response containing the flat ID, flat
 * number, building name, encoded URL, and a base64 string that decodes to a
 * valid PNG image.
 *
 */

describe('Feature: flat-qr-code-generation, Property 5: Metadata Response Completeness', () => {
  const service = new QrCodeService(TEST_BASE_URL)

  it('metadata response SHALL contain flatId, flatNumber, buildingName, encodedUrl, and valid base64 PNG for any valid flat', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          flatNumber: fc.string({ minLength: 1, maxLength: 10 }),
          slug: fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
        }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (flat, buildingName) => {
          const result = await service.generateQrCodeWithMetadata(
            flat,
            buildingName,
          )

          // Verify flatId equals the input flat.id
          expect(result.flatId).toBe(flat.id)

          // Verify flatNumber equals the input flat.flatNumber
          expect(result.flatNumber).toBe(flat.flatNumber)

          // Verify buildingName equals the input buildingName
          expect(result.buildingName).toBe(buildingName)

          // Verify encodedUrl equals {frontend_url}/f/{slug}
          expect(result.encodedUrl).toBe(`${TEST_BASE_URL}/f/${flat.slug}`)

          // Verify imageBase64 starts with data:image/png;base64,
          expect(result.imageBase64).toMatch(/^data:image\/png;base64,/)

          // Verify the base64 portion decodes to a valid PNG (check PNG magic bytes)
          const base64Data = result.imageBase64.replace(
            'data:image/png;base64,',
            '',
          )
          const imageBuffer = Buffer.from(base64Data, 'base64')

          // PNG magic bytes: 137 80 78 71 13 10 26 10
          const pngMagicBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
          expect(imageBuffer.subarray(0, 8)).toEqual(pngMagicBytes)
        },
      ),
      { numRuns: 200 },
    )
  }, 120_000)
})

/**
 * Feature: flat-qr-code-generation
 * Property 4: Bulk Generation Produces Complete ZIP Archive
 *
 * For any building with N flats (N ≥ 1), bulk QR code generation SHALL produce
 * a ZIP archive containing exactly N PNG files, where each file is named
 * `{building_name}_{flat_number}.png` and each PNG decodes to the correct flat URL.
 *
 */

describe('Feature: flat-qr-code-generation, Property 4: Bulk Generation Produces Complete ZIP Archive', () => {
  const service = new QrCodeService(TEST_BASE_URL)

  /**
   * Collects a readable stream into a single Buffer.
   */
  async function streamToBuffer(
    stream: import('node:stream').Readable,
  ): Promise<Buffer> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  it('for any building with N flats (N ≥ 1), ZIP SHALL contain exactly N PNG files with correct naming and each decodes to the correct flat URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a building name (alphanumeric to avoid filesystem issues)
        fc.string({
          minLength: 1,
          maxLength: 20,
          unit: fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
          ),
        }),
        // Generate 1-10 flats with unique flat numbers and slugs
        fc
          .array(
            fc.record({
              id: fc.uuid(),
              flatNumber: fc.string({
                minLength: 1,
                maxLength: 10,
                unit: fc.constantFrom(
                  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''),
                ),
              }),
              slug: fc.stringMatching(/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/),
            }),
            { minLength: 1, maxLength: 10 },
          )
          .filter((flats) => {
            // Ensure unique flat numbers and slugs
            const numbers = flats.map((f) => f.flatNumber)
            const slugs = flats.map((f) => f.slug)
            return (
              new Set(numbers).size === numbers.length &&
              new Set(slugs).size === slugs.length
            )
          }),
        async (buildingName, flats) => {
          // Generate bulk ZIP stream
          const stream = await service.generateBulkZipStream(
            flats,
            buildingName,
          )
          const zipBuffer = await streamToBuffer(stream)

          // Parse the ZIP archive
          const zip = new AdmZip(zipBuffer)
          const entries = zip.getEntries()

          // Verify: ZIP contains exactly N files
          expect(entries.length).toBe(flats.length)

          // Verify: each file is named {building_name}_{flat_number}.png
          const expectedFilenames = flats.map(
            (flat) => `${buildingName}_${flat.flatNumber}.png`,
          )
          const actualFilenames = entries.map((entry) => entry.entryName).sort()
          expect(actualFilenames).toEqual(expectedFilenames.sort())

          // Verify: each PNG in the ZIP decodes to the correct flat portal URL
          for (const flat of flats) {
            const filename = `${buildingName}_${flat.flatNumber}.png`
            const entry = zip.getEntry(filename)
            expect(entry).toBeDefined()

            const pngBuffer = entry!.getData()
            const decodedUrl = decodeQrFromPngBuffer(pngBuffer)
            const expectedUrl = `${TEST_BASE_URL}/f/${flat.slug}`
            expect(decodedUrl).toBe(expectedUrl)
          }
        },
      ),
      { numRuns: 100 },
    )
  }, 120_000)
})
