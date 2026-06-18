import {
	type Database,
	type DatabaseOrTransaction,
	buildings,
	flatSlugs,
	flats,
} from "@repo/db";
import type { FlatStatus } from "@repo/shared/constants";
import { and, count, eq } from "drizzle-orm";

export class FlatRepository {
	constructor(private db: Database) {}

	/**
	 * Finds a flat by ID and owner account.
	 */
	async findById(
		id: string,
		ownerAccountId: string,
		tx?: DatabaseOrTransaction,
	) {
		const client = tx ?? this.db;
		return client.query.flats.findFirst({
			where: and(eq(flats.id, id), eq(flats.ownerAccountId, ownerAccountId)),
			with: {
				building: {
					columns: { id: true, name: true },
				},
			},
		});
	}

	/**
	 * Finds a flat by number and building ID.
	 */
	async findByNumberAndBuilding(
		flatNumber: string,
		buildingId: string,
		tx?: DatabaseOrTransaction,
	) {
		const client = tx ?? this.db;
		return client.query.flats.findFirst({
			where: and(
				eq(flats.buildingId, buildingId),
				eq(flats.flatNumber, flatNumber),
			),
		});
	}

	/**
	 * Creates a new flat.
	 */
	async create(data: typeof flats.$inferInsert, tx?: DatabaseOrTransaction) {
		const client = tx ?? this.db;
		const [created] = await client.insert(flats).values(data).returning();
		if (!created) {
			throw new Error("Failed to create flat");
		}
		return created;
	}

	/**
	 * Updates an existing flat.
	 */
	async update(
		id: string,
		data: Partial<typeof flats.$inferInsert>,
		tx?: DatabaseOrTransaction,
	) {
		const client = tx ?? this.db;
		const [updated] = await client
			.update(flats)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(flats.id, id))
			.returning();
		if (!updated) {
			throw new Error("Failed to update flat");
		}
		return updated;
	}

	/**
	 * Deletes a flat and cascades slug deletion atomically.
	 */
	async delete(id: string, tx?: DatabaseOrTransaction) {
		const client = tx ?? this.db;
		// Ensure both are deleted in transaction context if tx is provided
		await client.delete(flatSlugs).where(eq(flatSlugs.flatId, id));
		await client.delete(flats).where(eq(flats.id, id));
	}

	/**
	 * Lists flats with building joins and pagination/filtering.
	 */
	async list(
		ownerAccountId: string,
		filters: { buildingId?: string; status?: FlatStatus },
		page: number,
		pageSize: number,
		tx?: DatabaseOrTransaction,
	) {
		const client = tx ?? this.db;
		const offset = (page - 1) * pageSize;

		const conditions = [eq(flats.ownerAccountId, ownerAccountId)];
		if (filters.buildingId) {
			conditions.push(eq(flats.buildingId, filters.buildingId));
		}
		if (filters.status) {
			conditions.push(eq(flats.status, filters.status));
		}

		const whereClause = and(...conditions);

		return client
			.select({
				id: flats.id,
				ownerAccountId: flats.ownerAccountId,
				buildingId: flats.buildingId,
				flatNumber: flats.flatNumber,
				floor: flats.floor,
				status: flats.status,
				createdAt: flats.createdAt,
				updatedAt: flats.updatedAt,
				buildingName: buildings.name,
			})
			.from(flats)
			.leftJoin(buildings, eq(flats.buildingId, buildings.id))
			.where(whereClause)
			.limit(pageSize)
			.offset(offset);
	}

	/**
	 * Counts flats matching criteria.
	 */
	async count(
		ownerAccountId: string,
		filters: { buildingId?: string; status?: FlatStatus },
		tx?: DatabaseOrTransaction,
	) {
		const client = tx ?? this.db;

		const conditions = [eq(flats.ownerAccountId, ownerAccountId)];
		if (filters.buildingId) {
			conditions.push(eq(flats.buildingId, filters.buildingId));
		}
		if (filters.status) {
			conditions.push(eq(flats.status, filters.status));
		}

		const whereClause = and(...conditions);

		const result = await client
			.select({ count: count() })
			.from(flats)
			.where(whereClause);

		return result[0]?.count ?? 0;
	}

	/**
	 * Finds a flat slug by flat ID.
	 */
	async findSlugByFlatId(flatId: string, tx?: DatabaseOrTransaction) {
		const client = tx ?? this.db;
		return client.query.flatSlugs.findFirst({
			where: eq(flatSlugs.flatId, flatId),
			columns: { slug: true },
		});
	}

	/**
	 * Creates a flat slug.
	 */
	async createSlug(
		data: typeof flatSlugs.$inferInsert,
		tx?: DatabaseOrTransaction,
	) {
		const client = tx ?? this.db;
		const [created] = await client
			.insert(flatSlugs)
			.values(data)
			.onConflictDoNothing()
			.returning({ slug: flatSlugs.slug });
		return created;
	}
}
