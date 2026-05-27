# Requirements Document

## Introduction

AmarSpace is a Bangla-first, mobile-first apartment management system targeting Bangladeshi apartment owners, managers, and renters. This document defines the complete application-level requirements covering user authentication flows, role-based access control, renter registration, building and flat management, billing and payments, advance deposit management, maintenance and issue tracking, notice distribution, and audit logging. The system operates as a multi-tenant SaaS platform with elderly-friendly interfaces and Bangla-first UX priority.

## Glossary

- **Auth_Service**: The application-level authentication service handling user registration, login, session management, and role assignment via Better Auth
- **Role_System**: The role-based access control system managing Owner, Manager, and Renter permissions
- **Registration_Service**: The service handling renter onboarding including personal data collection, NID verification, and contract creation
- **Building_Manager**: The module responsible for creating, updating, and organizing buildings, floors, and flats
- **Flat_Manager**: The sub-module of Building_Manager handling individual flat/unit lifecycle within buildings
- **Billing_Service**: The module generating monthly rent bills, tracking utility charges, and managing payment records
- **Payment_Processor**: The component recording payment transactions and updating billing status
- **Deposit_Manager**: The module tracking security deposits, advance adjustments, and remaining balances
- **Maintenance_Tracker**: The module handling maintenance requests, issue tracking, and status management
- **Notice_Service**: The module creating, distributing, and managing notices with role-based visibility
- **Audit_Service**: The application-level audit logging service recording all trackable actions with actor context
- **Owner**: A user role with full administrative access to all buildings, flats, tenants, and financial data within their account
- **Manager**: A user role with delegated access to assigned buildings, limited to operational tasks
- **Renter**: A user role with access limited to their own flat, bills, payments, and maintenance requests
- **NID**: National Identity Document number, a mandatory field for renter registration in Bangladesh
- **Rental_Contract**: The agreement record linking a Renter to a Flat with terms including rent amount, start date, and deposit
- **Advance_Adjustment**: A record of partial or full deduction from a renter's security deposit applied against a bill or as a manual adjustment
- **Flat**: An individual residential unit within a building, identified by floor and unit number
- **Building**: A physical apartment building containing multiple floors and flats managed by an Owner or Manager

## Requirements

### Requirement 1: User Registration and Onboarding

**User Story:** As a property owner, I want to register on AmarSpace with my email and password, so that I can set up my account and begin managing my properties.

#### Acceptance Criteria

1. WHEN a new user submits a registration form with a valid email address and a password between 8 and 128 characters, THE Auth_Service SHALL create a new user account and assign the Owner role by default
2. WHEN a user registers, THE Auth_Service SHALL hash the password using a secure hashing algorithm before storing it in the database
3. IF a registration attempt uses an email address already associated with an existing account, THEN THE Auth_Service SHALL reject the registration and return an error indicating the email is already in use without revealing account details
4. WHEN registration succeeds, THE Auth_Service SHALL create a session and return a session token to the client
5. THE Auth_Service SHALL validate that the email field conforms to a standard email format with a maximum length of 254 characters, normalize the email to lowercase before storage and duplicate checking, and validate that the password contains between 8 and 128 characters with at least one uppercase letter, one lowercase letter, and one digit
6. IF registration input fails validation, THEN THE Auth_Service SHALL return field-level error messages identifying each invalid field and the specific validation rule that failed
7. IF account creation succeeds but session creation fails, THEN THE Auth_Service SHALL still persist the created account and return an error indicating the user should sign in manually
8. IF the same IP address submits more than 10 registration attempts within a 15-minute window, THEN THE Auth_Service SHALL reject further registration requests from that IP and return an error indicating rate limit exceeded

### Requirement 2: User Login and Session Management

**User Story:** As a registered user, I want to log in with my email and password, so that I can access my dashboard and manage my properties.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_Service SHALL authenticate the user, create a session, and return a session token to the client
2. IF a login attempt provides incorrect credentials, THEN THE Auth_Service SHALL return a generic authentication failure message without indicating whether the email or password was incorrect
3. IF a user fails authentication 5 consecutive times for the same email address within a 15-minute window, THEN THE Auth_Service SHALL temporarily block further login attempts for that email for 15 minutes and SHALL return an error response indicating that the account is temporarily locked without revealing the lockout threshold or remaining duration
4. WHEN a user signs out, THE Auth_Service SHALL invalidate the active session within 1 second so the token cannot be reused for any subsequent request
5. WHILE a session is active and has not exceeded 7 days since the last authenticated request, THE Auth_Service SHALL accept the session token for authenticated requests and SHALL reset the 7-day inactivity timer on each successfully authenticated request
6. WHEN a request includes an expired or invalid session token, THE Auth_Service SHALL reject the request with an HTTP 401 response
7. WHEN a user logs in successfully, THE Audit_Service SHALL record the login event with the actor user ID, IP address, user agent, and timestamp

### Requirement 3: Role-Based Access Control

