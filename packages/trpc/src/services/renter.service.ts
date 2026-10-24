import { randomBytes } from "node:crypto";
import type { Database } from "@omniheaven/db";
import { and, desc, eq, ilike, inArray, or, schema, sql } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import type {
  contractStatusEnum,
  createContractSchema,
  createRenterSchema,
  submitNoticePeriodSchema,
  terminateContractSchema,
  updateRenterSchema,
} from "@omniheaven/validators";
import type { z } from "zod";
import { recordAuditLog } from "./audit.service";

export type CreateRenterInput = z.infer<typeof createRenterSchema>;
export type UpdateRenterInput = z.infer<typeof updateRenterSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type SubmitNoticePeriodInput = z.infer<typeof submitNoticePeriodSchema>;
export type TerminateContractInput = z.infer<typeof terminateContractSchema>;

export interface ServiceActor {
  id: string;
  email: string;
}

/**
 * Human-readable but high-entropy portal access code (e.g. "K7M2Q-9X4TR").
 * Ambiguous characters (0/O, 1/I) are excluded so it can be read over a phone.
 */
export function generatePortalAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let code = "";
  for (let index = 0; index < 10; index += 1) {
    const byte = bytes[index] ?? 0;
    code += alphabet[byte % alphabet.length];
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/**
 * 1. List Renters (KYC Directory) with search and pagination
 */
export async function listRenters(
  db: Database,
  orgId: string,
  filter?: {
    search?: string;
    limit?: number;
    offset?: number;
  },
) {
  const search = filter?.search?.trim();
  const limit = filter?.limit ?? 50;
  const offset = filter?.offset ?? 0;

  const whereConditions = [eq(schema.renters.organizationId, orgId)];

  if (search && search.length > 0) {
    const searchCondition = or(
      ilike(schema.renters.fullName, `%${search}%`),
      ilike(schema.renters.phone, `%${search}%`),
      ilike(schema.renters.nidNumber, `%${search}%`),
      ilike(schema.renters.occupation, `%${search}%`),
    );
    if (searchCondition) {
      whereConditions.push(searchCondition);
    }
  }

  return await db.query.renters.findMany({
    where: and(...whereConditions),
    with: {
      flat: {
        with: {
          building: true,
        },
      },
      contracts: {
        orderBy: [desc(schema.rentalContracts.createdAt)],
      },
      user: true,
    },
    orderBy: [desc(schema.renters.createdAt)],
    limit,
    offset,
  });
}

/**
 * 2. Get Renter by ID with contracts and flat history
 */
export async function getRenterById(db: Database, orgId: string, renterId: string) {
  const renter = await db.query.renters.findFirst({
    where: and(eq(schema.renters.id, renterId), eq(schema.renters.organizationId, orgId)),
    with: {
      flat: {
        with: {
          building: true,
        },
      },
      contracts: {
        with: {
          flat: true,
        },
        orderBy: [desc(schema.rentalContracts.createdAt)],
      },
      user: true,
    },
  });

  if (!renter) {
    throwDomainError(ErrorCode.RENTER_NOT_FOUND);
  }

  return renter;
}

/**
 * 3. Create Renter (KYC Onboarding)
 */
export async function createRenter(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateRenterInput,
) {
  const existingNid = await db.query.renters.findFirst({
    where: and(
      eq(schema.renters.organizationId, orgId),
      eq(schema.renters.nidNumber, input.nidNumber),
    ),
  });

  if (existingNid) {
    throwDomainError(ErrorCode.NID_ALREADY_EXISTS);
  }

  const renterId = crypto.randomUUID();
  const now = new Date();

  const [newRenter] = await db
    .insert(schema.renters)
    .values({
      id: renterId,
      organizationId: orgId,
      userId: input.userId ?? null,
      flatId: input.flatId ?? null,
      fullName: input.fullName,
      phone: input.phone,
      nidNumber: input.nidNumber,
      dateOfBirth: input.dateOfBirth ?? null,
      occupation: input.occupation,
      bloodGroup: input.bloodGroup,
      totalFamilyMembers: input.totalFamilyMembers,
      familyMemberNames: input.familyMemberNames ?? [],
      emergencyContactName: input.emergencyContactName,
      emergencyContactNumber: input.emergencyContactNumber,
      emergencyContactRelationship: input.emergencyContactRelationship,
      nidFrontPhoto: input.nidFrontPhoto ?? null,
      nidBackPhoto: input.nidBackPhoto ?? null,
      digitalSignatureUrl: input.digitalSignatureUrl ?? null,
      accessCode: generatePortalAccessCode(),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!newRenter) {
    throwDomainError(ErrorCode.RENTER_NOT_FOUND, "Failed to persist renter record");
  }

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "RENTER_CREATED",
    entityType: "renter",
    entityId: renterId,
    details: {
      fullName: input.fullName,
      nidNumber: input.nidNumber,
      phone: input.phone,
      bloodGroup: input.bloodGroup,
    },
  });

  return newRenter;
}

