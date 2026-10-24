import type { Database } from "@omniheaven/db";
import { and, desc, eq, gte, inArray, isNull, or, schema } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import type {
  assignStaffSchema,
  createMaintenanceRequestSchema,
  createNoticeSchema,
  maintenanceCategoryEnum,
  maintenancePriorityEnum,
  maintenanceStatusEnum,
  pinNoticeSchema,
  resolveMaintenanceRequestSchema,
  updateRequestStatusSchema,
} from "@omniheaven/validators";
import type { z } from "zod";
import { recordAuditLog } from "./audit.service";
import type { PortalScope } from "./portal-auth.service";

export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type AssignStaffInput = z.infer<typeof assignStaffSchema>;
export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;
export type ResolveMaintenanceRequestInput = z.infer<typeof resolveMaintenanceRequestSchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type PinNoticeInput = z.infer<typeof pinNoticeSchema>;

export interface ServiceActor {
  id: string;
  email: string;
  name?: string | null;
}

/**
 * 1. List Maintenance Requests (Admin / Manager)
 */
export async function listMaintenanceRequests(
  db: Database,
  orgId: string,
  filter?: {
    buildingId?: string;
    status?: z.infer<typeof maintenanceStatusEnum>;
    priority?: z.infer<typeof maintenancePriorityEnum>;
    flatId?: string;
    category?: z.infer<typeof maintenanceCategoryEnum>;
    limit?: number;
    offset?: number;
  },
) {
  const buildingId = filter?.buildingId;
  const status = filter?.status;
  const priority = filter?.priority;
  const flatId = filter?.flatId;
  const category = filter?.category;
  const limit = filter?.limit ?? 50;
  const offset = filter?.offset ?? 0;

  const whereConditions = [eq(schema.maintenanceRequests.organizationId, orgId)];

  if (buildingId) {
    whereConditions.push(eq(schema.maintenanceRequests.buildingId, buildingId));
  }
  if (status) {
    whereConditions.push(eq(schema.maintenanceRequests.status, status));
  }
  if (priority) {
    whereConditions.push(eq(schema.maintenanceRequests.priority, priority));
  }
  if (flatId) {
    whereConditions.push(eq(schema.maintenanceRequests.flatId, flatId));
  }
  if (category) {
    whereConditions.push(eq(schema.maintenanceRequests.category, category));
  }

  return await db.query.maintenanceRequests.findMany({
    where: and(...whereConditions),
    with: {
      building: true,
      flat: true,
      requestedByUser: true,
      assignedToStaff: true,
    },
    orderBy: [desc(schema.maintenanceRequests.createdAt)],
    limit,
    offset,
  });
}

/**
 * 2. Get Single Maintenance Request
 */
export async function getMaintenanceRequestById(db: Database, orgId: string, requestId: string) {
  const ticket = await db.query.maintenanceRequests.findFirst({
    where: and(
      eq(schema.maintenanceRequests.id, requestId),
      eq(schema.maintenanceRequests.organizationId, orgId),
    ),
    with: {
      building: true,
      flat: true,
      requestedByUser: true,
      assignedToStaff: true,
    },
  });

  if (!ticket) {
    throwDomainError(ErrorCode.TICKET_NOT_FOUND);
  }

  return ticket;
}

/**
 * 3. Create Maintenance Request (Admin / Manager)
 */
