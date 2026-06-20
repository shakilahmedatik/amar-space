import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
	managerAssignments,
	portalSessions,
	rentalContracts,
	renters,
} from "@/lib/db/schema";
import type { ApprovalStatus, UserRole } from "@repo/shared";
import { ROLE_ORDINALS } from "@repo/shared/roles";
import type { ApiErrorResponse } from "@repo/shared/types";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export interface AuthUser {
	id: string;
	role: UserRole;
	ownerAccountId: string;
	email: string;
	approvalStatus?: ApprovalStatus;
	isActive?: boolean;
}

export interface TenantScope {
	ownerAccountId: string;
	assignedBuildingIds?: string[];
	assignedFlatId?: string;
	isSuperadmin?: boolean;
}

export interface AuthContext {
	user: AuthUser;
	tenantScope: TenantScope;
}

type Role = AuthUser["role"];
export type RoleGuardConfig = Role[] | { minRole: Role };

function getPortalSessionCookie(request: NextRequest): string | undefined {
	return request.cookies.get("portal_session")?.value;
}

async function authenticatePortalSession(
	request: NextRequest,
): Promise<AuthUser | null> {
	const portalSessionId = getPortalSessionCookie(request);
	if (!portalSessionId) return null;

	try {
		const portalSession = await db.query.portalSessions.findFirst({
			where: eq(portalSessions.id, portalSessionId),
			with: {
				renter: {
					with: {
						user: true,
					},
				},
			},
		});

		if (!portalSession) return null;
		const now = new Date();
		if (portalSession.expiresAt <= now) return null;

		const renter = portalSession.renter;
		if (!renter?.user) return null;

		return {
			id: renter.user.id,
			role: "renter",
			ownerAccountId: renter.user.ownerAccountId || renter.user.id,
			email: renter.user.email,
			approvalStatus: "approved",
			isActive: renter.user.isActive ?? true,
		};
	} catch {
		return null;
	}
}

function isPortalRequest(request: NextRequest): boolean {
	if (request.headers.get("x-portal-request") === "true") return true;
	if (request.nextUrl.pathname.startsWith("/api/portal/")) return true;
	return false;
}

function errorResponse(
	message: string,
	statusCode = 401,
	error = "Unauthorized",
): NextResponse {
	const response: ApiErrorResponse = {
		requestId: crypto.randomUUID(),
		statusCode,
		error,
		message,
	};
	return NextResponse.json(response, { status: statusCode });
}

/**
 * In-memory cache for tenant scope resolution.
 * Avoids 2-3 DB queries per API request for the same user within the TTL window.
 * Stored on globalThis to survive HMR in development.
 */
const SCOPE_CACHE_TTL_MS = 60_000; // 1 minute

interface ScopeCacheEntry {
	scope: TenantScope;
	expiry: number;
}

const globalForScopeCache = globalThis as unknown as {
	__tenantScopeCache?: Map<string, ScopeCacheEntry>;
};

if (!globalForScopeCache.__tenantScopeCache) {
	globalForScopeCache.__tenantScopeCache = new Map();
}

const scopeCache = globalForScopeCache.__tenantScopeCache;

/**
 * Invalidate the cached tenant scope for a user.
 * Call this when role assignments or contracts change.
 */
export function invalidateTenantScopeCache(userId: string): void {
	scopeCache.delete(userId);
}

async function resolveTenantScope(user: AuthUser): Promise<TenantScope> {
	if (user.role === "superadmin") {
		return { ownerAccountId: "__all__", isSuperadmin: true };
	}

	// Check cache
	const cached = scopeCache.get(user.id);
	if (cached && cached.expiry > Date.now()) {
		return cached.scope;
	}

	const scope: TenantScope = {
		ownerAccountId: user.ownerAccountId,
	};

	if (user.role === "manager") {
		const assignments = await db
			.select({ buildingId: managerAssignments.buildingId })
			.from(managerAssignments)
			.where(
				and(
					eq(managerAssignments.managerId, user.id),
					eq(managerAssignments.ownerAccountId, user.ownerAccountId),
				),
			);
		scope.assignedBuildingIds = assignments.map((a) => a.buildingId);
	}

	if (user.role === "renter") {
		// Single JOIN query instead of two sequential queries
		const result = await db
			.select({ flatId: rentalContracts.flatId })
			.from(renters)
			.innerJoin(
				rentalContracts,
				and(
					eq(rentalContracts.renterId, renters.id),
					eq(rentalContracts.status, "active"),
				),
			)
			.where(eq(renters.userId, user.id))
			.limit(1);

		if (result[0]) {
			scope.assignedFlatId = result[0].flatId;
		}
	}

	// Store in cache
	scopeCache.set(user.id, {
		scope,
		expiry: Date.now() + SCOPE_CACHE_TTL_MS,
	});

	return scope;
}

