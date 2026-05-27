# Implementation Plan: AmarSpace Full Implementation

## Overview

This plan implements the AmarSpace multi-tenant apartment management platform as a Turborepo monorepo with a Next.js 16 frontend, Fastify REST API backend, PostgreSQL/Drizzle ORM data layer, and Cloudflare R2 file storage. Tasks are ordered by dependency: shared packages first, then database schema, backend services, API routes, middleware, and finally frontend pages.

## Tasks

- [x] 1. Set up monorepo structure and shared packages
  - [x] 1.1 Initialize Turborepo workspace with apps/web, apps/api, packages/db, packages/shared, packages/typescript-config
    - Create turbo.json with build/dev/test pipelines
    - Configure workspace package.json with workspaces
    - Set up shared TypeScript configs (base, nextjs, api)
    - _Requirements: 17.1_

  - [x] 1.2 Create packages/shared with types, constants, and validation schemas
    - Define shared TypeScript interfaces (ServiceContext, RequestContext, ApiErrorResponse, FieldError)
    - Define role enum and permission constants (Owner, Manager, Renter)
    - Define state machine transition maps (flat status, bill status, maintenance, issue)
    - Create Zod validation schemas for all domain entities
    - Implement BDT currency formatter (৳ with Bangladeshi numbering system)
    - Implement date formatter (DD/MM/YYYY Bangla locale)
    - _Requirements: 3.1, 15.3, 15.4, 19.2_

  - [x]* 1.3 Write property test for BDT currency formatting
    - **Property 19: BDT currency formatting**
    - **Validates: Requirements 15.3**

  - [x] 1.4 Create custom error classes in packages/shared
    - Implement AppError, ValidationError, NotFoundError, ForbiddenError, ConflictError, RateLimitError
    - Ensure error response structure matches API contract (requestId, statusCode, errors array)
    - _Requirements: 19.2, 19.3, 19.4, 19.5_

  - [x]* 1.5 Write property test for API error response structure
    - **Property 20: API error response structure**
    - **Validates: Requirements 19.2, 19.3, 19.4, 19.5, 19.6**

- [x] 2. Implement database schema and migrations (packages/db)
  - [x] 2.1 Create Drizzle schema for users table extension
    - Add role, ownerAccountId, phone, languagePreference columns
    - Define relations to buildings, manager_assignments, rental_contracts
    - _Requirements: 1.1, 3.1, 17.4_

  - [x] 2.2 Create Drizzle schema for buildings and flats tables
    - Define buildings table with ownerAccountId, name, address, totalFloors
    - Add unique constraint on (ownerAccountId, name)
    - Define flats table with buildingId, flatNumber, floor, status
    - Add unique constraint on (buildingId, flatNumber)
    - Define relations between buildings and flats
    - _Requirements: 5.1, 5.2, 5.9, 6.1, 6.2, 6.12_

  - [x] 2.3 Create Drizzle schema for manager_assignments table
    - Define managerId, buildingId, ownerAccountId with unique constraint on (managerId, buildingId)
    - Define relations to users and buildings
    - _Requirements: 3.7, 17.5_

  - [x] 2.4 Create Drizzle schema for renters and rental_contracts tables
    - Define renters table with all personal fields (fullName, phone, nidNumber, bloodGroup, etc.)
    - Define rental_contracts table with monthlyRent, startDate, securityDepositAmount, remainingDepositBalance, status
    - Define relations between renters, users, flats, and contracts
    - _Requirements: 4.1, 4.2, 4.7, 9.1_

  - [x] 2.5 Create Drizzle schema for bills, bill_line_items, and payments tables
    - Define bills table with contractId, flatId, renterId, billingMonth, baseRent, totalAmount, paidAmount, status
    - Add unique constraint on (flatId, billingMonth)
    - Define bill_line_items with cascade delete on bill
    - Define payments table with receiptReference unique constraint
    - Define relations between bills, line items, payments, and contracts
    - _Requirements: 7.1, 7.2, 7.10, 8.1, 8.8_

  - [x] 2.6 Create Drizzle schema for advance_adjustments table
    - Define contractId, amount, billId (optional), note, adjustedBy
    - Define relations to rental_contracts, bills, and users
    - _Requirements: 9.2, 9.11_

  - [x] 2.7 Create Drizzle schema for maintenance_requests, maintenance_attachments, and maintenance_comments tables
    - Define maintenance_requests with flatId, renterId, buildingId, title, description, priority, status
    - Define maintenance_attachments with cascade delete on request
    - Define maintenance_comments with authorId
    - Define relations between requests, attachments, comments, flats, and buildings
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 2.8 Create Drizzle schema for issues table
    - Define buildingId, title, description, category, priority, status, assigneeId, resolutionNotes, resolvedAt
    - Define relations to buildings and users
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 2.9 Create Drizzle schema for notices and file_references tables
    - Define notices table with authorId, title, body, targetAudience, targetBuildingId, targetFlatId, isPinned
    - Define file_references table with entityType, entityId, storageKey, fileName, fileSize, mimeType
    - Define relations for notices to buildings, flats, and users
    - _Requirements: 12.1, 18.2, 18.7_

  - [x] 2.10 Generate and run initial Drizzle migration
    - Run drizzle-kit generate to create migration SQL
    - Verify all constraints, indexes, and foreign keys are correct
    - Export database client and schema from packages/db
    - _Requirements: 17.4_

