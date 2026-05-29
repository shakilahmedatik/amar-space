# Design Document: API Documentation (OpenAPI + Scalar UI)

## Overview

This feature adds OpenAPI 3.1 spec generation and an interactive Scalar UI to the AmarSpace API. The implementation uses `@fastify/swagger` to auto-generate the spec from existing Fastify route definitions and Zod schemas, and `@scalar/fastify-api-reference` to serve the interactive UI at `/api/docs`.

No new architectural layers are introduced. Changes are confined to:
- `apps/api/package.json` — two new dependencies
- `apps/api/src/app.ts` — register two new plugins
- `apps/api/src/routes/*.ts` — add OpenAPI metadata (tags, summary, description, security, response schemas) to each route

---

## Package Choices

| Package | Version | Purpose |
|---|---|---|
| `@fastify/swagger` | `^9.x` | Generates OpenAPI 3.1 spec from Fastify route schemas |
| `@scalar/fastify-api-reference` | `^1.x` | Serves the Scalar interactive UI |

`@fastify/swagger` integrates natively with `fastify-type-provider-zod` — Zod schemas are automatically converted to JSON Schema / OpenAPI objects via the existing `serializerCompiler` / `validatorCompiler` setup. No additional Zod-to-OpenAPI transformer is needed.

---

## Plugin Registration Order

`@fastify/swagger` **must** be registered before any route plugins. `@scalar/fastify-api-reference` must be registered after swagger. Both go into `app.ts` after the existing utility plugins (env, db, auth, audit-logger, r2) but before the route registrations.

```typescript
// app.ts — plugin registration order

// 1. Existing utility plugins (unchanged)
app.register(import('./plugins/env'))
app.register(import('./plugins/db'))
app.register(import('./plugins/auth'))
app.register(import('./plugins/audit-logger'))
app.register(import('./plugins/r2'))

// 2. NEW: OpenAPI spec generation (must be before routes)
app.register(import('@fastify/swagger'), {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'AmarSpace API',
      version: '1.0.0',
      description: 'Property management API for AmarSpace — handles buildings, flats, renters, billing, payments, deposits, maintenance, issues, notices, and audit logs.',
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Bearer token obtained from POST /api/auth/sign-in/email or POST /api/register.',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Session cookie set automatically by Better Auth on sign-in.',
        },
      },
    },
    tags: [
      { name: 'Health', description: 'Service health and readiness checks' },
      { name: 'Authentication', description: 'User registration, sign-in, sign-out, and session management' },
      { name: 'Users', description: 'User role assignment' },
      { name: 'Buildings', description: 'Building management (create, list, update)' },
      { name: 'Flats', description: 'Flat management including status transitions' },
      { name: 'Renters', description: 'Renter registration and profile management' },
      { name: 'Bills', description: 'Monthly bill generation, line items, and status tracking' },
      { name: 'Payments', description: 'Payment recording and receipt retrieval' },
      { name: 'Deposits', description: 'Advance deposit balance and adjustment history' },
      { name: 'Maintenance', description: 'Maintenance request lifecycle and comments' },
      { name: 'Issues', description: 'Building-level issue tracking and assignment' },
      { name: 'Notices', description: 'Notice board with pinning and audience targeting' },
      { name: 'Settings', description: 'User profile and language preference settings' },
      { name: 'Audit', description: 'Immutable audit log query interface' },
      { name: 'Dashboard', description: 'Role-specific summary dashboards' },
    ],
  },
})

// 3. NEW: Scalar interactive UI (after swagger, before routes)
app.register(import('@scalar/fastify-api-reference'), {
  routePrefix: '/api/docs',
  configuration: {
    spec: { url: '/api/openapi.json' },
    title: 'AmarSpace API Reference',
  },
})

// 4. Existing route registrations (unchanged)
app.register(import('./routes/health'), { prefix: '/api/health' })
// ... rest of routes
```

---

## Route Annotation Strategy

Each route file gets OpenAPI metadata added to its `schema` object. The pattern is consistent across all routes:

```typescript
fastify.get('/', {
  schema: {
    tags: ['Buildings'],
    summary: 'List buildings',
    description: 'Returns a paginated list of buildings. **Roles: owner, manager**',
    security: [{ BearerAuth: [] }, { CookieAuth: [] }],
    querystring: z.object({ ... }), // existing — unchanged
    response: {
      200: z.object({ ... }),       // NEW: success response schema
      401: errorResponseSchema,     // NEW: auth error
      403: errorResponseSchema,     // NEW: role error (if roleGuard used)
    },
  },
  preHandler: [...],
}, handler)
```

### Shared Error Response Schema

A shared Zod schema for error responses is defined once and reused across all routes:

```typescript
// In app.ts or a shared lib file
import { z } from 'zod'

export const errorResponseSchema = z.object({
  requestId: z.string(),
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
})
```

---

## Route Groups — Annotation Summary

### Health (`/api/health`)
- Tag: `Health`
- No auth required — no `security` field
- Response: `200` (ok/degraded status object), `503` (degraded)

### Authentication (`/api/auth`, `/api/register`)
- Tag: `Authentication`
- **Special case**: `/api/auth/*` is a catch-all delegated to Better Auth. Fastify's schema system doesn't apply. These routes are documented using `@fastify/swagger`'s manual path injection via the `transform` hook or by adding explicit `hide: false` schema stubs.
- `/api/register` uses Zod body schema — annotated normally
- Auth routes documented: sign-up, sign-in, sign-out, get-session

### Users (`/api/users`)
- Tag: `Users`
- `PUT /api/users/:id/role` — Roles: owner
- Security: BearerAuth / CookieAuth