**User Story:** As a property owner, I want to assign roles to users (Manager, Renter), so that each person has appropriate access to the system features.

#### Acceptance Criteria

1. THE Role_System SHALL support three roles: Owner, Manager, and Renter, where each user is assigned exactly one role at any given time and the role determines the user's permitted actions
2. WHILE a user has the Owner role, THE Role_System SHALL grant access to all system features including building management, flat management, renter management, billing, payments, deposits, maintenance, notices, audit logs, and role assignment
3. WHILE a user has the Manager role, THE Role_System SHALL grant access to building operations, flat management, renter management, billing, payments, and maintenance for buildings assigned to that manager, and SHALL deny access to audit logs, role assignment, and financial configuration
4. WHILE a user has the Renter role, THE Role_System SHALL grant access only to the renter's own flat details, bills, payment history, maintenance request submission, and notices addressed to the renter
5. WHEN an Owner assigns or changes a role for a user, THE Role_System SHALL update the user's permissions within 2 seconds of the assignment action, invalidate any cached permissions for that user, and THE Audit_Service SHALL record the role change with the previous role and new role values
6. IF a user attempts to access a resource or action not permitted by their assigned role, THEN THE Role_System SHALL deny the request and return an error response indicating insufficient permissions
7. WHEN an Owner assigns the Manager role to a user, THE Role_System SHALL require at least one building to be assigned to the manager before the assignment is complete
8. IF an Owner attempts to remove or change the last remaining Owner role in the system, THEN THE Role_System SHALL reject the operation and return an error response indicating that at least one Owner must exist at all times
9. WHEN an Owner revokes a user's role or changes it to a more restrictive role, THE Role_System SHALL deny all subsequent requests from that user that exceed the new role's permissions, even if the user's session remains active

### Requirement 4: Renter Registration

**User Story:** As a property owner or manager, I want to register a new renter with their personal, family, emergency, and rental information, so that I can maintain complete tenant records for legal and operational purposes.

#### Acceptance Criteria

1. WHEN a renter registration form is submitted, THE Registration_Service SHALL require the following fields: Full Name, Phone Number, NID Number, Occupation, Blood Group, Total Family Members, Emergency Contact Name, Emergency Contact Number, Emergency Contact Relationship, Rental Start Date, Advance Amount Paid, Flat ID, and Monthly Rent Amount
2. THE Registration_Service SHALL accept the following optional fields: Date of Birth, Family Member Names (maximum 20 entries, each maximum 100 characters), NID Photo Upload, and Digital Signature
3. THE Registration_Service SHALL validate that the NID Number field is non-empty and contains only numeric characters with a length between 10 and 17 digits
4. THE Registration_Service SHALL validate that the Blood Group field contains exactly one of the following values: A+, A-, B+, B-, AB+, AB-, O+, O-
5. THE Registration_Service SHALL validate that Total Family Members is a positive integer between 1 and 50 inclusive
6. THE Registration_Service SHALL validate that the Phone Number follows a Bangladeshi mobile number format (11 digits starting with 01)
7. WHEN renter registration succeeds, THE Registration_Service SHALL create a Rental_Contract record linking the renter to the assigned flat with the specified rent amount, start date, and advance deposit amount
8. WHEN renter registration succeeds, THE Registration_Service SHALL create a user account for the renter with the Renter role and associate it with the assigned flat
9. IF any required field is missing or fails validation, THEN THE Registration_Service SHALL reject the submission and return field-level error messages for each invalid field
10. WHEN a renter is registered, THE Audit_Service SHALL record the renter approval action with the actor user ID and the new renter's entity ID
11. THE Registration_Service SHALL store the NID Photo as a file upload in Cloudflare R2 storage (maximum 5MB, JPEG/PNG/WebP format) and save the file reference URL in the renter record
12. THE Registration_Service SHALL store the Digital Signature as a base64-encoded image or file reference associated with the renter record
13. IF the specified Flat ID does not exist or the flat status is not Vacant, THEN THE Registration_Service SHALL reject the registration and return an error indicating the flat is not available for assignment

### Requirement 5: Building Management

**User Story:** As a property owner, I want to create and manage buildings in the system, so that I can organize my properties and assign flats within them.

#### Acceptance Criteria

1. WHEN an Owner submits a building creation form with a building name and address, THE Building_Manager SHALL create a new building record associated with the Owner's account
2. THE Building_Manager SHALL require a building name (minimum 1 character, maximum 200 characters) and address (minimum 1 character, maximum 500 characters) for building creation
3. WHEN a building is created, THE Building_Manager SHALL allow the Owner to optionally define the number of floors in the building as an integer between 1 and 200 inclusive
4. WHILE a user has the Owner role, THE Building_Manager SHALL allow updating building name, address, and floor count, applying the same validation constraints as building creation
5. WHILE a user has the Manager role for an assigned building, THE Building_Manager SHALL allow viewing building details but deny modification of building-level properties
6. WHEN a building is created, THE Audit_Service SHALL record the building creation action with the actor user ID and building entity ID
7. IF a building creation request is missing the building name or address, THEN THE Building_Manager SHALL reject the request with field-level validation errors indicating which fields are missing
8. THE Building_Manager SHALL support listing all buildings for an Owner with pagination returning a maximum of 50 buildings per page, sorted by creation date in descending order
9. IF an Owner submits a building creation request with a building name that already exists within that Owner's account, THEN THE Building_Manager SHALL reject the request with an error indicating the building name is already in use

