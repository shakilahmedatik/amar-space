# Requirements Document

## Introduction

This feature provides the frontend user interface for generating, previewing, downloading, and printing QR codes for flats in the AmarSpace platform. The UI integrates with the existing backend QR code generation API (`GET /api/flats/:id/qr-code` for single flat, `GET /api/buildings/:id/qr-codes` for bulk) and is accessible from the flat detail page and building detail page. The interface supports Bangla and English languages, is fully responsive, and meets WCAG 2.1 AA accessibility standards.

## Glossary

- **QR_Code_Dialog**: The modal dialog component that displays the generated QR code preview with download and print actions
- **QR_Code_Button**: The trigger button on the flat detail page that initiates QR code generation
- **Size_Selector**: The UI control that allows users to choose QR code pixel dimensions before generation
- **Bulk_Download_Button**: The trigger button on the building detail page that initiates bulk QR code ZIP download
- **Flat_Detail_Page**: The existing page at `/flats/[id]` that displays flat information and actions
- **Building_Detail_Page**: The existing page at `/buildings/[id]` that displays building information and flat list
- **QR_Code_Hook**: The TanStack Query hook that manages QR code API requests and caching
- **Toast_Feedback**: The notification component that displays success or error messages to the user

## Requirements

### Requirement 1: QR Code Generation Trigger

**User Story:** As an owner or manager, I want to see a QR code generation button on the flat detail page, so that I can generate a QR code for a specific flat.

#### Acceptance Criteria

1. WHEN an owner or manager views the Flat_Detail_Page, THE QR_Code_Button SHALL be visible in the actions section of the page, regardless of the flat's current status
2. WHILE the user has the "renter" role, THE Flat_Detail_Page SHALL hide the QR_Code_Button
3. WHEN the user clicks the QR_Code_Button, THE QR_Code_Dialog SHALL open and display a loading indicator while initiating a QR code generation request to `GET /api/flats/:id/qr-code`
4. THE QR_Code_Button SHALL display a QR code icon from lucide-react alongside a localized label
5. WHEN the QR code generation request succeeds, THE QR_Code_Dialog SHALL display the QR code image and a download button to save the image as a PNG file
6. IF the QR code generation request fails, THEN THE QR_Code_Dialog SHALL display an error message indicating the failure reason and a retry button to re-initiate the request

### Requirement 2: QR Code Size Customization

**User Story:** As an owner or manager, I want to choose the QR code size before generating it, so that I can produce codes suitable for different printing contexts.

#### Acceptance Criteria

1. WHEN the QR_Code_Dialog opens, THE Size_Selector SHALL display exactly four preset size options: 200px, 300px, 500px, and 800px, and SHALL NOT allow free-text or custom value entry
2. THE Size_Selector SHALL default to 300px as the selected size when no prior selection exists in the current dialog session
3. WHEN the user selects a different size from the Size_Selector, THE QR_Code_Hook SHALL immediately include the newly selected size as the `size` query parameter in a new API request, replacing any previously displayed QR code with a loading state until the new image is fetched
4. THE Size_Selector SHALL only offer values within the range 100–1000 pixels as accepted by the backend API, ensuring all preset options conform to this constraint
5. IF the QR_Code_Hook receives an error response after a size change, THEN THE QR_Code_Dialog SHALL display the error state and the Size_Selector SHALL remain enabled to allow the user to select a different size

### Requirement 3: QR Code Preview Display

**User Story:** As an owner or manager, I want to see a preview of the generated QR code in a dialog, so that I can verify it before downloading or printing.

#### Acceptance Criteria

1. WHEN the QR code image is successfully fetched, THE QR_Code_Dialog SHALL display the QR code image centered within the dialog body at a minimum rendered size of 200x200 pixels
2. THE QR_Code_Dialog SHALL display the flat number and building name as text labels above the QR code image
3. WHILE the QR code request is in progress, THE QR_Code_Dialog SHALL display a loading spinner with a localized "Generating..." message
4. IF the QR code request does not receive a response within 15 seconds, THEN THE QR_Code_Dialog SHALL treat the request as failed
5. IF the QR code request fails, THEN THE QR_Code_Dialog SHALL display a localized error message and a retry button that re-initiates the QR code generation request when activated
6. THE QR_Code_Dialog SHALL render the QR code image with an alt text attribute containing the flat number and building name

