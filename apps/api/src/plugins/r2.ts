import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

// --- Interfaces ---

export interface R2Client {
  /**
   * Uploads a file to R2 storage.
   * Returns the storage key used to reference the file.
   */
  upload(
    ownerAccountId: string,
    entityType: string,
    entityId: string,
    filename: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string>

  /**
   * Generates a pre-signed URL for retrieving a file.
   * The URL is valid for 1 hour.
   */
  getPresignedUrl(storageKey: string): Promise<string>

  /**
   * Deletes a file from R2 storage.
   */
  delete(storageKey: string): Promise<void>
}

// --- Plugin ---

declare module 'fastify' {
  interface FastifyInstance {
    r2: R2Client
  }
}

export default fp(
  async function r2Plugin(fastify: FastifyInstance) {
    const { env } = fastify

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })

    const bucketName = env.R2_BUCKET_NAME

    const r2: R2Client = {
      async upload(
        ownerAccountId: string,
        entityType: string,
        entityId: string,
        filename: string,
        buffer: Buffer,
        mimeType: string,
      ): Promise<string> {
        const timestamp = Date.now()
        const storageKey = `${ownerAccountId}/${entityType}/${entityId}/${timestamp}-${filename}`

        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
          Body: buffer,
          ContentType: mimeType,
        })

        await s3Client.send(command)

        return storageKey
      },

      async getPresignedUrl(storageKey: string): Promise<string> {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
        })

        const url = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // 1 hour
        })

        return url
      },

      async delete(storageKey: string): Promise<void> {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
        })

        await s3Client.send(command)
      },
    }

    fastify.decorate('r2', r2)
  },
  {
    name: 'r2',
    dependencies: ['env'],
  },
)
