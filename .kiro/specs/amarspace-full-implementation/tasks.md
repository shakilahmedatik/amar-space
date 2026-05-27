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

  - [x] 1.3 Write property test for BDT currency formatting
    - **Property 19: BDT currency formatting**
    - **Validates: Requirements 15.3**

  - [x] 1.4 Create custom error classes in packages/shared
    - Implement AppError, ValidationError, NotFoundError, ForbiddenError, ConflictError, RateLimitError
    - Ensure error response structure matches API contract (requestId, statusCode, errors array)
    - _Requirements: 19.2, 19.3, 19.4, 19.5_

  - [x] 1.5 Write property test for API error response structure
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

  - [x] 4.6 Write property test for role-based access control enforcement
    - **Property 4: Role-based access control enforcement**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6, 3.9**

  - [x] 4.7 Write property test for tenant data isolation
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

- [ ] 5. Implement authentication and registration services
  - [~] 5.1 Implement user registration endpoint
    - Validate email (≤254 chars, standard format, lowercase normalization)
    - Validate password (8-128 chars, uppercase + lowercase + digit)
    - Hash password, create user with Owner role
    - Create session on success, handle session creation failure gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [~] 5.2 Write property tests for registration validation
    - **Property 1: Registration produces valid account with Owner role**
    - **Property 2: Email and password validation correctness**
    - **Property 3: Duplicate email rejection**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6**

  - [~] 5.3 Implement login and session management endpoints
    - Authenticate with email/password via Better Auth
    - Record login event in audit log
    - Implement logout with session invalidation within 1 second
    - _Requirements: 2.1, 2.2, 2.4, 2.7_

  - [~] 5.4 Implement role assignment service
    - Allow Owner to assign/change roles
    - Require building assignment for Manager role
    - Prevent removal of last Owner
    - Invalidate cached permissions on role change
    - Record role changes in audit log
    - _Requirements: 3.5, 3.7, 3.8_

- [ ] 6. Implement building and flat management services
  - [~] 6.1 Implement BuildingService
    - createBuilding: validate name uniqueness per owner, enforce field constraints
    - updateBuilding: validate ownership, apply same constraints
    - listBuildings: tenant-scoped, paginated (max 50), sorted by createdAt desc
    - getBuilding: tenant-scoped single fetch
    - Record audit events for create/update
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9_

  - [~] 6.2 Write property test for building name uniqueness
    - **Property 7: Building name uniqueness per owner**
    - **Validates: Requirements 5.9**

  - [~] 6.3 Implement FlatService
    - createFlat: validate flat number uniqueness within building, enforce field constraints
    - updateFlat: validate ownership, update properties
    - deleteFlat: only allow if status is Vacant
    - listFlats: filter by buildingId and status, paginated (max 50)
    - transitionStatus: validate state machine (Vacant↔Occupied, Vacant↔Under_Maintenance)
    - Record audit events
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7, 6.10, 6.11, 6.12, 6.13, 6.14_

  - [~] 6.4 Write property tests for flat management
    - **Property 8: Flat number uniqueness within building**
    - **Property 9: Flat status transition validity**
    - **Validates: Requirements 6.12, 6.13, 6.14**

  - [~] 6.5 Implement building and flat API routes
    - Register GET/POST /api/buildings, GET/PUT /api/buildings/:id
    - Register GET/POST /api/flats, GET/PUT/DELETE /api/flats/:id
    - Apply auth guard, role guard, tenant scope middleware
    - Validate request bodies with Zod schemas
    - _Requirements: 5.5, 6.7, 6.8, 6.9_

- [ ] 7. Implement renter registration service
  - [~] 7.1 Implement RenterRegistrationService
    - Validate all required fields (NID 10-17 digits, phone 11 digits starting 01, blood group enum, family members 1-50)
    - Create user account with Renter role
    - Create renter record with personal data
    - Create rental_contract with rent amount, start date, deposit
    - Update flat status to Occupied
    - Reject if flat is not Vacant
    - Handle file uploads for NID photo and digital signature
    - Record audit event
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13_

  - [~] 7.2 Write property tests for renter registration validation
    - **Property 5: Renter registration field validation**
    - **Property 6: Flat assignment requires Vacant status**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.9, 4.13, 6.6**

  - [~] 7.3 Implement renter API routes
    - Register GET/POST /api/renters, GET /api/renters/:id
    - Apply auth guard, role guard (Owner, Manager), tenant scope
    - Validate request bodies with Zod schemas
    - _Requirements: 4.1, 4.9_