### Requirement 4: QR Code Download

**User Story:** As an owner or manager, I want to download the generated QR code as a PNG file, so that I can save it locally for printing or sharing.

#### Acceptance Criteria

1. WHEN the QR code image is displayed in the QR_Code_Dialog, THE QR_Code_Dialog SHALL show a download button labeled with a localized download action text
2. WHEN the user clicks the download button, THE QR_Code_Dialog SHALL trigger a browser file download of the QR code as a PNG image with the filename pattern `{flat_number}_qr.png`, where non-alphanumeric characters in flat_number are replaced with underscores
3. WHILE the QR code is being generated or loaded, THE download button SHALL be displayed in a disabled state
4. IF QR code generation has failed, THEN THE download button SHALL be displayed in a disabled state
5. WHEN the download completes successfully, THE Toast_Feedback SHALL display a localized success message for a duration of 4 seconds
6. IF the file download fails, THEN THE Toast_Feedback SHALL display a localized error message indicating the download could not be completed, for a duration of 4 seconds

### Requirement 5: QR Code Print

**User Story:** As an owner or manager, I want to print the QR code directly from the dialog, so that I can quickly produce a physical copy without downloading first.

#### Acceptance Criteria

1. WHEN the QR code image is displayed in the QR_Code_Dialog, THE QR_Code_Dialog SHALL show a print button
2. WHEN the user clicks the print button, THE QR_Code_Dialog SHALL open the browser print dialog with a print layout containing only the flat number, building name, and the QR code image
3. WHILE the QR code is loading, THE print button SHALL be disabled
4. IF QR code generation has failed, THEN THE print button SHALL be disabled and THE QR_Code_Dialog SHALL display an error message indicating that printing is unavailable
5. THE print layout SHALL display the flat number and building name as a header above the QR code image, with the QR code rendered at a minimum size of 200x200 pixels to ensure scannability when printed

### Requirement 6: Bulk QR Code Download

**User Story:** As an owner or manager, I want to download QR codes for all flats in a building as a ZIP file, so that I can efficiently print codes for an entire property.

#### Acceptance Criteria

1. WHEN an owner or manager views the Building_Detail_Page, THE Bulk_Download_Button SHALL be visible in the building actions area
2. WHILE the user has the "renter" role, THE Building_Detail_Page SHALL hide the Bulk_Download_Button
3. WHEN the user clicks the Bulk_Download_Button, THE QR_Code_Hook SHALL send a request to `GET /api/buildings/:id/qr-codes` and THE Bulk_Download_Button SHALL display a loading indicator and become disabled until the request completes or times out after 30 seconds
4. WHEN the ZIP file is successfully received, THE QR_Code_Hook SHALL trigger a file download with the filename pattern `{building_name}_qr_codes.zip` where special characters in the building name are replaced with underscores, and THE Bulk_Download_Button SHALL return to its default enabled state
5. IF the bulk download request fails due to a network error, server error, or timeout, THEN THE Toast_Feedback SHALL display a localized error message for 5 seconds and THE Bulk_Download_Button SHALL return to its default enabled state
6. IF the bulk download request returns an error indicating the building has no flats, THEN THE Toast_Feedback SHALL display a localized message indicating no QR codes are available for download

### Requirement 7: Loading and Error States

**User Story:** As a user, I want clear feedback during QR code operations, so that I understand what is happening and can recover from errors.

#### Acceptance Criteria

