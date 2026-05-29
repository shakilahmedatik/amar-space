# Requirements Document

## Introduction

This feature adds OpenAPI 3.1 specification generation and an interactive Scalar UI to the AmarSpace API. The API is built with Fastify 5 and TypeScript, uses `fastify-type-provider-zod` for Zod-based schema validation, and `better-auth` for session-based authentication. The documentation system will auto-generate an OpenAPI spec from existing route definitions and Zod schemas, serve an interactive Scalar UI at `/api/docs`, and document the Bearer token / session cookie authentication scheme so developers can authenticate and test all 16 route groups directly from the browser.

## Glossary

- **OpenAPI_Generator**: The `@fastify/swagger` plugin responsible for generating the OpenAPI 3.1 specification from Fastify route definitions and Zod schemas.
- **Scalar_UI**: The interactive API reference UI served by `@scalar/fastify-api-reference` at `/api/docs`.
- **Zod_Transformer**: The `fastify-zod-to-openapi` or built-in `fastify-type-provider-zod` JSON Schema transform that converts Zod schemas into OpenAPI-compatible JSON Schema objects.
- **Auth_Scheme**: The security scheme documenting both Bearer token (Authorization header) and session cookie (`better-auth.session_token`) authentication methods.
- **Route_Group**: One of the 16 logical groupings of API routes registered in `app.ts`.
- **Tag**: An OpenAPI tag used to group related endpoints in the Scalar UI.
- **Security_Requirement**: An OpenAPI `security` field on a route indicating which auth scheme(s) are required.
- **Spec_Endpoint**: The `GET /api/openapi.json` endpoint that serves the raw OpenAPI 3.1 JSON document.

## Requirements

### Requirement 1: OpenAPI Plugin Registration

**User Story:** As a developer, I want `@fastify/swagger` registered in the Fastify app, so that an OpenAPI 3.1 specification is automatically generated from existing route definitions and Zod schemas.

#### Acceptance Criteria

1. THE OpenAPI_Generator SHALL be registered as a Fastify plugin before any route plugins are registered in `app.ts`.
2. WHEN the Fastify app starts, THE OpenAPI_Generator SHALL produce an OpenAPI 3.1 document with `openapi: "3.1.0"`. IF the OpenAPI_Generator fails to initialise, THEN THE Fastify app SHALL log the error and continue starting without the OpenAPI spec.
3. THE OpenAPI_Generator SHALL set the document `info.title` to `"AmarSpace API"`, `info.version` to `"1.0.0"`, and `info.description` to a brief description of the API.
4. THE OpenAPI_Generator SHALL expose the generated spec at `GET /api/openapi.json`.
5. WHEN a route defines a Zod schema for `body`, `params`, `querystring`, or `response`, THE Zod_Transformer SHALL convert that schema into a valid OpenAPI JSON Schema object in the generated spec.
6. THE OpenAPI_Generator SHALL be configured with `mode: "dynamic"` so the spec is generated at runtime from live route registrations.
7. WHEN a route does not define any Zod schemas, THE OpenAPI_Generator SHALL still include that route in the generated spec using empty schema objects.

### Requirement 2: Scalar UI Registration

**User Story:** As a developer, I want an interactive Scalar UI served at `/api/docs`, so that I can browse, understand, and test all API endpoints from a browser.

#### Acceptance Criteria

1. THE Scalar_UI SHALL be registered as a Fastify plugin after the OpenAPI_Generator plugin.
2. WHEN a browser sends `GET /api/docs`, THE Scalar_UI SHALL respond with an HTML page rendering the Scalar interactive reference.
3. THE Scalar_UI SHALL be configured to load the OpenAPI spec from `/api/openapi.json`.
4. THE Scalar_UI SHALL be publicly accessible in all environments (development and production) without requiring authentication.
5. WHEN the Scalar_UI page loads, THE Scalar_UI SHALL display all route groups that are registered in the running API, organised by their OpenAPI tags.

### Requirement 3: Authentication Scheme Documentation

**User Story:** As a developer, I want the OpenAPI spec to document the Bearer token and session cookie authentication schemes, so that I can authenticate in the Scalar UI and test protected endpoints.

#### Acceptance Criteria

1. THE OpenAPI_Generator SHALL define a `BearerAuth` security scheme of type `http` with scheme `bearer` in the `components.securitySchemes` section.
2. THE OpenAPI_Generator SHALL define a `CookieAuth` security scheme of type `apiKey` with `in: cookie` and `name: better-auth.session_token` in the `components.securitySchemes` section.
3. WHEN a route uses the `authGuard` preHandler, THE OpenAPI_Generator SHALL include a `security` field on that route referencing `BearerAuth` or `CookieAuth`.
4. THE OpenAPI_Generator SHALL include a description on the `BearerAuth` scheme explaining that the token is obtained from `POST /api/auth/sign-in/email` or `POST /api/register`.
5. WHEN a user enters a Bearer token in the Scalar_UI authentication panel, THE Scalar_UI SHALL send the token as an `Authorization: Bearer <token>` header on subsequent test requests.

