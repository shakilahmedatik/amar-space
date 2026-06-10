import { ValidationError } from '@repo/shared/errors'
import { describe, expect, it } from 'vitest'
import { QrCodeService } from '../../src/services/qr-code'

/**
 * Unit tests for the QrCodeService.
 *
 * Tests validate:
 * - URL building produces correct format
 * - Size validation with defaults and range enforcement
 * - QR code generation produces valid PNG buffers
 * - Metadata response contains all required fields
 *
 */

const TEST_BASE_URL = 'https://app.amarspace.com'

describe('QrCodeService', () => {
  describe('buildFlatUrl', () => {
    it('should return {frontendUrl}/portal/{slug} format', () => {
      const service = new QrCodeService(TEST_BASE_URL)
      const slug = 'building-a-flat-4a'

      const url = service.buildFlatUrl(slug)

      expect(url).toBe(`${TEST_BASE_URL}/portal/${slug}`)
    })
  })

  describe('validateSize', () => {
    it('should return 300 when no argument is provided', () => {
      const service = new QrCodeService(TEST_BASE_URL)

      const size = service.validateSize()

      expect(size).toBe(300)
    })

    it('should throw ValidationError when size is below 100', () => {
      const service = new QrCodeService(TEST_BASE_URL)

      expect(() => service.validateSize(50)).toThrow(ValidationError)
    })

    it('should throw ValidationError when size is above 1000', () => {
      const service = new QrCodeService(TEST_BASE_URL)

      expect(() => service.validateSize(1500)).toThrow(ValidationError)
    })

    it('should return the provided size when within valid range', () => {
      const service = new QrCodeService(TEST_BASE_URL)

      const size = service.validateSize(500)

      expect(size).toBe(500)
    })
  })

  describe('generateQrCode', () => {
    it('should produce a PNG buffer when no size option is provided', async () => {
      const service = new QrCodeService(TEST_BASE_URL)
      const slug = 'building-a-flat-001'

      const buffer = await service.generateQrCode(slug)

      // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      expect(buffer[0]).toBe(0x89)
      expect(buffer[1]).toBe(0x50) // P
      expect(buffer[2]).toBe(0x4e) // N
      expect(buffer[3]).toBe(0x47) // G
      expect(buffer[4]).toBe(0x0d)
      expect(buffer[5]).toBe(0x0a)
      expect(buffer[6]).toBe(0x1a)
      expect(buffer[7]).toBe(0x0a)
    })
  })

  describe('generateQrCodeWithMetadata', () => {
    it('should return object with flatId, flatNumber, buildingName, encodedUrl, imageBase64 fields', async () => {
      const service = new QrCodeService(TEST_BASE_URL)
      const flat = {
        id: 'flat-001',
        flatNumber: 'A101',
        slug: 'sunrise-tower-flat-a101',
      }
      const buildingName = 'Sunrise Tower'

      const metadata = await service.generateQrCodeWithMetadata(
        flat,
        buildingName,
      )

      expect(metadata).toHaveProperty('flatId', flat.id)
      expect(metadata).toHaveProperty('flatNumber', flat.flatNumber)
      expect(metadata).toHaveProperty('buildingName', buildingName)
      expect(metadata).toHaveProperty(
        'encodedUrl',
        `${TEST_BASE_URL}/portal/${flat.slug}`,
      )
      expect(metadata).toHaveProperty('imageBase64')
    })

    it('should return imageBase64 starting with data:image/png;base64,', async () => {
      const service = new QrCodeService(TEST_BASE_URL)
      const flat = {
        id: 'flat-002',
        flatNumber: 'B202',
        slug: 'ocean-view-flat-b202',
      }
      const buildingName = 'Ocean View'

      const metadata = await service.generateQrCodeWithMetadata(
        flat,
        buildingName,
      )

      expect(metadata.imageBase64).toMatch(/^data:image\/png;base64,/)
    })
  })
})