### Requirement 6: Flat Management

**User Story:** As a property owner, I want to create and manage individual flats within my buildings, so that I can track occupancy, assign renters, and manage each unit independently.

#### Acceptance Criteria

1. WHEN an Owner submits a flat creation form with a flat number, floor number, and building reference, THE Flat_Manager SHALL create a new flat record within the specified building with an initial status of Vacant
2. THE Flat_Manager SHALL require a flat number (alphanumeric, maximum 20 characters), floor number (integer between 1 and 200 inclusive), and a building reference that exists in the system and belongs to the requesting Owner, for flat creation
3. THE Flat_Manager SHALL track flat status with one of the following values: Vacant, Occupied, or Under_Maintenance
4. WHEN a renter is assigned to a flat through the Registration_Service, THE Flat_Manager SHALL update the flat status to Occupied
5. WHEN a renter's contract ends or is terminated, THE Flat_Manager SHALL update the flat status to Vacant
6. IF a renter assignment is attempted on a flat that has status Occupied, THEN THE Flat_Manager SHALL reject the assignment and return an error response indicating the flat is currently occupied
7. WHILE a user has the Owner role, THE Flat_Manager SHALL allow creating, updating, and deleting flats within their buildings
8. WHILE a user has the Manager role for an assigned building, THE Flat_Manager SHALL allow viewing flat details and updating flat status but deny flat creation or deletion
9. WHILE a user has the Renter role, THE Flat_Manager SHALL allow viewing only the flat assigned to that renter
10. WHEN a flat is created, THE Audit_Service SHALL record the action with the actor user ID, building entity ID, and flat entity ID
11. THE Flat_Manager SHALL support listing all flats within a building with filtering by status and pagination returning a maximum of 50 flats per page
12. THE Flat_Manager SHALL enforce uniqueness of flat number within the same building, rejecting duplicate flat numbers with an error response indicating the flat number already exists in that building
13. IF an Owner or Manager attempts to delete a flat with status Occupied, THEN THE Flat_Manager SHALL reject the deletion and return an error response indicating that an occupied flat cannot be deleted
14. WHEN an Owner or Manager updates a flat status to Under_Maintenance, THE Flat_Manager SHALL allow the transition only from Vacant status, and WHEN the status is changed from Under_Maintenance, THE Flat_Manager SHALL set the status to Vacant

### Requirement 7: Monthly Billing

**User Story:** As a property owner, I want to generate monthly rent bills for each occupied flat, so that I can track what each renter owes and maintain financial records.

#### Acceptance Criteria

1. WHEN an Owner or Manager initiates billing for a month, THE Billing_Service SHALL generate a bill record for each flat with status Occupied, containing the flat reference, renter reference, billing month (in YYYY-MM format), rent amount from the Rental_Contract, and a status of Unpaid
2. WHEN an Owner or Manager adds a utility charge to a bill, THE Billing_Service SHALL append a line item with a description (maximum 200 characters) and an amount between 0.01 and 999,999.99, supporting a maximum of 20 line items per bill
3. THE Billing_Service SHALL calculate the total bill amount as the sum of the base rent and all utility line items
4. THE Billing_Service SHALL track bill status with one of the following values: Unpaid, Partially_Paid, Paid, or Overdue
5. WHEN the last calendar day of the billing month ends at 23:59:59 local time without the bill total being fully paid, THE Billing_Service SHALL update the bill status to Overdue
6. WHILE a user has the Owner role, THE Billing_Service SHALL allow viewing all bills across all buildings with filtering by building, flat, renter, month, and status
7. WHILE a user has the Manager role, THE Billing_Service SHALL allow viewing bills only for flats within assigned buildings
8. WHILE a user has the Renter role, THE Billing_Service SHALL allow viewing only bills addressed to that renter
9. WHEN a bill is created or modified, THE Audit_Service SHALL record the action with old and new values
10. THE Billing_Service SHALL prevent generating duplicate bills for the same flat and billing month, rejecting the request with an error message indicating the flat and month that already has a bill
11. THE Billing_Service SHALL support listing bills with pagination returning a maximum of 50 bills per page
12. IF a flat has status Occupied but its associated Rental_Contract has no rent amount defined, THEN THE Billing_Service SHALL skip bill generation for that flat and return an error indicating the missing rent amount
13. WHEN a payment is recorded against a bill that does not cover the full total amount, THE Billing_Service SHALL update the bill status to Partially_Paid
14. IF a user without the Owner or Manager role attempts to initiate billing or add utility charges, THEN THE Billing_Service SHALL reject the request with an error indicating insufficient permissions

