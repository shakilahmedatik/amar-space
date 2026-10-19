import type { Database } from "@omniheaven/db";
import { and, asc, desc, eq, schema } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import type {
  bulkCreateFlatsSchema,
  createBuildingSchema,
  createFlatSchema,
  emergencyContactInputSchema,
  flatStatusEnum,
  updateBuildingSchema,
  updateFlatSchema,
  updateFlatStatusSchema,
} from "@omniheaven/validators";
import type { z } from "zod";
import { assertOrganizationQuota } from "../utils/quota";
import { recordAuditLog } from "./audit.service";

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>;
export type CreateFlatInput = z.infer<typeof createFlatSchema>;
export type BulkCreateFlatsInput = z.infer<typeof bulkCreateFlatsSchema>;
export type UpdateFlatInput = z.infer<typeof updateFlatSchema>;
export type UpdateFlatStatusInput = z.infer<typeof updateFlatStatusSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactInputSchema> & {
  buildingId: string;
};

export interface ServiceActor {
  id: string;
  email: string;
}

/**
 * 1. List all buildings for an organization with aggregated unit stats
 */
export async function listBuildings(db: Database, orgId: string) {
  const buildingsList = await db.query.buildings.findMany({
    where: eq(schema.buildings.organizationId, orgId),
    with: {
      flats: true,
      emergencyContacts: true,
    },
    orderBy: [desc(schema.buildings.createdAt)],
  });

  return buildingsList.map((b) => {
    const totalFlats = b.flats.length;
    const occupiedFlats = b.flats.filter((f) => f.status === "occupied").length;
    const vacantFlats = b.flats.filter((f) => f.status === "vacant").length;
    const underMaintenanceFlats = b.flats.filter((f) => f.status === "under_maintenance").length;
    const totalRentalValue = b.flats.reduce((sum, f) => sum + (f.defaultRentAmount || 0), 0);

    return {
      ...b,
      stats: {
        totalFlats,
        occupiedFlats,
        vacantFlats,
        underMaintenanceFlats,
        occupancyRate: totalFlats > 0 ? Math.round((occupiedFlats / totalFlats) * 100) : 0,
        totalRentalValue,
      },
    };
  });
}

/**
 * 2. Get building details by ID with flat stats
 */
export async function getBuildingById(db: Database, orgId: string, buildingId: string) {
  const building = await db.query.buildings.findFirst({
    where: and(eq(schema.buildings.id, buildingId), eq(schema.buildings.organizationId, orgId)),
    with: {
      emergencyContacts: true,
      flats: true,
    },
  });

  if (!building) {
    throwDomainError(ErrorCode.BUILDING_NOT_FOUND);
  }

  const totalFlats = building.flats.length;
  const occupiedFlats = building.flats.filter((f) => f.status === "occupied").length;
  const vacantFlats = building.flats.filter((f) => f.status === "vacant").length;
  const underMaintenanceFlats = building.flats.filter(
    (f) => f.status === "under_maintenance",
  ).length;

  return {
    ...building,
    stats: {
      totalFlats,
      occupiedFlats,
      vacantFlats,
      underMaintenanceFlats,
      occupancyRate: totalFlats > 0 ? Math.round((occupiedFlats / totalFlats) * 100) : 0,
    },
  };
}

/**
 * 3. Create a new building with optional emergency contacts
 */
export async function createBuilding(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateBuildingInput,
) {
  const buildingId = crypto.randomUUID();
  const now = new Date();

  return await db.transaction(async (tx) => {
    const [newBuilding] = await tx
      .insert(schema.buildings)
      .values({
        id: buildingId,
        organizationId: orgId,
        name: input.name,
        address: input.address,
        city: input.city,
        thana: input.thana,
        postalCode: input.postalCode,
        totalFloors: input.totalFloors,
        hasElevator: input.hasElevator,
        hasGenerator: input.hasGenerator,
        gateClosingTime: input.gateClosingTime,
        caretakerPhone: input.caretakerPhone,
        managerPhone: input.managerPhone,
        whatsappGroupLink: input.whatsappGroupLink,
        buildingPhoto: input.buildingPhoto,
        logoPhoto: input.logoPhoto,
        rules: input.rules,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (input.emergencyContacts && input.emergencyContacts.length > 0) {
      await tx.insert(schema.emergencyContacts).values(
        input.emergencyContacts.map((c) => ({
          id: crypto.randomUUID(),
          organizationId: orgId,
          buildingId,
          name: c.name,
          role: c.role,
          phone: c.phone,
          type: c.type,
          createdAt: now,
        })),
      );
    }

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "BUILDING_CREATED",
      entityType: "building",
      entityId: buildingId,
      details: { name: input.name, address: input.address },
    });

    return newBuilding;
  });
}

/**
 * 4. Update building details
 */
