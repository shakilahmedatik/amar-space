import { DomainError, ErrorCode, type ErrorCodeType } from "@omniheaven/errors";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { members } from "./schema";

export class DomainInvariantError extends DomainError {
  constructor(code: ErrorCodeType | string, message: string) {
    super(code as ErrorCodeType, message);
    this.name = "DomainInvariantError";
  }
}

/**
 * Ensures that an organization always has at least one active owner.
 * If targetUserId is currently an owner and is the ONLY owner, throws DomainInvariantError(ErrorCode.CANNOT_REMOVE_LAST_OWNER).
 */
export async function ensureOrganizationHasOwner(
  db: Pick<Database, "select">,
  orgId: string,
  targetUserId: string,
): Promise<void> {
  // Check target user's current role
  const [targetMember] = await db
    .select({ role: members.role })
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.userId, targetUserId)))
    .limit(1);

  if (targetMember?.role !== "owner") {
    // Target is not an owner, so removing or modifying them does not violate the sole-owner invariant
    return;
  }

  // Count total owners in this organization
  const [ownerCountResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(members)
    .where(and(eq(members.organizationId, orgId), eq(members.role, "owner")));

  const ownerCount = ownerCountResult?.count ?? 0;

  if (ownerCount <= 1) {
    throw new DomainInvariantError(
      ErrorCode.CANNOT_REMOVE_LAST_OWNER,
      "Cannot remove or downgrade the last remaining owner of this organization. Promote another member to owner first.",
    );
  }
}
