import * as fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "../../src/client";
import { type SeedDb, seed } from "../../src/seed";

interface MockRow {
	id?: string;
	email?: string;
	key?: string;
	slug?: string;
	roleId?: string;
	permissionId?: string;
	[key: string]: unknown;
}

/**
 * Mock database layer that simulates Drizzle's insert().values().onConflictDoNothing().returning() chain
 * and mock queries with unique constraint resolution.
 */
function createMockDb(): SeedDb & { getInsertedRows(): MockRow[] } {
	const insertedRows: MockRow[] = [];

	const mockQuery = {
		permissions: {
			findFirst: vi.fn().mockResolvedValue({ id: "perm-id", key: "perm-key" }),
		},
		staffRoles: {
			findFirst: vi
				.fn()
				.mockResolvedValue({ id: "role-id", slug: "role-slug" }),
		},
		buildings: {
			findFirst: vi.fn().mockResolvedValue({ id: "building-id" }),
		},
		flats: {
			findFirst: vi.fn().mockResolvedValue({ id: "flat-id" }),
		},
		renters: {
			findFirst: vi.fn().mockResolvedValue({ id: "renter-id" }),
		},
		rentalContracts: {
			findFirst: vi.fn().mockResolvedValue({ id: "contract-id" }),
		},
	};

	const mockDb: SeedDb & { getInsertedRows(): MockRow[] } = {
		query: mockQuery,
		insert: vi.fn().mockImplementation(() => {
			return {
				values: vi
					.fn()
					.mockImplementation(
						(val: Record<string, unknown> | Record<string, unknown>[]) => {
							const rows = Array.isArray(val) ? val : [val];

							const insertUnique = (row: MockRow) => {
								const isDuplicate = insertedRows.some((existing) => {
									if (row.id && existing.id === row.id) return true;
									if (row.email && existing.email === row.email) return true;
									if (row.key && existing.key === row.key) return true;
									if (row.slug && existing.slug === row.slug) return true;
									if (
										row.roleId &&
										row.permissionId &&
										existing.roleId === row.roleId &&
										existing.permissionId === row.permissionId
									) {
										return true;
									}
									return false;
								});
								if (!isDuplicate) {
									insertedRows.push(row);
								}
							};

							const chain = {
								onConflictDoNothing: vi.fn().mockImplementation(() => {
									for (const row of rows) {
										insertUnique(row);
									}
									return chain;
								}),
								returning: vi.fn().mockImplementation(() => {
									for (const row of rows) {
										insertUnique(row);
									}
									const returnedVal = rows.map((r) => ({
										id: typeof r.id === "string" ? r.id : "generated-id",
										key: typeof r.key === "string" ? r.key : "generated-key",
									}));
									return Promise.resolve(returnedVal);
								}),
								// biome-ignore lint/suspicious/noThenProperty: simulating drizzle query builder thenable
								then: (resolve: (value: unknown) => void) => {
									for (const row of rows) {
										insertUnique(row);
									}
									const returnedVal = rows.map((r) => ({
										id: typeof r.id === "string" ? r.id : "generated-id",
										key: typeof r.key === "string" ? r.key : "generated-key",
									}));
									return Promise.resolve(returnedVal).then(resolve);
								},
							};
							return chain;
						},
					),
			};
		}),
		getInsertedRows: () => [...insertedRows],
	};

	return mockDb;
}

describe("Feature: amarspace-infrastructure-setup, Property 3: Seed Script Idempotence", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-11T08:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("running seed N times produces same row count as running once", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (n) => {
				// Run seed once and capture state
				const singleRunDb = createMockDb();
				await seed(singleRunDb);
				const singleRunRows = singleRunDb.getInsertedRows();

				// Run seed N times on a fresh db
				const multiRunDb = createMockDb();
				for (let i = 0; i < n; i++) {
					await seed(multiRunDb);
				}
				const multiRunRows = multiRunDb.getInsertedRows();

				// Row count must be identical
				expect(multiRunRows.length).toBe(singleRunRows.length);
			}),
			{ numRuns: 10 },
		);
	});

	it("running seed N times produces same content as running once", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (n) => {
				// Run seed once
				const singleRunDb = createMockDb();
				await seed(singleRunDb);
				const singleRunRows = singleRunDb.getInsertedRows();

				// Run seed N times
				const multiRunDb = createMockDb();
				for (let i = 0; i < n; i++) {
					await seed(multiRunDb);
				}
				const multiRunRows = multiRunDb.getInsertedRows();

				expect(multiRunRows).toEqual(singleRunRows);
			}),
			{ numRuns: 10 },
		);
	});

	it("seed uses onConflictDoNothing to ensure idempotence", async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 2, max: 5 }), async (_n) => {
				let onConflictDoNothingCallCount = 0;

				const trackingDb = createMockDb();
				const originalInsert = trackingDb.insert;
				trackingDb.insert = vi.fn().mockImplementation((table) => {
					const insertChain = originalInsert(table);
					const originalValues = insertChain.values;
					insertChain.values = vi.fn().mockImplementation((val) => {
						const valuesChain = originalValues(val);
						const originalOnConflict = valuesChain.onConflictDoNothing;
						valuesChain.onConflictDoNothing = vi
							.fn()
							.mockImplementation((opt) => {
								onConflictDoNothingCallCount++;
								return originalOnConflict(opt);
							});
						return valuesChain;
					});
					return insertChain;
				});

				await seed(trackingDb);

				// onConflictDoNothing must be called for the seed invocation
				expect(onConflictDoNothingCallCount).toBeGreaterThan(0);
			}),
			{ numRuns: 10 },
		);
	});
});
