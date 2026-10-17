# Domain 01: Core Auth & Multi-Tenancy — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 1.1: Property Owner Onboarding & Organization Creation
**As a** real estate property owner in Dhaka  
**I want to** register an account and create my property organization profile with a unique URL slug  
**So that** I can begin managing my buildings, staff, and rental operations under a dedicated workspace.

#### Scenario 1.1.1: Successful Organization Creation (Happy Path)
- **Given** I am a newly registered and authenticated user with verified email or phone
- **When** I submit the "Create Organization" form with:
  - Name: `"Gulshan Heights Ltd"`
  - Slug: `"gulshan-heights"`
  - Product Type: `"building"`
  - Contact Phone: `"+8801711223344"`
- **Then** a new record is created in `organizations` with slug `"gulshan-heights"`
- **And** an entry is created in `members` assigning my `user_id` the role of `"owner"`
- **And** an audit log is emitted with action `"CREATE"` for entity `"organization"`
- **And** my active session's `activeOrganizationId` is set to this new organization ID
- **And** I am redirected to the owner dashboard at `/dashboard`.

#### Scenario 1.1.2: Organization Slug Conflict (Edge Case / Failure)
- **Given** an organization already exists with slug `"green-villa"`
- **When** another user attempts to create an organization with slug `"green-villa"`
- **Then** the mutation fails with error code `"ORG_SLUG_TAKEN"`
- **And** the UI displays: `"This URL slug is already taken. Please choose another one."`
- **And** no record is inserted into `organizations` or `members`.

---

### Story 1.2: Inviting a Building Manager with Role-Based Permissions
**As an** organization Owner  
**I want to** invite my on-site building manager via email with the role `"manager"`  
**So that** they can handle daily flat inspections, rent collection records, and tenant communications without having owner billing permissions.

#### Scenario 1.2.1: Successful Invitation Issuance (Happy Path)
- **Given** I am authenticated with active role `"owner"` in organization `"bashundhara-tower"`
- **When** I send an invitation to `"manager@bashundhara.com"` with role `"manager"`
- **Then** an `invitations` record is inserted with `status = "pending"` and `expires_at = NOW() + 7 days`
- **And** an email notification containing a secure one-time acceptance token link is dispatched
- **And** an audit log is recorded noting the inviter and target role.

#### Scenario 1.2.2: Accepting an Invitation as an Existing User
- **Given** user `"manager@bashundhara.com"` already has an account on the platform
- **When** they click the invitation link within the 7-day expiration window
- **Then** their user record is linked to `"bashundhara-tower"` in `members` with role `"manager"`
- **And** the `invitations` record is marked `status = "accepted"`
- **And** upon subsequent login, `"bashundhara-tower"` appears in their organization switcher.

#### Scenario 1.2.3: Attempting to Accept an Expired Invitation (Failure Path)
- **Given** an invitation was issued 8 days ago and has expired
- **When** the invitee clicks the acceptance link
- **Then** the server rejects the request with code `"INVITATION_EXPIRED"`
- **And** the UI informs the user to request a fresh invitation from the property owner.

---

### Story 1.3: Sole Owner Demotion Prevention
**As the** security subsystem  
**I want to** prevent the sole owner of an organization from being deleted or demoted  
**So that** the organization is never orphaned without administrative ownership.

#### Scenario 1.3.1: Demoting Sole Owner Blocked
- **Given** user `"Atik"` is the only member with role `"owner"` in organization `"dhanmondi-residence"`
- **When** a manager or the owner themselves attempts to change Atik's role to `"manager"`
- **Then** the transaction aborts with code `"CANNOT_REMOVE_LAST_OWNER"`
- **And** the database state remains unchanged
- **And** a warning notification explains that another member must first be promoted to `"owner"`.

---

### Story 1.4: Seamless Multi-Tenant Context Switching
**As a** landlord who owns 3 separate residential buildings in different parts of the city  
**I want to** switch between my properties using a top-navigation dropdown  
**So that** all metrics, tenant lists, and financial reports immediately reflect the selected property without logging out.

#### Scenario 1.4.1: Instant Organization Switch (Happy Path)
- **Given** I hold `"owner"` membership in `"Dhanmondi Tower"` (ID: `org_1`) and `"Uttara Heights"` (ID: `org_2`)
- **When** I select `"Uttara Heights"` from the workspace switcher
- **Then** a tRPC mutation updates my session active organization to `org_2`
- **And** React Query cache keys scoped by `organizationId` invalidate and reload
- **And** the dashboard renders all units, finances, and notices for `"Uttara Heights"`.
