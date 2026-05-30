# Implementation Plan: Role-Based User Management

## Overview

This plan implements the superadmin role, owner account approval workflow, manager creation by owners, admin user management endpoints, and enhanced middleware (role guard, approval guard, tenant scope). The implementation builds incrementally on the existing Fastify middleware stack, Drizzle ORM schema, and better-auth session management.

## Tasks

- [x] 1. Database schema changes and shared types
  - [x] 1.1 Add `approvalStatus`, `isActive`, and `deactivatedAt` columns to users table
    - Add `approvalStatus` varchar column (nullable, default `'pending'`) to `packages/db/src/schema/users.ts`
    - Add `isActive` boolean column (not null, default `true`) to `packages/db/src/schema/users.ts`
    - Add `deactivatedAt` timestamp column (nullable, with timezone) to `packages/db/src/schema/users.ts`
    - Generate and run a Drizzle migration for the new columns
    - _Requirements: 1.1, 2.1, 4.3, 4.4_

  - [x] 1.2 Define shared TypeScript types and constants for roles and approval
    - Create `packages/shared/src/roles.ts` (or extend existing shared types) with `UserRole`, `ApprovalStatus`, `ROLE_ORDINALS`, and `VALID_APPROVAL_TRANSITIONS`
    - Export `UserRole = 'superadmin' | 'owner' | 'manager' | 'renter'`
    - Export `ROLE_ORDINALS: Record<UserRole, number>` with superadmin=4, owner=3, manager=2, renter=1
    - Export `VALID_APPROVAL_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]>`
    - _Requirements: 1.1, 5.1, 2.6_

  - [x] 1.3 Create Zod validation schemas for admin and manager endpoints
    - Create validation schemas for: create manager input (email max 254, name 1-200, buildingIds 1-20), approval status update, admin user list query params, owner list query params
    - Place in `packages/shared/src/validation/` following existing patterns
    - _Requirements: 3.1, 3.2, 3.9, 2.5, 2.6, 4.1_

