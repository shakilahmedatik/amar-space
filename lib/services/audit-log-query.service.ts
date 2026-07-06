import {
	type Database,
	auditLogs,
	flats,
	issues,
	maintenanceRequests,
	managerAssignments,
	users,
} from "@repo/db";
import { ForbiddenError } from "@repo/shared/errors";
import type { PaginationInput, RequestContext } from "@repo/shared/types";
import {
	and,
	count,
	desc,
	eq,
	exists,
	gte,
	inArray,
	lte,
	or,
} from "drizzle-orm";

// --- Types ---

export interface AuditLogQueryFilters {
	entityType?: string;
	entityId?: string;
	actorUserId?: string;
	actionName?: string;
	startDate?: string; // ISO date string
	endDate?: string; // ISO date string
}

export interface AuditLogEntry {
	id: string;
	ownerAccountId: string;
	actorId: string;
	actorName: string;
	action: string;
	entityType: string;
	entityId: string;
	oldValues: unknown;
	newValues: unknown;
	metadata: unknown;
	createdAt: Date;
}

export interface PaginatedAuditLogs {
	data: AuditLogEntry[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

// --- Service ---

/**
 * AuditLogQueryService handles querying audit log entries with role-based access control
 * and tenant isolation.
 *
 * Access rules:
 * - Owner: full access to all logs within their tenant (Requirement 13.3)
 * - Manager: access only to logs for entities in assigned buildings (Requirement 13.4)
 * - Renter: denied with 403 (Requirement 13.5)
 *
 * Features:
 * - Filter by entityType, entityId, actorUserId, actionName, date range
 * - Paginated with max 100 per page, sorted by createdAt descending
 * - Tenant isolation via ownerAccountId (Requirement 13.8)
 *
 */
export class AuditLogQueryService {
	private db: Database;

	constructor(db: Database) {
		this.db = db;
	}

	/**
	 * Queries audit logs with filtering, pagination, and role-based access control.
	 *
	 * - Owner: full access to all logs within their tenant
	 * - Manager: access only to logs for entities in their assigned buildings
	 * - Renter: denied (403 ForbiddenError)
	 *
	 */
	async queryLogs(
		ctx: RequestContext,
		filters: AuditLogQueryFilters,
		pagination: PaginationInput,
	): Promise<PaginatedAuditLogs> {
		// Renters cannot access audit logs (Requirement 13.5)
		if (ctx.role === "renter") {
			throw new ForbiddenError();
		}

		const pageSize = Math.min(Math.max(pagination.pageSize, 1), 100);
		const page = Math.max(pagination.page, 1);
		const offset = (page - 1) * pageSize;

		// Build conditions with tenant isolation (Requirement 13.8)
		const conditions = [];
		if (ctx.role !== "superadmin" && !ctx.isSuperadmin && ctx.ownerAccountId) {
			conditions.push(eq(auditLogs.ownerAccountId, ctx.ownerAccountId));
		}

		// Manager: restrict to entities in assigned buildings (Requirement 13.4)
		if (ctx.role === "manager") {
			let assignedBuildingIds = ctx.assignedBuildingIds;

			if (!assignedBuildingIds || assignedBuildingIds.length === 0) {
				const assignments = await this.db
					.select({ buildingId: managerAssignments.buildingId })
					.from(managerAssignments)
					.where(
						and(
							eq(managerAssignments.managerId, ctx.userId),
							eq(managerAssignments.ownerAccountId, ctx.ownerAccountId),
						),
					);

				assignedBuildingIds = assignments.map((a) => a.buildingId);
			}

			if (assignedBuildingIds.length === 0) {
				conditions.push(eq(auditLogs.actorId, ctx.userId));
			} else {
				conditions.push(
					or(
						eq(auditLogs.actorId, ctx.userId),
						inArray(auditLogs.entityId, assignedBuildingIds),
						exists(
							this.db
								.select()
								.from(flats)
								.where(
									and(
										eq(flats.id, auditLogs.entityId),
										inArray(flats.buildingId, assignedBuildingIds),
									),
								),
						),
						exists(
							this.db
								.select()
								.from(maintenanceRequests)
								.where(
									and(
										eq(maintenanceRequests.id, auditLogs.entityId),
										inArray(
											maintenanceRequests.buildingId,
											assignedBuildingIds,
										),
									),
								),
						),
						exists(
							this.db
								.select()
								.from(issues)
								.where(
									and(
										eq(issues.id, auditLogs.entityId),
										inArray(issues.buildingId, assignedBuildingIds),
									),
								),
						),
					),
				);
			}
		}

		// Apply filters
		if (filters.entityType) {
			conditions.push(eq(auditLogs.entityType, filters.entityType));
		}

		if (filters.entityId) {
			conditions.push(eq(auditLogs.entityId, filters.entityId));
		}

		if (filters.actorUserId) {
			conditions.push(eq(auditLogs.actorId, filters.actorUserId));
		}

		if (filters.actionName) {
			conditions.push(eq(auditLogs.action, filters.actionName));
		}

		if (filters.startDate) {
			conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
		}

		if (filters.endDate) {
			conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
		}

		const whereClause = and(...conditions);

		const [data, totalResult] = await Promise.all([
			this.db
				.select({
					id: auditLogs.id,
					ownerAccountId: auditLogs.ownerAccountId,
					actorId: auditLogs.actorId,
					actorName: users.name,
					action: auditLogs.action,
					entityType: auditLogs.entityType,
					entityId: auditLogs.entityId,
					oldValues: auditLogs.oldValues,
					newValues: auditLogs.newValues,
					metadata: auditLogs.metadata,
					createdAt: auditLogs.createdAt,
				})
				.from(auditLogs)
				.leftJoin(users, eq(auditLogs.actorId, users.id))
				.where(whereClause)
				.orderBy(desc(auditLogs.createdAt))
				.limit(pageSize)
				.offset(offset),
			this.db.select({ count: count() }).from(auditLogs).where(whereClause),
		]);

		const total = totalResult[0]?.count ?? 0;

		return {
			data: data.map((row) => ({
				id: row.id,
				ownerAccountId: row.ownerAccountId,
				actorId: row.actorId,
				actorName: row.actorName ?? "Unknown",
				action: row.action,
				entityType: row.entityType,
				entityId: row.entityId,
				oldValues: row.oldValues,
				newValues: row.newValues,
				metadata: row.metadata,
				createdAt: row.createdAt,
			})),
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}
}