- [~] 8. Checkpoint - Verify core services
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement billing and payment services
  - [~] 9.1 Implement BillingService
    - generateBills: create bill for each occupied flat in a month, set baseRent from contract
    - addUtilityCharge: append line item (max 20 per bill), recalculate totalAmount
    - getBill: fetch with line items and payments
    - listBills: multi-field filter (building, flat, renter, month, status), paginated
    - updateOverdueBills: mark unpaid/partially_paid bills as overdue after month end
    - Prevent duplicate bills per flat per month
    - Record audit events
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14_

  - [~] 9.2 Write property tests for billing
    - **Property 10: Bill total equals base rent plus line items**
    - **Property 11: No duplicate bills per flat per month**
    - **Validates: Requirements 7.3, 7.10**

  - [~] 9.3 Implement PaymentService
    - recordPayment: validate amount ≤ remaining balance, update bill paidAmount and status
    - Generate unique receipt reference (alphanumeric, 12-20 chars)
    - Validate payment date (not future, not > 365 days past)
    - Validate payment method enum (cash, bank_transfer, mobile_banking)
    - listPayments: filter by bill, renter, date range, method, paginated
    - getPaymentReceipt: fetch payment details
    - Reject payment against non-existent or fully paid bill
    - Record audit events
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

  - [~] 9.4 Write property test for payment status updates
    - **Property 12: Payment correctly updates bill status**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**

  - [~] 9.5 Implement billing and payment API routes
    - Register GET /api/bills, POST /api/bills/generate, GET /api/bills/:id, POST /api/bills/:id/charges
    - Register GET/POST /api/payments, GET /api/payments/:id
    - Apply auth guard, role guard, tenant scope
    - _Requirements: 7.6, 7.7, 7.8, 7.14, 8.6_

- [ ] 10. Implement deposit management service
  - [~] 10.1 Implement DepositService
    - getDeposit: fetch contract with remaining balance
    - applyAdjustment: validate amount ≤ remaining balance, deduct from balance
    - Handle bill-linked adjustments (apply as payment, update bill status)
    - Reject if adjustment exceeds remaining balance or bill is fully paid
    - listAdjustments: paginated (max 50), sorted by createdAt desc
    - Record audit events with old/new balance values
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_

  - [~] 10.2 Write property tests for deposit management
    - **Property 13: Deposit adjustment maintains balance invariant**
    - **Property 14: Deposit adjustment linked to bill acts as payment**
    - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**

  - [~] 10.3 Implement deposit API routes
    - Register GET /api/deposits/:contractId, POST /api/deposits/:contractId/adjust, GET /api/deposits/:contractId/history
    - Apply auth guard, role guard (Owner for adjustments, all for viewing), tenant scope
    - _Requirements: 9.7, 9.8, 9.9_

- [ ] 11. Implement maintenance and issue tracking services
  - [~] 11.1 Implement MaintenanceService
    - createRequest: validate title (5-200 chars), description (10-2000 chars), priority enum
    - Handle file attachments (max 5 files, JPEG/PNG/WebP, ≤5MB each)
    - updateRequestStatus: validate state machine transitions
    - addComment: create comment with authorId
    - listRequests: filter by building, flat, status, priority, paginated
    - Record audit events for status changes
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12_

  - [~] 11.2 Write property test for maintenance request status transitions
    - **Property 15: Maintenance request status transition validity**
    - **Validates: Requirements 10.5, 10.12**

  - [~] 11.3 Implement IssueService
    - createIssue: validate title (≤200), description (≤2000), category enum, priority enum
    - assignIssue: validate assignee has Manager role
    - updateIssueStatus: validate state machine, require resolution notes for Resolved
    - listIssues: filter by building, category, status, priority, assignee, paginated
    - Record audit events
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [~] 11.4 Write property test for issue status transitions
    - **Property 16: Issue status transition validity**
    - **Validates: Requirements 11.4, 11.8, 11.9**

  - [~] 11.5 Implement maintenance and issue API routes
    - Register GET/POST /api/maintenance, GET /api/maintenance/:id, PUT /api/maintenance/:id/status, POST /api/maintenance/:id/comments
    - Register GET/POST /api/issues, GET /api/issues/:id, PUT /api/issues/:id/status, PUT /api/issues/:id/assign
    - Apply auth guard, role guard, tenant scope
    - _Requirements: 10.6, 10.7, 10.8, 11.5_