- [x] 3. Checkpoint - Verify database schema
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Fastify API foundation and middleware
  - [x] 4.1 Set up Fastify app with plugins and error handler
    - Configure Fastify with fastify-type-provider-zod
    - Register CORS, cookie, and multipart plugins
    - Implement global error handler mapping AppError subclasses to HTTP responses
    - Add requestId (UUID v4) generation to every response
    - Configure request body size limit (1MB)
    - _Requirements: 19.1, 19.5, 19.6, 19.7_

  - [x] 4.2 Implement Better Auth plugin integration
    - Configure Better Auth with email/password provider
    - Set up session management with 7-day inactivity timeout
    - Implement login rate limiting (5 attempts per 15 minutes per email)
    - Implement registration rate limiting (10 attempts per 15 minutes per IP)
    - _Requirements: 1.1, 1.8, 2.1, 2.3, 2.5_

  - [x] 4.3 Implement auth guard middleware (preHandler)
    - Extract session token from cookie/header
    - Validate session via Better Auth
    - Inject user context (userId, role, ownerAccountId) into request
    - Return 401 for invalid/expired sessions
    - _Requirements: 2.4, 2.6, 17.2_

  - [x] 4.4 Implement role guard middleware
    - Accept allowedRoles parameter
    - Check request.user.role against allowed roles
    - Return 403 for insufficient permissions
    - _Requirements: 3.2, 3.3, 3.4, 3.6, 3.9_

  - [x] 4.5 Implement tenant scope middleware
    - Inject ownerAccountId filter into request context
    - For managers: resolve assigned building IDs from manager_assignments
    - For renters: resolve assigned flat ID from rental_contracts
    - _Requirements: 17.2, 17.5, 17.7_

  - [x]* 4.6 Write property test for role-based access control enforcement
    - **Property 4: Role-based access control enforcement**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.9**

  - [x]* 4.7 Write property test for tenant data isolation
    - **Property 17: Tenant data isolation**
    - **Validates: Requirements 17.2, 17.3, 17.6**

  - [x] 4.8 Implement Cloudflare R2 plugin
    - Configure R2 client with credentials from environment
    - Implement upload method with structured key format ({ownerAccountId}/{entityType}/{entityId}/{timestamp}-{filename})
    - Implement pre-signed URL generation (1-hour validity)
    - Implement delete method
    - _Requirements: 18.2, 18.5_

  - [x] 4.9 Implement audit logger plugin
    - Create async fire-and-forget audit log writer
    - Implement retry logic (max 3 attempts, 30s interval)
    - Truncate old/new values exceeding 10KB
    - _Requirements: 13.1, 13.2, 13.6, 13.7_

- [x] 5. Implement authentication and registration services
  - [x] 5.1 Implement user registration endpoint
    - Validate email (≤254 chars, standard format, lowercase normalization)
    - Validate password (8-128 chars, uppercase + lowercase + digit)
    - Hash password, create user with Owner role
    - Create session on success, handle session creation failure gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x]* 5.2 Write property tests for registration validation
    - **Property 1: Registration produces valid account with Owner role**
    - **Property 2: Email and password validation correctness**
    - **Property 3: Duplicate email rejection**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6**

  - [x] 5.3 Implement login and session management endpoints
    - Authenticate with email/password via Better Auth
    - Record login event in audit log
    - Implement logout with session invalidation within 1 second
    - _Requirements: 2.1, 2.2, 2.4, 2.7_

  - [x] 5.4 Implement role assignment service
    - Allow Owner to assign/change roles
    - Require building assignment for Manager role
    - Prevent removal of last Owner
    - Invalidate cached permissions on role change
    - Record role changes in audit log
    - _Requirements: 3.5, 3.7, 3.8_

