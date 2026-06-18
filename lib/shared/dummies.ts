import type { IAuditLogger, IR2Client } from "./types";

export class DummyAuditLogger implements IAuditLogger {
	log(entry: Record<string, unknown>): void | Promise<void> {
		// No-op
	}
}

export class DummyR2Client implements IR2Client {
	async upload(
		accountId: string,
		folder: string,
		entityId: string,
		filename: string,
		buffer: Buffer,
		mimeType: string,
	): Promise<string> {
		return "dummy-url";
	}

	async delete(url: string): Promise<void> {
		// No-op
	}
}

export const dummyAuditLogger = new DummyAuditLogger();
export const dummyR2Client = new DummyR2Client();
