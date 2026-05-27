import Fastify from 'fastify'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the AWS SDK modules
const mockSend = vi.fn().mockResolvedValue({})

vi.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = mockSend
    config: unknown
    constructor(config: unknown) {
      this.config = config
    }
  }

  class MockPutObjectCommand {
    Bucket: string
    Key: string
    Body: unknown
    ContentType: string
    constructor(input: {
      Bucket: string
      Key: string
      Body: unknown
      ContentType: string
    }) {
      this.Bucket = input.Bucket
      this.Key = input.Key
      this.Body = input.Body
      this.ContentType = input.ContentType
    }
  }

  class MockGetObjectCommand {
    Bucket: string
    Key: string
    constructor(input: { Bucket: string; Key: string }) {
      this.Bucket = input.Bucket
      this.Key = input.Key
    }
  }

  class MockDeleteObjectCommand {
    Bucket: string
    Key: string
    constructor(input: { Bucket: string; Key: string }) {
      this.Bucket = input.Bucket
      this.Key = input.Key
    }
  }

  return {
    S3Client: MockS3Client,
    PutObjectCommand: MockPutObjectCommand,
    GetObjectCommand: MockGetObjectCommand,
    DeleteObjectCommand: MockDeleteObjectCommand,
  }
})

const mockGetSignedUrl = vi
  .fn()
  .mockResolvedValue('https://presigned-url.example.com/file')

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}))

describe('R2 Plugin', () => {
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
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  async function buildApp() {
    const app = Fastify()
    await app.register(import('../../src/plugins/env'))
    await app.register(import('../../src/plugins/r2'))
    await app.ready()
    return app
  }

  it('should decorate fastify instance with r2 client', async () => {
    const app = await buildApp()

    expect(app.r2).toBeDefined()
    expect(app.r2.upload).toBeTypeOf('function')
    expect(app.r2.getPresignedUrl).toBeTypeOf('function')
    expect(app.r2.delete).toBeTypeOf('function')

    await app.close()
  })

  describe('upload', () => {
    it('should return a storage key with correct format', async () => {
      const app = await buildApp()

      const key = await app.r2.upload(
        'owner-123',
        'renter_nid',
        'entity-456',
        'photo.jpg',
        Buffer.from('test-data'),
        'image/jpeg',
      )

      // Key format: {ownerAccountId}/{entityType}/{entityId}/{timestamp}-{filename}
      expect(key).toMatch(/^owner-123\/renter_nid\/entity-456\/\d+-photo\.jpg$/)

      await app.close()
    })

    it('should include a timestamp in the storage key', async () => {
      const app = await buildApp()
      const before = Date.now()

      const key = await app.r2.upload(
        'owner-1',
        'maintenance',
        'req-1',
        'image.png',
        Buffer.from('data'),
        'image/png',
      )

      const after = Date.now()
      const parts = key.split('/')
      const filenamePart = parts[3]
      const timestamp = Number.parseInt(filenamePart.split('-')[0], 10)

      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)

      await app.close()
    })

    it('should call S3Client.send with correct parameters', async () => {
      const app = await buildApp()

      await app.r2.upload(
        'owner-1',
        'signature',
        'entity-1',
        'sig.png',
        Buffer.from('sig-data'),
        'image/png',
      )

      expect(mockSend).toHaveBeenCalledTimes(1)

      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand.Bucket).toBe('test-bucket')
      expect(sentCommand.Body).toEqual(Buffer.from('sig-data'))
      expect(sentCommand.ContentType).toBe('image/png')
      expect(sentCommand.Key).toMatch(
        /^owner-1\/signature\/entity-1\/\d+-sig\.png$/,
      )

      await app.close()
    })
  })

  describe('getPresignedUrl', () => {
    it('should return a pre-signed URL', async () => {
      const app = await buildApp()

      const url = await app.r2.getPresignedUrl(
        'owner-1/nid/entity-1/123-photo.jpg',
      )

      expect(url).toBe('https://presigned-url.example.com/file')

      await app.close()
    })

    it('should call getSignedUrl with 1-hour expiry', async () => {
      const app = await buildApp()

      await app.r2.getPresignedUrl('some/key')

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ Bucket: 'test-bucket', Key: 'some/key' }),
        { expiresIn: 3600 },
      )

      await app.close()
    })
  })

  describe('delete', () => {
    it('should call S3Client.send with DeleteObjectCommand', async () => {
      const app = await buildApp()

      await app.r2.delete('owner-1/nid/entity-1/123-photo.jpg')

      expect(mockSend).toHaveBeenCalledTimes(1)

      const sentCommand = mockSend.mock.calls[0][0]
      expect(sentCommand.Bucket).toBe('test-bucket')
      expect(sentCommand.Key).toBe('owner-1/nid/entity-1/123-photo.jpg')

      await app.close()
    })
  })
})
