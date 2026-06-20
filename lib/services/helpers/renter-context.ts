import { type Database, rentalContracts, renters } from "@repo/db";
import { CONTRACT_STATUS } from "@repo/shared/constants";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Helper to resolve the active rental contract for a renter.
 * This looks up the renter record using their userId and finds their active contract.
 * Used for tenant isolation and contextual flat filtering.
 */
export async function getActiveContractForRenter(
	db: Database,
	userId: string,
	validStatuses: (typeof rentalContracts.$inferSelect.status)[] = [
		CONTRACT_STATUS.ACTIVE as any,
	],
) {
	// Look up the renter record for this user
	const renterRecord = await db.query.renters.findFirst({
		where: eq(renters.userId, userId),
	});

	if (!renterRecord) {
		return null;
	}

	// Find the active contract for this renter
	const activeContract = await db.query.rentalContracts.findFirst({
		where: and(
			eq(rentalContracts.renterId, renterRecord.id),
			inArray(rentalContracts.status, validStatuses),
		),
	});

	if (!activeContract) {
		return null;
	}

	return {
		renterRecord,
		activeContract,
	};
}