### Buildings (`/api/buildings`)
- Tag: `Buildings`
- GET list — Roles: owner, manager
- POST create — Roles: owner
- GET by ID — Roles: owner, manager
- PUT update — Roles: owner

### Flats (`/api/flats`)
- Tag: `Flats`
- GET list — Roles: owner, manager
- POST create — Roles: owner
- GET by ID — Roles: owner, manager
- PUT update — Roles: owner
- DELETE — Roles: owner
- PUT status — Roles: owner, manager

### Renters (`/api/renters`)
- Tag: `Renters`
- **Special case**: `POST /api/renters` uses multipart form data (no Zod body schema). Document with `consumes: ['multipart/form-data']` and a manual schema describing the form fields and file uploads.
- GET list — Roles: owner, manager
- GET by ID — Roles: owner, manager

### Bills (`/api/bills`)
- Tag: `Bills`
- GET list — Roles: owner, manager, renter
- POST generate — Roles: owner, manager
- GET by ID — Roles: owner, manager, renter
- POST charges — Roles: owner, manager

### Payments (`/api/payments`)
- Tag: `Payments`
- GET list — Roles: owner, manager, renter
- POST record — Roles: owner, manager
- GET by ID — Roles: owner, manager, renter

### Deposits (`/api/deposits`)
- Tag: `Deposits`
- GET balance — Roles: owner, manager, renter
- POST adjust — Roles: owner
- GET history — Roles: owner, manager, renter

### Maintenance (`/api/maintenance`)
- Tag: `Maintenance`
- GET list — Roles: owner, manager, renter
- POST create — Roles: renter
- GET by ID — Roles: owner, manager, renter
- PUT status — Roles: owner, manager
- POST comment — Roles: owner, manager, renter

### Issues (`/api/issues`)
- Tag: `Issues`
- GET list — Roles: owner, manager
- POST create — Roles: owner, manager
- GET by ID — Roles: owner, manager
- PUT status — Roles: owner, manager
- PUT assign — Roles: owner, manager

### Notices (`/api/notices`)
- Tag: `Notices`
- GET list — Roles: owner, manager, renter
- POST create — Roles: owner, manager
- GET by ID — Roles: owner, manager, renter
- PUT update — Roles: owner, manager
- DELETE — Roles: owner, manager
- PUT pin — Roles: owner, manager

### Settings (`/api/settings`)
- Tag: `Settings`
- PUT language — All authenticated users
- GET profile — All authenticated users

### Audit (`/api/audit`)
- Tag: `Audit`
- GET list — Roles: owner, manager

### Dashboard (`/api/dashboard`)
- Tag: `Dashboard`
- GET /owner — Roles: owner
- GET /manager — Roles: manager
- GET /renter — Roles: renter

---

## Special Cases

### Auth Catch-All Routes (`/api/auth/*`)

The auth routes delegate to Better Auth's internal handler via a `fastify.all('/*', ...)` catch-all. Fastify's schema system doesn't process these routes automatically.

**Solution**: Add explicit `hide: false` schema stubs for the four documented auth endpoints directly in `auth.ts`, using `fastify.route()` with `method`, `url`, `schema`, and a handler that delegates to the existing catch-all logic. Alternatively, use `@fastify/swagger`'s `transform` option to inject manual path definitions.

The simpler approach: add four explicit route definitions with schemas alongside the existing catch-all, each with `hide: false` and a schema that documents the endpoint. The catch-all continues to handle actual requests.

### Multipart Route (`POST /api/renters`)

This route uses `@fastify/multipart` and parses parts manually — no Zod body schema. Document it with:

```typescript
schema: {
  tags: ['Renters'],
  summary: 'Register a new renter',
  description: 'Registers a renter with profile data and optional file uploads (NID photo, digital signature). **Roles: owner, manager**\n\nContent-Type: multipart/form-data',
  security: [{ BearerAuth: [] }, { CookieAuth: [] }],
  consumes: ['multipart/form-data'],
  body: {
    type: 'object',
    properties: {
      fullName: { type: 'string' },
      phone: { type: 'string' },
      nidNumber: { type: 'string' },
      // ... other fields
      nidPhoto: { type: 'string', format: 'binary', description: 'NID photo file' },
      digitalSignature: { type: 'string', format: 'binary', description: 'Digital signature file' },
    },
    required: ['fullName', 'phone', 'nidNumber', 'flatId', 'monthlyRent', 'startDate'],
  },
}
```

---

## File Change List

| File | Change |
|---|---|
| `apps/api/package.json` | Add `@fastify/swagger` and `@scalar/fastify-api-reference` |
| `apps/api/src/app.ts` | Register swagger and scalar plugins; define shared error schema |
| `apps/api/src/routes/health.ts` | Add tags, summary, description, response schemas |
| `apps/api/src/routes/auth.ts` | Add explicit schema stubs for 4 auth endpoints |
| `apps/api/src/routes/register.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/roles.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/buildings.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/flats.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/renters.ts` | Add tags, summary, description, security, multipart body schema |
| `apps/api/src/routes/bills.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/payments.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/deposits.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/maintenance.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/issues.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/notices.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/settings.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/audit.ts` | Add tags, summary, description, security, response schemas |
| `apps/api/src/routes/dashboard.ts` | Add tags, summary, description, security, response schemas |

---

## Spec Endpoint

`@fastify/swagger` automatically exposes the generated spec at `/api/openapi.json` when configured with `routePrefix: '/api'` (or via the default swagger route). The Scalar UI is configured to load from this URL.

Both endpoints are public — no `preHandler` auth guards are applied to them.