### Requirement 8: Payment Recording

**User Story:** As a property owner or manager, I want to record payments from renters against their bills, so that I can track who has paid and maintain accurate financial records.

#### Acceptance Criteria

1. WHEN an Owner or Manager records a payment, THE Payment_Processor SHALL create a payment record containing the bill reference, amount paid (minimum 0.01, maximum 999,999,999.99, up to 2 decimal places), payment date (must not be a future date and must not be more than 365 days in the past), payment method (Cash, Bank_Transfer, Mobile_Banking), and a note field (optional, maximum 500 characters)
2. WHEN a payment amount equals the remaining balance on a bill, THE Payment_Processor SHALL update the bill status to Paid
3. WHEN a payment amount is less than the remaining balance on a bill, THE Payment_Processor SHALL update the bill status to Partially_Paid and record the remaining balance
4. IF a payment amount exceeds the remaining balance on a bill, THEN THE Payment_Processor SHALL reject the payment and return an error indicating the maximum payable amount
5. THE Payment_Processor SHALL support multiple partial payments against a single bill, maintaining a payment history for each bill
6. WHILE a user has the Renter role, THE Payment_Processor SHALL allow viewing payment history for bills addressed to that renter but deny recording payments
7. WHEN a payment is recorded, THE Audit_Service SHALL record the payment update action with the bill entity ID, payment amount, and actor user ID
8. THE Payment_Processor SHALL generate a unique payment receipt reference (alphanumeric, 12 to 20 characters) for each recorded payment
9. THE Payment_Processor SHALL support listing payment history with filtering by bill, renter, date range (maximum span of 365 days), and payment method, with pagination returning a maximum of 50 records per page
10. IF a payment is recorded against a bill that does not exist or has a status of Paid, THEN THE Payment_Processor SHALL reject the payment and return an error indicating the bill is not eligible for payment
11. IF a payment amount is less than 0.01 or contains more than 2 decimal places, THEN THE Payment_Processor SHALL reject the payment and return an error indicating the valid amount format

### Requirement 9: Advance Deposit Management

**User Story:** As a property owner, I want to track security deposits and apply adjustments against future rent, so that I can manage deposit deductions transparently and maintain accurate balances.

#### Acceptance Criteria

1. WHEN a Rental_Contract is created, THE Deposit_Manager SHALL record the security deposit amount (minimum 0.01, maximum 99,999,999.99) and set the remaining deposit balance equal to the initial deposit amount
2. WHEN an Owner applies an advance adjustment, THE Deposit_Manager SHALL create an Advance_Adjustment record containing the contract reference, adjustment amount (minimum 0.01), optional bill reference, adjustment note (maximum 500 characters), adjusted-by user ID, and creation timestamp
3. WHEN an advance adjustment is applied, THE Deposit_Manager SHALL deduct the adjustment amount from the remaining deposit balance on the Rental_Contract
4. IF an advance adjustment amount exceeds the remaining deposit balance, THEN THE Deposit_Manager SHALL reject the adjustment and return an error indicating the maximum adjustable amount equal to the current remaining deposit balance
5. WHEN an advance adjustment is linked to a bill, THE Deposit_Manager SHALL apply the adjustment amount as a payment against that bill and update the bill status to Partially_Paid if the bill has a remaining balance greater than zero, or to Paid if the bill's remaining balance equals zero after the adjustment
6. IF an advance adjustment is linked to a bill that is already fully paid or the adjustment amount exceeds the bill's outstanding balance, THEN THE Deposit_Manager SHALL reject the adjustment and return an error indicating the bill's current outstanding balance
7. WHILE a user has the Owner role, THE Deposit_Manager SHALL allow viewing all deposit records and making adjustments for any Rental_Contract
8. WHILE a user has the Manager role, THE Deposit_Manager SHALL allow viewing deposit records for contracts within assigned buildings but deny making adjustments
9. WHILE a user has the Renter role, THE Deposit_Manager SHALL allow viewing only the renter's own deposit balance and adjustment history
10. WHEN an advance adjustment is made, THE Audit_Service SHALL record the action with old and new remaining balance values, the adjustment amount, and the actor user ID
11. THE Deposit_Manager SHALL support listing all adjustments for a contract with pagination returning a maximum of 50 records per page, sorted by creation timestamp in descending order
12. THE Deposit_Manager SHALL display the remaining deposit balance in the renter's dashboard view as a visible summary field that appears without requiring scrolling or navigation to a sub-page

### Requirement 10: Maintenance Request Submission

**User Story:** As a renter, I want to submit maintenance requests for my flat, so that the owner or manager can address issues in a timely manner.

#### Acceptance Criteria

