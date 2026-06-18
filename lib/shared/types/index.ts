import type { UserRole } from "../roles";

export type { UserRole };

export interface IAuditLogger {
	log(entry: Record<string, unknown>): void | Promise<void>;
}

export interface IR2Client {
	upload(
		accountId: string,
		folder: string,
		entityId: string,
		filename: string,
		buffer: Buffer,
		mimeType: string,
	): Promise<string>;
	delete(url: string): Promise<void>;
}

/** Service context injected into domain services */
export interface ServiceContext {
	db: unknown;
	auditLogger: IAuditLogger;
}

/** Request context injected by auth middleware */
export interface RequestContext {
	userId: string;
	role: UserRole;
	ownerAccountId: string;
	assignedBuildingIds?: string[];
	assignedFlatId?: string;
	ipAddress: string;
	userAgent: string;
	isSuperadmin?: boolean;
}

/** Standard API error response */
export interface ApiErrorResponse {
	requestId: string;
	statusCode: number;
	error: string;
	message: string;
	errors?: FieldError[];
}

/** Field-level validation error */
export interface FieldError {
	field: string;
	message: string;
	rule?: string;
}

export interface PaginationInput {
	page: number;
	pageSize: number;
}

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}
