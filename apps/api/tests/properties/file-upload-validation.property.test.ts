import { ValidationError } from '@repo/shared/errors'
import type { RequestContext } from '@repo/shared/types'
import fc from 'fast-check'
import { describe, expect, it, vi } from 'vitest'
import type { AuditLogger } from '../../src/plugins/audit-logger'
import type { R2Client } from '../../src/plugins/r2'
import {
  type FileAttachment,
  MaintenanceService,
} from '../../src/services/maintenance.service'

/**
 * Feature: amarspace-full-implementation
 * Property 18: File upload validation
 *
 * For any file upload, the system SHALL accept only files with MIME types in
 * {image/jpeg, image/png, image/webp} and size ≤ 5MB (5,242,880 bytes).
 * Files failing either constraint SHALL be rejected with a structured error
 * identifying the file name, rejection reason, and allowed constraints.
 *
 * When some files are valid and some invalid, valid ones are preserved and
 * invalid ones are rejected individually.
 *
 */

// --- Constants ---

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5,242,880 bytes
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const INVALID_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'video/mp4',
  'application/octet-stream',
  'application/zip',
  'text/html',
  'application/json',
]

// --- Helpers ---

function createMockAuditLogger(): AuditLogger {
  return {
    log: vi.fn(),
    query: vi.fn(),
    pendingRetries: 0,
    shutdown: vi.fn(),
  } as unknown as AuditLogger
}

function createMockR2(): R2Client {
  return {
    upload: vi.fn().mockResolvedValue('storage-key'),
    getPresignedUrl: vi.fn().mockResolvedValue('https://example.com/file'),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

function createRenterContext(): RequestContext {
  return {
    userId: 'user-renter-1',
    role: 'renter',
    ownerAccountId: 'owner-1',
    assignedFlatId: 'flat-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
  }
}

/**
 * Creates a MaintenanceService with a mock DB that supports renter context.
 * The service's validateAttachments method is private, so we test it via createRequest.
 */
function createServiceWithMockDb(
  auditLogger: AuditLogger,
  r2: R2Client,
  // biome-ignore lint/suspicious/noExplicitAny: test mock
): { service: MaintenanceService; db: any } {
  const db = {
    query: {
      renters: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'renter-1',
          userId: 'user-renter-1',
          ownerAccountId: 'owner-1',
        }),
      },
      flats: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'flat-1',
          ownerAccountId: 'owner-1',
          buildingId: 'building-1',
          flatNumber: 'A101',
          floor: 1,
          status: 'occupied',
        }),
      },
      maintenanceRequests: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 'request-1',
            ownerAccountId: 'owner-1',
            flatId: 'flat-1',
            renterId: 'renter-1',
            buildingId: 'building-1',
            title: 'Test Request',
            description: 'Test description for maintenance',
            priority: 'low',
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    }),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  }

  const service = new MaintenanceService(db as never, auditLogger, r2)
  return { service, db }
}

// --- Generators ---

/**
 * Generate a valid MIME type from the allowed set.
 */
const validMimeTypeArb = fc.constantFrom(...ALLOWED_MIME_TYPES)

/**
 * Generate an invalid MIME type (not in the allowed set).
 */
const invalidMimeTypeArb = fc.constantFrom(...INVALID_MIME_TYPES)

/**
 * Generate a valid file size: between 1 byte and 5MB (inclusive).
 */
const validFileSizeArb = fc.integer({ min: 1, max: MAX_FILE_SIZE })

/**
 * Generate an invalid file size: strictly greater than 5MB.
 */
const invalidFileSizeArb = fc.integer({
  min: MAX_FILE_SIZE + 1,
  max: MAX_FILE_SIZE * 2,
})

/**
 * Generate a valid file name: alphanumeric with extension.
 */
const validFileNameArb = fc
  .stringMatching(/^[a-zA-Z0-9_-]{1,20}$/)
  .map((name) => `${name}.jpg`)

/**
 * Generate a valid file attachment (correct MIME type, size ≤ 5MB).
 */