1. WHEN a Renter submits a maintenance request, THE Maintenance_Tracker SHALL create a request record containing the flat reference, renter reference, title (minimum 5 characters, maximum 200 characters), description (minimum 10 characters, maximum 2000 characters), priority (Low, Medium, High, Urgent), and a status of Open
2. WHEN a Renter attaches files to a maintenance request, THE Maintenance_Tracker SHALL accept up to 5 image files in JPEG, PNG, or WebP format with a maximum size of 5MB each, stored in Cloudflare R2
3. IF a file attachment is not in an accepted format or exceeds 5MB, THEN THE Maintenance_Tracker SHALL reject that file with an error indicating the accepted formats and size limit while preserving any valid attachments already uploaded
4. WHEN a maintenance request is created, THE Maintenance_Tracker SHALL notify the assigned Manager for the building via the system notification mechanism, or notify the Owner if no Manager is assigned to the building
5. THE Maintenance_Tracker SHALL track request status with one of the following values: Open, In_Progress, Resolved, or Closed, and SHALL enforce valid transitions where Open may transition to In_Progress or Closed, In_Progress may transition to Resolved or Closed, and Resolved may transition to Closed or re-opened to In_Progress
6. WHILE a user has the Owner role, THE Maintenance_Tracker SHALL allow viewing all maintenance requests across all buildings and updating request status
7. WHILE a user has the Manager role, THE Maintenance_Tracker SHALL allow viewing and updating maintenance requests for flats within assigned buildings
8. WHILE a user has the Renter role, THE Maintenance_Tracker SHALL allow viewing only maintenance requests submitted by that renter and allow adding comments but deny status changes
9. WHEN a maintenance request status changes, THE Audit_Service SHALL record the status change with old and new status values
10. WHEN a user requests a list of maintenance requests, THE Maintenance_Tracker SHALL return results filtered by building, flat, status, and priority, sorted by creation date descending, with pagination returning a maximum of 50 records per page
11. IF a maintenance request submission is missing the title or description, or the title or description does not meet the minimum length requirement, THEN THE Maintenance_Tracker SHALL reject the request with field-level validation errors identifying each failing field
12. IF a status transition is attempted that does not match a valid transition path, THEN THE Maintenance_Tracker SHALL reject the update with an error indicating the current status and the allowed transitions

### Requirement 11: Issue Tracking and Resolution

**User Story:** As a property owner or manager, I want to track and manage building-level issues beyond individual flat maintenance, so that I can maintain the overall property condition.

#### Acceptance Criteria

1. WHEN an Owner or Manager creates an issue, THE Maintenance_Tracker SHALL create an issue record containing the building reference, title (maximum 200 characters), description (maximum 2000 characters), category (Plumbing, Electrical, Structural, Cleaning, Security, Other), priority (Low, Medium, High, Urgent), and a status of Open
2. WHEN an Owner or Manager assigns an issue to a user, THE Maintenance_Tracker SHALL record the assignee (a Manager or external contractor reference) on the issue record for resolution tracking
3. WHEN an issue status changes, THE Audit_Service SHALL record the change with old and new status values and the actor user ID
4. WHEN an Owner or Manager marks an issue as Resolved, THE Maintenance_Tracker SHALL require resolution notes (maximum 2000 characters) and record the resolution date as the timestamp of the status change
5. WHILE a user has the Renter role, THE Maintenance_Tracker SHALL deny access to building-level issues
6. THE Maintenance_Tracker SHALL support listing issues with filtering by building, category, status, priority, and assigned user, with pagination returning a maximum of 50 records per page
7. IF an issue creation request is missing the title, description, or category, THEN THE Maintenance_Tracker SHALL reject the request with field-level validation errors
8. THE Maintenance_Tracker SHALL restrict issue status transitions to the following valid progressions: Open to In_Progress, Open to Resolved, Open to Closed, In_Progress to Resolved, In_Progress to Closed, Resolved to Closed, and Closed to no further transitions
9. IF a status change request specifies a transition not in the valid progressions, THEN THE Maintenance_Tracker SHALL reject the request with an error indicating the current status and the allowed target statuses
10. IF an issue assignment request references a user who does not have the Manager role and is not a registered external contractor, THEN THE Maintenance_Tracker SHALL reject the request with an error indicating the assignee is invalid

### Requirement 12: Notice Creation and Distribution

**User Story:** As a property owner or manager, I want to create and distribute notices to renters, so that I can communicate important information about the building, rules, or events.

#### Acceptance Criteria

