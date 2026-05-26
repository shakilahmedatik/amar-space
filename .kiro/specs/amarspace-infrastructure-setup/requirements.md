# Requirements Document

## Introduction

AmarSpace is a property management platform targeting Bangladeshi property owners and managers. This document defines the infrastructure and core architecture requirements for the initial setup, covering the monorepo structure, backend API framework, database layer, authentication, containerization, and foundational systems like audit logging and database migrations. The platform prioritizes simplicity, Bangla-first UX, mobile-first usability, and future SaaS scalability.

## Glossary

- **Monorepo**: A single repository containing multiple applications and shared packages, managed by Turborepo
- **Backend_API**: The Fastify-based REST API application deployed on Vercel serverless functions
- **Frontend_App**: The Next.js 16 web application serving the user interface
- **Database_Layer**: The PostgreSQL database accessed through Drizzle ORM
- **Auth_System**: The authentication system powered by Better Auth
- **Migration_System**: The Drizzle-based database migration tooling for schema changes
- **Docker_Setup**: The containerization configuration including Dockerfiles and docker-compose
- **Audit_Logger**: The system component responsible for recording trackable actions
- **Build_System**: The Turborepo-based build and task orchestration pipeline
- **Shared_Package**: Reusable code packages shared across applications within the monorepo

## Requirements

### Requirement 1: Monorepo Structure

**User Story:** As a developer, I want a well-organized Turborepo monorepo structure, so that I can manage multiple applications and shared packages efficiently with clear boundaries.

#### Acceptance Criteria

1. THE Build_System SHALL organize the codebase into an `apps/` directory for applications and a `packages/` directory for shared code, with both directories registered as workspace globs in the root `package.json`
2. THE Build_System SHALL include a `apps/web` workspace for the Next.js 16 frontend application and a `apps/docs` workspace for the documentation application
3. THE Build_System SHALL include a `apps/api` workspace for the Fastify backend application
4. THE Build_System SHALL include shared packages under the `@repo` scope: `@repo/typescript-config` for TypeScript configuration and `@repo/eslint-config` for ESLint configuration
5. THE Build_System SHALL use Bun as the package manager with workspace support, and each workspace SHALL reference shared packages using the `@repo/*` scope identifier
6. THE Build_System SHALL configure Turborepo task pipelines for `build`, `dev`, `lint`, and `check-types` commands, where `build` depends on upstream workspace builds (`^build`) and caches `.next` output, `dev` runs persistently without caching, and `lint` and `check-types` depend on their upstream workspace counterparts

### Requirement 2: Backend API Framework

**User Story:** As a developer, I want a Fastify-based REST API that runs on Vercel serverless, so that I can build stateless, performant endpoints without managing server infrastructure.

#### Acceptance Criteria

1. THE Backend_API SHALL use Fastify as the HTTP framework with TypeScript strict mode enabled
2. THE Backend_API SHALL be designed for Vercel serverless deployment with stateless request handling
3. THE Backend_API SHALL ensure all route handlers complete execution within 10 seconds to remain within Vercel serverless function time limits
4. THE Backend_API SHALL include request validation middleware using a schema-based validation library
5. THE Backend_API SHALL use middleware that adds no more than 500ms to cold-start initialization time
6. WHEN a request is received, THE Backend_API SHALL validate the request payload against a defined schema before processing the route handler logic
7. IF a request fails validation, THEN THE Backend_API SHALL return an HTTP 400 response containing a structured error object that includes an array of field-level error details, where each entry identifies the field name and the validation rule that failed
8. IF an unexpected error occurs during request processing, THEN THE Backend_API SHALL return an HTTP 500 response with a structured error object that does not expose internal implementation details

### Requirement 3: Database Layer Setup

**User Story:** As a developer, I want a PostgreSQL database with Drizzle ORM integration, so that I can define type-safe schemas and query the database with full TypeScript support.

#### Acceptance Criteria

1. THE Database_Layer SHALL use PostgreSQL as the primary database
2. THE Database_Layer SHALL use Drizzle ORM for schema definition and query building with strict TypeScript types
3. THE Database_Layer SHALL define schemas in a `packages/db` shared workspace package importable by the Backend_API via workspace references
4. THE Database_Layer SHALL use connection pooling configured with a maximum of 10 connections per serverless instance and an idle connection timeout of no more than 30 seconds
5. THE Database_Layer SHALL include a database client configuration that reads the database connection URL, pool size, and connection timeout from environment variables
6. IF the database is unreachable or a connection attempt fails, THEN THE Database_Layer SHALL return an error indicating the connection failure within 10 seconds without crashing the serverless function
7. IF the connection pool is exhausted, THEN THE Database_Layer SHALL queue the request and fail with a timeout error after no more than 5 seconds rather than creating unbounded connections
8. WHEN the Database_Layer establishes a connection, THE Database_Layer SHALL verify the connection is valid before returning it to the caller

