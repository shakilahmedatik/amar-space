# Domain 08: Superadmin SaaS — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 8.1: Platform Global Telemetry & Revenue Dashboard
**As a** platform executive at Omni Heaven HQ  
**I want to** view global platform statistics across all customer organizations  
**So that** I can track total tenant count, occupied units, active subscriptions, and Monthly Recurring Revenue (MRR in BDT).

#### Scenario 8.1.1: Viewing Platform Aggregates (Happy Path)
- **Given** I am authenticated with global role `"superadmin"`
- **When** I navigate to `https://hq.omniheaven.com`
- **Then** the dashboard displays:
  - Total Organizations (Active, Trialing, Suspended)
  - Total Units Configured & Overall Occupancy Rate
  - Total Active Subscriptions & MRR in BDT
  - System Health & Database Connection Pool status.

#### Scenario 8.1.2: Tenant Owner Attempting Superadmin Access (Security Invariant)
- **Given** user Atik is an `"owner"` of organization `"dhanmondi-tower"` but not a platform superadmin
- **When** Atik attempts to access `https://hq.omniheaven.com` or call `superadmin.getPlatformStats`
- **Then** the procedure rejects the request with code `"SUPERADMIN_FORBIDDEN"`
- **And** no platform statistics are disclosed.

---

### Story 8.2: Hard Quota Enforcement on Unit Creation
**As the** SaaS billing engine  
**I want to** block a customer on the "Starter" plan from adding more than 20 units  
**So that** customers must upgrade to paid higher tiers as their real estate portfolio expands.

#### Scenario 8.2.1: Quota Limit Exceeded Block (Happy Path)
- **Given** organization `"Green Garden Ltd"` is on the `"starter"` plan (Limit: 20 units)
- **And** the organization currently has 20 flats configured
- **When** the manager attempts to create Flat #21
- **Then** the procedure aborts with error code `"PLAN_QUOTA_EXCEEDED"`
- **And** the UI displays an upgrade modal: `"You have reached your 20-unit limit on the Starter plan. Upgrade to Pro for up to 100 units."`
- **And** Flat #21 is not inserted.

---

### Story 8.3: Customer Organization Suspension
**As a** platform administrator  
**I want to** suspend an organization whose subscription is delinquent  
**So that** their staff and tenants are locked out until payment is settled.

#### Scenario 8.3.1: Suspending Organization and Freezing Tenant Access (Happy Path)
- **Given** organization `"City View Apartments"` is 30 days overdue on subscription payment
- **When** a superadmin executes `superadmin.suspendOrganization` with reason `"Subscription payment past due"`
- **Then** `organizations.status` updates to `"suspended"`
- **And** any active manager or tenant attempting to load their dashboard receives error `"ORG_SUSPENDED"`
- **And** an alert banner instructs them to contact billing support to reactivate their account.