- [x] 2. Middleware enhancements
  - [x] 2.1 Enhance auth guard to support superadmin role and deactivation check
    - Update `AuthUser` interface in `apps/api/src/middleware/auth-guard.ts` to include `'superadmin'` in the role union, add `approvalStatus` and `isActive` fields
    - Add logic: if `isActive === false`, invalidate session via better-auth API, return 401 with "Account is deactivated" message
    - Inject `approvalStatus` and `isActive` from session user into `request.user`
    - _Requirements: 1.2, 4.7, 5.4_

  - [x] 2.2 Enhance role guard with hierarchical mode and superadmin bypass
    - Update `apps/api/src/middleware/role-guard.ts` to accept `Role[] | { minRole: Role }` config
    - Add superadmin bypass: if `request.user.role === 'superadmin'`, always pass regardless of config
    - For explicit list mode: check if user role is in the list (existing behavior)
    - For hierarchical mode: check `ROLE_ORDINALS[userRole] >= ROLE_ORDINALS[minRole]`
    - _Requirements: 1.3, 5.1, 5.2, 5.3, 5.6_

  - [x] 2.3 Write property tests for role guard (Properties 1, 2, 3)
    - **Property 1: Superadmin bypasses all role guards**
    - **Property 2: Explicit role list grants access only to listed roles**
    - **Property 3: Hierarchical role access respects ordinal ranking**
    - Create `apps/api/tests/property/role-guard.property.test.ts` using fast-check
    - **Validates: Requirements 1.3, 5.1, 5.2, 5.3**

  - [x] 2.4 Create approval guard middleware
    - Create `apps/api/src/middleware/approval-guard.ts`
    - Block owners with `approvalStatus` of `pending` or `rejected` from resource-management endpoints
    - Superadmin bypasses this check
    - Return 403 with message "Your account is pending approval" when blocked
    - _Requirements: 2.2, 5.4, 5.5_

  - [x] 2.5 Write property test for approval guard (Property 4)
    - **Property 4: Unapproved owners are blocked from resource management**
    - Create `apps/api/tests/property/approval-guard.property.test.ts` using fast-check
    - **Validates: Requirements 2.2, 5.4**

  - [x] 2.6 Enhance tenant scope middleware for superadmin bypass
    - Update `apps/api/src/middleware/tenant-scope.ts` to check if `user.role === 'superadmin'`
    - If superadmin, set `request.tenantScope = { ownerAccountId: '__all__' }` and return early
    - _Requirements: 1.6, 6.1_

  - [x] 2.7 Write property test for tenant scope (Property 11)
    - **Property 11: Manager scope enforcement**
    - Create `apps/api/tests/property/tenant-scope.property.test.ts` using fast-check
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 3. Checkpoint - Ensure all middleware tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Owner approval workflow service and routes
  - [x] 4.1 Create OwnerApprovalService
    - Create `apps/api/src/services/owner-approval.ts`
    - Implement `listOwners(params: { page, pageSize, status? })` with pagination (default 20, max 100) and optional status filter
    - Implement `updateApprovalStatus(actorId, ownerId, newStatus)` with transition validation using `VALID_APPROVAL_TRANSITIONS`
    - Log all approval actions to audit logger
    - Return 400 for invalid transitions, 404 for non-existent owner
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.8_

  - [x] 4.2 Write property test for approval status transitions (Property 5)
    - **Property 5: Only valid approval status transitions succeed**
    - Create `apps/api/tests/property/approval-guard.property.test.ts` (extend or separate file)
    - **Validates: Requirements 2.6, 2.8**

  - [x] 4.3 Create admin owner routes
    - Create `apps/api/src/routes/admin/owners.ts`
    - `GET /api/admin/owners` — List owners with pagination and status filter (superadmin only)
    - `PUT /api/admin/owners/:id/status` — Update approval status (superadmin only)
    - Use `preHandler: [authGuard, roleGuard(['superadmin'])]`
    - Define Zod request/response schemas following existing route patterns
    - _Requirements: 2.5, 2.6, 2.7_

  - [x] 4.4 Write property test for admin access control (Property 6)
    - **Property 6: Non-superadmin users cannot access admin endpoints**
    - Create `apps/api/tests/property/admin-access.property.test.ts` using fast-check
    - **Validates: Requirements 1.5, 2.7, 7.4**