function checkRoleAccess(userRole: Role, config?: RoleGuardConfig): boolean {
	if (!config) return true;
	if (userRole === "superadmin") return true;

	if (Array.isArray(config)) {
		return config.includes(userRole);
	}

	return ROLE_ORDINALS[userRole] >= ROLE_ORDINALS[config.minRole];
}

export function withAuth<P = Record<string, string>>(
	handler: (
		req: NextRequest,
		ctx: AuthContext,
		params: P | Promise<P>,
	) => Promise<NextResponse | Response> | NextResponse | Response,
	options?: { roles?: RoleGuardConfig; requireApproval?: boolean },
) {
	return async (
		req: NextRequest,
		{ params }: { params: P | Promise<P> } = { params: {} as P | Promise<P> },
	) => {
		let authUser: AuthUser | null = null;

		if (isPortalRequest(req)) {
			authUser = await authenticatePortalSession(req);
		}

		if (!authUser) {
			try {
				const session = await auth.api.getSession({ headers: req.headers });
				if (
					session?.user &&
					typeof session.user === "object" &&
					session.user !== null
				) {
					const user = session.user;
					if ("isActive" in user && user.isActive === false) {
						return errorResponse("Account is deactivated", 401);
					}

					const roleStr =
						"role" in user && typeof user.role === "string"
							? user.role
							: "owner";

					const userId =
						"id" in user && typeof user.id === "string" ? user.id : "";
					const ownerAccountId =
						roleStr === "owner"
							? userId
							: ("ownerAccountId" in user &&
								typeof user.ownerAccountId === "string"
									? user.ownerAccountId
									: "") || userId;

					// Define type guard for ApprovalStatus
					const isValidApprovalStatus = (s: unknown): s is ApprovalStatus =>
						typeof s === "string" &&
						["pending", "approved", "rejected"].includes(s);

					// Define type guard for Role
					const isValidRole = (r: unknown): r is AuthUser["role"] =>
						typeof r === "string" &&
						[
							"superadmin",
							"owner",
							"manager",
							"security_guard",
							"care_taker",
							"renter",
						].includes(r);

					const approvalStatusVal =
						"approvalStatus" in user ? user.approvalStatus : undefined;
					const finalRole = isValidRole(roleStr) ? roleStr : "owner";

					authUser = {
						id: userId,
						role: finalRole,
						ownerAccountId,
						email:
							"email" in user && typeof user.email === "string"
								? user.email
								: "",
						approvalStatus: isValidApprovalStatus(approvalStatusVal)
							? approvalStatusVal
							: undefined,
						isActive:
							"isActive" in user && typeof user.isActive === "boolean"
								? user.isActive
								: undefined,
					};
				}
			} catch {}
		}

		if (!authUser && !isPortalRequest(req)) {
			authUser = await authenticatePortalSession(req);
		}

		if (!authUser) {
			return errorResponse("Authentication required", 401);
		}

		if (!checkRoleAccess(authUser.role, options?.roles)) {
			return errorResponse("Insufficient permissions", 403, "Forbidden");
		}

		if (
			options?.requireApproval &&
			authUser.role === "owner" &&
			(authUser.approvalStatus === "pending" ||
				authUser.approvalStatus === "rejected")
		) {
			return errorResponse(
				"Your account is pending approval",
				403,
				"Forbidden",
			);
		}

		const tenantScope = await resolveTenantScope(authUser);

		return handler(req, { user: authUser, tenantScope }, params);
	};
}