- [ ] 12. Implement notice and file upload services
  - [~] 12.1 Implement NoticeService
    - createNotice: validate title (≤200), body (≤5000), target audience enum
    - Validate building/flat references for targeted notices
    - updateNotice: author/owner check for edit permissions
    - deleteNotice: author/owner check
    - togglePin: enforce max 5 pinned per scope
    - listNotices: filter by target audience, pinned status, role-based visibility
    - Manager can only create for assigned buildings, edit/delete own notices
    - Record audit events
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12, 12.13_

  - [~] 12.2 Implement FileUploadService
    - uploadFiles: validate MIME types (jpeg, png, webp, pdf), size ≤5MB, max 5 files
    - Store in R2 with structured key, save file_references in DB
    - Handle orphan cleanup (delete from R2 if DB write fails)
    - getPresignedUrl: generate 1-hour pre-signed URL
    - deleteFile: remove from R2 and DB
    - Return 503 with Retry-After on R2 unavailability
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9_

  - [~] 12.3 Write property test for file upload validation
    - **Property 18: File upload validation**
    - **Validates: Requirements 18.3, 18.9**

  - [~] 12.4 Implement notice and file upload API routes
    - Register GET/POST /api/notices, GET/PUT/DELETE /api/notices/:id, PUT /api/notices/:id/pin
    - Register POST /api/files/upload, GET /api/files/:key
    - Apply auth guard, role guard, tenant scope
    - _Requirements: 12.9, 12.10, 18.5_

- [ ] 13. Implement audit log query endpoint
  - [~] 13.1 Implement audit log query API route
    - Register GET /api/audit with filtering by entity type, entity ID, actor, action, date range
    - Paginated (max 100 per page), sorted by timestamp desc
    - Owner: full access; Manager: scoped to assigned buildings; Renter: denied (403)
    - _Requirements: 13.3, 13.4, 13.5_

- [~] 14. Checkpoint - Verify all backend services and API routes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement Next.js frontend foundation
  - [~] 15.1 Set up Next.js 16 app with providers and layouts
    - Configure TanStack Query provider with 30s stale time
    - Set up i18n with Bangla as default language, English fallback
    - Configure Tailwind CSS with Bangla-compatible font (Noto Sans Bengali or similar)
    - Create RootLayout with global providers
    - Create AuthLayout for login/register pages
    - Create DashboardLayout with responsive navigation
    - _Requirements: 14.1, 14.4, 15.1, 15.2, 15.5, 15.6, 20.4_

  - [~] 15.2 Implement shared UI components
    - Create DataTable with pagination and filters (shadcn/ui Table)
    - Create FormField with label-above-input pattern and validation errors
    - Create ConfirmDialog for destructive actions (44x44px buttons)
    - Create StatusBadge with color-coded indicators
    - Create CurrencyDisplay (BDT formatting with ৳)
    - Create DateDisplay (DD/MM/YYYY Bangla locale)
    - Create FileUpload with drag-and-drop, preview, 5MB limit
    - Create LoadingSkeleton for data fetch placeholders
    - Create ErrorFeedback (top-of-viewport, 48px min height, 5s display, close button)
    - Create LanguageToggle (Bangla/English switch)
    - _Requirements: 14.2, 14.3, 14.5, 15.3, 15.4, 15.5, 16.1, 16.2, 16.4, 16.5, 16.6, 16.7, 16.8_

  - [~] 15.3 Implement API client and hooks
    - Create typed API client with session token handling
    - Create TanStack Query hooks for all API endpoints
    - Implement error handling with ErrorFeedback integration
    - Handle 401 responses with redirect to login
    - _Requirements: 19.6, 20.4, 20.7_

  - [~] 15.4 Create responsive navigation components
    - Implement BottomTabBar for mobile (< 768px)
    - Implement Sidebar for desktop (≥ 768px)
    - Role-based navigation items (Owner sees all, Manager sees assigned, Renter sees own)
    - Max 1 click from dashboard to any primary feature
    - _Requirements: 14.4, 16.3, 20.6_

- [ ] 16. Implement authentication pages
  - [~] 16.1 Implement login page (/login)
    - Email and password form with validation
    - Error display for failed login attempts
    - Redirect to dashboard on success
    - Mobile-first responsive layout
    - _Requirements: 2.1, 2.2, 14.3, 20.5_

  - [~] 16.2 Implement registration page (/register)
    - Email and password form with real-time validation feedback
    - Password requirements display (8+ chars, uppercase, lowercase, digit)
    - Redirect to dashboard on success
    - _Requirements: 1.1, 1.5, 1.6, 14.3_