export async function createMaintenanceRequest(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateMaintenanceRequestInput,
) {
  const building = await db.query.buildings.findFirst({
    where: and(
      eq(schema.buildings.id, input.buildingId),
      eq(schema.buildings.organizationId, orgId),
    ),
  });

  if (!building) {
    throwDomainError(
      ErrorCode.BUILDING_NOT_FOUND,
      "Selected building does not belong to your organization.",
    );
  }

  if (input.flatId) {
    const flat = await db.query.flats.findFirst({
      where: and(eq(schema.flats.id, input.flatId), eq(schema.flats.buildingId, input.buildingId)),
    });

    if (!flat) {
      throwDomainError(ErrorCode.FLAT_NOT_FOUND, "Selected flat not found in this building.");
    }
  }

  const ticketId = `ticket-${crypto.randomUUID()}`;
  const [ticket] = await db
    .insert(schema.maintenanceRequests)
    .values({
      id: ticketId,
      organizationId: orgId,
      buildingId: input.buildingId,
      flatId: input.flatId ?? null,
      category: input.category,
      title: input.title,
      description: input.description,
      priority: input.priority,
      photoUrls: input.photoUrls,
      status: "open",
      requestedBy: actor.name ?? actor.email,
      requestedByUserId: actor.id,
      repairCost: "0.00",
      costBilledTo: "landlord",
      resolutionPhotoUrls: [],
    })
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MAINTENANCE_TICKET_CREATED",
    entityType: "maintenance_request",
    entityId: ticketId,
    details: {
      title: input.title,
      priority: input.priority,
      category: input.category,
      buildingId: input.buildingId,
      flatId: input.flatId,
    },
  });

  return ticket;
}

/**
 * 4. Assign Staff / Caretaker to Ticket
 */
export async function assignStaffToRequest(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: AssignStaffInput,
) {
  const ticket = await db.query.maintenanceRequests.findFirst({
    where: and(
      eq(schema.maintenanceRequests.id, input.requestId),
      eq(schema.maintenanceRequests.organizationId, orgId),
    ),
  });

  if (!ticket) {
    throwDomainError(ErrorCode.TICKET_NOT_FOUND);
  }

  if (ticket.status === "closed") {
    throwDomainError(ErrorCode.TICKET_ALREADY_CLOSED);
  }

  const staffMember = await db.query.members.findFirst({
    where: and(
      eq(schema.members.organizationId, orgId),
      eq(schema.members.userId, input.staffUserId),
    ),
  });

  if (!staffMember) {
    throwDomainError(ErrorCode.CANNOT_ASSIGN_UNCONFIRMED_STAFF);
  }

  const nextStatus = ticket.status === "open" ? "assigned" : ticket.status;

  const [updated] = await db
    .update(schema.maintenanceRequests)
    .set({
      assignedToStaffId: input.staffUserId,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.maintenanceRequests.id, input.requestId),
        eq(schema.maintenanceRequests.organizationId, orgId),
      ),
    )
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MAINTENANCE_STAFF_ASSIGNED",
    entityType: "maintenance_request",
    entityId: input.requestId,
    details: {
      assignedToStaffId: input.staffUserId,
      previousStatus: ticket.status,
      newStatus: nextStatus,
    },
  });

  return updated;
}

/**
 * 5. Update Ticket Status
 */
export async function updateRequestStatus(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: UpdateRequestStatusInput,
) {
  const ticket = await db.query.maintenanceRequests.findFirst({
    where: and(
      eq(schema.maintenanceRequests.id, input.requestId),
      eq(schema.maintenanceRequests.organizationId, orgId),
    ),
  });

  if (!ticket) {
    throwDomainError(ErrorCode.TICKET_NOT_FOUND);
  }

  if (ticket.status === "closed") {
    throwDomainError(ErrorCode.TICKET_ALREADY_CLOSED);
  }

  const isClosing = input.status === "closed";

  const [updated] = await db
    .update(schema.maintenanceRequests)
    .set({
      status: input.status,
      closedAt: isClosing ? new Date() : ticket.closedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.maintenanceRequests.id, input.requestId),
        eq(schema.maintenanceRequests.organizationId, orgId),
      ),
    )
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MAINTENANCE_STATUS_UPDATED",
    entityType: "maintenance_request",
    entityId: input.requestId,
    details: {
      previousStatus: ticket.status,
      newStatus: input.status,
    },
  });

  return updated;
}

