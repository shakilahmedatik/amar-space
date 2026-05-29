# Implementation Tasks: API Documentation (OpenAPI + Scalar UI)

## Task List

- [x] 1. Install dependencies and register plugins in app.ts
  - [x] 1.1 Install `@fastify/swagger` and `@scalar/fastify-api-reference` in `apps/api/package.json`
  - [x] 1.2 Register `@fastify/swagger` in `app.ts` before route registrations with OpenAPI 3.1 config, info, security schemes, and all 15 tags
  - [x] 1.3 Register `@scalar/fastify-api-reference` in `app.ts` after swagger with `routePrefix: '/api/docs'` pointing to `/api/openapi.json`
  - [x] 1.4 Define and export a shared `errorResponseSchema` Zod object in `app.ts` for reuse across route files

- [x] 2. Annotate health and register routes
  - [x] 2.1 Add OpenAPI metadata to `routes/health.ts`: tag `Health`, summary, description, 200/503 response schemas
  - [x] 2.2 Add OpenAPI metadata to `routes/register.ts`: tag `Authentication`, summary, description, security, 201/400/429 response schemas

- [x] 3. Annotate auth routes (special case)
  - [x] 3.1 Add explicit schema stubs in `routes/auth.ts` for `POST /sign-up/email`, `POST /sign-in/email`, `POST /sign-out`, `GET /get-session` with tag `Authentication`, summaries, descriptions, request body schemas, and response schemas — these sit alongside the existing catch-all handler

- [x] 4. Annotate user and building routes
  - [x] 4.1 Add OpenAPI metadata to `routes/roles.ts`: tag `Users`, summary, description, security, role annotation, 200/400/401/403 response schemas
  - [x] 4.2 Add OpenAPI metadata to all routes in `routes/buildings.ts`: tag `Buildings`, summaries, descriptions, security, role annotations, response schemas

- [x] 5. Annotate flat routes
  - [x] 5.1 Add OpenAPI metadata to all routes in `routes/flats.ts`: tag `Flats`, summaries, descriptions, security, role annotations, response schemas for all 6 endpoints including the status transition endpoint

- [x] 6. Annotate renter routes (multipart special case)
  - [x] 6.1 Add OpenAPI metadata to `GET /api/renters` and `GET /api/renters/:id` in `routes/renters.ts`: tag `Renters`, summaries, descriptions, security, role annotations, response schemas
  - [x] 6.2 Add multipart form-data schema to `POST /api/renters` in `routes/renters.ts`: `consumes: ['multipart/form-data']`, document all form fields and file upload fields (`nidPhoto`, `digitalSignature`) with `format: binary`

- [x] 7. Annotate billing and payment routes
  - [x] 7.1 Add OpenAPI metadata to all routes in `routes/bills.ts`: tag `Bills`, summaries, descriptions, security, role annotations, response schemas for all 4 endpoints
  - [x] 7.2 Add OpenAPI metadata to all routes in `routes/payments.ts`: tag `Payments`, summaries, descriptions, security, role annotations, response schemas for all 3 endpoints

- [x] 8. Annotate deposit, maintenance, and issue routes
  - [x] 8.1 Add OpenAPI metadata to all routes in `routes/deposits.ts`: tag `Deposits`, summaries, descriptions, security, role annotations, response schemas for all 3 endpoints
  - [x] 8.2 Add OpenAPI metadata to all routes in `routes/maintenance.ts`: tag `Maintenance`, summaries, descriptions, security, role annotations, response schemas for all 5 endpoints
  - [x] 8.3 Add OpenAPI metadata to all routes in `routes/issues.ts`: tag `Issues`, summaries, descriptions, security, role annotations, response schemas for all 5 endpoints

- [x] 9. Annotate notice, settings, audit, and dashboard routes
  - [x] 9.1 Add OpenAPI metadata to all routes in `routes/notices.ts`: tag `Notices`, summaries, descriptions, security, role annotations, response schemas for all 6 endpoints
  - [x] 9.2 Add OpenAPI metadata to all routes in `routes/settings.ts`: tag `Settings`, summaries, descriptions, security, response schemas for both endpoints
  - [x] 9.3 Add OpenAPI metadata to `routes/audit.ts`: tag `Audit`, summary, description, security, role annotation, response schemas
  - [x] 9.4 Add OpenAPI metadata to all routes in `routes/dashboard.ts`: tag `Dashboard`, summaries, descriptions, security, role annotations, response schemas for all 3 dashboard endpoints

- [x] 10. Verify and validate
  - [x] 10.1 Run `bun run build` in `apps/api` to confirm TypeScript compiles without errors after all changes
  - [x] 10.2 Start the dev server and verify `GET /api/openapi.json` returns a valid OpenAPI 3.1 JSON document with a non-empty `paths` object
  - [x] 10.3 Verify `GET /api/docs` returns the Scalar UI HTML page and all 15 tags are visible in the sidebar
  - [x] 10.4 Test authentication flow in Scalar UI: sign in via `POST /api/auth/sign-in/email`, copy the token, set it as Bearer auth, and successfully call a protected endpoint like `GET /api/buildings`
