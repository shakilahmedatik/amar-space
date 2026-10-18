import { type Database, schema } from "@omniheaven/db";

export interface AuditLogParams {
  db: Pick<Database, "insert">;
  organizationId: string;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function recordAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await params.db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      organizationId: params.organizationId,
      actorId: params.actorId ?? null,
      actorEmail: params.actorEmail ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
  }
}
