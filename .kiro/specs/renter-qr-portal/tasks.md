# Implementation Plan: Renter QR Portal

## Overview

This plan implements the Renter QR Portal — a public-facing, mobile-first, Bangla-first web experience at `/f/{flatSlug}`. The implementation is structured as incremental steps: database schema first, then API routes, then frontend components, with testing woven throughout. Each step builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Database schema and migrations
  - [x] 1.1 Create `flat_slugs` table migration
    - Add `flat_slugs` table with columns: `id` (UUID PK), `flat_id` (FK → flats.id, UNIQUE, NOT NULL), `slug` (VARCHAR(100), UNIQUE, NOT NULL), `created_at` (TIMESTAMPTZ)
    - Add unique index on `slug`
    - _Requirements: 1.1, 1.5_

  - [x] 1.2 Create `emergency_contacts` table migration
    - Add `emergency_contacts` table with columns: `id`, `building_id` (FK → buildings.id), `owner_account_id` (FK → users.id), `name`, `role`, `phone`, `type`, `sort_order`, `created_at`, `updated_at`
    - _Requirements: 5.1, 5.2_

  - [x] 1.3 Create `registration_requests` table migration
    - Add `registration_requests` table with all columns per design (full_name, phone, nid_number, nid_photo_url, blood_group, occupation, family_members, emergency_contact, rental_start_date, advance_amount, digital_signature_url, status, etc.)
    - Add partial unique constraint on `(flat_id, phone)` WHERE `status = 'PENDING_APPROVAL'`
    - _Requirements: 7.5, 7.9_

  - [x] 1.4 Create `renter_access_codes` table migration
    - Add `renter_access_codes` table with columns: `id`, `flat_id`, `renter_id`, `code_hash`, `failed_attempts`, `locked_until`, `created_at`, `updated_at`
    - _Requirements: 8.1, 8.5_

  - [x] 1.5 Create `portal_sessions` table migration
    - Add `portal_sessions` table with columns: `id`, `flat_id`, `renter_id`, `expires_at`, `created_at`
    - _Requirements: 8.2, 8.6_

  - [x] 1.6 Create `analytics_events` table migration
    - Add `analytics_events` table with columns: `id`, `event_name`, `flat_slug`, `user_agent`, `metadata` (JSONB), `created_at`
    - _Requirements: 13.1, 13.2_

  - [x] 1.7 Add new columns to `buildings` table
    - Add columns: `whatsapp_group_link`, `manager_phone`, `logo_url`, `cover_image_url`, `rules` (TEXT)
    - _Requirements: 2.5, 3.2, 3.4, 6.1_