- [x] 6. Implement building and flat management services
  - [x] 6.1 Implement BuildingService
    - createBuilding: validate name uniqueness per owner, enforce field constraints
    - updateBuilding: validate ownership, apply same constraints
    - listBuildings: tenant-scoped, paginated (max 50), sorted by createdAt desc
    - getBuilding: tenant-scoped single fetch
    - Record audit events for create/update
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9_

  - [x]* 6.2 Write property test for building name uniqueness
    - **Property 7: Building name uniqueness per owner**
    - **Validates: Requirements 5.9**

  - [x] 6.3 Implement FlatService
    - createFlat: validate flat number uniqueness within building, enforce field constraints
    - updateFlat: validate ownership, update properties
    - deleteFlat: only allow if status is Vacant
    - listFlats: filter by buildingId and status, paginated (max 50)
    - transitionStatus: validate state machine (Vacant↔Occupied, Vacant↔Under_Maintenance)
    - Record audit events
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.10, 6.11, 6.12, 6.13, 6.14_

  - [x]* 6.4 Write property tests for flat management
    - **Property 8: Flat number uniqueness within building**
    - **Property 9: Flat status transition validity**
    - **Validates: Requirements 6.12, 6.13, 6.14**

  - [x] 6.5 Implement building and flat API routes
    - Register GET/POST /api/buildings, GET/PUT /api/buildings/:id
    - Register GET/POST /api/flats, GET/PUT/DELETE /api/flats/:id
    - Apply auth guard, role guard, tenant scope middleware
    - Validate request bodies with Zod schemas
    - _Requirements: 5.5, 6.7, 6.8, 6.9_

- [x] 7. Implement renter registration service
  - [x] 7.1 Implement RenterRegistrationService
    - Validate all required fields (NID 10-17 digits, phone 11 digits starting 01, blood group enum, family members 1-50)
    - Create user account with Renter role
    - Create renter record with personal data
    - Create rental_contract with rent amount, start date, deposit
    - Update flat status to Occupied
    - Reject if flat is not Vacant
    - Handle file uploads for NID photo and digital signature
    - Record audit event
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13_

  - [x]* 7.2 Write property tests for renter registration validation
    - **Property 5: Renter registration field validation**
    - **Property 6: Flat assignment requires Vacant status**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.9, 4.13, 6.6**

  - [x] 7.3 Implement renter API routes
    - Register GET/POST /api/renters, GET /api/renters/:id
    - Apply auth guard, role guard (Owner, Manager), tenant scope
    - Validate request bodies with Zod schemas
    - _Requirements: 4.1, 4.9_

- [x] 8. Checkpoint - Verify core services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement billing and payment services
  - [x] 9.1 Implement BillingService
    - generateBills: create bill for each occupied flat in a month, set baseRent from contract
    - addUtilityCharge: append line item (max 20 per bill), recalculate totalAmount
    - getBill: fetch with line items and payments
    - listBills: multi-field filter (building, flat, renter, month, status), paginated
    - updateOverdueBills: mark unpaid/partially_paid bills as overdue after month end
    - Prevent duplicate bills per flat per month
    - Record audit events
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14_

  - [ ]* 9.2 Write property tests for billing
    - **Property 10: Bill total equals base rent plus line items**
    - **Property 11: No duplicate bills per flat per month**
    - **Validates: Requirements 7.3, 7.10**

  - [x] 9.3 Implement PaymentService
    - recordPayment: validate amount (0.01-999,999,999.99, 2 decimal places), update bill paidAmount and status
    - Generate unique receipt reference (alphanumeric, 12-20 chars)
    - Reject if payment exceeds remaining balance or bill is already Paid
    - Validate payment date (not future, not > 365 days past)
    - Validate payment method (Cash, Bank_Transfer, Mobile_Banking)
    - listPayments: filter by bill, renter, date range (max 365 days), method, paginated
    - Record audit events
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

  - [ ]* 9.4 Write property test for payment status updates
    - **Property 12: Payment correctly updates bill status**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**

  - [x] 9.5 Implement billing and payment API routes
    - Register GET /api/bills, POST /api/bills/generate, GET /api/bills/:id, POST /api/bills/:id/charges
    - Register GET /api/payments, POST /api/payments, GET /api/payments/:id
    - Apply auth guard, role guard, tenant scope middleware
    - Validate request bodies with Zod schemas
    - _Requirements: 7.6, 7.7, 7.8, 7.14, 8.6, 8.9_

