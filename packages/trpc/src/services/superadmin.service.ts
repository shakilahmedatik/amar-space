import type { Database } from "@omniheaven/db";
import { and, asc, count, desc, eq, ilike, or, schema } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import type {
  GetOrganizationDetailsInput,
  ListOrganizationsInput,
  ReinstateOrganizationInput,
  SuspendOrganizationInput,
  UpdateOrganizationPlanInput,
  UpdateSubscriptionPlanInput,
} from "@omniheaven/validators";
import { recordAuditLog } from "./audit.service";

export interface SuperadminActor {
  id: string;
  email: string;
}

/**
 * 1. High-Level Platform HQ Statistics & MRR Aggregation
 */
export async function getPlatformStats(db: Database) {
  const [totalOrgsResult] = await db.select({ count: count() }).from(schema.organizations);
  const [activeOrgsResult] = await db
    .select({ count: count() })
    .from(schema.organizations)
    .where(eq(schema.organizations.status, "active"));
  const [suspendedOrgsResult] = await db
    .select({ count: count() })
    .from(schema.organizations)
    .where(eq(schema.organizations.status, "suspended"));
  const [trialingOrgsResult] = await db
    .select({ count: count() })
    .from(schema.organizations)
    .where(eq(schema.organizations.status, "trialing"));

  const [buildingsResult] = await db.select({ count: count() }).from(schema.buildings);
  const [flatsResult] = await db.select({ count: count() }).from(schema.flats);
  const [roomsResult] = await db.select({ count: count() }).from(schema.rooms);
  const [bookingsResult] = await db.select({ count: count() }).from(schema.bookings);
  const [rentersResult] = await db.select({ count: count() }).from(schema.renters);

  const activeSubscriptions = await db.query.subscriptions.findMany({
    where: or(
      eq(schema.subscriptions.status, "active"),
      eq(schema.subscriptions.status, "trialing"),
    ),
    with: {
      plan: true,
    },
  });

  let estimatedMrrBdt = 0;
  for (const sub of activeSubscriptions) {
    if (sub.status === "active" && sub.plan) {
      if (sub.billingCycle === "yearly") {
        estimatedMrrBdt += Number(sub.plan.priceYearlyBdt) / 12;
      } else {
        estimatedMrrBdt += Number(sub.plan.priceMonthlyBdt);
      }
    }
  }

  const totalFlats = Number(flatsResult?.count ?? 0);
  const totalRooms = Number(roomsResult?.count ?? 0);
  const totalUnits = totalFlats + totalRooms;

  return {
    organizations: {
      total: Number(totalOrgsResult?.count ?? 0),
      active: Number(activeOrgsResult?.count ?? 0),
      suspended: Number(suspendedOrgsResult?.count ?? 0),
      trialing: Number(trialingOrgsResult?.count ?? 0),
    },
    assets: {
      totalBuildings: Number(buildingsResult?.count ?? 0),
      totalFlats,
      totalRooms,
      totalUnits,
      totalRenters: Number(rentersResult?.count ?? 0),
      totalBookings: Number(bookingsResult?.count ?? 0),
    },
    revenue: {
      activeSubscriptionsCount: activeSubscriptions.length,
      estimatedMrrBdt: Math.round(estimatedMrrBdt),
      currency: "BDT",
    },
    systemHealth: {
      databaseConnected: true,
      clusterStatus: "healthy",
      uptimeSeconds: Math.floor(process.uptime()),
    },
  };
}

/**
 * 2. Organization Directory with Live Unit Counts & Quotas
 */
export async function listAllOrganizations(db: Database, input: ListOrganizationsInput) {
  const conditions = [];

  if (input.search) {
    const pattern = `%${input.search}%`;
    conditions.push(
      or(
        ilike(schema.organizations.name, pattern),
        ilike(schema.organizations.slug, pattern),
        ilike(schema.organizations.contactEmail, pattern),
      ),
    );
  }

  if (input.status) {
    conditions.push(eq(schema.organizations.status, input.status));
  }

  if (input.productType) {
    conditions.push(eq(schema.organizations.productType, input.productType));
  }

  const orgs = await db.query.organizations.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      subscription: {
        with: {
          plan: true,
        },
      },
      members: {
        with: {
          user: true,
        },
      },
    },
    orderBy: [desc(schema.organizations.createdAt)],
    limit: input.limit,
  });

  return await Promise.all(
    orgs.map(async (org) => {
      const [flatRow] = await db
        .select({ count: count() })
        .from(schema.flats)
        .innerJoin(schema.buildings, eq(schema.flats.buildingId, schema.buildings.id))
        .where(eq(schema.buildings.organizationId, org.id));

      const [roomRow] = await db
        .select({ count: count() })
        .from(schema.rooms)
        .innerJoin(schema.roomTypes, eq(schema.rooms.roomTypeId, schema.roomTypes.id))
        .where(eq(schema.roomTypes.organizationId, org.id));

      const flatsCount = Number(flatRow?.count ?? 0);
      const roomsCount = Number(roomRow?.count ?? 0);
      const currentUnits = flatsCount + roomsCount;

      const maxUnits = org.subscription?.plan?.maxUnits ?? 20;
      const quotaPercentage =
        maxUnits > 0 ? Math.min(100, Math.round((currentUnits / maxUnits) * 100)) : 0;

      const owner = org.members.find((m) => m.role === "owner")?.user;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        productType: org.productType,
        status: org.status,
        customDomain: org.customDomain,
        contactPhone: org.contactPhone,
        contactEmail: org.contactEmail,
        createdAt: org.createdAt,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
            }
          : null,
        membersCount: org.members.length,
        units: {
          flatsCount,
          roomsCount,
          currentUnits,
          maxUnits,
          remainingUnits: Math.max(0, maxUnits - currentUnits),
          quotaPercentage,
        },
        subscription: org.subscription
          ? {
              id: org.subscription.id,
              status: org.subscription.status,
              billingCycle: org.subscription.billingCycle,
              trialEndsAt: org.subscription.trialEndsAt,
              currentPeriodEnd: org.subscription.currentPeriodEnd,
              plan: org.subscription.plan
                ? {
                    id: org.subscription.plan.id,
                    name: org.subscription.plan.name,
                    priceMonthlyBdt: org.subscription.plan.priceMonthlyBdt,
                    maxUnits: org.subscription.plan.maxUnits,
                  }
                : null,
            }
          : null,
      };
    }),
  );
}

