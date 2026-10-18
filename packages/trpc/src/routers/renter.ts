import { and, desc, eq, ilike, inArray, or, schema, sql } from "@omniheaven/db";
import {
  contractStatusEnum,
  createContractSchema,
  createRenterSchema,
  RENTER_ERROR_CODES,
  submitNoticePeriodSchema,
  terminateContractSchema,
  updateRenterSchema,
} from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { orgProtectedProcedure, protectedProcedure, requireRole, router } from "../trpc";
import { recordAuditLog } from "../utils/audit";

export const renterRouter = router({
  // 1. List Renters (KYC Directory) with search and pagination
  listRenters: orgProtectedProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const search = input?.search?.trim();
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      const whereConditions = [eq(schema.renters.organizationId, ctx.organizationId)];

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

      return await ctx.db.query.renters.findMany({
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
    }),

  // 2. Get Renter by ID with contracts and flat history
  getRenterById: orgProtectedProcedure
    .input(z.object({ renterId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const renter = await ctx.db.query.renters.findFirst({
        where: and(
          eq(schema.renters.id, input.renterId),
          eq(schema.renters.organizationId, ctx.organizationId),
        ),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RENTER_ERROR_CODES.RENTER_NOT_FOUND,
        });
      }

      return renter;
    }),

  // 3. Create Renter (KYC Onboarding)
  createRenter: requireRole(["owner", "admin", "manager"])
    .input(createRenterSchema)
    .mutation(async ({ ctx, input }) => {
      // Enforce unique NID per organization
      const existingNid = await ctx.db.query.renters.findFirst({
        where: and(
          eq(schema.renters.organizationId, ctx.organizationId),
          eq(schema.renters.nidNumber, input.nidNumber),
        ),
      });

      if (existingNid) {
        throw new TRPCError({
          code: "CONFLICT",
          message: RENTER_ERROR_CODES.NID_ALREADY_EXISTS,
        });
      }

      const renterId = crypto.randomUUID();
      const now = new Date();

      const [newRenter] = await ctx.db
        .insert(schema.renters)
        .values({
          id: renterId,
          organizationId: ctx.organizationId,
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
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!newRenter) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to persist renter record",
        });
      }

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
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
    }),

  // 4. Update Renter Profile
  updateRenter: requireRole(["owner", "admin", "manager"])
    .input(updateRenterSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.renters.findFirst({
        where: and(
          eq(schema.renters.id, input.id),
          eq(schema.renters.organizationId, ctx.organizationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RENTER_ERROR_CODES.RENTER_NOT_FOUND,
        });
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
      if (input.familyMemberNames !== undefined)
        updateData.familyMemberNames = input.familyMemberNames;
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

      const [updatedRenter] = await ctx.db
        .update(schema.renters)
        .set(updateData)
        .where(
          and(
            eq(schema.renters.id, input.id),
            eq(schema.renters.organizationId, ctx.organizationId),
          ),
        )
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "RENTER_UPDATED",
        entityType: "renter",
        entityId: input.id,
        details: updateData,
      });

      if (!updatedRenter) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update renter record",
        });
      }

      return updatedRenter;
    }),

  // 5. List Tenancy Contracts
  listContracts: orgProtectedProcedure
    .input(
      z
        .object({
          status: contractStatusEnum.optional(),
          flatId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.rentalContracts.organizationId, ctx.organizationId)];

      if (input?.status) {
        conditions.push(eq(schema.rentalContracts.status, input.status));
      }

      if (input?.flatId) {
        conditions.push(eq(schema.rentalContracts.flatId, input.flatId));
      }

      return await ctx.db.query.rentalContracts.findMany({
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
    }),

  // 6. Get Contract by ID
  getContractById: orgProtectedProcedure
    .input(z.object({ contractId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const contract = await ctx.db.query.rentalContracts.findFirst({
        where: and(
          eq(schema.rentalContracts.id, input.contractId),
          eq(schema.rentalContracts.organizationId, ctx.organizationId),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RENTER_ERROR_CODES.CONTRACT_NOT_FOUND,
        });
      }

      return contract;
    }),

  // 7. Create Contract (Draft Agreement)
  createContract: requireRole(["owner", "admin", "manager"])
    .input(createContractSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify renter belongs to organization
      const renter = await ctx.db.query.renters.findFirst({
        where: and(
          eq(schema.renters.id, input.renterId),
          eq(schema.renters.organizationId, ctx.organizationId),
        ),
      });

      if (!renter) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RENTER_ERROR_CODES.RENTER_NOT_FOUND,
        });
      }

      // Verify flat belongs to organization
      const flat = await ctx.db.query.flats.findFirst({
        where: and(
          eq(schema.flats.id, input.flatId),
          eq(schema.flats.organizationId, ctx.organizationId),
        ),
      });

      if (!flat) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Target flat not found in active organization",
        });
      }

      // Invariant: Flat cannot have another contract in "active" or "notice_period" status
      const existingActiveContract = await ctx.db.query.rentalContracts.findFirst({
        where: and(
          eq(schema.rentalContracts.organizationId, ctx.organizationId),
          eq(schema.rentalContracts.flatId, input.flatId),
          inArray(schema.rentalContracts.status, ["active", "notice_period"]),
        ),
      });

      if (existingActiveContract) {
        throw new TRPCError({
          code: "CONFLICT",
          message: RENTER_ERROR_CODES.FLAT_ALREADY_OCCUPIED,
        });
      }

      const contractId = crypto.randomUUID();
      const now = new Date();

      const [newContract] = await ctx.db
        .insert(schema.rentalContracts)
        .values({
          id: contractId,
          organizationId: ctx.organizationId,
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to persist rental contract draft",
        });
      }

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
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
    }),

  // 8. Activate Contract (Atomic transaction: set active, occupied, and link renter)
  activateContract: requireRole(["owner", "admin", "manager"])
    .input(
      z.object({
        contractId: z.string().min(1),
        initialDepositReceived: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.query.rentalContracts.findFirst({
        where: and(
          eq(schema.rentalContracts.id, input.contractId),
          eq(schema.rentalContracts.organizationId, ctx.organizationId),
        ),
      });

      if (!contract) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RENTER_ERROR_CODES.CONTRACT_NOT_FOUND,
        });
      }

      if (contract.status !== "draft" && contract.status !== "pending_signature") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: RENTER_ERROR_CODES.CONTRACT_NOT_IN_DRAFT,
        });
      }

      const now = new Date();

      return await ctx.db.transaction(async (tx) => {
        // Enforce single active contract invariant per flat
        const conflictingActive = await tx.query.rentalContracts.findFirst({
          where: and(
            eq(schema.rentalContracts.organizationId, ctx.organizationId),
            eq(schema.rentalContracts.flatId, contract.flatId),
            inArray(schema.rentalContracts.status, ["active", "notice_period"]),
            sql`${schema.rentalContracts.id} != ${contract.id}`,
          ),
        });

        if (conflictingActive) {
          throw new TRPCError({
            code: "CONFLICT",
            message: RENTER_ERROR_CODES.FLAT_ALREADY_OCCUPIED,
          });
        }

        // 1. Activate Contract
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
              eq(schema.rentalContracts.organizationId, ctx.organizationId),
            ),
          )
          .returning();

        // 2. Set flat status to occupied
        await tx
          .update(schema.flats)
          .set({
            status: "occupied",
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.flats.id, contract.flatId),
              eq(schema.flats.organizationId, ctx.organizationId),
            ),
          );

        // 3. Link flatId to renter
        await tx
          .update(schema.renters)
          .set({
            flatId: contract.flatId,
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.renters.id, contract.renterId),
              eq(schema.renters.organizationId, ctx.organizationId),
            ),
          );

        // 4. Audit log
        await recordAuditLog({
          db: tx,
          organizationId: ctx.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
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

        if (!updatedContract) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to activate contract",
          });
        }

        return updatedContract;
      });
    }),

  // 9. Submit Notice Period
  submitNoticePeriod: requireRole(["owner", "admin", "manager"])
    .input(submitNoticePeriodSchema)
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.query.rentalContracts.findFirst({
        where: and(
          eq(schema.rentalContracts.id, input.contractId),
          eq(schema.rentalContracts.organizationId, ctx.organizationId),
        ),
      });

      if (!contract) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RENTER_ERROR_CODES.CONTRACT_NOT_FOUND,
        });
      }

      if (contract.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Notice period can only be submitted for currently active tenancy contracts",
        });
      }

      const now = new Date();

      const [updatedContract] = await ctx.db
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
            eq(schema.rentalContracts.organizationId, ctx.organizationId),
          ),
        )
        .returning();

      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "NOTICE_PERIOD_SUBMITTED",
        entityType: "rental_contract",
        entityId: input.contractId,
        details: {
          expectedDepartureDate: input.expectedDepartureDate,
          reason: input.reason,
        },
      });

      if (!updatedContract) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to record notice period",
        });
      }

      return updatedContract;
    }),

  // 10. Terminate Tenancy Contract (Checkout Handover & Flat Status sync)
  terminateContract: requireRole(["owner", "admin", "manager"])
    .input(terminateContractSchema)
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.query.rentalContracts.findFirst({
        where: and(
          eq(schema.rentalContracts.id, input.contractId),
          eq(schema.rentalContracts.organizationId, ctx.organizationId),
        ),
      });

      if (!contract) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: RENTER_ERROR_CODES.CONTRACT_NOT_FOUND,
        });
      }

      const now = new Date();
      const currentDeposit = Number(contract.remainingDepositBalance || 0);
      const remainingAfterDeductions = Math.max(0, currentDeposit - input.deductions);

      return await ctx.db.transaction(async (tx) => {
        // 1. Terminate Contract
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
              eq(schema.rentalContracts.organizationId, ctx.organizationId),
            ),
          )
          .returning();

        // 2. Set flat status to vacant or under_maintenance based on inspection
        await tx
          .update(schema.flats)
          .set({
            status: input.nextFlatStatus,
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.flats.id, contract.flatId),
              eq(schema.flats.organizationId, ctx.organizationId),
            ),
          );

        // 3. Unlink flatId from renter if matching
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
              eq(schema.renters.organizationId, ctx.organizationId),
            ),
          );

        // 4. Audit Log
        await recordAuditLog({
          db: tx,
          organizationId: ctx.organizationId,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
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

        if (!terminatedContract) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to terminate contract",
          });
        }

        return terminatedContract;
      });
    }),

  // 11. Get Current User's Renter Profile (Renter Portal, scoped to session.user.id)
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const renter = await ctx.db.query.renters.findFirst({
      where: eq(schema.renters.userId, ctx.user.id),
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
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No renter profile linked to this user account",
      });
    }

    return renter;
  }),

  // 12. Get Current User's Active Tenancy Contract (Renter Portal, scoped to session.user.id)
  getMyActiveContract: protectedProcedure.query(async ({ ctx }) => {
    const renter = await ctx.db.query.renters.findFirst({
      where: eq(schema.renters.userId, ctx.user.id),
    });

    if (!renter) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No renter profile linked to this user account",
      });
    }

    const activeContract = await ctx.db.query.rentalContracts.findFirst({
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
  }),

  // 13. Get Single Tenancy Contract by ID with strict Tenant Ownership Verification
  getMyContractById: protectedProcedure
    .input(z.object({ contractId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const contract = await ctx.db.query.rentalContracts.findFirst({
        where: eq(schema.rentalContracts.id, input.contractId),
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contract not found",
        });
      }

      // Restrict Renter Portal access so tenants can only query contracts where renter.userId === session.user.id
      if (contract.renter.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view this contract",
        });
      }

      return contract;
    }),

  // 14. Create Presigned Upload URL for KYC NID and Leases (SeaweedFS / S3 / R2)
  createPresignedUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileType: z.string().min(1),
        folder: z.enum(["nid", "signatures", "contracts", "receipts"]),
      }),
    )
    .mutation(async ({ input }) => {
      const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `${input.folder}/${Date.now()}-${sanitizedName}`;
      const endpoint = process.env.S3_ENDPOINT || "http://localhost:8333";
      const bucket = process.env.S3_BUCKET || "omniheaven-assets";

      const uploadUrl = `${endpoint}/${bucket}/${key}`;
      const publicUrl = `${endpoint}/${bucket}/${key}`;

      return {
        uploadUrl,
        publicUrl,
        key,
      };
    }),
});
