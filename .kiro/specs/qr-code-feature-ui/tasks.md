# Implementation Plan: QR Code Feature UI

## Overview

Implement the frontend QR code generation, preview, download, and print functionality for the AmarSpace platform. This covers utility functions, TanStack Query hooks, UI components (dialog, buttons, size selector, preview), integration into existing flat/building detail pages, i18n translation keys, and comprehensive testing. The implementation uses TypeScript, React 19, Next.js 16 App Router, TanStack Query v5, Radix UI Dialog, and Tailwind CSS v4.

## Tasks

- [x] 1. Create utility functions and i18n translation keys
  - [x] 1.1 Create `apps/web/lib/qr-code-utils.ts` with `sanitizeFilename`, `getQrFilename`, `getBulkQrFilename`, `downloadBlob`, and `printQrCode` functions
    - `sanitizeFilename` replaces non-alphanumeric characters (except Bengali Unicode U+0980–U+09FF and hyphens) with underscores
    - `getQrFilename(flatNumber)` returns `{sanitized}_qr.png`
    - `getBulkQrFilename(buildingName)` returns `{sanitized}_qr_codes.zip`
    - `downloadBlob(blob, filename)` creates an anchor element, triggers download, and revokes the object URL
    - `printQrCode(blobUrl, flatNumber, buildingName)` creates a hidden iframe with print layout containing flat number, building name, and QR image at minimum 200×200px, then calls `window.print()`
    - _Requirements: 4.2, 5.2, 5.5, 6.4_

  - [x] 1.2 Add QR code translation keys to both English (en) and Bangla (bn) locale dictionaries
    - Add all keys under the `qrCode` namespace as defined in the design: button, dialogTitle, sizeLabel, size options, generating, download, print, close, retry, tryAgainLater, downloadSuccess, downloadError, connectionError, permissionDenied, flatNotFound, bulkDownload, bulkDownloadSuccess, bulkDownloadError, noQrCodesAvailable, generateAriaLabel, imageAlt
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

  - [x] 1.3 Write property test for filename sanitization (Property 2)
    - **Property 2: Filename sanitization preserves safety**
    - For any input string, `sanitizeFilename` output contains only alphanumeric characters, Bengali Unicode (U+0980–U+09FF), hyphens, and underscores
    - Location: `apps/web/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 4.2, 6.4**

  - [x] 1.4 Write property test for translation key completeness (Property 6)
    - **Property 6: Translation key completeness**
    - For any translation key used by the QR code feature, the key resolves to a non-empty string in both bn and en locale dictionaries
    - Location: `apps/web/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 10.1, 10.3**