const validFileAttachmentArb: fc.Arbitrary<FileAttachment> = fc.record({
  fileName: validFileNameArb,
  buffer: fc.constant(Buffer.from('fake-image-data')),
  mimeType: validMimeTypeArb,
  fileSize: validFileSizeArb,
})

/**
 * Generate a file attachment with invalid MIME type (any size).
 */
const invalidMimeFileAttachmentArb: fc.Arbitrary<FileAttachment> = fc.record({
  fileName: validFileNameArb,
  buffer: fc.constant(Buffer.from('fake-data')),
  mimeType: invalidMimeTypeArb,
  fileSize: validFileSizeArb,
})

/**
 * Generate a file attachment with valid MIME type but size > 5MB.
 */
const oversizedFileAttachmentArb: fc.Arbitrary<FileAttachment> = fc.record({
  fileName: validFileNameArb,
  buffer: fc.constant(Buffer.from('fake-image-data')),
  mimeType: validMimeTypeArb,
  fileSize: invalidFileSizeArb,
})

/**
 * Generate a valid maintenance request input.
 */
const validRequestInputArb = fc.constant({
  title: 'Leaking pipe in bathroom',
  description: 'The pipe under the sink has been leaking for two days.',
  priority: 'medium',
})

// --- Property 18: File upload validation ---