/**
 * 6. Resolve Maintenance Ticket
 */
export async function resolveMaintenanceRequest(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: ResolveMaintenanceRequestInput,
) {
  const ticket = await db.query.maintenanceRequests.findFirst({
    where: and(
      eq(schema.maintenanceRequests.id, input.requestId),
      eq(schema.maintenanceRequests.organizationId, orgId),
    ),
  });

  if (!ticket) {
    throwDomainError(ErrorCode.TICKET_NOT_FOUND);
  }

  if (ticket.status === "closed") {
    throwDomainError(ErrorCode.TICKET_ALREADY_CLOSED);
  }

  if (!input.resolutionNotes || input.resolutionNotes.trim().length < 5) {
    throwDomainError(ErrorCode.RESOLUTION_NOTES_REQUIRED);
  }

  const [resolved] = await db
    .update(schema.maintenanceRequests)
    .set({
      status: "resolved",
      resolutionNotes: input.resolutionNotes.trim(),
      repairCost: input.repairCost,
      costBilledTo: input.costBilledTo,
      resolutionPhotoUrls: input.resolutionPhotoUrls,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.maintenanceRequests.id, input.requestId),
        eq(schema.maintenanceRequests.organizationId, orgId),
      ),
    )
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "MAINTENANCE_TICKET_RESOLVED",
    entityType: "maintenance_request",
    entityId: input.requestId,
    details: {
      repairCost: input.repairCost,
      costBilledTo: input.costBilledTo,
      resolutionNotes: input.resolutionNotes.trim(),
    },
  });

  return resolved;
}

/**
 * 7. List Building Notices
 */
export async function listNotices(
  db: Database,
  orgId: string,
  filter?: {
    buildingId?: string;
    activeOnly?: boolean;
  },
) {
  const buildingId = filter?.buildingId;
  const activeOnly = filter?.activeOnly ?? true;

  const whereConditions = [eq(schema.notices.organizationId, orgId)];

  if (buildingId) {
    const buildingFilter = or(
      eq(schema.notices.targetBuildingId, buildingId),
      isNull(schema.notices.targetBuildingId),
    );
    if (buildingFilter) whereConditions.push(buildingFilter);
  }

  if (activeOnly) {
    const now = new Date();
    const activeFilter = or(isNull(schema.notices.expiresAt), gte(schema.notices.expiresAt, now));
    if (activeFilter) whereConditions.push(activeFilter);
  }

  return await db.query.notices.findMany({
    where: and(...whereConditions),
    with: {
      authorUser: true,
      targetBuilding: true,
    },
    orderBy: [desc(schema.notices.isPinned), desc(schema.notices.createdAt)],
  });
}

/**
 * 8. Create Building Notice
 */
export async function createNotice(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateNoticeInput,
) {
  const noticeId = `notice-${crypto.randomUUID()}`;
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  const [notice] = await db
    .insert(schema.notices)
    .values({
      id: noticeId,
      organizationId: orgId,
      title: input.title,
      body: input.body,
      targetAudience: input.targetAudience,
      targetBuildingId: input.targetBuildingId ?? null,
      targetFlatId: input.targetFlatId ?? null,
      isPinned: input.isPinned,
      authorUserId: actor.id,
      expiresAt,
    })
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NOTICE_CREATED",
    entityType: "notice",
    entityId: noticeId,
    details: {
      title: input.title,
      targetAudience: input.targetAudience,
      targetBuildingId: input.targetBuildingId,
      isPinned: input.isPinned,
    },
  });

  return notice;
}

/**
 * 9. Pin / Unpin Notice
 */
export async function pinNotice(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: PinNoticeInput,
) {
  const [updated] = await db
    .update(schema.notices)
    .set({
      isPinned: input.isPinned,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.notices.id, input.noticeId), eq(schema.notices.organizationId, orgId)))
    .returning();

  if (!updated) {
    throwDomainError(ErrorCode.NOTICE_NOT_FOUND);
  }

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NOTICE_PINNED",
    entityType: "notice",
    entityId: input.noticeId,
    details: { isPinned: input.isPinned },
  });

  return updated;
}

