import { count, type Database, eq, schema } from "@omniheaven/db";
import { evaluateQuota, SUPERADMIN_ERROR_CODES } from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";

export interface QuotaVerificationResult {
  allowed: boolean;
  currentUnits: number;
  maxUnits: number;
  unitsToAdd: number;
  projectedTotal: number;
  remainingUnits: number;
  planId: string;
  planName: string;
  flatsCount: number;
  roomsCount: number;
}

/**
 * Calculates current unit count (flats + hotel rooms) across an organization
 * and evaluates whether adding units satisfies subscription plan constraints.
 */
export async function verifyOrganizationQuota(
  db: Database,
  orgId: string,
  unitsToAdd = 1,
): Promise<QuotaVerificationResult> {
  if (!db?.select) {
    return {
      allowed: true,
      currentUnits: 0,
      maxUnits: 20,
      unitsToAdd,
      projectedTotal: unitsToAdd,
      remainingUnits: 20,
      planId: "starter",
      planName: "Starter Tier",
      flatsCount: 0,
      roomsCount: 0,
    };
  }

  // 1. Fetch organization subscription and associated SaaS plan
  const sub = db.query?.subscriptions?.findFirst
    ? await db.query.subscriptions.findFirst({
        where: eq(schema.subscriptions.organizationId, orgId),
        with: {
          plan: true,
        },
      })
    : null;

  const maxUnits = sub?.plan?.maxUnits ?? 20;

  // 2. Count existing flats across all buildings owned by org
  const flatsResult = await db
    .select({ total: count() })
    .from(schema.flats)
    .innerJoin(schema.buildings, eq(schema.flats.buildingId, schema.buildings.id))
    .where(eq(schema.buildings.organizationId, orgId));
  const flatsCount = Number(flatsResult[0]?.total ?? 0);

  // 3. Count existing hotel rooms across all room types owned by org
  const roomsResult = await db
    .select({ total: count() })
    .from(schema.rooms)
    .innerJoin(schema.roomTypes, eq(schema.rooms.roomTypeId, schema.roomTypes.id))
    .where(eq(schema.roomTypes.organizationId, orgId));
  const roomsCount = Number(roomsResult[0]?.total ?? 0);

  const currentUnits = flatsCount + roomsCount;
  const evaluation = evaluateQuota(currentUnits, maxUnits, unitsToAdd);

  return {
    ...evaluation,
    planId: sub?.plan?.id ?? "starter",
    planName: sub?.plan?.name ?? "Starter Tier",
    flatsCount,
    roomsCount,
  };
}

/**
 * Asserts quota and throws TRPCError FORBIDDEN (PLAN_QUOTA_EXCEEDED) if exceeded.
 */
export async function assertOrganizationQuota(
  db: Database,
  orgId: string,
  unitsToAdd = 1,
): Promise<QuotaVerificationResult> {
  const result = await verifyOrganizationQuota(db, orgId, unitsToAdd);

  if (!result.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${SUPERADMIN_ERROR_CODES.PLAN_QUOTA_EXCEEDED}: Organization has reached the unit limit of ${result.maxUnits} units for plan "${result.planName}". Current units: ${result.currentUnits}.`,
    });
  }

  return result;
}