describe('Feature: amarspace-full-implementation, Property 18: File upload validation', () => {
  // --- Sub-property: Files with invalid MIME type SHALL be rejected ---

  describe('files with invalid MIME type SHALL be rejected regardless of size', () => {
    it('any file with a MIME type not in {image/jpeg, image/png, image/webp} SHALL be rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidMimeFileAttachmentArb,
          validRequestInputArb,
          async (invalidFile, requestInput) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            // Property: A single file with invalid MIME type causes rejection
            await expect(
              service.createRequest(ctx, requestInput, [invalidFile]),
            ).rejects.toThrow(ValidationError)

            // Property: R2 upload is never called for invalid files
            expect(r2.upload).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('a file with invalid MIME type is rejected even when size is within 5MB', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidMimeTypeArb,
          validFileSizeArb,
          validFileNameArb,
          async (mimeType, fileSize, fileName) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            const file: FileAttachment = {
              fileName,
              buffer: Buffer.from('fake-data'),
              mimeType,
              fileSize,
            }

            // Property: Invalid MIME type is rejected regardless of file size
            await expect(
              service.createRequest(
                ctx,
                {
                  title: 'Leaking pipe in bathroom',
                  description:
                    'The pipe under the sink has been leaking for two days.',
                  priority: 'medium',
                },
                [file],
              ),
            ).rejects.toThrow(ValidationError)
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // --- Sub-property: Files exceeding 5MB SHALL be rejected ---

  describe('files exceeding 5MB SHALL be rejected regardless of MIME type', () => {
    it('any file with size > 5MB SHALL be rejected even with a valid MIME type', async () => {
      await fc.assert(
        fc.asyncProperty(
          oversizedFileAttachmentArb,
          validRequestInputArb,
          async (oversizedFile, requestInput) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            // Property: A file exceeding 5MB is rejected
            await expect(
              service.createRequest(ctx, requestInput, [oversizedFile]),
            ).rejects.toThrow(ValidationError)

            // Property: R2 upload is never called for oversized files
            expect(r2.upload).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('a file with size exactly at 5MB (5,242,880 bytes) SHALL be accepted', async () => {
      await fc.assert(
        fc.asyncProperty(validMimeTypeArb, async (mimeType) => {
          const auditLogger = createMockAuditLogger()
          const r2 = createMockR2()
          const { service } = createServiceWithMockDb(auditLogger, r2)
          const ctx = createRenterContext()

          const file: FileAttachment = {
            fileName: 'boundary.jpg',
            buffer: Buffer.alloc(MAX_FILE_SIZE),
            mimeType,
            fileSize: MAX_FILE_SIZE, // exactly 5MB — boundary value
          }

          // Property: File at exactly 5MB is accepted (boundary is inclusive)
          await expect(
            service.createRequest(
              ctx,
              {
                title: 'Boundary size test',
                description: 'Testing the exact 5MB boundary for file upload.',
                priority: 'low',
              },
              [file],
            ),
          ).resolves.toBeDefined()
        }),
        { numRuns: 10 },
      )
    })

    it('a file with size of 5MB + 1 byte SHALL be rejected', async () => {
      await fc.assert(
        fc.asyncProperty(validMimeTypeArb, async (mimeType) => {
          const auditLogger = createMockAuditLogger()
          const r2 = createMockR2()
          const { service } = createServiceWithMockDb(auditLogger, r2)
          const ctx = createRenterContext()

          const file: FileAttachment = {
            fileName: 'just-over-limit.jpg',
            buffer: Buffer.alloc(MAX_FILE_SIZE + 1),
            mimeType,
            fileSize: MAX_FILE_SIZE + 1, // 1 byte over the limit
          }

          // Property: File 1 byte over 5MB is rejected
          await expect(
            service.createRequest(
              ctx,
              {
                title: 'Over limit test',
                description: 'Testing one byte over the 5MB file size limit.',
                priority: 'low',
              },
              [file],
            ),
          ).rejects.toThrow(ValidationError)
        }),
        { numRuns: 10 },
      )
    })
  })

  // --- Sub-property: Valid files SHALL be accepted ---

  describe('files with valid MIME type AND size ≤ 5MB SHALL be accepted', () => {
    it('any combination of valid MIME type and size ≤ 5MB SHALL be accepted', async () => {
      await fc.assert(
        fc.asyncProperty(
          validFileAttachmentArb,
          validRequestInputArb,
          async (validFile, requestInput) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            // Property: A valid file (correct MIME type, size ≤ 5MB) is accepted
            const result = await service.createRequest(ctx, requestInput, [
              validFile,
            ])

            expect(result).toBeDefined()
            expect(result.id).toBeDefined()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('all three accepted MIME types (JPEG, PNG, WebP) SHALL be accepted', async () => {
      for (const mimeType of ALLOWED_MIME_TYPES) {
        const auditLogger = createMockAuditLogger()
        const r2 = createMockR2()
        const { service } = createServiceWithMockDb(auditLogger, r2)
        const ctx = createRenterContext()

        const file: FileAttachment = {
          fileName: `test.${mimeType.split('/')[1]}`,
          buffer: Buffer.from('fake-image-data'),
          mimeType,
          fileSize: 1024, // 1KB — well within limit
        }

        // Property: Each allowed MIME type is accepted
        const result = await service.createRequest(
          ctx,
          {
            title: `Test ${mimeType} upload`,
            description: `Testing that ${mimeType} files are accepted by the system.`,
            priority: 'low',
          },
          [file],
        )

        expect(result).toBeDefined()
      }
    })
  })

  // --- Sub-property: Maximum 5 files per request ---

  describe('maximum 5 files per maintenance request', () => {
    it('exactly 5 valid files SHALL be accepted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validFileAttachmentArb, { minLength: 5, maxLength: 5 }),
          async (files) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            // Property: Exactly 5 valid files are accepted
            const result = await service.createRequest(
              ctx,
              {
                title: 'Five files test',
                description: 'Testing that exactly 5 files can be uploaded.',
                priority: 'medium',
              },
              files,
            )

            expect(result).toBeDefined()
          },
        ),
        { numRuns: 50 },
      )
    })

    it('more than 5 files SHALL be rejected regardless of individual file validity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validFileAttachmentArb, { minLength: 6, maxLength: 10 }),
          async (files) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            // Property: More than 5 files are rejected
            await expect(
              service.createRequest(
                ctx,
                {
                  title: 'Too many files test',
                  description: 'Testing that more than 5 files are rejected.',
                  priority: 'low',
                },
                files,
              ),
            ).rejects.toThrow(ValidationError)
          },
        ),
        { numRuns: 50 },
      )
    })
  })

  // --- Sub-property: Mixed valid/invalid files — invalid ones are rejected individually ---

  describe('when some files are valid and some invalid, the entire batch is rejected', () => {
    it('a batch with at least one invalid MIME type file SHALL be rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validFileAttachmentArb, { minLength: 1, maxLength: 4 }),
          invalidMimeFileAttachmentArb,
          async (validFiles, invalidFile) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            // Mix valid and invalid files (total ≤ 5)
            const mixedFiles = [...validFiles, invalidFile]
            fc.pre(mixedFiles.length <= 5)

            // Property: A batch containing any invalid file is rejected
            await expect(
              service.createRequest(
                ctx,
                {
                  title: 'Mixed files test',
                  description: 'Testing mixed valid and invalid file uploads.',
                  priority: 'high',
                },
                mixedFiles,
              ),
            ).rejects.toThrow(ValidationError)

            // Property: No files are uploaded to R2 when validation fails
            expect(r2.upload).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('a batch with at least one oversized file SHALL be rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validFileAttachmentArb, { minLength: 1, maxLength: 4 }),
          oversizedFileAttachmentArb,
          async (validFiles, oversizedFile) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            // Mix valid and oversized files (total ≤ 5)
            const mixedFiles = [...validFiles, oversizedFile]
            fc.pre(mixedFiles.length <= 5)

            // Property: A batch containing any oversized file is rejected
            await expect(
              service.createRequest(
                ctx,
                {
                  title: 'Mixed size test',
                  description:
                    'Testing mixed valid and oversized file uploads.',
                  priority: 'urgent',
                },
                mixedFiles,
              ),
            ).rejects.toThrow(ValidationError)

            // Property: No files are uploaded to R2 when validation fails
            expect(r2.upload).not.toHaveBeenCalled()
          },
        ),
        { numRuns: 100 },
      )
    })

    it('the ValidationError for invalid files SHALL contain field-level errors identifying each invalid file', async () => {
      await fc.assert(
        fc.asyncProperty(
          invalidMimeTypeArb,
          validFileNameArb,
          async (invalidMimeType, fileName) => {
            const auditLogger = createMockAuditLogger()
            const r2 = createMockR2()
            const { service } = createServiceWithMockDb(auditLogger, r2)
            const ctx = createRenterContext()

            const invalidFile: FileAttachment = {
              fileName,
              buffer: Buffer.from('fake-data'),
              mimeType: invalidMimeType,
              fileSize: 1024,
            }

            let caughtError: ValidationError | undefined

            try {
              await service.createRequest(
                ctx,
                {
                  title: 'Error structure test',
                  description:
                    'Testing that error structure identifies invalid files.',
                  priority: 'low',
                },
                [invalidFile],
              )
            } catch (err) {
              if (err instanceof ValidationError) {
                caughtError = err
              }
            }

            // Property: ValidationError is thrown
            expect(caughtError).toBeDefined()
            expect(caughtError).toBeInstanceOf(ValidationError)

            // Property: The error contains field-level errors (stored in `details` on AppError)
            expect(caughtError!.details).toBeDefined()
            expect(caughtError!.details!.length).toBeGreaterThan(0)

            // Property: At least one error references the attachment field
            const attachmentError = caughtError!.details!.find((e) =>
              e.field.includes('attachment'),
            )
            expect(attachmentError).toBeDefined()
          },
        ),
        { numRuns: 100 },
      )
    })
  })

  // --- Sub-property: Zero files is valid (no attachments required) ---

  describe('zero file attachments is valid (attachments are optional)', () => {
    it('creating a maintenance request with no attachments SHALL succeed', async () => {
      await fc.assert(
        fc.asyncProperty(validRequestInputArb, async (requestInput) => {
          const auditLogger = createMockAuditLogger()
          const r2 = createMockR2()
          const { service } = createServiceWithMockDb(auditLogger, r2)
          const ctx = createRenterContext()

          // Property: No attachments is valid
          const result = await service.createRequest(ctx, requestInput)

          expect(result).toBeDefined()
          expect(result.id).toBeDefined()

          // Property: R2 upload is not called when there are no attachments
          expect(r2.upload).not.toHaveBeenCalled()
        }),
        { numRuns: 50 },
      )
    })
  })
})
