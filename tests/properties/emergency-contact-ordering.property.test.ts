import {
	type EmergencyContact,
	ROLE_ORDER,
	sortContacts,
} from "@/lib/sort-emergency-contacts";
// Feature: renter-qr-portal, Property 4: Emergency contact role ordering
import fc from "fast-check";
import { describe, expect, it } from "vitest";

/**
 * Property 4: Emergency contact role ordering
 *
 * For any set of building emergency contacts with roles from
 * {Owner, Manager, Caretaker, Security}, the display order SHALL always follow
 * the sequence Owner → Manager → Caretaker → Security, with contacts of the
 * same role maintaining their original relative order.
 */

const BUILDING_ROLES = ["মালিক", "ম্যানেজার", "কেয়ারটেকার", "সিকিউরিটি"];

/**
 * Generator for a building emergency contact with a known role.
 */
const buildingContactArb: fc.Arbitrary<EmergencyContact> = fc.record({
	name: fc.string({ minLength: 1, maxLength: 50 }),
	role: fc.constantFrom(...BUILDING_ROLES),
	phone: fc.option(fc.string({ minLength: 11, maxLength: 11 }), {
		nil: null,
	}),
	type: fc.constant("building" as const),
	order: fc.integer({ min: 0, max: 100 }),
});

/**
 * Generator for a nearby emergency contact.
 */
const nearbyContactArb: fc.Arbitrary<EmergencyContact> = fc.record({
	name: fc.string({ minLength: 1, maxLength: 50 }),
	role: fc.constantFrom("হাসপাতাল", "পুলিশ স্টেশন", "ফায়ার সার্ভিস"),
	phone: fc.option(fc.string({ minLength: 11, maxLength: 11 }), {
		nil: null,
	}),
	type: fc.constant("nearby" as const),
	order: fc.integer({ min: 0, max: 100 }),
});

describe("Feature: renter-qr-portal, Property 4: Emergency contact role ordering", () => {
	it("building contacts are always ordered Owner → Manager → Caretaker → Security", () => {
		fc.assert(
			fc.property(
				fc.array(buildingContactArb, { minLength: 1, maxLength: 20 }),
				(contacts) => {
					const sorted = sortContacts(contacts);

					// All sorted contacts should be building type
					const buildingSorted = sorted.filter((c) => c.type === "building");

					// Verify role ordering: each contact's role order should be <= the next
					for (let i = 0; i < buildingSorted.length - 1; i++) {
						const currentRoleOrder = ROLE_ORDER[buildingSorted[i]?.role] ?? 999;
						const nextRoleOrder =
							ROLE_ORDER[buildingSorted[i + 1]?.role] ?? 999;
						expect(currentRoleOrder).toBeLessThanOrEqual(nextRoleOrder);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it("contacts of the same role maintain their original relative order (stability)", () => {
		fc.assert(
			fc.property(
				fc.array(buildingContactArb, { minLength: 2, maxLength: 20 }),
				(contacts) => {
					// Assign unique sequential order values to track original positions
					const indexedContacts = contacts.map((c, i) => ({
						...c,
						order: i,
					}));

					const sorted = sortContacts(indexedContacts);
					const buildingSorted = sorted.filter((c) => c.type === "building");

					// For contacts with the same role, their `order` values should be ascending
					// (preserving original relative order)
					for (let i = 0; i < buildingSorted.length - 1; i++) {
						const current = buildingSorted[i]!;
						const next = buildingSorted[i + 1]!;
						if (current.role === next.role) {
							expect(current.order).toBeLessThan(next.order);
						}
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it("building contacts always appear before nearby contacts", () => {
		fc.assert(
			fc.property(
				fc.array(buildingContactArb, { minLength: 1, maxLength: 10 }),
				fc.array(nearbyContactArb, { minLength: 1, maxLength: 10 }),
				(buildingContacts, nearbyContacts) => {
					const allContacts = [...nearbyContacts, ...buildingContacts];
					const sorted = sortContacts(allContacts);

					// Find the last building contact index and first nearby contact index
					let lastBuildingIdx = -1;
					let firstNearbyIdx = sorted.length;

					for (let i = 0; i < sorted.length; i++) {
						const item = sorted[i]!;
						if (item.type === "building") lastBuildingIdx = i;
						if (item.type === "nearby" && i < firstNearbyIdx)
							firstNearbyIdx = i;
					}

					// All building contacts should come before all nearby contacts
					if (lastBuildingIdx >= 0 && firstNearbyIdx < sorted.length) {
						expect(lastBuildingIdx).toBeLessThan(firstNearbyIdx);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it("the sort preserves all input contacts (no contacts lost or duplicated)", () => {
		fc.assert(
			fc.property(
				fc.array(buildingContactArb, { minLength: 0, maxLength: 15 }),
				fc.array(nearbyContactArb, { minLength: 0, maxLength: 5 }),
				(buildingContacts, nearbyContacts) => {
					const allContacts = [...buildingContacts, ...nearbyContacts];
					const sorted = sortContacts(allContacts);

					// Same number of contacts in output as input
					expect(sorted.length).toBe(allContacts.length);
				},
			),
			{ numRuns: 100 },
		);
	});
});
