# Implementation Plan: AmarSpace Infrastructure Setup

## Overview

This plan implements the foundational infrastructure for AmarSpace — a property management platform built as a Turborepo monorepo. Tasks are ordered to establish shared packages first, then the backend API, authentication, audit logging, Docker containerization, and finally integration wiring. Each task builds incrementally on previous steps.

## Tasks

- [x] 1. Set up the `packages/db` shared package
  - [x] 1.1 Create `packages/db` package structure and configuration
    - Create `packages/db/package.json` with `@repo/db` name, exports map (`.`, `./schema`, `./client`, `./migrate`), and exact-pinned dependencies: `drizzle-orm`, `@neondatabase/serverless`, `zod`
    - Create `packages/db/tsconfig.json` extending `@repo/typescript-config` with `strict: true`, `declaration: true`, `declarationMap: true`
    - Create `packages/db/drizzle.config.ts` with PostgreSQL dialect, schema path, migrations output directory, strict and verbose mode
    - Create `packages/db/src/index.ts` barrel export file
    - _Requirements: 3.2, 3.3, 4.1, 4.2, 9.1, 9.6_

  - [x] 1.2 Implement Drizzle schema definitions
    - Create `packages/db/src/schema/users.ts` with users table (id, email, name, hashedPassword, emailVerified, createdAt, updatedAt)
    - Create `packages/db/src/schema/sessions.ts` with sessions table (id, userId FK, token, expiresAt, ipAddress, userAgent, createdAt)
    - Create `packages/db/src/schema/login-attempts.ts` with login_attempts table (id, email, success, ipAddress, attemptedAt)
    - Create `packages/db/src/schema/audit-logs.ts` with audit_logs table including indexes on entityType, actorUserId, and createdAt
    - Create `packages/db/src/schema/index.ts` barrel export for all schemas
    - _Requirements: 3.2, 5.3, 7.2, 7.8_

  - [x] 1.3 Implement database client and connection configuration
    - Create `packages/db/src/client.ts` with `createDbClient` function using Neon serverless driver
    - Configure connection pooling with max 10 connections, 30s idle timeout, 10s connection timeout from environment variables
    - Implement connection validation on checkout
    - Export `Database` type for consumers
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 1.4 Implement migration utilities and seed script
    - Create `packages/db/src/migrate.ts` with migration runner that applies pending migrations
    - Create `packages/db/src/seed.ts` with idempotent seed function using `onConflictDoNothing`
    - Add `db:generate`, `db:migrate`, `db:seed` scripts to `packages/db/package.json`
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 1.5 Write property test for seed script idempotence
    - **Property 3: Seed Script Idempotence**
    - Create `packages/db/tests/properties/seed.test.ts`
    - Verify that running seed N times produces same row count and content as running once
    - **Validates: Requirements 4.4**

- [x] 2. Set up the `apps/api` Fastify backend application
  - [x] 2.1 Create `apps/api` package structure and core configuration
    - Create `apps/api/package.json` with exact-pinned dependencies: `fastify`, `fastify-type-provider-zod`, `zod`, `better-auth`, `@repo/db`
    - Create `apps/api/tsconfig.json` extending `@repo/typescript-config` with strict mode
    - Create directory structure: `src/`, `src/plugins/`, `src/routes/`, `src/middleware/`, `src/lib/`, `tests/unit/`, `tests/properties/`, `tests/integration/`
    - Add `dev`, `build`, `start`, `test`, `test:unit`, `test:properties`, `test:integration` scripts
    - Install and configure Vitest with `vitest.config.ts`
    - _Requirements: 2.1, 2.2, 10.2_

  - [x] 2.2 Implement environment validation plugin
    - Create `apps/api/src/plugins/env.ts` with Zod schema validating DATABASE_URL, AUTH_SECRET (min 32 chars), AUTH_BASE_URL, DB_POOL_SIZE, DB_IDLE_TIMEOUT, DB_CONNECTION_TIMEOUT, NODE_ENV
    - Implement startup validation that logs missing/invalid variables to stderr and exits with non-zero code
    - Register as Fastify plugin that decorates the app instance with validated env
    - _Requirements: 8.3, 8.5, 8.6_

  - [ ]* 2.3 Write property test for environment validation completeness
    - **Property 10: Environment Validation Completeness**
    - Create `apps/api/tests/properties/env.test.ts`
    - Generate random env var sets (present/missing/malformed) and verify correct startup/failure behavior
    - Verify application-level values override root-level values
    - **Validates: Requirements 8.1, 8.3, 8.5, 8.6**

  - [x] 2.4 Implement Fastify app factory and global error handler
    - Create `apps/api/src/app.ts` with `buildApp` function using `ZodTypeProvider`
    - Implement global error handler that sanitizes 500 errors (no stack traces, file paths, DB URLs)
    - Transform Zod validation errors into structured `{ statusCode, error, message, details: FieldError[] }` format
    - Handle known operational errors (4xx) with consistent response structure
    - _Requirements: 2.4, 2.6, 2.7, 2.8_

  - [ ]* 2.5 Write property test for request validation correctness
    - **Property 1: Request Validation Correctness**
    - Create `apps/api/tests/properties/validation.test.ts`
    - Generate random payloads against Zod schemas; verify conforming payloads invoke handler, non-conforming return 400 with field-level errors
    - **Validates: Requirements 2.6, 2.7**

  - [ ]* 2.6 Write property test for error response sanitization
    - **Property 2: Error Response Sanitization**
    - Create `apps/api/tests/properties/error-handling.test.ts`
    - Generate random Error objects with stack traces, file paths, DB URLs; verify 500 responses contain only generic message
    - **Validates: Requirements 2.8**

  - [x] 2.7 Implement Vercel serverless entry point
    - Create `apps/api/src/index.ts` as the Vercel serverless handler
    - Export default async handler that builds the app, calls `app.ready()`, and delegates to `app.fetch()`
    - Ensure stateless request handling within 10s execution limit
    - _Requirements: 2.2, 2.3_