- [x] 10. Implement advance deposit management service
  - [x] 10.1 Implement DepositService
    - getDeposit: fetch contract with remaining balance
    - applyAdjustment: validate amount ≤ remaining balance, deduct from balance, optionally link to bill
    - When linked to bill: apply as payment, update bill status accordingly
    - Reject if adjustment exceeds remaining balance
    - Reject if linked bill is already Paid or adjustment exceeds bill outstanding
    - listAdjustments: paginated (max 50), sorted by createdAt desc
    - Record audit events with old/new balance values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_

  - [ ]* 10.2 Write property tests for deposit management
    - **Property 13: Deposit adjustment maintains balance invariant**
    - **Property 14: Deposit adjustment linked to bill acts as payment**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**

  - [x] 10.3 Implement deposit API routes
    - Register GET /api/deposits/:contractId, POST /api/deposits/:contractId/adjust, GET /api/deposits/:contractId/history
    - Apply auth guard, role guard (Owner for adjustments, Manager/Renter for viewing), tenant scope
    - Validate request bodies with Zod schemas
    - _Requirements: 9.7, 9.8, 9.9, 9.12_

- [~] 11. Checkpoint - Verify financial services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement maintenance and issue tracking services
  - [x] 12.1 Implement MaintenanceService
    - createRequest: validate title (5-200 chars), description (10-2000 chars), priority enum, set status Open
    - Handle file attachments (max 5 images, JPEG/PNG/WebP, max 5MB each)
    - updateRequestStatus: validate state machine transitions
    - addComment: allow Renter to add comments, validate content (max 2000 chars)
    - listRequests: filter by building, flat, status, priority, paginated (max 50)
    - Record audit events for status changes
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_

  - [ ]* 12.2 Write property test for maintenance status transitions
    - **Property 15: Maintenance request status transition validity**
    - **Validates: Requirements 10.5, 10.12**

  - [x] 12.3 Implement IssueService
    - createIssue: validate title (max 200), description (max 2000), category enum, priority enum, set status Open
    - assignIssue: validate assignee has Manager role
    - updateIssueStatus: validate state machine transitions, require resolution notes for Resolved
    - listIssues: filter by building, category, status, priority, assignee, paginated (max 50)
    - Record audit events for status changes
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [ ]* 12.4 Write property test for issue status transitions
    - **Property 16: Issue status transition validity**
    - **Validates: Requirements 11.4, 11.8, 11.9**

  - [x] 12.5 Implement maintenance and issue API routes
    - Register GET/POST /api/maintenance, GET /api/maintenance/:id, PUT /api/maintenance/:id/status, POST /api/maintenance/:id/comments
    - Register GET/POST /api/issues, GET /api/issues/:id, PUT /api/issues/:id/status, PUT /api/issues/:id/assign
    - Apply auth guard, role guard, tenant scope middleware
    - Validate request bodies with Zod schemas
    - _Requirements: 10.6, 10.7, 10.8, 11.5, 11.6_

  - [ ]* 12.6 Write property test for file upload validation
    - **Property 18: File upload validation**
    - **Validates: Requirements 18.3, 18.9**

- [x] 13. Implement notice service
  - [x] 13.1 Implement NoticeService
    - createNotice: validate title (max 200), body (max 5000), target audience enum
    - Validate building/flat reference for Specific_Building/Specific_Flat targets
    - Manager can only target assigned buildings
    - updateNotice: author or Owner can edit
    - deleteNotice: author or Owner can delete
    - togglePin: enforce max 5 pinned per target audience scope
    - listNotices: filter by target audience, pinned status, role-based visibility, paginated (max 50)
    - Record audit events
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13_

  - [x] 13.2 Implement notice API routes
    - Register GET/POST /api/notices, GET/PUT/DELETE /api/notices/:id, PUT /api/notices/:id/pin
    - Apply auth guard, role guard (Owner, Manager for create/edit), tenant scope
    - Validate request bodies with Zod schemas
    - _Requirements: 12.5, 12.6, 12.9, 12.10_