/**
 * 4. Update Renter Profile
 */
export async function updateRenter(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: UpdateRenterInput,
) {
  const existing = await db.query.renters.findFirst({
    where: and(eq(schema.renters.id, input.id), eq(schema.renters.organizationId, orgId)),
  });

  if (!existing) {
    throwDomainError(ErrorCode.RENTER_NOT_FOUND);
  }

  const now = new Date();
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  };

  if (input.fullName !== undefined) updateData.fullName = input.fullName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.dateOfBirth !== undefined) updateData.dateOfBirth = input.dateOfBirth;
  if (input.occupation !== undefined) updateData.occupation = input.occupation;
  if (input.bloodGroup !== undefined) updateData.bloodGroup = input.bloodGroup;
  if (input.totalFamilyMembers !== undefined)
    updateData.totalFamilyMembers = input.totalFamilyMembers;
  if (input.familyMemberNames !== undefined) updateData.familyMemberNames = input.familyMemberNames;
  if (input.emergencyContactName !== undefined)
    updateData.emergencyContactName = input.emergencyContactName;
  if (input.emergencyContactNumber !== undefined)
    updateData.emergencyContactNumber = input.emergencyContactNumber;
  if (input.emergencyContactRelationship !== undefined)
    updateData.emergencyContactRelationship = input.emergencyContactRelationship;
  if (input.nidFrontPhoto !== undefined) updateData.nidFrontPhoto = input.nidFrontPhoto;
  if (input.nidBackPhoto !== undefined) updateData.nidBackPhoto = input.nidBackPhoto;
  if (input.digitalSignatureUrl !== undefined)
    updateData.digitalSignatureUrl = input.digitalSignatureUrl;

  const [updatedRenter] = await db
    .update(schema.renters)
    .set(updateData)
    .where(and(eq(schema.renters.id, input.id), eq(schema.renters.organizationId, orgId)))
    .returning();

  if (!updatedRenter) {
    throwDomainError(ErrorCode.RENTER_NOT_FOUND, "Failed to update renter record");
  }

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "RENTER_UPDATED",
    entityType: "renter",
    entityId: input.id,
    details: updateData,
  });

  return updatedRenter;
}

/**
 * 5. List Tenancy Contracts
 */
export async function listContracts(
  db: Database,
  orgId: string,
  filter?: {
    status?: z.infer<typeof contractStatusEnum>;
    flatId?: string;
  },
) {
  const conditions = [eq(schema.rentalContracts.organizationId, orgId)];

  if (filter?.status) {
    conditions.push(eq(schema.rentalContracts.status, filter.status));
  }

  if (filter?.flatId) {
    conditions.push(eq(schema.rentalContracts.flatId, filter.flatId));
  }

  return await db.query.rentalContracts.findMany({
    where: and(...conditions),
    with: {
      renter: true,
      flat: {
        with: {
          building: true,
        },
      },
    },
    orderBy: [desc(schema.rentalContracts.createdAt)],
  });
}