- [x] 2. Shared validation schemas and utilities
  - [x] 2.1 Create flat slug validation utility
    - Create `packages/shared/src/portal/slug-validation.ts`
    - Implement `isValidFlatSlug(slug: string): boolean` — accepts only lowercase alphanumeric + hyphens, 1–100 chars
    - Export validation function and regex pattern
    - _Requirements: 1.3, 1.5_

  - [x] 2.2 Write property test for slug validation
    - **Property 1: Flat slug validation**
    - **Validates: Requirements 1.3, 1.5**

  - [x] 2.3 Create registration form validation schema
    - Create `packages/shared/src/portal/registration-validation.ts`
    - Implement Zod schema with all field constraints: Full Name (1–100 chars), Phone (11 digits starting with 01), NID (10 or 17 digits), Blood Group enum, Occupation (1–100 chars), Family Members (1–20), Emergency Contact (11 digits starting with 01), Rental Start Date (current or future within 90 days), Advance Amount (0–99,999,999), Digital Signature (non-empty base64)
    - Return Bangla error messages for each invalid field
    - _Requirements: 7.2, 7.7_

  - [x] 2.4 Write property test for registration form validation
    - **Property 5: Registration form validation**
    - **Validates: Requirements 7.2, 7.7**

  - [x] 2.5 Create analytics event validation schema
    - Create `packages/shared/src/portal/analytics-validation.ts`
    - Implement Zod schema ensuring `flat_slug` is non-empty and `timestamp` is valid ISO 8601
    - _Requirements: 13.2_

  - [x] 2.6 Write property test for analytics event structure
    - **Property 9: Analytics event structure**
    - **Validates: Requirements 13.2**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Portal API routes (apps/api)
  - [x] 4.1 Implement `GET /api/portal/flat/:slug` endpoint
    - Validate slug format using shared validation
    - Query `flat_slugs` → join `flats` → join `buildings` → join `emergency_contacts`
    - Return `PortalFlatResponse` with building info, flat status, emergency contacts, and `hasPendingRegistration` flag
    - Return 400 for invalid slug, 404 for not found
    - Ensure no private data (NID, payments, contracts) is included in response
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 5.1, 9.1, 9.2_

  - [x] 4.2 Write property test for public API data exclusion
    - **Property 8: Public API data exclusion**
    - **Validates: Requirements 9.1, 9.2**

  - [x] 4.3 Implement `GET /api/portal/flat/:slug/notices` endpoint
    - Validate slug, resolve flat
    - Query public notices for the flat's building, sorted by `created_at` DESC, limited to 20
    - Truncate notice descriptions to 120 characters
    - Return `PortalNoticesResponse`
    - _Requirements: 4.1, 4.2_

  - [x] 4.4 Write property test for notice list formatting
    - **Property 3: Notice list formatting invariants**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 4.5 Implement `POST /api/portal/flat/:slug/register` endpoint
    - Validate slug and request body using shared registration schema
    - Check for duplicate pending registration (same flat + phone)
    - Upload NID photo and digital signature to S3
    - Create `registration_requests` record with PENDING_APPROVAL status
    - Return `RegistrationResponse` with Bangla confirmation
    - _Requirements: 7.5, 7.9_

  - [x] 4.6 Write property test for duplicate registration prevention
    - **Property 6: Duplicate registration prevention**
    - **Validates: Requirements 7.9**

  - [x] 4.7 Implement `POST /api/portal/flat/:slug/access` endpoint
    - Validate slug and 6-digit code format
    - Check lockout status (reject if `locked_until` > now)
    - Hash code and compare against `renter_access_codes.code_hash`
    - On failure: increment `failed_attempts`, lock after 5 consecutive failures for 15 minutes
    - On success: reset `failed_attempts`, create `portal_sessions` record (30-min expiry), set HTTP-only session cookie, return redirect URL
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 4.8 Write property test for access code rate limiting
    - **Property 7: Access code rate limiting**
    - **Validates: Requirements 8.5**

  - [x] 4.9 Implement `POST /api/portal/analytics` endpoint
    - Validate event payload using shared analytics schema
    - Insert into `analytics_events` table asynchronously (fire-and-forget)
    - Always return 200 (never fail visibly)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Portal frontend layout and page setup (apps/web)
  - [x] 6.1 Create portal layout and page route
    - Create `app/f/[flatSlug]/layout.tsx` — minimal layout without auth sidebar, with Bangla font and meta tags
    - Create `app/f/[flatSlug]/page.tsx` — server component that validates slug, fetches portal data from API, and renders portal sections
    - Create `app/f/[flatSlug]/loading.tsx` — skeleton loading state
    - Create `app/f/[flatSlug]/error.tsx` — error boundary with Bangla messages
    - _Requirements: 1.1, 1.4, 11.1, 11.5_

  - [x] 6.2 Create portal header component
    - Create `app/f/[flatSlug]/components/portal-header.tsx`
    - Display building name (truncated at 100 chars with ellipsis), flat number, logo/cover image, and status badge
    - Handle missing data with placeholder text "তথ্য পাওয়া যায়নি"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 6.3 Write property test for building name truncation
    - **Property 2: Building name truncation**
    - **Validates: Requirements 2.1**

  - [x] 6.4 Create status badge component
    - Create `app/f/[flatSlug]/components/status-badge.tsx`
    - Map flat status to colored badge: AVAILABLE → green "খালি", OCCUPIED → blue "ভাড়া হয়েছে", MAINTENANCE → orange "রক্ষণাবেক্ষণ", unknown → grey "অজানা"
    - _Requirements: 2.2, 2.3, 2.4, 2.6_

  - [x] 6.5 Write unit tests for status badge mapping
    - Test all 4 status mappings (AVAILABLE, OCCUPIED, MAINTENANCE, unknown)
    - _Requirements: 2.2, 2.3, 2.4, 2.6_