- [x] 3. Checkpoint - Core packages verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement authentication system
  - [x] 4.1 Implement Better Auth plugin
    - Create `apps/api/src/plugins/auth.ts` with `createAuth` function using Better Auth with Drizzle adapter
    - Configure email/password authentication, 7-day session expiry, daily session refresh
    - Configure rate limiting: 5 max attempts per 15-minute window
    - Register as Fastify plugin that decorates app with auth instance
    - _Requirements: 5.1, 5.2, 5.3, 5.8_

  - [x] 4.2 Implement auth route handlers
    - Create `apps/api/src/routes/auth.ts` with sign-up, sign-in, sign-out, and session retrieval endpoints
    - Implement generic error responses that don't reveal whether email or password was incorrect
    - Implement session token creation on successful authentication
    - Implement session invalidation on sign-out
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.9_

  - [ ]* 4.3 Write property test for authentication error opacity
    - **Property 4: Authentication Error Opacity**
    - Create `apps/api/tests/properties/auth.test.ts`
    - Generate random email/password combinations for non-existent emails and wrong passwords; verify identical error responses
    - **Validates: Requirements 5.6**

  - [ ]* 4.4 Write property test for rate limiting enforcement
    - **Property 5: Rate Limiting Enforcement**
    - In `apps/api/tests/properties/auth.test.ts`
    - Verify that after 5 consecutive failures for any email, subsequent attempts are rejected for 15 minutes regardless of credential validity
    - **Validates: Requirements 5.8**

  - [ ]* 4.5 Write property test for session token validation
    - **Property 6: Session Token Validation**
    - In `apps/api/tests/properties/auth.test.ts`
    - Generate random/expired/malformed tokens; verify all are rejected and grant no access to protected resources
    - **Validates: Requirements 5.9**

- [x] 5. Implement audit log system
  - [x] 5.1 Implement audit logger plugin
    - Create `apps/api/src/plugins/audit.ts` with `AuditLogger` class
    - Implement async log writing with in-memory retry queue (exponential backoff, max 3 retries)
    - Ensure audit log failures don't block primary action completion
    - Validate entityType ≤ 100 chars, action ≤ 100 chars, JSON values ≤ 10KB
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8_

  - [x] 5.2 Implement audit log query endpoint with RBAC
    - Create `apps/api/src/routes/audit.ts` with paginated query endpoint
    - Implement Owner role: access to all entries, max 100 per page
    - Implement Manager role: access restricted to entries for assigned properties, max 100 per page
    - Deny access for users without Owner or Manager role with permissions error
    - _Requirements: 7.5, 7.6, 7.7_

  - [ ]* 5.3 Write property test for audit log entry integrity
    - **Property 7: Audit Log Entry Integrity**
    - Create `apps/api/tests/properties/audit.test.ts`
    - Generate random audit entry data and JSON values ≤ 10KB; verify all required fields present and JSON round-trips correctly
    - **Validates: Requirements 7.2, 7.8**

  - [ ]* 5.4 Write property test for audit log fault tolerance
    - **Property 8: Audit Log Fault Tolerance**
    - In `apps/api/tests/properties/audit.test.ts`
    - Mock DB failures during audit writes; verify primary action still completes successfully
    - **Validates: Requirements 7.4**

  - [ ]* 5.5 Write property test for audit log RBAC
    - **Property 9: Audit Log Role-Based Access Control**
    - In `apps/api/tests/properties/audit.test.ts`
    - Generate random users/roles/properties; verify Owner sees all, Manager sees only assigned, others get denied, pagination ≤ 100
    - **Validates: Requirements 7.5, 7.6, 7.7**