1. WHEN an Owner or Manager creates a notice, THE Notice_Service SHALL create a notice record containing the title (maximum 200 characters), body (maximum 5000 characters), target audience (All_Renters, Specific_Building, Specific_Flat, Managers_Only), creation timestamp, and author reference
2. THE Notice_Service SHALL support setting a notice as pinned, which keeps it visible at the top of the notice list until unpinned, with a maximum of 5 pinned notices per target audience scope, ordered by most recently pinned first among pinned notices
3. WHEN a notice targets Specific_Building, THE Notice_Service SHALL require a valid building reference and distribute the notice only to renters and managers of that building
4. WHEN a notice targets Specific_Flat, THE Notice_Service SHALL require a valid flat reference and distribute the notice only to the renter of that flat
5. WHILE a user has the Renter role, THE Notice_Service SHALL display only notices targeted at All_Renters, the renter's building, or the renter's specific flat
6. WHILE a user has the Manager role, THE Notice_Service SHALL display notices targeted at All_Renters, Managers_Only, and buildings assigned to that manager
7. WHEN a notice is created, THE Audit_Service SHALL record the notice creation action with the actor user ID and notice entity ID
8. THE Notice_Service SHALL support listing notices with filtering by target audience and pinned status, with pagination returning a maximum of 50 notices per page, ordered by pinned status first then creation date descending
9. WHILE a user has the Owner role, THE Notice_Service SHALL allow creating, editing (title, body, target audience, and pinned status), pinning, and deleting any notice regardless of author
10. WHILE a user has the Manager role, THE Notice_Service SHALL allow creating notices targeted at buildings assigned to that manager, and allow editing and deleting only notices authored by that manager, but deny editing or deleting notices created by the Owner or other Managers
11. IF a notice creation request is missing the title or body, THEN THE Notice_Service SHALL reject the request with field-level validation errors indicating which required fields are missing
12. IF a notice creation or edit request targets Specific_Building or Specific_Flat but the provided building or flat reference does not exist, THEN THE Notice_Service SHALL reject the request with a validation error indicating the referenced entity was not found
13. IF a Manager attempts to create a notice targeting a building not assigned to that manager, THEN THE Notice_Service SHALL reject the request with an error indicating insufficient permissions for the specified building

### Requirement 13: Audit Log Application Service

**User Story:** As a property owner, I want to view a comprehensive audit trail of all actions taken in the system, so that I can maintain accountability and investigate any disputes.

#### Acceptance Criteria

1. WHEN any trackable action occurs (user login, flat creation, renter approval, payment update, bill modification, maintenance update, issue status change, role change, notice creation, contract change), THE Audit_Service SHALL create a log entry containing: actor user ID, entity type, entity ID, action name, old value (JSON), new value (JSON), IP address, user agent, and creation timestamp
2. IF the old value or new value JSON exceeds 10KB in size, THEN THE Audit_Service SHALL truncate the value to 10KB and append a truncation indicator flag to the stored JSON object
3. WHILE a user has the Owner role, THE Audit_Service SHALL allow querying audit logs with filtering by entity type, entity ID, actor user ID, action name, and date range, with results sorted by creation timestamp in descending order and pagination returning a maximum of 100 entries per page
4. WHILE a user has the Manager role, THE Audit_Service SHALL allow querying audit logs only for entities within buildings assigned to that manager, with results sorted by creation timestamp in descending order and pagination returning a maximum of 100 entries per page
5. IF a user with the Renter role requests audit log access, THEN THE Audit_Service SHALL deny the request with an HTTP 403 response
6. THE Audit_Service SHALL write audit log entries asynchronously so that the primary action response time is not increased by more than 50 milliseconds due to audit log processing
7. IF an audit log write fails, THEN THE Audit_Service SHALL log the failure to the application error log and queue the entry for retry up to a maximum of 3 attempts with a minimum interval of 30 seconds between attempts, without affecting the primary action outcome
8. THE Audit_Service SHALL retain audit log entries for a minimum of 365 days before they become eligible for deletion or migration to cold storage

### Requirement 14: Mobile-First Responsive Interface

**User Story:** As a renter or owner using a mobile phone, I want the interface to be optimized for small screens, so that I can manage my apartment tasks comfortably on my phone.

#### Acceptance Criteria

1. THE Frontend_App SHALL render all pages with a mobile-first responsive layout where the primary breakpoint targets screens 360px wide and above
2. THE Frontend_App SHALL ensure all interactive elements (buttons, form inputs, links) have a minimum touch target size of 44x44 CSS pixels on viewports below 768px width
3. WHILE the viewport width is below 768px, THE Frontend_App SHALL use a single-column layout for all form pages
4. THE Frontend_App SHALL display navigation as a bottom tab bar on viewports below 768px width and as a sidebar on viewports 768px wide and above
5. THE Frontend_App SHALL ensure all text content is rendered at a minimum of 16px CSS font size and without horizontal scrolling on viewports 360px wide and above, in both portrait and landscape orientations
6. THE Frontend_App SHALL load and render the initial page content, measured as Largest Contentful Paint (LCP), within 3 seconds on a simulated 3G network connection (1.6 Mbps download speed, 300ms RTT)
7. THE Frontend_App SHALL use Tailwind CSS responsive utility classes for all layout decisions, avoiding fixed pixel widths for container elements
8. WHILE the viewport width is below 768px, THE Frontend_App SHALL support both portrait and landscape orientations without content overflow or loss of interactive functionality

### Requirement 15: Bangla-First User Experience

**User Story:** As a Bangladeshi user, I want the interface to prioritize Bangla language and local conventions, so that I can use the system comfortably in my native language.

#### Acceptance Criteria