1. WHILE a QR code generation request is in progress, THE QR_Code_Dialog SHALL display a spinner in place of the image area
2. IF the API returns a 403 error, THEN THE Toast_Feedback SHALL display a localized "permission denied" message for 5 seconds before auto-dismissing
3. IF the API returns a 404 error, THEN THE Toast_Feedback SHALL display a localized "flat not found" message for 5 seconds before auto-dismissing
4. IF a network error occurs during QR code generation (including connection timeout, DNS failure, or server unreachable), THEN THE QR_Code_Dialog SHALL display a localized "connection error" message with a retry button
5. WHEN the user clicks the retry button, THE QR_Code_Hook SHALL re-execute the failed request with the same parameters
6. IF the QR code generation request does not receive a response within 15 seconds, THEN THE QR_Code_Hook SHALL abort the request and treat it as a network error
7. IF the retry attempt fails 3 consecutive times, THEN THE QR_Code_Dialog SHALL disable the retry button and display a localized message indicating the user should try again later

### Requirement 8: Responsive Design

**User Story:** As a user on a mobile device, I want the QR code interface to work well on small screens, so that I can generate and view QR codes from my phone.

#### Acceptance Criteria

1. THE QR_Code_Dialog SHALL render as a full-screen sheet (100% viewport width and height) on viewports narrower than 640px and as a centered modal with a maximum width of 480px on wider viewports
2. THE QR_Code_Button SHALL maintain a minimum touch target of 44x44 pixels on all viewport sizes
3. THE Size_Selector SHALL stack vertically on viewports narrower than 640px and display inline on wider viewports
4. THE QR code image preview SHALL scale to a maximum width of 100% of the dialog content area while maintaining its aspect ratio, with a minimum rendered size of 150x150 pixels
5. WHILE the viewport is narrower than 640px, ALL interactive elements within the QR_Code_Dialog (including download and print buttons) SHALL maintain a minimum touch target of 44x44 pixels

### Requirement 9: Accessibility Compliance

**User Story:** As a user with assistive technology, I want the QR code interface to be fully accessible, so that I can operate all features using a keyboard or screen reader.

#### Acceptance Criteria

1. WHILE the QR_Code_Dialog is open, THE QR_Code_Dialog SHALL trap focus so that Tab and Shift+Tab cycle only through interactive elements within the dialog in DOM order
2. WHEN the QR_Code_Dialog is closed, THE QR_Code_Dialog SHALL return focus to the QR_Code_Button that triggered it
3. WHEN the user presses the Escape key while the QR_Code_Dialog is open, THE QR_Code_Dialog SHALL close and return focus to the QR_Code_Button
4. THE QR_Code_Button SHALL have an aria-label attribute containing the text "Generate QR code" followed by the flat identifier, localized to the current application language
5. THE Size_Selector SHALL be operable via keyboard navigation (arrow keys for selection, Enter/Space to confirm)
6. THE QR code image SHALL include a descriptive alt attribute in the format: "QR code for flat {flat_number} in {building_name}"
7. ALL interactive elements within the QR_Code_Dialog SHALL have a minimum contrast ratio of 4.5:1 against their background
8. THE QR_Code_Dialog SHALL have role="dialog", aria-modal="true", and an aria-labelledby attribute referencing the dialog's visible heading text

### Requirement 10: Internationalization

**User Story:** As a Bangla-speaking user, I want all QR code interface text in Bangla, so that I can use the feature in my preferred language.

#### Acceptance Criteria

1. THE QR_Code_Dialog SHALL display all labels, buttons, and messages using translation keys resolved via the useTranslation hook, including: dialog title, size selector label, size option labels, download button label, print button label, close button label, loading message, error messages, and retry button label
2. THE QR_Code_Button label SHALL be localized for both Bangla ("কিউআর কোড") and English ("QR Code")
3. THE Toast_Feedback messages for success, error, and permission states SHALL have corresponding translation keys defined in both the Bangla (bn) and English (en) locale dictionaries
4. WHEN the user's language preference changes via the setLocale function, THE QR_Code_Dialog SHALL reflect the new language without requiring a page reload or re-opening the dialog
5. IF a translation key used by the QR code feature is missing from the active locale dictionary, THEN THE QR_Code_Dialog SHALL fall back to the English translation for that key