/**
 * 10. Delete Notice
 */
export async function deleteNotice(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  noticeId: string,
) {
  const [deleted] = await db
    .delete(schema.notices)
    .where(and(eq(schema.notices.id, noticeId), eq(schema.notices.organizationId, orgId)))
    .returning();

  if (!deleted) {
    throwDomainError(ErrorCode.NOTICE_NOT_FOUND);
  }

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NOTICE_DELETED",
    entityType: "notice",
    entityId: noticeId,
    details: { title: deleted.title },
  });

  return { success: true };
}

/**
 * 11. Renter Portal: Get Current User's Maintenance Requests
 */
export async function getMyMaintenanceRequests(db: Database, userId: string) {
  const renter = await db.query.renters.findFirst({
    where: eq(schema.renters.userId, userId),
    with: {
      flat: {
        with: {
          building: true,
        },
      },
    },
  });

  const whereConditions = [eq(schema.maintenanceRequests.requestedByUserId, userId)];

  if (renter?.flatId) {
    whereConditions.push(eq(schema.maintenanceRequests.flatId, renter.flatId));
  }

  return await db.query.maintenanceRequests.findMany({
    where: or(...whereConditions),
    with: {
      building: true,
      flat: true,
      assignedToStaff: true,
    },
    orderBy: [desc(schema.maintenanceRequests.createdAt)],
  });
}

/**
 * 12. Renter Portal: Get Single Maintenance Ticket (Strict Isolation)
 */
export async function getMyMaintenanceRequestById(db: Database, userId: string, requestId: string) {
  const renter = await db.query.renters.findFirst({
    where: eq(schema.renters.userId, userId),
  });

  const ticket = await db.query.maintenanceRequests.findFirst({
    where: eq(schema.maintenanceRequests.id, requestId),
    with: {
      building: true,
      flat: true,
      assignedToStaff: true,
    },
  });

  if (!ticket) {
    throwDomainError(ErrorCode.TICKET_NOT_FOUND);
  }

  const isRequester = ticket.requestedByUserId === userId;
  const isMyFlat = renter?.flatId && ticket.flatId === renter.flatId;

  if (!isRequester && !isMyFlat) {
    throwDomainError(ErrorCode.FORBIDDEN_TICKET_ACCESS);
  }

  return ticket;
}

/**
 * 13. Renter Portal: Create Maintenance Request
 */
export async function createMyMaintenanceRequest(
  db: Database,
  user: { id: string; email: string },
  input: {
    category: z.infer<typeof maintenanceCategoryEnum>;
    title: string;
    description: string;
    priority: z.infer<typeof maintenancePriorityEnum>;
    photoUrls: string[];
  },
) {
  const renter = await db.query.renters.findFirst({
    where: eq(schema.renters.userId, user.id),
    with: {
      flat: true,
    },
  });

  if (!renter?.flatId || !renter.flat) {
    throwDomainError(
      ErrorCode.FLAT_NOT_FOUND,
      "No active apartment tenancy found associated with your profile.",
    );
  }

  const ticketId = `ticket-${crypto.randomUUID()}`;
  const [ticket] = await db
    .insert(schema.maintenanceRequests)
    .values({
      id: ticketId,
      organizationId: renter.organizationId,
      buildingId: renter.flat.buildingId,
      flatId: renter.flatId,
      category: input.category,
      title: input.title,
      description: input.description,
      priority: input.priority,
      photoUrls: input.photoUrls,
      status: "open",
      requestedBy: renter.fullName,
      requestedByUserId: user.id,
      repairCost: "0.00",
      costBilledTo: "landlord",
      resolutionPhotoUrls: [],
    })
    .returning();

  await recordAuditLog({
    db,
    organizationId: renter.organizationId,
    actorId: user.id,
    actorEmail: user.email,
    action: "TENANT_MAINTENANCE_SUBMITTED",
    entityType: "maintenance_request",
    entityId: ticketId,
    details: {
      title: input.title,
      flatId: renter.flatId,
      priority: input.priority,
    },
  });

  return ticket;
}