### Requirement 4: Route Tagging

**User Story:** As a developer, I want all routes grouped by logical domain tags in the Scalar UI, so that I can quickly navigate to the endpoints I need.

#### Acceptance Criteria

1. THE OpenAPI_Generator SHALL assign the tag `"Health"` to routes under `/api/health`.
2. THE OpenAPI_Generator SHALL assign the tag `"Authentication"` to routes under `/api/auth` and `/api/register`.
3. THE OpenAPI_Generator SHALL assign the tag `"Users"` to routes under `/api/users`.
4. THE OpenAPI_Generator SHALL assign the tag `"Buildings"` to routes under `/api/buildings`.
5. THE OpenAPI_Generator SHALL assign the tag `"Flats"` to routes under `/api/flats`.
6. THE OpenAPI_Generator SHALL assign the tag `"Renters"` to routes under `/api/renters`.
7. THE OpenAPI_Generator SHALL assign the tag `"Bills"` to routes under `/api/bills`.
8. THE OpenAPI_Generator SHALL assign the tag `"Payments"` to routes under `/api/payments`.
9. THE OpenAPI_Generator SHALL assign the tag `"Deposits"` to routes under `/api/deposits`.
10. THE OpenAPI_Generator SHALL assign the tag `"Maintenance"` to routes under `/api/maintenance`.
11. THE OpenAPI_Generator SHALL assign the tag `"Issues"` to routes under `/api/issues`.
12. THE OpenAPI_Generator SHALL assign the tag `"Notices"` to routes under `/api/notices`.
13. THE OpenAPI_Generator SHALL assign the tag `"Settings"` to routes under `/api/settings`.
14. THE OpenAPI_Generator SHALL assign the tag `"Audit"` to routes under `/api/audit`.
15. THE OpenAPI_Generator SHALL assign the tag `"Dashboard"` to routes under `/api/dashboard`.
16. THE OpenAPI_Generator SHALL define each tag with a human-readable description in the top-level `tags` array of the OpenAPI document.

### Requirement 5: Route Schema Annotation

**User Story:** As a developer, I want each route to have a summary and description in the OpenAPI spec, so that the Scalar UI displays meaningful information about each endpoint.

#### Acceptance Criteria

1. WHEN a route is registered in Fastify, THE OpenAPI_Generator SHALL include a `summary` field for that route in the generated spec.
2. WHEN a route is registered in Fastify, THE OpenAPI_Generator SHALL include a `description` field for that route in the generated spec.
3. WHEN a route defines a Zod `body` schema, THE OpenAPI_Generator SHALL include a `requestBody` object in the spec for that route with `content: application/json`.
4. WHEN a route defines a Zod `querystring` schema, THE OpenAPI_Generator SHALL include the query parameters in the `parameters` array for that route.
5. WHEN a route defines a Zod `params` schema, THE OpenAPI_Generator SHALL include the path parameters in the `parameters` array for that route.
6. THE OpenAPI_Generator SHALL document at minimum a `200` or `201` success response schema for each route.
7. THE OpenAPI_Generator SHALL document a `400` error response schema for routes that accept a request body or query parameters.
8. THE OpenAPI_Generator SHALL document a `401` error response schema for routes protected by `authGuard`.

### Requirement 6: Role-Based Access Documentation

**User Story:** As a developer, I want the OpenAPI spec to indicate which roles can access each endpoint, so that I understand the access control model without reading source code.

#### Acceptance Criteria

1. WHEN a route uses `roleGuard(['owner'])`, THE OpenAPI_Generator SHALL include `"Roles: owner"` in the route description.
2. WHEN a route uses `roleGuard(['owner', 'manager'])`, THE OpenAPI_Generator SHALL include `"Roles: owner, manager"` in the route description.
3. WHEN a route uses `roleGuard(['owner', 'manager', 'renter'])`, THE OpenAPI_Generator SHALL include `"Roles: owner, manager, renter"` in the route description.
4. THE OpenAPI_Generator SHALL document a `403` error response schema for routes that use `roleGuard`.

### Requirement 7: Spec Endpoint Accessibility

**User Story:** As a developer or CI tool, I want the raw OpenAPI JSON spec available at a stable URL, so that I can download it, lint it, or generate client SDKs from it.

#### Acceptance Criteria

1. THE Spec_Endpoint SHALL respond to `GET /api/openapi.json` with `Content-Type: application/json`.
2. THE Spec_Endpoint SHALL be publicly accessible without authentication in all environments.
3. WHEN the Fastify app is running, THE Spec_Endpoint SHALL return a valid OpenAPI 3.1 JSON document with a non-empty `paths` object.
4. IF the OpenAPI_Generator fails to initialise AND error logging succeeds, THEN THE Fastify app SHALL exit with a non-zero status code. IF error logging itself fails, THEN THE Fastify app SHALL NOT exit.