### Requirement 4: Database Migration System

**User Story:** As a developer, I want a safe and repeatable database migration workflow, so that I can evolve the schema without risking data loss in production.

#### Acceptance Criteria

1. THE Migration_System SHALL use Drizzle Kit for generating and running migrations
2. THE Migration_System SHALL store migration files in version control within the `packages/db` directory alongside the schema definitions
3. THE Migration_System SHALL enforce a production-safe migration workflow where generated migrations contain only additive or non-destructive DDL operations (CREATE, ADD COLUMN, ALTER) by default, and destructive operations (DROP TABLE, DROP COLUMN, column type changes) require an explicit confirmation flag before generation
4. THE Migration_System SHALL include seed scripts for populating development databases with test data, and seed scripts SHALL be idempotent such that running them multiple times produces the same database state without duplicating records
5. THE Migration_System SHALL generate migration SQL files that can be reviewed before execution, separating the generation step from the apply step into distinct commands
6. WHEN a migration is generated, THE Migration_System SHALL produce a timestamped migration file containing raw SQL in the migrations directory within `packages/db`
7. IF a migration fails during execution, THEN THE Migration_System SHALL halt execution, report the specific migration file and error that caused the failure, and leave previously applied migrations in their completed state without rolling back the entire batch

### Requirement 5: Authentication System

**User Story:** As a developer, I want a Better Auth integration for user authentication, so that I can provide secure login and session management without building auth from scratch.

#### Acceptance Criteria

1. THE Auth_System SHALL use Better Auth as the authentication library with email and password as the credential-based authentication method
2. THE Auth_System SHALL support session-based authentication compatible with serverless deployment, with sessions expiring after 7 days of inactivity
3. THE Auth_System SHALL store user credentials and sessions in the PostgreSQL database
4. THE Auth_System SHALL expose sign-up, sign-in, sign-out, and session retrieval endpoints through the Backend_API
5. WHEN a user authenticates successfully, THE Auth_System SHALL create a session and return a session token that the client can use for subsequent authenticated requests
6. IF an authentication attempt fails, THEN THE Auth_System SHALL return a generic error response without revealing whether the email or password was incorrect
7. WHEN a user signs out, THE Auth_System SHALL invalidate the active session so that the session token can no longer be used for authenticated requests
8. IF a user fails authentication 5 consecutive times for the same email address, THEN THE Auth_System SHALL temporarily block further login attempts for that email for 15 minutes
9. WHEN a request includes an expired or invalid session token, THE Auth_System SHALL reject the request and return an error response indicating the session is invalid

### Requirement 6: Docker Containerization

**User Story:** As a developer, I want a complete Docker setup for the project, so that I can run the entire stack locally and prepare for future VPS deployment.

#### Acceptance Criteria

1. THE Docker_Setup SHALL include a Dockerfile for the Frontend_App at `apps/web/Dockerfile` that uses a multi-stage build with a dependency installation stage, a build stage, and a production runtime stage based on a Node.js 18+ base image
2. THE Docker_Setup SHALL include a Dockerfile for the Backend_API at `apps/api/Dockerfile` that uses a multi-stage build with a dependency installation stage, a build stage, and a production runtime stage based on a Node.js 18+ base image
3. THE Docker_Setup SHALL include a `docker-compose.yml` at the repository root that defines at minimum the following services: web (Frontend_App), api (Backend_API), and db (PostgreSQL)
4. THE Docker_Setup SHALL include a PostgreSQL service in the docker-compose configuration using PostgreSQL version 15 or higher with a named volume for data persistence
5. THE Docker_Setup SHALL support environment variable injection by referencing an `env_file` directive in docker-compose that loads variables from a `.env` file located at the repository root
6. WHEN `docker-compose up` is executed, THE Docker_Setup SHALL start the db service first, then the api service after db is healthy, and then the web service after api is healthy, using `depends_on` with health check conditions
7. THE Docker_Setup SHALL expose the Frontend_App on host port 3000, the Backend_API on host port 3001, and PostgreSQL on host port 5432
8. THE Docker_Setup SHALL include an nginx configuration directory at `docker/nginx/` containing at minimum a default configuration file for future reverse proxy setup
9. THE Docker_Setup SHALL provide separate docker-compose override files where `docker-compose.yml` defines the production configuration and `docker-compose.override.yml` defines local development overrides including volume mounts for source code hot-reloading

### Requirement 7: Audit Log System

**User Story:** As a property owner, I want all significant actions tracked in an audit log, so that I can maintain accountability and review operational history.

#### Acceptance Criteria