/**
 * 14. Renter Portal: Get Building Notices
 */
export async function getMyNotices(db: Database, userId: string) {
  const renter = await db.query.renters.findFirst({
    where: eq(schema.renters.userId, userId),
    with: {
      flat: true,
    },
  });

  if (!renter) {
    return [];
  }

  const now = new Date();

  const targetConditions = [eq(schema.notices.targetAudience, "all_renters")];

  if (renter.flat?.buildingId) {
    const bFilter = and(
      eq(schema.notices.targetAudience, "specific_building"),
      eq(schema.notices.targetBuildingId, renter.flat.buildingId),
    );
    if (bFilter) targetConditions.push(bFilter);
  }

  if (renter.flatId) {
    const fFilter = and(
      eq(schema.notices.targetAudience, "specific_flat"),
      eq(schema.notices.targetFlatId, renter.flatId),
    );
    if (fFilter) targetConditions.push(fFilter);
  }

  const activeFilter = or(isNull(schema.notices.expiresAt), gte(schema.notices.expiresAt, now));

  const whereConditions = [
    eq(schema.notices.organizationId, renter.organizationId),
    or(...targetConditions),
  ];
  if (activeFilter) whereConditions.push(activeFilter);

  return await db.query.notices.findMany({
    where: and(...whereConditions),
    with: {
      authorUser: true,
      targetBuilding: true,
    },
    orderBy: [desc(schema.notices.isPinned), desc(schema.notices.createdAt)],
  });
}

/**
 * Public portal endpoint: Submit maintenance request from tenant portal using flatSlug.
 */
export async function createPortalMaintenanceRequest(
  db: Database,
  scope: PortalScope,
  input: {
    category: z.infer<typeof maintenanceCategoryEnum>;
    title: string;
    description: string;
    priority: z.infer<typeof maintenancePriorityEnum>;
    photoUrls: string[];
  },
) {
  const targetFlat = await db.query.flats.findFirst({
    where: and(
      eq(schema.flats.id, scope.flatId),
      eq(schema.flats.organizationId, scope.organizationId),
    ),
    with: {
      rentalContracts: {
        where: inArray(schema.rentalContracts.status, ["active", "notice_period"]),
        with: {
          renter: true,
        },
        orderBy: [desc(schema.rentalContracts.createdAt)],
      },
    },
  });

  if (!targetFlat) {
    throwDomainError(ErrorCode.FLAT_NOT_FOUND, "Portal session is not linked to a valid flat");
  }

  const activeContract = targetFlat.rentalContracts[0] ?? null;
  const requestedBy =
    activeContract?.renter?.fullName || `Resident of Flat ${targetFlat.flatNumber}`;
  const requestedByUserId = activeContract?.renter?.userId || null;

  const ticketId = `ticket-${crypto.randomUUID()}`;
  const [ticket] = await db
    .insert(schema.maintenanceRequests)
    .values({
      id: ticketId,
      organizationId: targetFlat.organizationId,
      buildingId: targetFlat.buildingId,
      flatId: targetFlat.id,
      category: input.category,
      title: input.title,
      description: input.description,
      priority: input.priority,
      photoUrls: input.photoUrls,
      status: "open",
      requestedBy,
      requestedByUserId,
      repairCost: "0.00",
      costBilledTo: "landlord",
      resolutionPhotoUrls: [],
    })
    .returning();

  if (!ticket) {
    throwDomainError(ErrorCode.TICKET_NOT_FOUND, "Failed to create maintenance ticket");
  }

  return ticket;
}