- [x] 6. Checkpoint - Auth and audit verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Set up Docker containerization
  - [ ] 7.1 Create Dockerfiles for web and api applications
    - Create `apps/web/Dockerfile` with multi-stage build: deps install → build → production runtime (Node.js 22 Alpine)
    - Create `apps/api/Dockerfile` with multi-stage build: deps install → build → production runtime (Node.js 22 Alpine)
    - Optimize layer caching by copying package.json/lockfile first
    - _Requirements: 6.1, 6.2_

  - [ ] 7.2 Create docker-compose configuration
    - Create `docker-compose.yml` at repo root with services: db (PostgreSQL 16 Alpine), api, web
    - Configure db with named volume `pgdata`, health check using `pg_isready`
    - Configure service startup order: db → api → web using `depends_on` with health check conditions
    - Expose ports: web=3000, api=3001, db=5432
    - Reference `.env` file via `env_file` directive
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ] 7.3 Create docker-compose override and nginx configuration
    - Create `docker-compose.override.yml` with dev overrides: volume mounts for hot-reloading, use node:22-alpine image directly
    - Create `docker/nginx/default.conf` with reverse proxy configuration for web and api services
    - _Requirements: 6.8, 6.9_

- [ ] 8. Set up environment configuration and health endpoint
  - [ ] 8.1 Create environment configuration files
    - Create `.env.example` at repo root with all required variables (DATABASE_URL, AUTH_SECRET, AUTH_BASE_URL, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, etc.) with placeholder values and inline comments
    - Create `apps/api/.env.example` with API-specific variables
    - Create `apps/web/.env.example` with frontend-specific variables
    - Update `.gitignore` to exclude `.env` files while keeping `.env.example` tracked
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 8.2 Implement health check route
    - Create `apps/api/src/routes/health.ts` with `/api/health` endpoint
    - Return service status, database connectivity check, and uptime
    - Register the health route in the Fastify app factory (`src/app.ts`)
    - Use for Docker health check and monitoring
    - _Requirements: 2.2, 6.6_

- [ ] 9. Wire monorepo integration and update Turborepo configuration
  - [ ] 9.1 Update root Turborepo and workspace configuration
    - Update `turbo.json` to include `apps/api` build outputs (`dist/**`) in the `build` task outputs array
    - Ensure `packages/db` is in the Turborepo task dependency graph (builds before dependents)
    - Verify workspace references resolve correctly between `apps/api` → `@repo/db`
    - Add `db:generate` and `db:migrate` tasks to turbo.json if needed
    - _Requirements: 1.5, 1.6, 9.5, 9.7_

  - [ ] 9.2 Configure shared TypeScript and lint settings for new packages
    - Ensure `packages/db/tsconfig.json` and `apps/api/tsconfig.json` extend shared configs correctly
    - Verify `declaration: true` and `declarationMap: true` in `packages/db` for type exports
    - Verify that importing unexported symbols from `@repo/db` produces TypeScript compilation errors
    - Run `turbo run check-types` to validate cross-workspace type resolution
    - _Requirements: 9.2, 9.3, 9.6, 9.8_

  - [ ]* 9.3 Write integration tests for monorepo wiring
    - Test that `apps/api` can import from `@repo/db` and resolve types correctly
    - Test that `turbo run build` completes successfully with correct dependency order
    - Test that `turbo run check-types` catches type errors across workspace boundaries
    - _Requirements: 9.5, 9.7, 9.8_

- [ ] 10. Final checkpoint - Full infrastructure verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout with strict mode enabled
- All dependencies should use exact versions (no caret/tilde ranges) per Requirement 10.9
- Vitest is the test runner; fast-check is used for property-based tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["7.1", "8.1"] },
    { "id": 1, "tasks": ["7.2", "8.2"] },
    { "id": 2, "tasks": ["7.3", "9.1"] },
    { "id": 3, "tasks": ["9.2"] },
    { "id": 4, "tasks": ["9.3"] }
  ]
}
```
