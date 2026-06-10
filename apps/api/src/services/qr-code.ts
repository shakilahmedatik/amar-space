import type { Readable } from 'node:stream'
import { PassThrough } from 'node:stream'
import { ValidationError } from '@repo/shared/errors'
import archiver from 'archiver'
import { PNG } from 'pngjs'
import QRCode from 'qrcode'

// --- Types ---

export interface QrCodeOptions {
  /** Pixel width/height of the QR code image. Default: 300 */
  size?: number
}

export interface QrCodeMetadata {
  flatId: string
  flatNumber: string
  buildingName: string
  encodedUrl: string
  imageBase64: string
}

export interface BulkQrCodeEntry {
  filename: string
  buffer: Buffer
}

// --- Service ---

/**
 * QrCodeService handles QR code generation for flats.
 * Generates PNG images encoding flat portal URLs (/f/{slug}), supports metadata responses,
 * and bulk ZIP archive streaming for entire buildings.
 *
 * The QR code encodes the public portal URL using the flat's slug,
 * pointing to the frontend application (not the API server).
 *
 */
export class QrCodeService {
  constructor(private frontendUrl: string) {}

  /**
   * Builds the portal URL to encode in the QR code for a given flat slug.
   * Format: {frontendUrl}/f/{slug}
   *
   */
  buildFlatUrl(slug: string): string {
    return `${this.frontendUrl}/portal/${slug}`
  }

  /**
   * Validates the size parameter.
   * Returns the validated size or the default (300) if not provided.
   * Throws ValidationError if size is outside [100, 1000].
   *
   */
  validateSize(size?: number): number {
    if (size === undefined || size === null) {
      return 300
    }

    if (size < 100 || size > 1000) {
      throw new ValidationError([
        {
          field: 'size',
          message: 'Size must be between 100 and 1000 pixels',
          rule: 'range',
        },
      ])
    }

    return size
  }

  /**
   * Generates a QR code PNG buffer for a single flat.
   * Ensures the output image has exact pixel dimensions matching the requested size.
   *
   */
  async generateQrCode(slug: string, options?: QrCodeOptions): Promise<Buffer> {
    const size = this.validateSize(options?.size)
    const url = this.buildFlatUrl(slug)

    const buffer = await QRCode.toBuffer(url, {
      width: size,
      margin: 0,
      type: 'png',
      errorCorrectionLevel: 'M',
    })

    // The qrcode library may produce images slightly smaller than requested
    // due to QR module alignment. Ensure exact dimensions by padding if needed.
    const png = PNG.sync.read(buffer)
    if (png.width === size && png.height === size) {
      return buffer
    }

    // Create a new PNG at the exact requested size with white background
    const output = new PNG({ width: size, height: size })

    // Fill with white background
    for (let i = 0; i < output.data.length; i += 4) {
      output.data[i] = 255 // R
      output.data[i + 1] = 255 // G
      output.data[i + 2] = 255 // B
      output.data[i + 3] = 255 // A
    }

    // Center the QR code in the output image
    const offsetX = Math.floor((size - png.width) / 2)
    const offsetY = Math.floor((size - png.height) / 2)

    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const srcIdx = (y * png.width + x) * 4
        const dstIdx = ((y + offsetY) * size + (x + offsetX)) * 4
        output.data[dstIdx] = png.data[srcIdx]!
        output.data[dstIdx + 1] = png.data[srcIdx + 1]!
        output.data[dstIdx + 2] = png.data[srcIdx + 2]!
        output.data[dstIdx + 3] = png.data[srcIdx + 3]!
      }
    }

    return PNG.sync.write(output)
  }

  /**
   * Generates a QR code and returns metadata with base64-encoded image.
   *
   */
  async generateQrCodeWithMetadata(
    flat: { id: string; flatNumber: string; slug: string },
    buildingName: string,
    options?: QrCodeOptions,
  ): Promise<QrCodeMetadata> {
    const buffer = await this.generateQrCode(flat.slug, options)
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`
    const encodedUrl = this.buildFlatUrl(flat.slug)

    return {
      flatId: flat.id,
      flatNumber: flat.flatNumber,
      buildingName,
      encodedUrl,
      imageBase64: base64,
    }
  }

  /**
   * Generates QR codes for multiple flats and returns a ZIP archive stream.
   * Each file is named {building_name}_{flat_number}.png.
   *
   */
  async generateBulkZipStream(
    flats: Array<{ id: string; flatNumber: string; slug: string }>,
    buildingName: string,
    options?: QrCodeOptions,
  ): Promise<Readable> {
    const archive = archiver('zip', { zlib: { level: 6 } })
    const passThrough = new PassThrough()

    archive.pipe(passThrough)

    for (const flat of flats) {
      const buffer = await this.generateQrCode(flat.slug, options)
      const filename = `${buildingName}_${flat.flatNumber}.png`
      archive.append(buffer, { name: filename })
    }

    archive.finalize()

    return passThrough
  }
}