/**
 * 6. Get Contract by ID
 */
export async function getContractById(db: Database, orgId: string, contractId: string) {
  const contract = await db.query.rentalContracts.findFirst({
    where: and(
      eq(schema.rentalContracts.id, contractId),
      eq(schema.rentalContracts.organizationId, orgId),
    ),
    with: {
      renter: true,
      flat: {
        with: {
          building: true,
        },
      },
      bills: true,
    },
  });

  if (!contract) {
    throwDomainError(ErrorCode.CONTRACT_NOT_FOUND);
  }

  return contract;
}

/**
 * 7. Create Contract (Draft Agreement)
 */
export async function createContract(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateContractInput,
) {
  const renter = await db.query.renters.findFirst({
    where: and(eq(schema.renters.id, input.renterId), eq(schema.renters.organizationId, orgId)),
  });

  if (!renter) {
    throwDomainError(ErrorCode.RENTER_NOT_FOUND);
  }

  const flat = await db.query.flats.findFirst({
    where: and(eq(schema.flats.id, input.flatId), eq(schema.flats.organizationId, orgId)),
  });

  if (!flat) {
    throwDomainError(ErrorCode.FLAT_NOT_FOUND, "Target flat not found in active organization");
  }

  const existingActiveContract = await db.query.rentalContracts.findFirst({
    where: and(
      eq(schema.rentalContracts.organizationId, orgId),
      eq(schema.rentalContracts.flatId, input.flatId),
      inArray(schema.rentalContracts.status, ["active", "notice_period"]),
    ),
  });

  if (existingActiveContract) {
    throwDomainError(ErrorCode.FLAT_ALREADY_OCCUPIED);
  }

  const contractId = crypto.randomUUID();
  const now = new Date();

  const [newContract] = await db
    .insert(schema.rentalContracts)
    .values({
      id: contractId,
      organizationId: orgId,
      renterId: input.renterId,
      flatId: input.flatId,
      monthlyRent: input.monthlyRent.toFixed(2),
      serviceCharge: input.serviceCharge.toFixed(2),
      securityDepositAmount: input.securityDepositAmount.toFixed(2),
      remainingDepositBalance: input.securityDepositAmount.toFixed(2),
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      noticePeriodDays: input.noticePeriodDays,
      status: "draft",
      contractDocumentUrl: input.contractDocumentUrl ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!newContract) {
    throwDomainError(ErrorCode.CONTRACT_NOT_FOUND, "Failed to persist rental contract draft");
  }

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "CONTRACT_DRAFTED",
    entityType: "rental_contract",
    entityId: contractId,
    details: {
      renterId: input.renterId,
      flatId: input.flatId,
      monthlyRent: input.monthlyRent,
      securityDepositAmount: input.securityDepositAmount,
    },
  });

  return newContract;
}

/**
 * 8. Activate Contract (Atomic transaction)
 */
