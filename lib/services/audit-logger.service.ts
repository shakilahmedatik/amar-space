import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import type { IAuditLogger } from "@/lib/shared/types";

export class PostgresAuditLogger implements IAuditLogger {
	async log(entry: Record<string, unknown>): Promise<void> {
		try {
			await db.insert(auditLogs).values({
				ownerAccountId: entry.ownerAccountId as string,
				actorId: entry.actorId as string,
				action: entry.action as string,
				entityType: entry.entityType as string,
				entityId: entry.entityId as string,
				oldValues: entry.oldValues || null,
				newValues: entry.newValues || null,
				metadata: entry.metadata || null,
			});
		} catch (error) {
			console.error("[AuditLogger] Failed to write audit log:", error);
		}
	}
}

export const auditLogger = new PostgresAuditLogger();
