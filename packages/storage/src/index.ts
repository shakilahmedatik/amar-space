import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@omniheaven/env";
import { createLogger } from "@omniheaven/logger";

const logger = createLogger("storage");

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
      forcePathStyle: true, // Required for SeaweedFS & MinIO path-based buckets
    });
  }
  return s3ClientInstance;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

/**
 * Generates an S3 PUT presigned URL for direct client-to-storage upload.
 */
export async function getPresignedUploadUrl(
  folder: string,
  filename: string,
  contentType: string,
  expiresInSeconds = 600,
): Promise<PresignedUploadResult> {
  const s3 = getS3Client();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileKey = `${folder}/${Date.now()}-${sanitizedFilename}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  const publicUrl = `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${fileKey}`;

  logger.debug({ fileKey, contentType }, "Generated presigned upload URL");

  return {
    uploadUrl,
    fileKey,
    publicUrl,
  };
}

/**
 * Generates a signed GET URL with time-limited read access for sensitive/private assets.
 */
export async function getPresignedReadUrl(
  fileKey: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: fileKey,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Returns a static public URL for assets in public directories.
 */
export function getPublicUrl(fileKey: string): string {
  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${fileKey}`;
}

/**
 * Removes an object from S3 storage.
 */
export async function deleteFile(fileKey: string): Promise<void> {
  const s3 = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: fileKey,
  });

  await s3.send(command);
  logger.info({ fileKey }, "Deleted file from storage");
}