- [ ] 14. Implement audit log query service
  - [~] 14.1 Implement AuditLogQueryService
    - queryLogs: filter by entity type, entity ID, actor user ID, action name, date range
    - Paginated (max 100 per page), sorted by createdAt desc
    - Owner: full access to all logs
    - Manager: access only to logs for entities in assigned buildings
    - Renter: denied (403)
    - _Requirements: 13.3, 13.4, 13.5, 13.8_

  - [~] 14.2 Implement audit log API route
    - Register GET /api/audit
    - Apply auth guard, role guard (Owner, Manager), tenant scope
    - Validate query parameters with Zod schemas
    - _Requirements: 13.3, 13.4, 13.5_

- [~] 15. Checkpoint - Verify all backend services
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Implement frontend foundation and layout
  - [~] 16.1 Set up Next.js app with providers and i18n
    - Configure TanStack Query provider with 30s stale time
    - Set up next-intl or custom i18n with Bangla as default language
    - Configure Bangla-compatible font (Unicode Bengali block U+0980–U+09FF)
    - Set up language toggle with localStorage (unauthenticated) and server-side profile (authenticated) persistence
    - Implement translation fallback to English for missing keys
    - _Requirements: 15.1, 15.2, 15.5, 15.6, 15.7_

  - [~] 16.2 Implement responsive layout components
    - Create DashboardLayout with BottomTabBar (< 768px) and Sidebar (≥ 768px)
    - Ensure all interactive elements have 44x44px minimum touch targets
    - Implement single-column layout for forms on mobile
    - Use Tailwind responsive utilities, avoid fixed pixel widths
    - Ensure minimum 16px body text, 16px line-height 1.6
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.7, 14.8, 16.2, 16.8_

  - [~] 16.3 Implement shared UI components
    - Create DataTable with pagination and filters
    - Create FormField with label-above-input pattern
    - Create ConfirmDialog for destructive actions (44x44px buttons)
    - Create StatusBadge, CurrencyDisplay (BDT), DateDisplay (DD/MM/YYYY)
    - Create FileUpload with drag-and-drop and 5MB limit
    - Create LoadingSkeleton and ErrorFeedback (48px min height, 5s display)
    - Create LanguageToggle component
    - Ensure WCAG AA contrast ratio (4.5:1 normal text, 3:1 large text)
    - _Requirements: 15.3, 15.4, 16.1, 16.3, 16.4, 16.5, 16.6, 16.7_

- [ ] 17. Implement frontend authentication pages
  - [~] 17.1 Implement login page
    - Create login form with email and password fields
    - Handle authentication errors with generic message
    - Display rate limit feedback
    - Redirect to dashboard on success
    - _Requirements: 2.1, 2.2, 2.3, 20.5_

  - [~] 17.2 Implement registration page
    - Create registration form with email and password fields
    - Display field-level validation errors
    - Handle duplicate email error
    - Redirect to dashboard on success
    - _Requirements: 1.1, 1.5, 1.6, 1.8_

- [ ] 18. Implement frontend dashboard and navigation
  - [~] 18.1 Implement role-specific dashboard
    - Owner dashboard: total buildings, flats, occupancy ratio, unpaid bills (BDT), 5 recent maintenance, 5 recent audit entries
    - Manager dashboard: assigned buildings, flats with occupancy (max 20), unpaid bills (BDT), 10 pending maintenance
    - Renter dashboard: flat address, building name, current bill with status, deposit balance (BDT), active maintenance requests
    - Use TanStack Query with 30s stale time, show loading skeleton
    - Handle no-flat-assigned state for Renter
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.7, 20.8_

  - [~] 18.2 Implement navigation structure
    - Max 3 levels from dashboard to any feature
    - One click/tap to reach primary sections (Buildings, Flats, Renters, Bills, Maintenance, Audit, Notices)
    - Role-based navigation item visibility
    - _Requirements: 16.3, 20.5, 20.6_

- [ ] 19. Implement frontend building and flat management pages
  - [~] 19.1 Implement building list and detail pages
    - Building list with pagination (max 50)
    - Building creation form with name and address validation
    - Building detail with flat list
    - Owner can edit, Manager can only view
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.7, 5.8_

  - [~] 19.2 Implement flat management pages
    - Flat list with status filter and pagination (max 50)
    - Flat creation form with flat number, floor, building reference
    - Flat detail with status badge
    - Status transition controls (Owner/Manager)
    - Delete confirmation for Vacant flats only
    - _Requirements: 6.1, 6.2, 6.7, 6.8, 6.9, 6.11, 6.13_