- [ ] 17. Implement dashboard pages
  - [~] 17.1 Implement Owner dashboard
    - Display total buildings, total flats, occupied/vacant ratio
    - Display total unpaid bills in BDT
    - Show 5 most recent maintenance requests
    - Show 5 most recent audit log entries
    - Loading skeleton during fetch
    - Error state with retry action
    - _Requirements: 20.1, 20.4, 20.7_

  - [~] 17.2 Implement Manager dashboard
    - Display assigned buildings count
    - Display flats with occupancy status (max 20, sorted by building then flat number)
    - Display total unpaid bills for assigned buildings in BDT
    - Show 10 most recent pending maintenance requests
    - _Requirements: 20.2, 20.4_

  - [~] 17.3 Implement Renter dashboard
    - Display current flat address and flat number, building name
    - Display current month's bill with payment status
    - Display remaining deposit balance in BDT
    - Show all active maintenance requests
    - Handle no-flat-assigned state
    - _Requirements: 20.3, 20.4, 20.8, 9.12_

- [ ] 18. Implement building and flat management pages
  - [~] 18.1 Implement buildings list page (/buildings)
    - DataTable with pagination (max 50 per page)
    - Create building form/dialog
    - _Requirements: 5.1, 5.8_

  - [~] 18.2 Implement building detail page (/buildings/[id])
    - Display building info with edit capability (Owner only)
    - Show flats list within building with status filter
    - Create flat form/dialog
    - _Requirements: 5.4, 6.1, 6.11_

  - [~] 18.3 Implement flat detail page (/flats/[id])
    - Display flat info, current renter, contract details
    - Status badge and status transition controls
    - Delete flat button with confirmation (only if Vacant)
    - _Requirements: 6.3, 6.7, 6.13_

- [ ] 19. Implement renter management pages
  - [~] 19.1 Implement renters list page (/renters)
    - DataTable with building/flat filter and pagination
    - _Requirements: 4.1_

  - [~] 19.2 Implement renter registration form (/renters/new)
    - Multi-section form: personal info, family, emergency contact, rental terms
    - NID photo upload with preview
    - Digital signature capture/upload
    - Building and flat selection (only Vacant flats)
    - Real-time field validation with Bangla error messages
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.9, 4.11, 4.12_

  - [~] 19.3 Implement renter detail page (/renters/[id])
    - Display all renter information
    - Show contract details and deposit balance
    - Link to bills and payments
    - _Requirements: 4.7, 9.12_

- [ ] 20. Implement billing and payment pages
  - [~] 20.1 Implement bills list page (/bills)
    - DataTable with filters (building, flat, month, status)
    - Generate bills action button (Owner/Manager)
    - _Requirements: 7.6, 7.7, 7.8, 7.11_

  - [~] 20.2 Implement bill detail page (/bills/[id])
    - Display bill with line items and payment history
    - Add utility charge form (Owner/Manager)
    - Record payment form (Owner/Manager)
    - Status badge with color coding
    - _Requirements: 7.2, 7.3, 8.1_

  - [~] 20.3 Implement payments list page (/payments)
    - DataTable with filters (bill, renter, date range, method)
    - Payment receipt view
    - _Requirements: 8.9_

- [ ] 21. Implement maintenance and issue pages
  - [~] 21.1 Implement maintenance requests list page (/maintenance)
    - DataTable with filters (building, flat, status, priority)
    - Role-based visibility (Renter sees own only)
    - _Requirements: 10.6, 10.7, 10.8, 10.10_

  - [~] 21.2 Implement new maintenance request form (/maintenance/new)
    - Title, description, priority selection
    - File upload (max 5 images, JPEG/PNG/WebP, ≤5MB)
    - Auto-populate flat reference for Renter role
    - _Requirements: 10.1, 10.2, 10.3, 10.11_

  - [~] 21.3 Implement maintenance request detail page (/maintenance/[id])
    - Display request details with attachments
    - Status transition controls (Owner/Manager)
    - Comments section with add comment form
    - _Requirements: 10.5, 10.8_

  - [~] 21.4 Implement issues list page (/issues)
    - DataTable with filters (building, category, status, priority, assignee)
    - Create issue button (Owner/Manager)
    - _Requirements: 11.5, 11.6_

  - [~] 21.5 Implement issue detail page (/issues/[id])
    - Display issue details
    - Assign issue form
    - Status transition controls with resolution notes requirement
    - _Requirements: 11.2, 11.4, 11.8_

