import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { IR2Client } from "./types";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

/** Lazy-initialized S3 client — only created on first actual use */
let _s3Client: S3Client | null | undefined;

function getS3Client(): S3Client | null {
	if (_s3Client !== undefined) return _s3Client;

	if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
		_s3Client = new S3Client({
			region: "auto",
			endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: r2AccessKeyId,
				secretAccessKey: r2SecretAccessKey,
			},
		});
	} else {
		_s3Client = null;
	}

	return _s3Client;
}

export class CloudflareR2Client implements IR2Client {
	async upload(
		accountId: string,
		folder: string,
		entityId: string,
		filename: string,
		buffer: Buffer,
		mimeType: string,
	): Promise<string> {
		const client = getS3Client();
		if (!client || !bucketName) {
			console.warn("R2 is not configured, returning dummy URL");
			return "dummy-url";
		}

		const timestamp = Date.now();
		const storageKey = `${accountId}/${folder}/${entityId}/${timestamp}-${filename}`;

		const command = new PutObjectCommand({
			Bucket: bucketName,
			Key: storageKey,
			Body: buffer,
			ContentType: mimeType,
		});

		await client.send(command);

		return storageKey;
	}

	async delete(storageKey: string): Promise<void> {
		const client = getS3Client();
		if (!client || !bucketName) return;

		const command = new DeleteObjectCommand({
			Bucket: bucketName,
			Key: storageKey,
		});

		await client.send(command);
	}
}

export const r2Client = new CloudflareR2Client();