- [ ] 20. Implement frontend renter management pages
  - [~] 20.1 Implement renter registration form
    - Multi-field form with all required and optional fields
    - NID photo upload and digital signature upload
    - Flat selection (only Vacant flats)
    - Field-level validation with Bangla error messages
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 4.11, 4.12_

  - [~] 20.2 Implement renter list and detail pages
    - Renter list with pagination
    - Renter detail showing personal info, contract, and deposit balance
    - _Requirements: 4.1, 9.12_

- [ ] 21. Implement frontend billing and payment pages
  - [~] 21.1 Implement bill list and detail pages
    - Bill list with multi-field filters (building, flat, renter, month, status), paginated
    - Bill generation action (Owner/Manager)
    - Bill detail showing line items and payment history
    - Add utility charge form (max 20 line items)
    - _Requirements: 7.1, 7.2, 7.6, 7.7, 7.8, 7.11_

  - [~] 21.2 Implement payment recording and history pages
    - Payment recording form with amount, date, method, note
    - Payment history with filters (bill, renter, date range, method), paginated
    - Payment receipt display with unique reference
    - _Requirements: 8.1, 8.5, 8.6, 8.8, 8.9_

  - [~] 21.3 Implement deposit management pages
    - Deposit balance display on renter detail
    - Adjustment form (Owner only) with amount, optional bill link, note
    - Adjustment history list, paginated
    - _Requirements: 9.7, 9.8, 9.9, 9.11, 9.12_

- [ ] 22. Implement frontend maintenance and issue pages
  - [~] 22.1 Implement maintenance request pages
    - Maintenance request list with filters (building, flat, status, priority), paginated
    - New request form (Renter) with title, description, priority, file attachments
    - Request detail with status badge, comments, and attachments
    - Status update controls (Owner/Manager)
    - Comment form (all roles)
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7, 10.8, 10.10_

  - [~] 22.2 Implement issue tracking pages
    - Issue list with filters (building, category, status, priority, assignee), paginated
    - New issue form (Owner/Manager) with title, description, category, priority
    - Issue detail with status, assignee, resolution notes
    - Status update and assignment controls
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.6, 11.7_

- [ ] 23. Implement frontend notice and audit pages
  - [~] 23.1 Implement notice pages
    - Notice list with pinned notices at top, filtered by target audience, paginated
    - New notice form with title, body, target audience, building/flat selection
    - Notice detail with edit/delete (author or Owner)
    - Pin/unpin toggle (max 5 per scope)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8, 12.9_

  - [~] 23.2 Implement audit log viewer (Owner only)
    - Audit log list with filters (entity type, entity ID, actor, action, date range)
    - Paginated (max 100 per page), sorted by timestamp desc
    - Display old/new values in expandable rows
    - _Requirements: 13.3, 13.4, 13.5_

- [ ] 24. Implement frontend settings page
  - [~] 24.1 Implement user settings page
    - Language preference toggle (Bangla/English) with server-side persistence
    - Display current user role and account info
    - _Requirements: 15.5, 15.6_

- [~] 25. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout — all implementation tasks use TypeScript
- Frontend uses Next.js 16 App Router with TanStack Query and shadcn/ui
- Backend uses Fastify with Zod validation and Drizzle ORM
- All tenant-scoped queries filter by ownerAccountId at the service layer
- File storage uses Cloudflare R2 with pre-signed URLs

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["9.1"] },
    { "id": 1, "tasks": ["9.2", "9.3"] },
    { "id": 2, "tasks": ["9.4", "9.5"] },
    { "id": 3, "tasks": ["10.1"] },
    { "id": 4, "tasks": ["10.2", "10.3"] },
    { "id": 5, "tasks": ["12.1", "12.3"] },
    { "id": 6, "tasks": ["12.2", "12.4", "12.5", "12.6"] },
    { "id": 7, "tasks": ["13.1"] },
    { "id": 8, "tasks": ["13.2", "14.1"] },
    { "id": 9, "tasks": ["14.2"] },
    { "id": 10, "tasks": ["16.1"] },
    { "id": 11, "tasks": ["16.2", "16.3"] },
    { "id": 12, "tasks": ["17.1", "17.2"] },
    { "id": 13, "tasks": ["18.1", "18.2"] },
    { "id": 14, "tasks": ["19.1", "19.2", "20.1", "20.2"] },
    { "id": 15, "tasks": ["21.1", "21.2", "21.3"] },
    { "id": 16, "tasks": ["22.1", "22.2"] },
    { "id": 17, "tasks": ["23.1", "23.2", "24.1"] }
  ]
}
```