/**
 * 3. Organization Deep Dive Details
 */
export async function getOrganizationDetails(db: Database, input: GetOrganizationDetailsInput) {
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, input.organizationId),
    with: {
      subscription: {
        with: {
          plan: true,
        },
      },
      members: {
        with: {
          user: true,
        },
      },
      buildings: {
        with: {
          flats: true,
        },
      },
      roomTypes: {
        with: {
          rooms: true,
        },
      },
      auditLogs: {
        orderBy: [desc(schema.auditLogs.createdAt)],
        limit: 20,
      },
    },
  });

  if (!org) {
    throwDomainError(ErrorCode.ORGANIZATION_NOT_FOUND);
  }

  const totalFlats = org.buildings.reduce((acc, b) => acc + b.flats.length, 0);
  const totalRooms = org.roomTypes.reduce((acc, rt) => acc + rt.rooms.length, 0);
  const currentUnits = totalFlats + totalRooms;
  const maxUnits = org.subscription?.plan?.maxUnits ?? 20;

  return {
    ...org,
    stats: {
      totalBuildings: org.buildings.length,
      totalFlats,
      totalRoomTypes: org.roomTypes.length,
      totalRooms,
      currentUnits,
      maxUnits,
      remainingUnits: Math.max(0, maxUnits - currentUnits),
      quotaPercentage:
        maxUnits > 0 ? Math.min(100, Math.round((currentUnits / maxUnits) * 100)) : 0,
    },
  };
}

/**
 * 4. Suspend Customer Organization
 */
export async function suspendOrganization(
  db: Database,
  actor: SuperadminActor,
  input: SuspendOrganizationInput,
) {
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, input.organizationId),
  });

  if (!org) {
    throwDomainError(ErrorCode.ORGANIZATION_NOT_FOUND);
  }

  const [updatedOrg] = await db
    .update(schema.organizations)
    .set({
      status: "suspended",
      updatedAt: new Date(),
    })
    .where(eq(schema.organizations.id, input.organizationId))
    .returning();

  await db
    .update(schema.subscriptions)
    .set({
      status: "suspended",
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.organizationId, input.organizationId));

  await recordAuditLog(db, {
    orgId: input.organizationId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: "superadmin",
    },
    action: "ORGANIZATION_SUSPENDED",
    entityType: "organization",
    entityId: input.organizationId,
    details: {
      reason: input.reason,
      previousStatus: org.status,
      suspendedBy: actor.email,
    },
  });

  return {
    success: true,
    organizationId: input.organizationId,
    status: updatedOrg?.status ?? "suspended",
    message: `Organization "${org.name}" has been suspended.`,
  };
}

/**
 * 5. Reinstate Customer Organization
 */
export async function reinstateOrganization(
  db: Database,
  actor: SuperadminActor,
  input: ReinstateOrganizationInput,
) {
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, input.organizationId),
  });

  if (!org) {
    throwDomainError(ErrorCode.ORGANIZATION_NOT_FOUND);
  }

  const [updatedOrg] = await db
    .update(schema.organizations)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(schema.organizations.id, input.organizationId))
    .returning();

  await db
    .update(schema.subscriptions)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(schema.subscriptions.organizationId, input.organizationId));

  await recordAuditLog(db, {
    orgId: input.organizationId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: "superadmin",
    },
    action: "ORGANIZATION_REINSTATED",
    entityType: "organization",
    entityId: input.organizationId,
    details: {
      notes: input.notes ?? null,
      previousStatus: org.status,
      reinstatedBy: actor.email,
    },
  });

  return {
    success: true,
    organizationId: input.organizationId,
    status: updatedOrg?.status ?? "active",
    message: `Organization "${org.name}" has been reinstated to active status.`,
  };
}

