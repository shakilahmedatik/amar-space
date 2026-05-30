# Requirements Document

## Introduction

This feature enables the AmarSpace platform to generate QR codes for individual flats. Each QR code encodes a unique identifier or URL that links to the flat's details, allowing property owners and managers to print and affix QR codes to physical locations. Renters or visitors can scan the QR code to access flat information, submit maintenance requests, or verify flat identity.

## Glossary

- **QR_Code_Generator**: The system component responsible for creating QR code images from flat data
- **Flat**: A residential unit within a building, identified by a unique ID, building association, and flat number
- **Owner**: A user with the "owner" role who has full management access to their properties
- **Manager**: A user with the "manager" role who has limited management access to assigned buildings
- **QR_Payload**: The data encoded within the QR code (typically a URL or flat identifier)
- **API**: The Fastify-based backend service that handles HTTP requests

## Requirements

### Requirement 1: Generate QR Code for a Flat

**User Story:** As an owner or manager, I want to generate a QR code for a specific flat, so that I can print it and affix it to the flat's entrance for identification purposes.

#### Acceptance Criteria

1. WHEN an authenticated owner or manager requests QR code generation for a valid flat ID, THE QR_Code_Generator SHALL produce a QR code image encoding the flat's unique identifier
2. THE QR_Code_Generator SHALL return the QR code as a PNG image with a minimum resolution of 200x200 pixels
3. WHEN a QR code is generated, THE QR_Code_Generator SHALL encode a URL containing the flat ID that resolves to the flat's detail page
4. IF the specified flat ID does not exist, THEN THE API SHALL return a 404 error with a descriptive message
5. IF the requesting user does not have access to the flat's building, THEN THE API SHALL return a 403 error

### Requirement 2: Access Control for QR Code Generation

**User Story:** As a platform administrator, I want QR code generation restricted to authorized users, so that only legitimate property stakeholders can create QR codes for their flats.

#### Acceptance Criteria

1. THE API SHALL require authentication for all QR code generation requests
2. WHILE a user has the "owner" role, THE API SHALL allow QR code generation for any flat belonging to the owner's account
3. WHILE a user has the "manager" role, THE API SHALL allow QR code generation only for flats within the manager's assigned buildings
4. IF an unauthenticated request is received, THEN THE API SHALL return a 401 error

### Requirement 3: QR Code Content Structure

**User Story:** As a developer, I want the QR code to encode a standardized URL format, so that scanning the code leads to a consistent and predictable destination.

#### Acceptance Criteria

1. THE QR_Code_Generator SHALL encode a URL in the format: `{base_url}/flats/{flat_id}`
2. THE QR_Code_Generator SHALL use the configured application base URL as the URL prefix
3. THE QR_Code_Generator SHALL produce QR codes that conform to the ISO/IEC 18004 standard
4. FOR ALL valid flat IDs, generating a QR code then decoding the QR code image SHALL yield the original encoded URL (round-trip property)

### Requirement 4: QR Code Image Customization

**User Story:** As an owner, I want to optionally customize the QR code size, so that I can generate codes suitable for different printing contexts.

#### Acceptance Criteria

1. WHERE a custom size parameter is provided, THE QR_Code_Generator SHALL produce a QR code image at the specified pixel dimensions
2. THE QR_Code_Generator SHALL accept size values between 100 and 1000 pixels
3. IF a size value outside the valid range is provided, THEN THE API SHALL return a 400 error with a message indicating the valid range
4. WHEN no size parameter is provided, THE QR_Code_Generator SHALL default to 300x300 pixels

### Requirement 5: Bulk QR Code Generation

**User Story:** As an owner, I want to generate QR codes for all flats in a building at once, so that I can efficiently print codes for an entire property.

#### Acceptance Criteria

1. WHEN an owner requests bulk QR code generation for a building, THE QR_Code_Generator SHALL produce QR codes for all flats in the specified building
2. THE API SHALL return bulk QR codes as a single downloadable ZIP archive containing individual PNG files
3. THE QR_Code_Generator SHALL name each file in the archive using the pattern: `{building_name}_{flat_number}.png`
4. IF the specified building has no flats, THEN THE API SHALL return a 400 error with a descriptive message
5. WHILE a user has the "manager" role, THE API SHALL restrict bulk generation to buildings assigned to the manager

### Requirement 6: QR Code Metadata Response

**User Story:** As a developer integrating with the API, I want the QR code endpoint to return useful metadata alongside the image, so that I can display contextual information in the UI.

#### Acceptance Criteria

1. WHEN a QR code is generated with a metadata request, THE API SHALL return a JSON response containing the flat ID, flat number, building name, and the encoded URL
2. THE API SHALL support a query parameter to choose between image-only response and metadata-with-base64-image response
3. WHEN the metadata format is requested, THE QR_Code_Generator SHALL encode the QR code image as a base64 string within the JSON response
