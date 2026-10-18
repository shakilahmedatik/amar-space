import { and, count, desc, eq, gte, lte, schema } from "@omniheaven/db";
import {
  AUDIT_ERROR_CODES,
  exportAuditReportCsvSchema,
  generateAuditCsv,
  getEntityAuditTrailSchema,
  listAuditLogsSchema,
  validateDateRange,
} from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";
import { orgProtectedProcedure, router } from "../trpc";
import { recordAuditLog } from "../utils/audit";

// Restrict access strictly to Owner, Admin, and Manager roles. Staff and Members are forbidden.
const auditProtectedProcedure = orgProtectedProcedure.use(({ ctx, next }) => {
  const allowedRoles = ["owner", "admin", "manager"];
  if (!allowedRoles.includes(ctx.role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: AUDIT_ERROR_CODES.AUDIT_FORBIDDEN,
    });
  }
  return next({ ctx });
});

export const auditRouter = router({
  // 1. List Audit Logs (Paginated & Filterable)
  listAuditLogs: auditProtectedProcedure
    .input(listAuditLogsSchema.optional())
    .query(async ({ ctx, input }) => {
      const filters = input ?? { limit: 50, offset: 0 };

      // Validate date range if provided
      if (filters.startDate || filters.endDate) {
        const dateCheck = validateDateRange(filters.startDate, filters.endDate, 365);
        if (!dateCheck.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: AUDIT_ERROR_CODES.INVALID_DATE_RANGE,
          });
        }
      }

      const conditions = [eq(schema.auditLogs.organizationId, ctx.organizationId)];

      if (filters.entityType) {
        conditions.push(eq(schema.auditLogs.entityType, filters.entityType));
      }
      if (filters.entityId) {
        conditions.push(eq(schema.auditLogs.entityId, filters.entityId));
      }
      if (filters.actorUserId) {
        conditions.push(eq(schema.auditLogs.actorUserId, filters.actorUserId));
      }
      if (filters.action) {
        conditions.push(eq(schema.auditLogs.action, filters.action));
      }
      if (filters.startDate) {
        conditions.push(gte(schema.auditLogs.createdAt, new Date(filters.startDate)));
      }
      if (filters.endDate) {
        conditions.push(lte(schema.auditLogs.createdAt, new Date(filters.endDate)));
      }

      const whereClause = and(...conditions);

      const [totalCountResult] = await ctx.db
        .select({ value: count() })
        .from(schema.auditLogs)
        .where(whereClause);

      const total = totalCountResult ? Number(totalCountResult.value) : 0;

      const logs = await ctx.db.query.auditLogs.findMany({
        where: whereClause,
        orderBy: [desc(schema.auditLogs.createdAt)],
        limit: filters.limit,
        offset: filters.offset,
      });

      return {
        logs,
        total,
        limit: filters.limit,
        offset: filters.offset,
      };
    }),

  // 2. Get Entity Audit Trail (Timeline of state changes for a flat, lease, bill, or ticket)
  getEntityAuditTrail: auditProtectedProcedure
    .input(getEntityAuditTrailSchema)
    .query(async ({ ctx, input }) => {
      const logs = await ctx.db.query.auditLogs.findMany({
        where: and(
          eq(schema.auditLogs.organizationId, ctx.organizationId),
          eq(schema.auditLogs.entityType, input.entityType),
          eq(schema.auditLogs.entityId, input.entityId),
        ),
        orderBy: [desc(schema.auditLogs.createdAt)],
        limit: input.limit,
      });

      return logs;
    }),

  // 3. Export Certified Audit Report as CSV (For CA/Tax Compliance in Bangladesh)
  exportAuditReportCsv: auditProtectedProcedure
    .input(exportAuditReportCsvSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate date window strictly (max 90 days as per legal/regulatory compliance)
      const dateCheck = validateDateRange(input.startDate, input.endDate, 90);
      if (!dateCheck.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: AUDIT_ERROR_CODES.INVALID_DATE_RANGE,
        });
      }

      const conditions = [
        eq(schema.auditLogs.organizationId, ctx.organizationId),
        gte(schema.auditLogs.createdAt, new Date(input.startDate)),
        lte(schema.auditLogs.createdAt, new Date(input.endDate)),
      ];

      if (input.entityType) {
        conditions.push(eq(schema.auditLogs.entityType, input.entityType));
      }
      if (input.action) {
        conditions.push(eq(schema.auditLogs.action, input.action));
      }

      const logs = await ctx.db.query.auditLogs.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.auditLogs.createdAt)],
        limit: 5000,
      });

      const csvContent = generateAuditCsv(logs);
      const filename = `audit_report_${ctx.organizationId}_${input.startDate}_to_${input.endDate}.csv`;

      // Log compliance record of this export action itself
      await recordAuditLog({
        db: ctx.db,
        organizationId: ctx.organizationId,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        action: "EXPORT",
        entityType: "audit_log",
        entityId: `export-${Date.now()}`,
        details: {
          startDate: input.startDate,
          endDate: input.endDate,
          rowCount: logs.length,
          filename,
        },
      });

      return {
        csv: csvContent,
        filename,
        rowCount: logs.length,
      };
    }),
});