- [x] 7. Quick actions and notice board components
  - [x] 7.1 Create quick actions grid component
    - Create `app/f/[flatSlug]/components/quick-actions-grid.tsx`
    - Render 2-column grid with 48x48px minimum touch targets
    - Conditionally show WhatsApp and Call Manager buttons based on configured data
    - Include Emergency Contacts and Notices scroll-to buttons
    - Track "WhatsApp Clicked" analytics event on tap
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 7.2 Create notice board component
    - Create `app/f/[flatSlug]/components/notice-board.tsx`
    - Display notices in reverse chronological order with Bangla date formatting (DD MMM YYYY)
    - Truncate descriptions to 120 chars, expand/collapse on tap
    - Show empty state "কোনো নোটিশ নেই" when no notices
    - Track "Notice Viewed" analytics event on expand
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.3 Create emergency contacts component
    - Create `app/f/[flatSlug]/components/emergency-contacts.tsx`
    - Display contacts ordered: Owner → Manager → Caretaker → Security, then nearby services
    - Show "কল করুন" button with tel: link for contacts with phone numbers
    - Show empty state "কোনো জরুরি যোগাযোগ নেই" when no contacts
    - Track "Emergency Contact Clicked" analytics event
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 7.4 Write property test for emergency contact role ordering
    - **Property 4: Emergency contact role ordering**
    - **Validates: Requirements 5.1**

  - [x] 7.5 Create building info component
    - Create `app/f/[flatSlug]/components/building-info.tsx`
    - Render rich text building rules (HTML) in a scrollable container
    - Hide section entirely if no rules configured
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Registration and access code components
  - [x] 8.1 Create registration form component
    - Create `app/f/[flatSlug]/components/registration-form.tsx` (client component)
    - Implement all form fields with shared Zod validation schema
    - Display field-level Bangla error messages
    - Show form only when flat status is AVAILABLE, hide during MAINTENANCE
    - Preserve form data on validation errors
    - Track "Registration Started" and "Registration Submitted" analytics events
    - Submit via TanStack Query mutation to `POST /api/portal/flat/:slug/register`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [x] 8.2 Create signature pad component
    - Create `app/f/[flatSlug]/components/signature-pad.tsx` (client component)
    - Implement touch-based signature capture using canvas
    - Export signature as base64 PNG
    - Validate minimum 1 stroke
    - _Requirements: 7.2_

  - [x] 8.3 Create access code input component
    - Create `app/f/[flatSlug]/components/access-code-input.tsx` (client component)
    - Implement 6-digit numeric-only input (filter non-numeric characters)
    - Show only when flat status is OCCUPIED
    - Display Bangla error messages on invalid code
    - Display lockout message with remaining time when locked
    - Clear input on failed attempt
    - Track "Access Code Attempted" and "Access Granted" analytics events
    - Submit via TanStack Query mutation to `POST /api/portal/flat/:slug/access`
    - Redirect to `/renter/dashboard` on success
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 8.4 Write unit tests for access code input
    - Test numeric-only filtering
    - Test lockout display logic
    - Test input clearing on failure
    - _Requirements: 8.1, 8.3, 8.5_

- [x] 9. Analytics integration and session management
  - [x] 9.1 Create analytics utility
    - Create `app/f/[flatSlug]/lib/analytics.ts`
    - Implement `trackEvent(event: string, flatSlug: string, metadata?: Record<string, string>)` using `navigator.sendBeacon` with fallback to non-blocking fetch
    - Silently discard failures (no user-visible errors)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 9.2 Implement session expiry handling
    - Add session check middleware/hook that redirects to `/f/{flatSlug}` when session expires
    - Display session expired message in Bangla
    - _Requirements: 8.6_

- [x] 10. Accessibility and mobile optimization
  - [x] 10.1 Apply accessibility and responsive styles
    - Ensure minimum 16px font size across all portal components
    - Ensure 48x48px touch targets with 8px spacing
    - Ensure WCAG AA contrast ratios (4.5:1 normal text, 3:1 large text)
    - Ensure no horizontal scrolling on 360px–768px viewports
    - Add icons alongside text for all interactive elements
    - Support pinch-to-zoom up to 200% without layout breakage
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.8, 10.9_

  - [x] 10.2 Write unit tests for responsive rendering
    - Test no horizontal overflow at 360px viewport
    - Test touch target sizes meet 48x48px minimum
    - _Requirements: 10.2, 10.6_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript, Next.js App Router, Fastify, Drizzle ORM, TanStack Query, Zod, and fast-check
- All user-facing text must be in Bangla
- S3 upload for NID photos and signatures uses existing infrastructure patterns in the codebase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6"] },
    { "id": 3, "tasks": ["4.1", "4.3", "4.5", "4.7", "4.9"] },
    { "id": 4, "tasks": ["4.2", "4.4", "4.6", "4.8"] },
    { "id": 5, "tasks": ["6.1", "6.4", "9.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "6.5", "7.1", "7.2", "7.3", "7.5"] },
    { "id": 7, "tasks": ["7.4", "8.1", "8.2", "8.3"] },
    { "id": 8, "tasks": ["8.4", "9.2", "10.1"] },
    { "id": 9, "tasks": ["10.2"] }
  ]
}
```