export async function updateBuilding(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: UpdateBuildingInput,
) {
  const existing = await db.query.buildings.findFirst({
    where: and(eq(schema.buildings.id, input.id), eq(schema.buildings.organizationId, orgId)),
  });

  if (!existing) {
    throwDomainError(ErrorCode.BUILDING_NOT_FOUND);
  }

  const { id, ...data } = input;
  const [updated] = await db
    .update(schema.buildings)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.buildings.id, id), eq(schema.buildings.organizationId, orgId)))
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BUILDING_UPDATED",
    entityType: "building",
    entityId: id,
    details: data,
  });

  return updated;
}

/**
 * 5. Delete a building (blocked if occupied units exist)
 */
export async function deleteBuilding(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  buildingId: string,
) {
  const building = await db.query.buildings.findFirst({
    where: and(eq(schema.buildings.id, buildingId), eq(schema.buildings.organizationId, orgId)),
    with: {
      flats: true,
    },
  });

  if (!building) {
    throwDomainError(ErrorCode.BUILDING_NOT_FOUND);
  }

  const occupiedUnits = building.flats.filter((f) => f.status === "occupied");
  if (occupiedUnits.length > 0) {
    throwDomainError(ErrorCode.BUILDING_HAS_ACTIVE_UNITS);
  }

  await db
    .delete(schema.buildings)
    .where(and(eq(schema.buildings.id, buildingId), eq(schema.buildings.organizationId, orgId)));

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "BUILDING_DELETED",
    entityType: "building",
    entityId: buildingId,
    details: { name: building.name },
  });

  return { success: true };
}

/**
 * 6. List flats of a building with optional floor / status filter
 */
export async function listFlatsByBuilding(
  db: Database,
  orgId: string,
  filter: {
    buildingId: string;
    floor?: number;
    status?: z.infer<typeof flatStatusEnum>;
  },
) {
  const building = await db.query.buildings.findFirst({
    where: and(
      eq(schema.buildings.id, filter.buildingId),
      eq(schema.buildings.organizationId, orgId),
    ),
  });

  if (!building) {
    throwDomainError(ErrorCode.BUILDING_NOT_FOUND);
  }

  const conditions = [
    eq(schema.flats.buildingId, filter.buildingId),
    eq(schema.flats.organizationId, orgId),
  ];

  if (typeof filter.floor === "number") {
    conditions.push(eq(schema.flats.floor, filter.floor));
  }
  if (filter.status) {
    conditions.push(eq(schema.flats.status, filter.status));
  }

  return await db.query.flats.findMany({
    where: and(...conditions),
    orderBy: [asc(schema.flats.floor), asc(schema.flats.flatNumber)],
  });
}

/**
 * 7. Create a single flat
 */
export async function createFlat(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateFlatInput,
) {
  const building = await db.query.buildings.findFirst({
    where: and(
      eq(schema.buildings.id, input.buildingId),
      eq(schema.buildings.organizationId, orgId),
    ),
  });

  if (!building) {
    throwDomainError(ErrorCode.BUILDING_NOT_FOUND);
  }

  const existing = await db.query.flats.findFirst({
    where: and(
      eq(schema.flats.buildingId, input.buildingId),
      eq(schema.flats.flatNumber, input.flatNumber),
    ),
  });

  if (existing) {
    throwDomainError(ErrorCode.FLAT_DUPLICATE_NUMBER);
  }

  await assertOrganizationQuota(db, orgId, 1);

  const flatId = crypto.randomUUID();
  const now = new Date();

  const [flat] = await db
    .insert(schema.flats)
    .values({
      id: flatId,
      organizationId: orgId,
      buildingId: input.buildingId,
      flatNumber: input.flatNumber,
      floor: input.floor,
      unitType: input.unitType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      balconies: input.balconies,
      squareFeet: input.squareFeet,
      defaultRentAmount: input.defaultRentAmount,
      defaultServiceCharge: input.defaultServiceCharge,
      electricityMeterNumber: input.electricityMeterNumber,
      electricityMeterType: input.electricityMeterType,
      gasType: input.gasType,
      waterSubmeterNumber: input.waterSubmeterNumber,
      notes: input.notes,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "FLAT_CREATED",
    entityType: "flat",
    entityId: flatId,
    details: { flatNumber: input.flatNumber, buildingId: input.buildingId },
  });

  return flat;
}

/**
 * 8. Bulk create flats across floors and door letters
 */