1. THE Audit_Logger SHALL record actions including user login, flat creation, renter approval, payment updates, bill modifications, maintenance updates, issue status changes, role changes, notice creation, and contract changes
2. THE Audit_Logger SHALL store the following fields for each log entry: actor user ID, entity type (maximum 100 characters), entity ID, action performed (maximum 100 characters), old value (JSON, maximum 10KB), new value (JSON, maximum 10KB), IP address, user agent, and creation timestamp
3. WHEN a trackable action occurs, THE Audit_Logger SHALL create an audit log entry before the response is sent to the client
4. IF the audit log write fails during a trackable action, THEN THE Audit_Logger SHALL still allow the primary action to complete and SHALL queue the failed log entry for retry
5. WHILE a user has the Owner role, THE Audit_Logger SHALL allow access to all audit log entries with paginated results returning a maximum of 100 entries per page
6. WHILE a user has the Manager role, THE Audit_Logger SHALL restrict access to audit log entries where the entity belongs to a property assigned to that manager, with paginated results returning a maximum of 100 entries per page
7. IF a user without the Owner or Manager role requests audit log access, THEN THE Audit_Logger SHALL deny the request and return an error response indicating insufficient permissions
8. THE Audit_Logger SHALL store old and new values as JSON to support any entity structure

### Requirement 8: Environment Configuration

**User Story:** As a developer, I want centralized environment variable management, so that I can configure different environments without code changes.

#### Acceptance Criteria

1. THE Build_System SHALL support `.env` files at the repository root and within individual application directories, where application-level variables override root-level variables of the same name
2. THE Build_System SHALL include a `.env.example` file at the repository root and within each application directory, listing every required environment variable with a placeholder value and a brief inline comment describing its purpose
3. WHEN the Backend_API starts, THE Backend_API SHALL validate that all required environment variables are present and non-empty within 5 seconds of process initialization
4. THE Build_System SHALL exclude `.env` files from version control through `.gitignore` rules while keeping `.env.example` files tracked
5. IF a required environment variable is missing or empty at startup, THEN THE Backend_API SHALL log each missing variable name to standard error and terminate the process with a non-zero exit code
6. IF a required environment variable contains a value that does not match its expected format, THEN THE Backend_API SHALL log an error message indicating the variable name and expected format, and terminate the process with a non-zero exit code

### Requirement 9: Shared Package Architecture

**User Story:** As a developer, I want shared packages for common code like validation schemas and types, so that I can maintain consistency between frontend and backend.

#### Acceptance Criteria

1. THE Shared_Package SHALL include a `packages/db` package containing Drizzle schema definitions, database connection configuration, and migration utility exports
2. THE Shared_Package SHALL include a `packages/typescript-config` package with base TypeScript configurations that extend a shared `base.json` with `strict: true` enabled
3. THE Shared_Package SHALL include a `packages/eslint-config` package with shared linting rules exportable via named entry points
4. THE Shared_Package SHALL include a `packages/ui` package for shared UI components built with shadcn/ui, where each component is individually importable via the package `exports` field
5. WHEN a consuming app declares a workspace dependency on a shared package, THE Build_System SHALL resolve the import using Bun workspace references and the package `exports` map without requiring manual path aliases
6. THE Shared_Package SHALL export TypeScript types with `declaration: true` and `declarationMap: true` enabled in the package's TypeScript configuration, so that consuming apps receive compile-time type errors for incorrect usage
7. WHEN the `packages/db` package is imported by a consuming app, THE Build_System SHALL include it in the Turborepo task dependency graph so that the db package builds before its dependents
8. IF a consuming app imports a symbol not listed in a shared package's `exports` field, THEN THE Build_System SHALL produce a TypeScript compilation error at build time

### Requirement 10: Technology Version Standards

**User Story:** As a developer, I want enforced technology version standards, so that the project uses modern, maintained, and compatible dependencies.

#### Acceptance Criteria

1. THE Build_System SHALL use Next.js with a minimum version of 16.x for the Frontend_App, pinned to an exact minor version in package.json
2. THE Build_System SHALL use Fastify for the Backend_API, pinned to an exact minor version that is no more than 2 minor versions behind the current stable release at the time of installation
3. THE Build_System SHALL use Drizzle ORM for the Database_Layer, pinned to an exact minor version that is no more than 2 minor versions behind the current stable release at the time of installation
4. THE Build_System SHALL use Better Auth for the Auth_System, pinned to an exact minor version that is no more than 2 minor versions behind the current stable release at the time of installation
5. THE Build_System SHALL use TanStack Query for server state management in the Frontend_App, pinned to an exact minor version that is no more than 2 minor versions behind the current stable release at the time of installation
6. THE Build_System SHALL use Tailwind CSS and shadcn/ui for styling the Frontend_App, with each pinned to an exact minor version in package.json
7. THE Build_System SHALL use only dependencies that have received at least one published release within the last 12 months and provide TypeScript type definitions either built-in or via DefinitelyTyped
8. IF a dependency has had no published release in the last 12 months or is marked as deprecated on its package registry, THEN THE Build_System SHALL flag it for replacement during the next scheduled dependency review
9. THE Build_System SHALL use exact versions (no caret or tilde ranges) for all direct production dependencies in package.json files across the monorepo