- [x] 5. Manager creation service and routes
  - [x] 5.1 Create temporary password generation utility
    - Create `apps/api/src/utils/password-generator.ts`
    - Implement `generateTemporaryPassword(length = 16)` using `crypto.randomBytes`
    - Ensure minimum 12 chars with at least one uppercase, lowercase, digit, and special character
    - Use Fisher-Yates shuffle with cryptographic randomness
    - _Requirements: 3.7_

  - [x] 5.2 Write property test for password generation (Property 10)
    - **Property 10: Generated temporary passwords meet all character requirements**
    - Create `apps/api/tests/property/password-generation.property.test.ts` using fast-check
    - **Validates: Requirements 3.7**

  - [x] 5.3 Create ManagerService
    - Create `apps/api/src/services/manager.ts`
    - Implement `createManager(ctx, input)`: validate building ownership, check email uniqueness, create user with `manager` role and `ownerAccountId`, create manager_assignment records, generate temp password, log to audit
    - Implement `listManagers(ctx, pagination)`: paginated list of managers for owner's account (max page size 100)
    - Implement `updateAssignments(ctx, managerId, buildingIds)`: validate all buildings belong to owner, ensure at least 1 assignment remains
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 6.5, 6.6, 6.7_

  - [x] 5.4 Write property tests for manager creation (Properties 7, 8, 9)
    - **Property 7: Valid manager creation produces correct user and assignments**
    - **Property 8: Building ID count validation**
    - **Property 9: Building ownership validation rejects foreign buildings**
    - Create `apps/api/tests/property/manager-creation.property.test.ts` using fast-check
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x] 5.5 Create manager routes
    - Create `apps/api/src/routes/managers.ts`
    - `POST /api/managers` — Create a manager (owner only, with approval guard)
    - `GET /api/managers` — List managers for owner's account (owner only)
    - `PUT /api/managers/:id/assignments` — Update building assignments (owner only)
    - Use `preHandler: [authGuard, roleGuard(['owner']), approvalGuard, tenantScope]`
    - Define Zod request/response schemas
    - _Requirements: 3.1, 3.6, 6.5, 6.6_

  - [x] 5.6 Write property test for building assignment updates (Property 12)
    - **Property 12: Building assignment update validation**
    - Create `apps/api/tests/property/tenant-scope.property.test.ts` (extend)
    - **Validates: Requirements 6.6, 6.7**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Admin user management service and routes
  - [x] 7.1 Create AdminUserService
    - Create `apps/api/src/services/admin-user.ts`
    - Implement `listUsers(params: { page, pageSize, role? })`: paginated (max 50 per page), filtered by role, sorted by creation date descending
    - Implement `deactivateUser(actorId, targetUserId)`: set `isActive=false`, set `deactivatedAt`, invalidate all sessions in DB, log to audit. Reject if target is superadmin (403).
    - Implement `getDashboardStats()`: count users by role, count pending approvals, count active sessions (not expired per 7-day policy)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 7.3, 7.5_

  - [x] 7.2 Write property test for user deactivation (Property 13)
    - **Property 13: User deactivation invalidates all sessions**
    - Create `apps/api/tests/property/user-deactivation.property.test.ts` using fast-check
    - **Validates: Requirements 4.4**

  - [x] 7.3 Create admin user management routes
    - Create `apps/api/src/routes/admin/users.ts`
    - `GET /api/admin/users` — List all users with role filter and pagination (superadmin only)
    - `PUT /api/admin/users/:id/deactivate` — Deactivate a user (superadmin only)
    - Use `preHandler: [authGuard, roleGuard(['superadmin'])]`
    - Define Zod request/response schemas
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [x] 7.4 Create admin dashboard route
    - Create `apps/api/src/routes/admin/dashboard.ts`
    - `GET /api/admin/dashboard` — Platform statistics (superadmin only)
    - Return: usersByRole counts, pendingApprovals count, activeSessions count
    - Handle database errors gracefully (return 500 with "Dashboard data is temporarily unavailable")
    - Use `preHandler: [authGuard, roleGuard(['superadmin'])]`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Integration and wiring
  - [x] 8.1 Register new routes in app.ts
    - Register admin owner routes at `/api/admin/owners`
    - Register admin user routes at `/api/admin/users`
    - Register admin dashboard route at `/api/admin/dashboard`
    - Register manager routes at `/api/managers`
    - Add `Admin` and `Managers` tags to OpenAPI spec configuration
    - _Requirements: 2.5, 2.6, 4.1, 7.1, 3.1, 6.5_

  - [x] 8.2 Apply approval guard to existing resource routes
    - Add `approvalGuard` to preHandler arrays in: buildings, flats, renters, bills, payments, deposits, maintenance, issues, notices routes
    - Ensure the middleware order is: `authGuard → roleGuard → approvalGuard → tenantScope`
    - _Requirements: 2.2, 5.4_

  - [x] 8.3 Update owner registration flow to set pending approval status
    - Modify the registration route/service to set `approvalStatus = 'pending'` when a new user registers with the `owner` role
    - Ensure non-owner roles (manager, renter) do not get an approval status set
    - _Requirements: 2.1_

  - [x] 8.4 Write integration tests for end-to-end flows
    - Test: register owner → pending → approve → access granted
    - Test: manager creation → login with temp password → access assigned buildings only
    - Test: deactivation → session invalidation → login rejected
    - Test: non-superadmin cannot access admin endpoints
    - _Requirements: 2.1, 2.3, 3.1, 4.4, 4.7, 7.4_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation uses TypeScript
- Existing patterns (service classes, Zod schemas, preHandler middleware arrays) are followed consistently
- The `fast-check` library is used for property-based testing alongside Vitest

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6"] },
    { "id": 3, "tasks": ["2.3", "2.5", "2.7", "5.1"] },
    { "id": 4, "tasks": ["4.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.4", "5.5"] },
    { "id": 6, "tasks": ["4.4", "5.6", "7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 9, "tasks": ["8.4"] }
  ]
}
```
