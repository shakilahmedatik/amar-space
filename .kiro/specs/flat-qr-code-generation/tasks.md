# Implementation Plan: Flat QR Code Generation

## Overview

This plan implements QR code generation for flats in the AmarSpace platform. It covers installing dependencies, creating the `QrCodeService`, adding route handlers for single and bulk QR code generation, wiring routes into the app, and writing property-based and unit tests.

## Tasks

- [x] 1. Install dependencies and set up project structure
  - [x] 1.1 Install npm packages for QR code generation
    - Add `qrcode` and `archiver` as production dependencies in `apps/api`
    - Add `@types/qrcode`, `@types/archiver`, and `jsqr` as dev dependencies in `apps/api`
    - Run `pnpm install` to update lockfile
    - _Requirements: 1.1, 5.2_

- [x] 2. Implement QrCodeService
  - [x] 2.1 Create the QrCodeService class
    - Create `apps/api/src/services/qr-code.ts`
    - Implement `buildFlatUrl(flatId: string): string` using `AUTH_BASE_URL` env variable
    - Implement `validateSize(size?: number): number` with range [100, 1000] and default 300
    - Implement `generateQrCode(flatId: string, options?: QrCodeOptions): Promise<Buffer>` using the `qrcode` library
    - Implement `generateQrCodeWithMetadata(flat, buildingName, options): Promise<QrCodeMetadata>` returning base64-encoded image with metadata
    - Implement `generateBulkZipStream(flats, buildingName, options): Promise<Readable>` using `archiver` for ZIP streaming
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 6.1, 6.3_

  - [x] 2.2 Write property test: QR Code Round-Trip
    - **Property 1: QR Code Round-Trip**
    - Generate QR code for arbitrary flat IDs and decode the PNG to verify the encoded URL matches `{base_url}/flats/{flat_id}`
    - Place in `apps/api/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 1.1, 1.3, 3.1, 3.4**

  - [x] 2.3 Write property test: Size Parameter Controls Output Dimensions
    - **Property 2: Size Parameter Controls Output Dimensions**
    - For valid sizes [100, 1000], verify generated image dimensions match. For invalid sizes, verify validation error is thrown.
    - Place in `apps/api/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 1.2, 4.1, 4.2, 4.3**

  - [x] 2.4 Write unit tests for QrCodeService
    - Test default size (300x300) when no size parameter provided
    - Test `buildFlatUrl` produces correct URL format
    - Test `validateSize` rejects values outside [100, 1000]
    - Test `generateQrCodeWithMetadata` returns all required fields
    - Place in `apps/api/tests/unit/qr-code-service.test.ts`
    - _Requirements: 3.1, 4.4, 6.1, 6.3_

- [x] 3. Implement single flat QR code route
  - [x] 3.1 Create the flat QR code route handler
    - Create `apps/api/src/routes/flat-qr-code.ts`
    - Implement `GET /api/flats/:id/qr-code` endpoint
    - Apply middleware: `authGuard`, `roleGuard(['owner', 'manager'])`, `approvalGuard`, `tenantScope`
    - Add Zod validation for `id` param (UUID), `size` query (100-1000, default 300), `format` query ('image' | 'metadata')
    - Verify flat exists and belongs to user's `ownerAccountId`
    - For managers, verify flat's `buildingId` is in `assignedBuildingIds`
    - Return PNG image with `Content-Type: image/png` for image format
    - Return JSON metadata with base64 image for metadata format
    - Handle 400, 401, 403, 404 error responses
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3_

  - [x] 3.2 Write property test: Tenant-Scoped Access Control
    - **Property 3: Tenant-Scoped Access Control**
    - Verify owner can access flats within their `ownerAccountId`, manager can only access flats in `assignedBuildingIds`, all other combinations are denied
    - Place in `apps/api/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 2.2, 2.3, 5.5**

  - [x] 3.3 Write property test: Metadata Response Completeness
    - **Property 5: Metadata Response Completeness**
    - For any flat with a valid building association, metadata format response contains flatId, flatNumber, buildingName, encodedUrl, and valid base64 PNG
    - Place in `apps/api/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 6.1, 6.3**

- [x] 4. Implement bulk QR code generation route
  - [x] 4.1 Create the building bulk QR code route handler
    - Create `apps/api/src/routes/building-qr-codes.ts`
    - Implement `GET /api/buildings/:id/qr-codes` endpoint
    - Apply middleware: `authGuard`, `roleGuard(['owner', 'manager'])`, `approvalGuard`, `tenantScope`
    - Add Zod validation for `id` param (UUID), `size` query (100-1000, default 300)
    - Verify building exists and belongs to user's `ownerAccountId`
    - For managers, verify building is in `assignedBuildingIds`
    - Query all flats for the building
    - Return 400 if building has no flats
    - Stream ZIP archive with `Content-Type: application/zip` and `Content-Disposition: attachment; filename="{building_name}_qr_codes.zip"`
    - Each file named `{building_name}_{flat_number}.png`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 2.1, 2.2, 2.3_

  - [x] 4.2 Write property test: Bulk Generation Produces Complete ZIP Archive
    - **Property 4: Bulk Generation Produces Complete ZIP Archive**
    - For any building with N flats (N ≥ 1), verify ZIP contains exactly N PNG files with correct naming pattern and each decodes to the correct flat URL
    - Place in `apps/api/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Wire routes and finalize integration
  - [x] 6.1 Register QR code routes in the application
    - Register flat QR code route in `apps/api/src/app.ts` under the existing `/api/flats` prefix
    - Register building QR codes route in `apps/api/src/app.ts` under the existing `/api/buildings` prefix
    - Add OpenAPI tag for QR code endpoints
    - _Requirements: 1.1, 5.1_

  - [x] 6.2 Write integration tests for QR code endpoints
    - Test full request lifecycle through middleware stack for single flat QR code
    - Test full request lifecycle for bulk building QR codes
    - Test auth rejection for unauthenticated requests (401)
    - Test role-based access verification (403 for unauthorized)
    - Test 404 for non-existent flat/building
    - Test Content-Type headers (image/png for image, application/json for metadata, application/zip for bulk)
    - Place in `apps/api/tests/integration/qr-code.test.ts`
    - _Requirements: 1.4, 1.5, 2.1, 2.4, 5.4_

- [x] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The `AUTH_BASE_URL` environment variable is reused as the public-facing base URL for QR code content
- No database migrations are needed — the feature operates on existing `flats` and `buildings` tables

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "6.1"] },
    { "id": 4, "tasks": ["6.2"] }
  ]
}
```