- [ ] 22. Implement notices and audit pages
  - [~] 22.1 Implement notices list page (/notices)
    - Pinned notices at top, then by creation date desc
    - Role-based visibility filtering
    - Create notice button (Owner/Manager)
    - _Requirements: 12.2, 12.5, 12.6, 12.8_

  - [~] 22.2 Implement notice creation/edit form (/notices/new)
    - Title, body, target audience selection
    - Building/flat picker for targeted notices
    - Pin toggle
    - _Requirements: 12.1, 12.3, 12.4, 12.11_

  - [~] 22.3 Implement audit log viewer (/audit) - Owner only
    - DataTable with filters (entity type, entity ID, actor, action, date range)
    - Paginated (max 100 per page)
    - Display old/new values in expandable rows
    - _Requirements: 13.3, 13.5_

  - [~] 22.4 Implement settings page (/settings)
    - Language preference toggle (Bangla/English)
    - Store preference in localStorage (unauthenticated) and server profile (authenticated)
    - _Requirements: 15.5, 15.6_

- [~] 23. Checkpoint - Verify frontend pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. Integration wiring and final validation
  - [~] 24.1 Wire Vercel serverless deployment configuration
    - Configure vercel.json for API routes
    - Set up environment variables for PostgreSQL, R2, Better Auth
    - Ensure Turborepo build pipeline works end-to-end
    - _Requirements: 17.1_

  - [~] 24.2 Implement i18n translation files
    - Create Bangla translation JSON for all UI labels, errors, navigation
    - Create English translation JSON as fallback
    - Implement missing key fallback to English
    - _Requirements: 15.1, 15.7_

  - [~] 24.3 Write integration tests for critical flows
    - Test auth flow: register → login → use → logout → reject
    - Test renter registration: create user + contract + update flat
    - Test billing flow: generate → add charges → record payment → status update
    - Test deposit adjustment linked to bill
    - _Requirements: 1.1, 4.7, 7.1, 8.2, 9.5_

- [~] 25. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout (Next.js 16, Fastify, Drizzle ORM)
- All API responses include a requestId (UUID v4) for tracing
- Tenant isolation (ownerAccountId filtering) is enforced at the service layer for every query

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.4"] },
    { "id": 2, "tasks": ["1.3", "1.5", "2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.6", "2.7", "2.8", "2.9"] },
    { "id": 4, "tasks": ["2.10"] },
    { "id": 5, "tasks": ["4.1", "4.8", "4.9"] },
    { "id": 6, "tasks": ["4.2", "4.3"] },
    { "id": 7, "tasks": ["4.4", "4.5"] },
    { "id": 8, "tasks": ["4.6", "4.7", "5.1"] },
    { "id": 9, "tasks": ["5.2", "5.3", "5.4"] },
    { "id": 10, "tasks": ["6.1", "6.3"] },
    { "id": 11, "tasks": ["6.2", "6.4", "6.5"] },
    { "id": 12, "tasks": ["7.1"] },
    { "id": 13, "tasks": ["7.2", "7.3"] },
    { "id": 14, "tasks": ["9.1", "9.3"] },
    { "id": 15, "tasks": ["9.2", "9.4", "9.5"] },
    { "id": 16, "tasks": ["10.1"] },
    { "id": 17, "tasks": ["10.2", "10.3"] },
    { "id": 18, "tasks": ["11.1", "11.3"] },
    { "id": 19, "tasks": ["11.2", "11.4", "11.5"] },
    { "id": 20, "tasks": ["12.1", "12.2"] },
    { "id": 21, "tasks": ["12.3", "12.4", "13.1"] },
    { "id": 22, "tasks": ["15.1"] },
    { "id": 23, "tasks": ["15.2", "15.3", "15.4"] },
    { "id": 24, "tasks": ["16.1", "16.2"] },
    { "id": 25, "tasks": ["17.1", "17.2", "17.3"] },
    { "id": 26, "tasks": ["18.1", "18.2", "18.3"] },
    { "id": 27, "tasks": ["19.1", "19.2", "19.3"] },
    { "id": 28, "tasks": ["20.1", "20.2", "20.3"] },
    { "id": 29, "tasks": ["21.1", "21.2", "21.3", "21.4", "21.5"] },
    { "id": 30, "tasks": ["22.1", "22.2", "22.3", "22.4"] },
    { "id": 31, "tasks": ["24.1", "24.2"] },
    { "id": 32, "tasks": ["24.3"] }
  ]
}
```
