import {
	type Database,
	type DatabaseOrTransaction,
	buildings,
	issueAttachments,
	issues,
	users,
} from "@repo/db";
import { type SQL, and, count, desc, eq, inArray } from "drizzle-orm";
import { BaseRepository, type ScopeContext } from "./scoped-query";

export class IssueRepository extends BaseRepository {
	findById(id: string, ownerAccountId: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.query.issues.findFirst({
			where: and(eq(issues.id, id), eq(issues.ownerAccountId, ownerAccountId)),
			with: {
				building: { columns: { id: true, name: true } },
				assignee: { columns: { id: true, name: true } },
				attachments: true,
			},
		});
	}

	findByIdWithAccess(id: string, scope: ScopeContext) {
		const client = this.db;
		if (scope.role === "superadmin") {
			return client.query.issues.findFirst({
				where: eq(issues.id, id),
				with: {
					building: { columns: { id: true, name: true } },
					assignee: { columns: { id: true, name: true } },
					attachments: true,
				},
			});
		}
		return client.query.issues.findFirst({
			where: and(
				eq(issues.id, id),
				eq(issues.ownerAccountId, scope.ownerAccountId),
			),
			with: {
				building: { columns: { id: true, name: true } },
				assignee: { columns: { id: true, name: true } },
				attachments: true,
			},
		});
	}

	list(
		scope: ScopeContext,
		filters: {
			buildingId?: string;
			category?: string;
			status?: import("@repo/shared/constants").IssueStatus;
			priority?: string;
			assigneeId?: string;
		},
		page: number,
		pageSize: number,
	) {
		const client = this.db;
		const offset = (page - 1) * pageSize;

		const conditions: SQL[] = [];

		if (scope.role !== "superadmin") {
			conditions.push(eq(issues.ownerAccountId, scope.ownerAccountId));
		}
		if (scope.role === "manager" && scope.assignedBuildingIds) {
			conditions.push(inArray(issues.buildingId, scope.assignedBuildingIds));
		}
		if (filters.buildingId) {
			conditions.push(eq(issues.buildingId, filters.buildingId));
		}
		if (filters.category) {
			conditions.push(eq(issues.category, filters.category));
		}
		if (filters.status) {
			conditions.push(eq(issues.status, filters.status));
		}
		if (filters.priority) {
			conditions.push(eq(issues.priority, filters.priority));
		}
		if (filters.assigneeId) {
			conditions.push(eq(issues.assigneeId, filters.assigneeId));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		return Promise.all([
			client
				.select({
					id: issues.id,
					ownerAccountId: issues.ownerAccountId,
					buildingId: issues.buildingId,
					flatId: issues.flatId,
					renterId: issues.renterId,
					title: issues.title,
					description: issues.description,
					category: issues.category,
					priority: issues.priority,
					status: issues.status,
					assigneeId: issues.assigneeId,
					resolutionNotes: issues.resolutionNotes,
					resolvedAt: issues.resolvedAt,
					createdAt: issues.createdAt,
					updatedAt: issues.updatedAt,
					buildingName: buildings.name,
					assigneeName: users.name,
				})
				.from(issues)
				.leftJoin(buildings, eq(issues.buildingId, buildings.id))
				.leftJoin(users, eq(issues.assigneeId, users.id))
				.where(whereClause)
				.orderBy(desc(issues.createdAt))
				.limit(pageSize)
				.offset(offset),
			client.select({ count: count() }).from(issues).where(whereClause),
		]);
	}

	create(data: typeof issues.$inferInsert, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.insert(issues).values(data).returning();
	}

	update(
		id: string,
		data: Partial<typeof issues.$inferInsert>,
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		return client
			.update(issues)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(issues.id, id))
			.returning();
	}

	delete(id: string, tx?: DatabaseOrTransaction) {
		const client = this.txOrDb(tx);
		return client.delete(issues).where(eq(issues.id, id));
	}

	insertAttachments(
		data: (typeof issueAttachments.$inferInsert)[],
		tx?: DatabaseOrTransaction,
	) {
		const client = this.txOrDb(tx);
		if (data.length === 0) return [];
		return client.insert(issueAttachments).values(data).returning();
	}
}
