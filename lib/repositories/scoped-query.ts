import type { Database, DatabaseOrTransaction } from "@repo/db";

export interface ScopeContext {
	ownerAccountId: string;
	role:
		| "superadmin"
		| "owner"
		| "manager"
		| "security_guard"
		| "care_taker"
		| "renter";
	assignedBuildingIds?: string[];
	assignedFlatId?: string;
	isSuperadmin?: boolean;
}

export abstract class BaseRepository {
	constructor(protected db: Database) {}

	protected txOrDb(tx?: DatabaseOrTransaction): DatabaseOrTransaction {
		return tx ?? this.db;
	}
}