/**
 * 6. SaaS Subscription Plans Catalog
 */
export async function listPlans(db: Database) {
  return await db.query.subscriptionPlans.findMany({
    orderBy: [asc(schema.subscriptionPlans.priceMonthlyBdt)],
  });
}

/**
 * 7. Override or Upgrade Organization SaaS Plan
 */
export async function updateOrganizationPlan(
  db: Database,
  actor: SuperadminActor,
  input: UpdateOrganizationPlanInput,
) {
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, input.organizationId),
    with: {
      subscription: true,
    },
  });

  if (!org) {
    throwDomainError(ErrorCode.ORGANIZATION_NOT_FOUND);
  }

  const targetPlan = await db.query.subscriptionPlans.findFirst({
    where: eq(schema.subscriptionPlans.id, input.planId),
  });

  if (!targetPlan) {
    throwDomainError(ErrorCode.PLAN_NOT_FOUND);
  }

  const [flatRow] = await db
    .select({ count: count() })
    .from(schema.flats)
    .innerJoin(schema.buildings, eq(schema.flats.buildingId, schema.buildings.id))
    .where(eq(schema.buildings.organizationId, org.id));

  const [roomRow] = await db
    .select({ count: count() })
    .from(schema.rooms)
    .innerJoin(schema.roomTypes, eq(schema.rooms.roomTypeId, schema.roomTypes.id))
    .where(eq(schema.roomTypes.organizationId, org.id));

  const currentUnits = Number(flatRow?.count ?? 0) + Number(roomRow?.count ?? 0);

  if (targetPlan.maxUnits < currentUnits) {
    throwDomainError(
      ErrorCode.INVALID_PLAN_UPGRADE,
      `${ErrorCode.INVALID_PLAN_UPGRADE}: Organization has ${currentUnits} active units, which exceeds target plan "${targetPlan.name}" limit of ${targetPlan.maxUnits} units. Archive units before downgrading.`,
    );
  }

  const now = new Date();
  const extensionDays = input.extendDays ?? 30;
  const newPeriodEnd = new Date(now.getTime() + extensionDays * 24 * 60 * 60 * 1000);

  let updatedSubscription: typeof schema.subscriptions.$inferSelect | undefined;

  if (org.subscription) {
    const [sub] = await db
      .update(schema.subscriptions)
      .set({
        planId: targetPlan.id,
        plan: targetPlan.id,
        billingCycle: input.billingCycle,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        updatedAt: now,
      })
      .where(eq(schema.subscriptions.id, org.subscription.id))
      .returning();
    updatedSubscription = sub;
  } else {
    const [sub] = await db
      .insert(schema.subscriptions)
      .values({
        id: `sub-${crypto.randomUUID()}`,
        organizationId: org.id,
        planId: targetPlan.id,
        plan: targetPlan.id,
        billingCycle: input.billingCycle,
        status: "active",
        trialStartsAt: now,
        trialEndsAt: newPeriodEnd,
        currentPeriodStart: now,
        currentPeriodEnd: newPeriodEnd,
        paymentProvider: "manual",
      })
      .returning();
    updatedSubscription = sub;
  }

  const subscriptionId = updatedSubscription?.id ?? org.subscription?.id ?? "unknown";

  await recordAuditLog(db, {
    orgId: input.organizationId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: "superadmin",
    },
    action: "ORGANIZATION_PLAN_UPDATED",
    entityType: "subscription",
    entityId: subscriptionId,
    details: {
      planId: targetPlan.id,
      planName: targetPlan.name,
      billingCycle: input.billingCycle,
      maxUnits: targetPlan.maxUnits,
      extendDays: extensionDays,
      currentUnits,
    },
  });

  return {
    success: true,
    subscription: updatedSubscription,
    plan: targetPlan,
  };
}

/**
 * 8. Edit SaaS Subscription Plan
 */
export async function updateSubscriptionPlan(db: Database, input: UpdateSubscriptionPlanInput) {
  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(schema.subscriptionPlans.id, input.planId),
  });

  if (!plan) {
    throwDomainError(ErrorCode.PLAN_NOT_FOUND);
  }

  const updates: Partial<typeof schema.subscriptionPlans.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.priceMonthlyBdt !== undefined)
    updates.priceMonthlyBdt = input.priceMonthlyBdt.toFixed(2);
  if (input.priceYearlyBdt !== undefined) updates.priceYearlyBdt = input.priceYearlyBdt.toFixed(2);
  if (input.maxUnits !== undefined) updates.maxUnits = input.maxUnits;
  if (input.features !== undefined) updates.features = JSON.stringify(input.features);
  if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;

  const [updatedPlan] = await db
    .update(schema.subscriptionPlans)
    .set(updates)
    .where(eq(schema.subscriptionPlans.id, input.planId))
    .returning();

  return updatedPlan;
}