1. THE Frontend_App SHALL display all UI labels, button text, navigation items, error messages, and placeholder text in Bangla as the default language
2. THE Frontend_App SHALL use a Bangla-compatible font that supports the full Unicode Bengali block (U+0980–U+09FF) as the primary typeface with a minimum body text size of 16px, a minimum line height of 1.6, and heading text scaled proportionally with a minimum size of 20px
3. THE Frontend_App SHALL format currency values using the Bangladeshi Taka symbol (৳) followed by the numeric amount with 2 decimal places and comma separators following the Bangladeshi numbering system (e.g., ৳1,20,000.00)
4. THE Frontend_App SHALL format dates using the Bangla locale format (DD/MM/YYYY) with Bangla month names available in date pickers, using Western Arabic numerals (0-9) for date digits
5. THE Frontend_App SHALL display a language toggle accessible from the global navigation area on every page that switches all UI text between Bangla and English while maintaining the same layout and functionality
6. WHEN a user changes the language preference, THE Frontend_App SHALL store the preference in browser local storage for unauthenticated users and in the user's server-side profile for authenticated users, and SHALL apply the stored preference on subsequent visits without requiring re-selection
7. IF a translation key is missing for the active language, THEN THE Frontend_App SHALL fall back to displaying the English text for that key rather than showing a blank or a raw translation key identifier

### Requirement 16: Elderly-Friendly Interface Design

**User Story:** As an elderly property owner, I want the interface to be simple and easy to use with large text and clear navigation, so that I can manage my properties without difficulty.

#### Acceptance Criteria

1. THE Frontend_App SHALL provide a high-contrast color scheme meeting WCAG AA contrast ratio (minimum 4.5:1 for normal text, 3:1 for large text) as the default theme
2. THE Frontend_App SHALL use a minimum font size of 16px for body text and 14px for secondary text across all pages
3. THE Frontend_App SHALL limit navigation depth to a maximum of 3 levels from the dashboard to any feature page
4. THE Frontend_App SHALL display a visible text label positioned above or beside each form input field that identifies the expected input, without relying solely on placeholder text for field identification
5. WHEN a user initiates a destructive action (delete, remove, terminate), THE Frontend_App SHALL display a confirmation dialog with a confirm button labeled with the specific action being performed and a cancel button labeled "Cancel", where both buttons have a minimum size of 44x44 pixels
6. THE Frontend_App SHALL avoid auto-advancing carousels, time-limited interactions, and animations that cannot be paused or disabled
7. WHEN an action completes or fails, THE Frontend_App SHALL display a success or error feedback message at the top of the viewport with a minimum height of 48px, a minimum display duration of 5 seconds before auto-dismissal, and a visible close button allowing the user to dismiss the message manually at any time
8. THE Frontend_App SHALL render all interactive elements (buttons, links, form controls) with a minimum touch target size of 44x44 pixels

### Requirement 17: Multi-Tenant Data Isolation

**User Story:** As a property owner, I want my data to be completely isolated from other owners on the platform, so that my building, renter, and financial information remains private and secure.

#### Acceptance Criteria

1. THE Backend_API SHALL associate every building, flat, contract, bill, payment, maintenance request, issue, and notice record with an owner account ID
2. WHEN any data query is executed against tenant-scoped resources, THE Backend_API SHALL include the authenticated user's owner account ID as a mandatory filter condition so that results never include records belonging to a different owner account
3. IF a user attempts to access a resource belonging to a different owner account, THEN THE Backend_API SHALL return an HTTP 404 response without revealing that the resource exists under a different account
4. THE Database_Layer SHALL enforce owner account ID as a non-nullable foreign key on all tenant-scoped tables, where tenant-scoped tables are those storing buildings, flats, contracts, bills, payments, maintenance requests, issues, and notices
5. WHEN a Manager is assigned to a building, THE Backend_API SHALL scope the Manager's data access to only the buildings explicitly assigned to that Manager within the same owner account
6. THE Backend_API SHALL validate tenant ownership at the service layer before performing any create, read, update, or delete operation on tenant-scoped resources
7. WHEN a Renter accesses the system, THE Backend_API SHALL restrict the Renter's data access to only the flat, contract, bills, payments, maintenance requests, issues, and notices explicitly associated with that Renter's active contract within the owning account
8. IF a create or update operation is submitted without an owner account ID or with an owner account ID that does not match the authenticated user's owner account, THEN THE Backend_API SHALL reject the request and return an error response indicating an authorization failure

### Requirement 18: File Upload and Storage

**User Story:** As a property owner or renter, I want to upload files (NID photos, maintenance images, signatures), so that important documents are stored securely and accessible when needed.

#### Acceptance Criteria