export async function activateContract(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: { contractId: string; initialDepositReceived?: boolean },
) {
  const contract = await db.query.rentalContracts.findFirst({
    where: and(
      eq(schema.rentalContracts.id, input.contractId),
      eq(schema.rentalContracts.organizationId, orgId),
    ),
  });

  if (!contract) {
    throwDomainError(ErrorCode.CONTRACT_NOT_FOUND);
  }

  if (contract.status !== "draft" && contract.status !== "pending_signature") {
    throwDomainError(ErrorCode.CONTRACT_NOT_IN_DRAFT);
  }

  const now = new Date();

  return await db.transaction(async (tx) => {
    const conflictingActive = await tx.query.rentalContracts.findFirst({
      where: and(
        eq(schema.rentalContracts.organizationId, orgId),
        eq(schema.rentalContracts.flatId, contract.flatId),
        inArray(schema.rentalContracts.status, ["active", "notice_period"]),
        sql`${schema.rentalContracts.id} != ${contract.id}`,
      ),
    });

    if (conflictingActive) {
      throwDomainError(ErrorCode.FLAT_ALREADY_OCCUPIED);
    }

    const [updatedContract] = await tx
      .update(schema.rentalContracts)
      .set({
        status: "active",
        remainingDepositBalance: contract.securityDepositAmount,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.rentalContracts.id, contract.id),
          eq(schema.rentalContracts.organizationId, orgId),
        ),
      )
      .returning();

    await tx
      .update(schema.flats)
      .set({
        status: "occupied",
        updatedAt: now,
      })
      .where(and(eq(schema.flats.id, contract.flatId), eq(schema.flats.organizationId, orgId)));

    await tx
      .update(schema.renters)
      .set({
        flatId: contract.flatId,
        updatedAt: now,
      })
      .where(
        and(eq(schema.renters.id, contract.renterId), eq(schema.renters.organizationId, orgId)),
      );

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "CONTRACT_ACTIVATED",
      entityType: "rental_contract",
      entityId: contract.id,
      details: {
        flatId: contract.flatId,
        renterId: contract.renterId,
        monthlyRent: contract.monthlyRent,
        securityDepositAmount: contract.securityDepositAmount,
      },
    });

    return updatedContract;
  });
}

/**
 * 9. Submit Notice Period
 */
export async function submitNoticePeriod(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: SubmitNoticePeriodInput,
) {
  const contract = await db.query.rentalContracts.findFirst({
    where: and(
      eq(schema.rentalContracts.id, input.contractId),
      eq(schema.rentalContracts.organizationId, orgId),
    ),
  });

  if (!contract) {
    throwDomainError(ErrorCode.CONTRACT_NOT_FOUND);
  }

  if (contract.status !== "active") {
    throwDomainError(
      ErrorCode.CONTRACT_NOT_FOUND,
      "Notice period can only be submitted for currently active tenancy contracts",
    );
  }

  const now = new Date();

  const [updatedContract] = await db
    .update(schema.rentalContracts)
    .set({
      status: "notice_period",
      terminationDate: input.expectedDepartureDate,
      terminationReason: input.reason,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.rentalContracts.id, input.contractId),
        eq(schema.rentalContracts.organizationId, orgId),
      ),
    )
    .returning();

  await recordAuditLog({
    db,
    organizationId: orgId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "NOTICE_PERIOD_SUBMITTED",
    entityType: "rental_contract",
    entityId: input.contractId,
    details: {
      expectedDepartureDate: input.expectedDepartureDate,
      reason: input.reason,
    },
  });

  return updatedContract;
}

/**
 * 10. Terminate Tenancy Contract
 */
