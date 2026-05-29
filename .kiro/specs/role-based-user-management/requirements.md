# Requirements Document

## Introduction

This feature extends the existing role system in AmarSpace to introduce a **superadmin** role responsible for platform-level administration (approving owner accounts, managing the entire website) and formalizes the **owner-to-manager** user creation flow. The current system supports `owner`, `manager`, and `renter` roles. This feature adds `superadmin` as a fourth role with elevated platform-wide privileges, while clarifying the owner's ability to create and manage manager users within their own account scope.

## Glossary

- **System**: The AmarSpace backend API (Fastify application)
- **Superadmin**: A platform-level administrator with full access to manage the website, approve owner accounts, and oversee all tenants
- **Owner**: A registered user who owns/manages properties and can create manager users within their account scope
- **Manager**: A user created by an Owner, assigned to manage specific buildings on behalf of the Owner
- **Renter**: A tenant user associated with a flat within a building
- **Owner_Account**: The logical grouping of an Owner and all users (managers, renters) operating under that Owner
- **Role_Guard**: The middleware that enforces role-based access control on API endpoints
- **Auth_Guard**: The middleware that validates session tokens and injects user context into requests
- **Approval_Status**: The state of an Owner account registration — one of `pending`, `approved`, or `rejected`

## Requirements

### Requirement 1: Superadmin Role Definition

**User Story:** As a platform operator, I want a superadmin role with full system access, so that I can manage the entire platform including owner account approvals.

#### Acceptance Criteria

1. THE System SHALL support a `superadmin` role in addition to the existing `owner`, `manager`, and `renter` roles
2. WHEN a user with the `superadmin` role authenticates, THE Auth_Guard SHALL inject the `superadmin` role into the request context
3. THE Role_Guard SHALL grant `superadmin` users access to all protected endpoints regardless of the endpoint's configured allowed roles
4. THE System SHALL restrict superadmin account creation to existing superadmin users or direct database seeding
5. IF a non-superadmin user attempts to assign the `superadmin` role to any account, THEN THE System SHALL reject the request with a 403 Forbidden response indicating insufficient permissions
6. WHILE a user is authenticated with the `superadmin` role, THE System SHALL bypass tenant scoping restrictions, allowing access to resources across all owner accounts

### Requirement 2: Owner Account Approval Workflow

**User Story:** As a superadmin, I want to approve or reject owner account registrations, so that only verified property owners can use the platform.

#### Acceptance Criteria

1. WHEN a new user registers with the `owner` role, THE System SHALL set the Approval_Status to `pending`
2. WHILE an Owner account has Approval_Status `pending` or `rejected`, THE System SHALL restrict the Owner from accessing property management endpoints (buildings, flats, and related resources) and return a 403 Forbidden response indicating the account is not yet approved
3. WHEN a Superadmin sets an Owner account's Approval_Status to `approved`, THE System SHALL persist the status change and allow the Owner to access all endpoints permitted by the `owner` role
4. WHEN a Superadmin sets an Owner account's Approval_Status to `rejected`, THE System SHALL persist the status change and maintain restricted access equivalent to the `pending` state
5. THE System SHALL provide an API endpoint for Superadmin users to list all Owner accounts with their Approval_Status, supporting pagination (default page size of 20, maximum 100) and filtering by Approval_Status value
6. THE System SHALL provide an API endpoint for Superadmin users to update the Approval_Status of an Owner account, accepting only valid transitions: `pending` to `approved`, `pending` to `rejected`, `rejected` to `approved`, or `approved` to `rejected`
7. IF a non-superadmin user attempts to access the approval endpoints, THEN THE System SHALL return a 403 Forbidden response
8. IF a Superadmin attempts an invalid Approval_Status transition, THEN THE System SHALL return a 400 Bad Request response with an error message indicating the transition is not allowed

### Requirement 3: Owner Creates Manager Users

**User Story:** As an Owner, I want to create manager users and assign them to my buildings, so that I can delegate building management tasks.

#### Acceptance Criteria

1. WHEN an Owner submits a manager creation request with a valid email (max 254 characters), name (1 to 200 characters), and building assignments (1 to 20 building IDs), THE System SHALL create a new user with the `manager` role linked to the Owner_Account
2. THE System SHALL require at least one and at most 20 building IDs when creating a manager user
3. IF any specified building ID does not exist or does not belong to the Owner's Owner_Account, THEN THE System SHALL reject the request with a validation error indicating which building ID is invalid
4. WHEN an Owner creates a manager, THE System SHALL associate the manager with the specified buildings via manager assignments
5. IF the specified email already belongs to an existing user in the system or conflicts with a pending registration, THEN THE System SHALL return a 409 Conflict response
6. THE System SHALL restrict manager creation to users with the `owner` role within their own Owner_Account scope
7. WHEN a manager is created, THE System SHALL generate a temporary password of at least 12 characters containing uppercase, lowercase, numeric, and special characters, and return it in the response
8. THE System SHALL record the manager creation action in the audit log including the actor ID, target user ID, assigned building IDs, and timestamp
9. IF the manager creation request is missing required fields (email, name, or building IDs), THEN THE System SHALL return a validation error response indicating the missing fields