- [x] 2. Implement TanStack Query hooks
  - [x] 2.1 Create `apps/web/hooks/use-qr-code.ts` implementing the `useQrCode` hook
    - Uses `useQuery` with `queryKey: ['qr-code', flatId, size]`
    - Fetches `GET /api/flats/:id/qr-code?size={size}&format=image` as a blob
    - 15-second timeout via AbortController
    - `staleTime: 5 * 60 * 1000`
    - `enabled` controlled by dialog open state
    - Tracks retry count via `useRef`; increments on error, resets on success
    - `retry()` invalidates the specific query key
    - `isRetryDisabled` returns true when retryCount >= 3
    - Cleans up blob URLs via `useEffect` cleanup
    - _Requirements: 1.3, 2.3, 3.3, 3.4, 7.1, 7.5, 7.6, 7.7_

  - [x] 2.2 Create `apps/web/hooks/use-bulk-qr-download.ts` implementing the `useBulkQrDownload` hook
    - Uses `useMutation` for user-triggered one-shot action
    - Fetches `GET /api/buildings/:id/qr-codes?size=300` as a blob
    - 30-second timeout via AbortController
    - On success: triggers file download with `getBulkQrFilename(buildingName)`
    - On error: shows toast with appropriate message based on HTTP status (403, 404, 5xx, network error)
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [x] 2.3 Write property test for size parameter correctness (Property 4)
    - **Property 4: Size selection triggers correct API parameter**
    - For any size value from preset options (200, 300, 500, 800), the `useQrCode` hook includes that exact value as the `size` query parameter
    - Location: `apps/web/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 2.3**

- [x] 3. Checkpoint - Ensure utility functions and hooks compile correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement UI components
  - [x] 4.1 Create `apps/web/components/qr-code/size-selector.tsx` implementing the SizeSelector component
    - Radix RadioGroup with four preset options: 200, 300, 500, 800
    - Default value: 300
    - Keyboard accessible (arrow keys navigate, Enter/Space selects)
    - Layout: inline (`flex-row`) on ≥640px, stacked (`flex-col`) on <640px
    - Minimum touch target 44×44px per option
    - Localized labels via `useTranslation`
    - _Requirements: 2.1, 2.2, 2.4, 8.3, 9.5_

  - [x] 4.2 Create `apps/web/components/qr-code/qr-code-preview.tsx` implementing the QrCodePreview component
    - Displays flat number and building name as header labels above the image
    - Shows QR code image with descriptive alt text: "QR code for flat {flatNumber} in {buildingName}"
    - Image: `max-w-full`, maintains aspect ratio, min 200×200px (150×150px on mobile)
    - Loading state: centered spinner with localized "Generating..." text
    - Error state: localized error message + retry button (disabled after 3 failures)
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 7.7, 8.4_

  - [x] 4.3 Create `apps/web/components/qr-code/qr-code-dialog.tsx` implementing the QrCodeDialog component
    - Built on `@radix-ui/react-dialog` with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
    - Contains: title, SizeSelector, QrCodePreview, action buttons (download, print, close)
    - Download button: triggers `downloadBlob` with `getQrFilename(flatNumber)`, shows success/error toast
    - Print button: triggers `printQrCode` with current blobUrl
    - Both buttons disabled during loading and error states
    - Responsive: full-screen sheet below 640px, centered modal (max-w-[480px]) above 640px
    - Focus trap, Escape-to-close, focus return handled by Radix
    - _Requirements: 1.3, 1.5, 1.6, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.4, 7.5, 7.6, 7.7, 8.1, 8.5, 9.1, 9.2, 9.3, 9.7, 9.8_

  - [x] 4.4 Create `apps/web/components/qr-code/qr-code-button.tsx` implementing the QrCodeButton component
    - Renders a Button with `QrCode` icon from lucide-react and localized label
    - Minimum touch target: 44×44px
    - `aria-label`: localized "Generate QR code for flat {flatNumber}"
    - Only rendered when user role is `owner` or `manager` (visibility controlled by parent)
    - _Requirements: 1.1, 1.2, 1.4, 8.2, 9.4_

  - [x] 4.5 Create `apps/web/components/qr-code/bulk-qr-download-button.tsx` implementing the BulkQrDownloadButton component
    - Renders a Button with `Download` icon and localized "Download All QR Codes" label
    - Shows loading spinner and becomes disabled during download
    - Only rendered when user role is `owner` or `manager`
    - Minimum touch target: 44×44px
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.6 Write property test for role-based visibility (Property 1)
    - **Property 1: Role-based visibility of QR actions**
    - For any user role, QrCodeButton and BulkQrDownloadButton are visible iff role is "owner" or "manager"; hidden for "renter"
    - Location: `apps/web/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 1.1, 1.2, 6.1, 6.2**

  - [x] 4.7 Write property test for dialog metadata display (Property 3)
    - **Property 3: Dialog displays flat metadata in labels and alt text**
    - For any flat number and building name, when QR code is loaded, the dialog displays both as visible text and in the image alt attribute
    - Location: `apps/web/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 3.2, 3.6, 9.6**

  - [x] 4.8 Write property test for aria-label content (Property 5)
    - **Property 5: Aria-label contains flat identifier**
    - For any flat number string and supported locale, the QrCodeButton's aria-label contains both the localized "Generate QR code" text and the flat number value
    - Location: `apps/web/tests/properties/qr-code.property.test.ts`
    - **Validates: Requirements 9.4**

- [x] 5. Checkpoint - Ensure all components compile and render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate into existing pages
  - [x] 6.1 Integrate QrCodeButton and QrCodeDialog into `apps/web/app/flats/[id]/page.tsx`
    - Add QrCodeButton in the actions section (visible only for owner/manager roles)
    - Add controlled dialog state (`open`, `onOpenChange`)
    - Pass `flatId`, `flatNumber`, and `buildingName` from the flat data to both components
    - Wire the QrCodeButton click to open the QrCodeDialog
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.2 Integrate BulkQrDownloadButton into the building detail page
    - Add BulkQrDownloadButton in the building actions area (visible only for owner/manager roles)
    - Pass `buildingId` and `buildingName` from the building data
    - _Requirements: 6.1, 6.2_

- [x] 7. Write unit and integration tests
  - [x] 7.1 Write unit tests for QrCodeDialog component
    - Test loading state renders spinner and localized "Generating..." message
    - Test success state renders image, download button, print button
    - Test error state renders error message and retry button
    - Test retry button disables after 3 consecutive failures
    - Test download and print buttons are disabled during loading and error states
    - Test responsive layout: full-screen sheet below 640px, centered modal above
    - Location: `apps/web/tests/qr-code-dialog.test.tsx`
    - _Requirements: 3.1, 3.3, 3.5, 4.3, 4.4, 5.3, 5.4, 7.1, 7.7, 8.1_

  - [x] 7.2 Write unit tests for SizeSelector component
    - Test defaults to 300px
    - Test displays exactly 4 options (200, 300, 500, 800)
    - Test keyboard navigation (arrow keys, Enter/Space)
    - Location: `apps/web/tests/size-selector.test.tsx`
    - _Requirements: 2.1, 2.2, 9.5_

  - [x] 7.3 Write unit tests for utility functions
    - Test `sanitizeFilename` with various inputs (special chars, Bengali text, empty string)
    - Test `getQrFilename` produces correct pattern
    - Test `getBulkQrFilename` produces correct pattern
    - Location: `apps/web/tests/qr-code-utils.test.ts`
    - _Requirements: 4.2, 6.4_

  - [x] 7.4 Write integration tests for QR code flow
    - Test full flow: open dialog → select size → verify API call → verify image display → download
    - Test bulk download: click button → verify API call → verify file download triggered
    - Test error recovery: simulate network failure → retry → succeed on second attempt
    - Test timeout: simulate slow response → verify abort after 15s → verify error state
    - Location: `apps/web/tests/qr-code-integration.test.tsx`
    - _Requirements: 1.3, 2.3, 4.2, 6.3, 7.4, 7.5, 7.6_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend API endpoints already exist — this implementation covers only the client-side UI layer
- All components use the existing `useTranslation` hook for i18n and fall back to English for missing keys
- Radix UI Dialog handles focus trap, Escape-to-close, and focus return automatically

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 4, "tasks": ["4.6", "4.7", "4.8", "6.1", "6.2"] },
    { "id": 5, "tasks": ["7.1", "7.2", "7.3", "7.4"] }
  ]
}
```