export async function bulkCreateFlats(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: BulkCreateFlatsInput,
) {
  return await db.transaction(async (tx) => {
    const building = await tx.query.buildings.findFirst({
      where: and(
        eq(schema.buildings.id, input.buildingId),
        eq(schema.buildings.organizationId, orgId),
      ),
    });

    if (!building) {
      throwDomainError(ErrorCode.BUILDING_NOT_FOUND);
    }

    const existingFlats = await tx.query.flats.findMany({
      where: eq(schema.flats.buildingId, input.buildingId),
      columns: { flatNumber: true },
    });
    const existingNumbers = new Set(existingFlats.map((f) => f.flatNumber));

    const toInsert = [];
    const now = new Date();

    for (let fl = input.floorStart; fl <= input.floorEnd; fl++) {
      for (const letter of input.letters) {
        const flatNumber = `${fl}${letter}`;
        if (existingNumbers.has(flatNumber)) {
          throwDomainError(
            ErrorCode.FLAT_DUPLICATE_NUMBER,
            `Flat ${flatNumber} already exists in this building (${ErrorCode.FLAT_DUPLICATE_NUMBER})`,
          );
        }

        toInsert.push({
          id: crypto.randomUUID(),
          organizationId: orgId,
          buildingId: input.buildingId,
          flatNumber,
          floor: fl,
          unitType: input.unitType,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          balconies: input.balconies,
          squareFeet: input.squareFeet,
          defaultRentAmount: input.defaultRentAmount,
          defaultServiceCharge: input.defaultServiceCharge,
          electricityMeterType: input.electricityMeterType,
          gasType: input.gasType,
          status: "vacant" as const,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    if (toInsert.length > 0) {
      await assertOrganizationQuota(tx, orgId, toInsert.length);
    }

    const inserted = await tx.insert(schema.flats).values(toInsert).returning();

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "FLATS_BULK_CREATED",
      entityType: "building",
      entityId: input.buildingId,
      details: {
        count: inserted.length,
        floorStart: input.floorStart,
        floorEnd: input.floorEnd,
      },
    });

    return {
      count: inserted.length,
      flats: inserted,
    };
  });
}

/**
 * 9. Update flat specifications
 */
export async function updateFlat(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: UpdateFlatInput,
) {
  const target = await db.query.flats.findFirst({
    where: and(eq(schema.flats.id, input.id), eq(schema.flats.organizationId, orgId)),
  });

  if (!target) {
    throwDomainError(ErrorCode.FLAT_NOT_FOUND);
  }

  if (input.flatNumber && input.flatNumber !== target.flatNumber) {
    const duplicate = await db.query.flats.findFirst({
      where: and(
        eq(schema.flats.buildingId, target.buildingId),
        eq(schema.flats.flatNumber, input.flatNumber),
      ),
    });

    if (duplicate) {
      throwDomainError(ErrorCode.FLAT_DUPLICATE_NUMBER);
    }
  }

  const { id, ...data } = input;
  const [updated] = await db
    .update(schema.flats)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.flats.id, id), eq(schema.flats.organizationId, orgId)))
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "FLAT_UPDATED",
    entityType: "flat",
    entityId: id,
    details: data,
  });

  return updated;
}

/**
 * 10. Update flat occupancy/maintenance status
 */
export async function updateFlatStatus(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: UpdateFlatStatusInput,
) {
  const flat = await db.query.flats.findFirst({
    where: and(eq(schema.flats.id, input.flatId), eq(schema.flats.organizationId, orgId)),
  });

  if (!flat) {
    throwDomainError(ErrorCode.FLAT_NOT_FOUND);
  }

  if (flat.status === "occupied" && input.status !== "occupied") {
    throwDomainError(ErrorCode.FLAT_OCCUPIED_STATUS_LOCKED);
  }

  const [updated] = await db
    .update(schema.flats)
    .set({ status: input.status, updatedAt: new Date() })
    .where(and(eq(schema.flats.id, input.flatId), eq(schema.flats.organizationId, orgId)))
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "FLAT_STATUS_UPDATED",
    entityType: "flat",
    entityId: input.flatId,
    details: { previousStatus: flat.status, newStatus: input.status },
  });

  return updated;
}

/**
 * 11. List emergency contacts for a building
 */
export async function listEmergencyContacts(db: Database, orgId: string, buildingId: string) {
  return await db.query.emergencyContacts.findMany({
    where: and(
      eq(schema.emergencyContacts.buildingId, buildingId),
      eq(schema.emergencyContacts.organizationId, orgId),
    ),
    orderBy: [desc(schema.emergencyContacts.createdAt)],
  });
}

/**
 * 12. Create emergency contact
 */
export async function createEmergencyContact(
  db: Database,
  orgId: string,
  input: EmergencyContactInput,
) {
  const id = crypto.randomUUID();
  const [contact] = await db
    .insert(schema.emergencyContacts)
    .values({
      id,
      organizationId: orgId,
      buildingId: input.buildingId,
      name: input.name,
      role: input.role,
      phone: input.phone,
      type: input.type,
      createdAt: new Date(),
    })
    .returning();

  return contact;
}

/**
 * 13. Delete emergency contact
 */
export async function deleteEmergencyContact(db: Database, orgId: string, contactId: string) {
  await db
    .delete(schema.emergencyContacts)
    .where(
      and(
        eq(schema.emergencyContacts.id, contactId),
        eq(schema.emergencyContacts.organizationId, orgId),
      ),
    );

  return { success: true };
}