### Requirement 4: Superadmin User Management

**User Story:** As a superadmin, I want to view and manage all users across the platform, so that I can monitor and intervene when necessary.

#### Acceptance Criteria

1. THE System SHALL provide an API endpoint for Superadmin users to list all users with pagination returning a maximum of 50 users per page, filtering by role, sorted by creation date in descending order
2. WHEN a Superadmin requests the user list, THE System SHALL return user details including id, name, email, role, Approval_Status, and creation date
3. THE System SHALL provide an API endpoint for Superadmin users to deactivate a user account
4. WHEN a Superadmin deactivates a user account, THE System SHALL invalidate all active sessions for that user within 2 seconds and prevent the deactivated user from creating new sessions until reactivated
5. IF a Superadmin attempts to deactivate another Superadmin account, THEN THE System SHALL return a 403 Forbidden response
6. WHEN a Superadmin performs a user management action (including failed attempts such as trying to deactivate another superadmin), THE System SHALL record an entry in the audit log containing the actor user ID, target user ID, action type, outcome, and timestamp
7. IF a deactivated user attempts to authenticate, THEN THE System SHALL reject the login attempt, invalidate all existing sessions and tokens for that user, and return an error response indicating the account is deactivated

### Requirement 5: Role Hierarchy and Access Control

**User Story:** As a developer, I want a clear role hierarchy enforced at the middleware level, so that authorization logic is consistent across all endpoints.

#### Acceptance Criteria

1. THE System SHALL enforce the role hierarchy with the following ordinal ranking (highest to lowest): `superadmin` (4) > `owner` (3) > `manager` (2) > `renter` (1)
2. WHEN the Role_Guard evaluates access, THE System SHALL grant access if the user's role ordinal value is equal to or higher than the minimum required role ordinal for the endpoint
3. WHEN an endpoint is configured with an explicit list of allowed roles, THE System SHALL grant access only to users whose role matches one of the listed roles, regardless of hierarchy position
4. WHILE a user's Approval_Status is `pending` or `rejected`, THE Role_Guard SHALL deny access to all endpoints that create, update, or delete buildings, flats, renters, payments, bills, deposits, maintenance requests, or notices, regardless of the user's role
5. IF the Role_Guard denies access due to Approval_Status being `pending` or `rejected`, THEN THE System SHALL return a 403 Forbidden response with a message indicating that the user's account is not yet approved
6. IF the Role_Guard denies access due to insufficient role permissions, THEN THE System SHALL return a 403 Forbidden response with a message indicating insufficient permissions

### Requirement 6: Manager Scope Enforcement

**User Story:** As an Owner, I want managers to only access buildings they are assigned to, so that data isolation is maintained between buildings.

#### Acceptance Criteria

1. WHILE a Manager user accesses any endpoint scoped to a building (buildings, flats, or issues within a building), THE System SHALL verify the Manager's assigned building IDs (resolved via the tenant scope middleware) include the requested building ID before processing the request
2. IF a Manager attempts to access a building they are not assigned to, THEN THE System SHALL return a 403 Forbidden response with an error message indicating the Manager is not assigned to the requested building
3. IF a Manager has zero building assignments, THEN THE System SHALL return an empty result set for list endpoints and a 403 Forbidden response for single-resource building-scoped endpoints
4. WHEN an Owner removes a building assignment from a Manager, THE System SHALL exclude the removed building from the Manager's tenant scope on all subsequent requests made after the removal operation completes
5. THE System SHALL provide a paginated API endpoint for Owners to list all managers within their Owner_Account, returning each manager's id, name, email, and assigned building IDs, with pagination limited to a maximum page size of 100
6. WHEN an Owner updates a Manager's building assignments, THE System SHALL validate that all specified building IDs belong to the Owner's Owner_Account and that at least one building assignment remains after the update
7. IF an Owner attempts to assign a Manager to a building that does not belong to the Owner's Owner_Account, THEN THE System SHALL return a 403 Forbidden response

### Requirement 7: Superadmin Dashboard Data

**User Story:** As a superadmin, I want a dashboard overview of platform activity, so that I can monitor the health and growth of the platform.

#### Acceptance Criteria

1. THE System SHALL provide an API endpoint accessible only to users with the superadmin role for retrieving platform-level statistics
2. WHEN a Superadmin requests dashboard data, THE System SHALL return the total count of users grouped by role (owner, manager, renter), the count of user accounts pending approval, and the count of currently active sessions (sessions not yet expired per the 7-day inactivity policy)
3. WHEN a Superadmin requests dashboard data, THE System SHALL return the response within 5 seconds (inclusive)
4. IF a non-superadmin user (owner, manager, or renter) attempts to access the superadmin dashboard endpoint, THEN THE System SHALL return a 403 Forbidden response and SHALL NOT include any platform-level statistics in the response body
5. IF the System encounters a database error while aggregating platform statistics, THEN THE System SHALL return an error response indicating that dashboard data is temporarily unavailable and SHALL NOT return partial or stale data