1. THE Backend_API SHALL accept file uploads for NID photos, digital signatures, and maintenance request images via multipart form data, with a maximum of 5 files per single upload request
2. THE Backend_API SHALL store uploaded files in Cloudflare R2 object storage with a structured key format: `{ownerAccountId}/{entityType}/{entityId}/{filename}`, where filenames are prefixed with a timestamp to prevent overwriting existing files with the same name
3. THE Backend_API SHALL validate uploaded files against allowed MIME types (image/jpeg, image/png, image/webp, application/pdf) and reject files exceeding 5MB with a structured error response indicating the file name, the reason for rejection, and the allowed constraints
4. WHEN a file is uploaded successfully, THE Backend_API SHALL return a file reference URL that can be used to retrieve the file
5. THE Backend_API SHALL generate pre-signed URLs for file retrieval with a maximum validity of 1 hour, ensuring files are not publicly accessible without authentication
6. IF a file upload fails due to storage service unavailability, THEN THE Backend_API SHALL return an HTTP 503 response indicating temporary unavailability and include a Retry-After header with a value of 30 seconds
7. THE Backend_API SHALL associate uploaded file references with the parent entity (renter record, maintenance request) in the database
8. IF the file is stored successfully but the database association with the parent entity fails, THEN THE Backend_API SHALL delete the orphaned file from storage and return an error response indicating the upload could not be completed
9. IF a file upload request contains a MIME type not in the allowed list, THEN THE Backend_API SHALL reject the entire request without storing any files and return an error response identifying each invalid file and its detected MIME type

### Requirement 19: API Input Validation and Error Handling

**User Story:** As a developer, I want consistent input validation and error responses across all API endpoints, so that clients receive predictable, actionable error information.

#### Acceptance Criteria

1. WHEN any API endpoint receives a request, THE Backend_API SHALL validate the request body, query parameters, and path parameters against the endpoint's defined JSON schema before executing business logic, and SHALL reject any request with a body exceeding 1MB with an HTTP 413 response
2. IF request validation fails, THEN THE Backend_API SHALL return an HTTP 400 response containing a structured error object with a `requestId` field and an `errors` array of no more than 50 entries, where each entry includes the field path, the validation rule that failed, and a human-readable message in Bangla
3. IF a requested resource is not found, THEN THE Backend_API SHALL return an HTTP 404 response with a structured error object containing a `requestId` field, an error code, and a message indicating the resource type and identifier that was not found
4. IF an authenticated user lacks permission for the requested action, THEN THE Backend_API SHALL return an HTTP 403 response with a structured error object containing a `requestId` field and a message indicating insufficient permissions without revealing what permissions are required
5. IF an unexpected server error occurs, THEN THE Backend_API SHALL return an HTTP 500 response with a structured error object containing a `requestId` field and a generic error message that does not expose internal implementation details, stack traces, or database information
6. THE Backend_API SHALL include a unique request ID in UUID v4 format in every API response (both success and error) via a response header and within error response bodies to facilitate request tracing and support inquiries
7. THE Backend_API SHALL log all HTTP 500 errors with the full error stack trace, request ID, HTTP method, request path, requesting user ID (if authenticated), and client IP address to the application error log

### Requirement 20: Dashboard and Navigation

**User Story:** As a user, I want a role-appropriate dashboard showing relevant information at a glance, so that I can quickly understand the current state of my properties or tenancy.

#### Acceptance Criteria

1. WHILE a user has the Owner role, THE Frontend_App SHALL display a dashboard showing: total buildings count, total flats count, occupied vs vacant flat ratio displayed as a fraction (e.g., "12/20 occupied"), total unpaid bills amount formatted in BDT currency, the 5 most recent maintenance requests sorted by creation date descending, and the 5 most recent audit log entries sorted by creation date descending
2. WHILE a user has the Manager role, THE Frontend_App SHALL display a dashboard showing: assigned buildings count, flats in assigned buildings with occupancy status displaying a maximum of 20 flats sorted by building then flat number, total unpaid bills amount for assigned buildings formatted in BDT currency, and the 10 most recent pending maintenance requests for assigned buildings sorted by creation date descending
3. WHILE a user has the Renter role, THE Frontend_App SHALL display a dashboard showing: current flat address and flat number, assigned building name, current month's bill amount with payment status (paid, unpaid, or overdue), remaining deposit balance formatted in BDT currency, and all active maintenance requests submitted by the renter sorted by creation date descending
4. WHEN the user navigates to the dashboard page, THE Frontend_App SHALL fetch and display dashboard data using TanStack Query with a stale time of 30 seconds, showing a loading skeleton until data is available
5. WHEN the user successfully logs in, THE Frontend_App SHALL redirect the user to the dashboard page as the default landing page
6. THE Frontend_App SHALL provide navigation to all permitted features from the dashboard with a maximum of one click or tap to reach any primary feature section, where primary feature sections are: Buildings, Flats, Renters, Bills, Maintenance Requests, Audit Logs (Owner only), and Notices
7. IF the dashboard data request fails or returns an error, THEN THE Frontend_App SHALL display an error message indicating the data could not be loaded and provide a retry action that re-fetches the dashboard data
8. IF a Renter user has no flat currently assigned, THEN THE Frontend_App SHALL display a message indicating no flat is assigned in place of the flat details and bill information