export async function terminateContract(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: TerminateContractInput,
) {
  const contract = await db.query.rentalContracts.findFirst({
    where: and(
      eq(schema.rentalContracts.id, input.contractId),
      eq(schema.rentalContracts.organizationId, orgId),
    ),
  });

  if (!contract) {
    throwDomainError(ErrorCode.CONTRACT_NOT_FOUND);
  }

  const now = new Date();
  const currentDeposit = Number(contract.remainingDepositBalance || 0);
  const remainingAfterDeductions = Math.max(0, currentDeposit - input.deductions);

  return await db.transaction(async (tx) => {
    const [terminatedContract] = await tx
      .update(schema.rentalContracts)
      .set({
        status: "terminated",
        terminationDate: input.terminationDate,
        terminationReason: input.terminationReason,
        remainingDepositBalance: remainingAfterDeductions.toFixed(2),
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.rentalContracts.id, input.contractId),
          eq(schema.rentalContracts.organizationId, orgId),
        ),
      )
      .returning();

    if (input.deductions > 0) {
      await tx.insert(schema.advanceAdjustments).values({
        id: crypto.randomUUID(),
        adjustmentType: "damage_deduction",
        amount: input.deductions.toFixed(2),
        balanceBefore: currentDeposit.toFixed(2),
        balanceAfter: remainingAfterDeductions.toFixed(2),
        note: input.terminationReason || "Deductions applied upon contract termination",
        adjustedBy: actor.id,
        contractId: input.contractId,
        organizationId: orgId,
      });
    }

    if (input.refundAmount > 0) {
      await tx.insert(schema.advanceAdjustments).values({
        id: crypto.randomUUID(),
        adjustmentType: "refund_upon_termination",
        amount: input.refundAmount.toFixed(2),
        balanceBefore: remainingAfterDeductions.toFixed(2),
        balanceAfter: Math.max(0, remainingAfterDeductions - input.refundAmount).toFixed(2),
        note: "Security deposit refund upon contract termination",
        adjustedBy: actor.id,
        contractId: input.contractId,
        organizationId: orgId,
      });
    }

    await tx
      .update(schema.flats)
      .set({
        status: input.nextFlatStatus,
        updatedAt: now,
      })
      .where(and(eq(schema.flats.id, contract.flatId), eq(schema.flats.organizationId, orgId)));

    await tx
      .update(schema.renters)
      .set({
        flatId: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schema.renters.id, contract.renterId),
          eq(schema.renters.flatId, contract.flatId),
          eq(schema.renters.organizationId, orgId),
        ),
      );

    await recordAuditLog({
      db: tx,
      organizationId: orgId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "CONTRACT_TERMINATED",
      entityType: "rental_contract",
      entityId: input.contractId,
      details: {
        flatId: contract.flatId,
        renterId: contract.renterId,
        terminationDate: input.terminationDate,
        terminationReason: input.terminationReason,
        deductions: input.deductions,
        refundAmount: input.refundAmount,
        nextFlatStatus: input.nextFlatStatus,
        inspectionNotes: input.inspectionNotes,
      },
    });

    return terminatedContract;
  });
}

/**
 * 11. Get Current User's Renter Profile (Renter Portal)
 */
export async function getMyProfile(db: Database, userId: string) {
  const renter = await db.query.renters.findFirst({
    where: eq(schema.renters.userId, userId),
    with: {
      flat: {
        with: {
          building: true,
        },
      },
      contracts: {
        orderBy: [desc(schema.rentalContracts.createdAt)],
      },
    },
  });

  if (!renter) {
    throwDomainError(ErrorCode.RENTER_NOT_FOUND, "No renter profile linked to this user account");
  }

  return renter;
}

/**
 * 12. Get Current User's Active Tenancy Contract (Renter Portal)
 */
export async function getMyActiveContract(db: Database, userId: string) {
  const renter = await db.query.renters.findFirst({
    where: eq(schema.renters.userId, userId),
  });

  if (!renter) {
    throwDomainError(ErrorCode.RENTER_NOT_FOUND, "No renter profile linked to this user account");
  }

  const activeContract = await db.query.rentalContracts.findFirst({
    where: and(
      eq(schema.rentalContracts.renterId, renter.id),
      inArray(schema.rentalContracts.status, ["active", "notice_period"]),
    ),
    with: {
      flat: {
        with: {
          building: true,
        },
      },
      renter: true,
    },
    orderBy: [desc(schema.rentalContracts.createdAt)],
  });

  return activeContract ?? null;
}

/**
 * 13. Get Single Tenancy Contract by ID with Tenant Ownership Verification
 */
export async function getMyContractById(db: Database, userId: string, contractId: string) {
  const contract = await db.query.rentalContracts.findFirst({
    where: eq(schema.rentalContracts.id, contractId),
    with: {
      flat: {
        with: {
          building: true,
        },
      },
      renter: true,
    },
  });

  if (!contract) {
    throwDomainError(ErrorCode.CONTRACT_NOT_FOUND, "Contract not found");
  }

  if (contract.renter.userId !== userId) {
    throwDomainError(ErrorCode.ORG_FORBIDDEN, "You are not authorized to view this contract");
  }

  return contract;
}
