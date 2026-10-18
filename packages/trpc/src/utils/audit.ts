import { type Database, schema } from "@omniheaven/db";
import { AUDIT_ERROR_CODES, sanitizeAuditValue } from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";

export interface AuditActor {
  id?: string | null;
  userId?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface RecordAuditLogParams {
  orgId?: string;
  organizationId?: string;
  actor?: AuditActor;
  actorUserId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  throwOnError?: boolean;
  req?: {
    header?: (name: string) => string | undefined;
    headers?: Record<string, string | undefined>;
  };
}

export interface LegacyAuditLogParams {
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

// Function overloads to support both signatures:
// 1. recordAuditLog(tx, { orgId, actor, action, ... })
// 2. recordAuditLog({ db, organizationId, ... })
export async function recordAuditLog(
  dbOrParams: Pick<Database, "insert"> | LegacyAuditLogParams,
  maybeParams?: RecordAuditLogParams,
): Promise<void> {
  let db: Pick<Database, "insert">;
  let params: RecordAuditLogParams;

  if (maybeParams !== undefined) {
    db = dbOrParams as Pick<Database, "insert">;
    params = maybeParams;
  } else {
    const legacy = dbOrParams as LegacyAuditLogParams;
    db = legacy.db;
    params = {
      organizationId: legacy.organizationId,
      actorId: legacy.actorId,
      actorEmail: legacy.actorEmail,
      action: legacy.action,
      entityType: legacy.entityType,
      entityId: legacy.entityId,
      metadata: legacy.details,
      ipAddress: legacy.ipAddress,
    };
  }

  const orgId = params.orgId ?? params.organizationId;
  if (!orgId) {
    console.error("[AuditLog] organizationId/orgId is required to write audit log.");
    return;
  }

  // Extract client IP address if req is provided
  let ip = params.ipAddress ?? null;
  let ua = params.userAgent ?? null;

  if (params.req) {
    if (!ip) {
      if (typeof params.req.header === "function") {
        ip =
          params.req.header("cf-connecting-ip") ||
          params.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
          params.req.header("x-real-ip") ||
          null;
      } else if (params.req.headers) {
        ip =
          params.req.headers["cf-connecting-ip"] ||
          params.req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          params.req.headers["x-real-ip"] ||
          null;
      }
    }

    if (!ua) {
      if (typeof params.req.header === "function") {
        ua = params.req.header("user-agent") || null;
      } else if (params.req.headers) {
        ua = params.req.headers["user-agent"] || null;
      }
    }
  }

  const actorUserId =
    params.actorUserId ?? params.actor?.userId ?? params.actor?.id ?? params.actorId ?? null;
  const actorEmail = params.actorEmail ?? params.actor?.email ?? "system@omniheaven.local";
  const actorRole = params.actorRole ?? params.actor?.role ?? "system";
  const entityId = params.entityId ?? "unknown";

  // Sanitize before/after diffs & metadata to strip passwords, tokens, API keys
  const sanitizedOldValue =
    params.oldValue !== undefined ? sanitizeAuditValue(params.oldValue) : null;
  const sanitizedNewValue =
    params.newValue !== undefined ? sanitizeAuditValue(params.newValue) : null;
  const rawMetadata = params.metadata ?? params.details ?? null;
  const sanitizedMetadata = rawMetadata !== null ? sanitizeAuditValue(rawMetadata) : null;

  try {
    await db.insert(schema.auditLogs).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      actorUserId,
      actorEmail,
      actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId,
      oldValue: sanitizedOldValue,
      newValue: sanitizedNewValue,
      metadata: sanitizedMetadata,
      ipAddress: ip,
      userAgent: ua,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
    if (params.throwOnError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: AUDIT_ERROR_CODES.AUDIT_LOG_WRITE_FAILED,
        cause: err,
      });
    }
  }
}
