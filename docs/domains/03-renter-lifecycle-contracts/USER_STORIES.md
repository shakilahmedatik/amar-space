# Domain 03: Renter Lifecycle & Contracts — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 3.1: Complete Renter KYC Registration with Mandatory Bangladeshi Fields
**As a** building manager or landlord  
**I want to** register a prospective tenant with their full legal identity, verified NID, blood group, family details, and emergency contacts  
**So that** our apartment building complies with Bangladeshi residential security regulations and operational safety standards.

#### Scenario 3.1.1: Successful Renter Registration (Happy Path)
- **Given** I am authenticated with role `"manager"` or `"owner"` in organization `"gulshan-heights"`
- **When** I submit the "Register Renter" form with:
  - Full Name: `"Tanvir Ahmed"`
  - Phone: `"+8801719876543"`
  - NID Number: `"19922692018000451"` (Valid 17-digit legacy NID)
  - Date of Birth: `"1992-05-14"`
  - Occupation: `"Senior Software Engineer"`
  - Blood Group: `"B+"`
  - Total Family Members: `3`
  - Family Member Names: `["Farhana Sultana (Spouse)", "Ayan Ahmed (Child)"]`
  - Emergency Contact: `"Mohammad Hossain"`, Phone: `"+8801812345678"`, Relationship: `"Brother"`
- **Then** a new record is created in `renters`
- **And** an audit log is emitted with action `"CREATE"` for entity `"renter"`
- **And** the tenant profile is marked `"Ready for Lease"`.

#### Scenario 3.1.2: Invalid NID Format Rejected (Edge Case / Failure)
- **Given** I am registering a new renter
- **When** I enter NID Number as `"123456789"` (9 digits) or `"12345678901"` (11 digits)
- **Then** client and server Zod validation rejects the mutation with error code `"NID_INVALID_FORMAT"`
- **And** the UI displays: `"NID must be either a 10-digit Smart NID or a 17-digit National ID number."`
- **And** no database record is saved.

#### Scenario 3.1.3: Missing Blood Group Rejected (Regulatory Invariant)
- **Given** I am filling out the renter registration form
- **When** the blood group dropdown is omitted
- **Then** the form cannot be submitted, and an error indicates `"Blood Group is required for emergency safety"`.

---

### Story 3.2: Tenancy Agreement Creation & Advance Deposit Initialization
**As an** estate manager  
**I want to** draft and activate a rental contract for Flat 4B specifying monthly rent, service charge, and 2 months advance security deposit  
**So that** the tenant's financial ledger is formally initialized and the flat is locked from other leases.

#### Scenario 3.2.1: Contract Activation & Automatic Flat Occupancy (Happy Path)
- **Given** renter `"Tanvir Ahmed"` is registered
- **And** flat `"Flat 4B"` in `"Gulshan Heights"` has status `"vacant"`
- **When** I create and activate a contract with:
  - Monthly Rent: `৳ 30,000.00`
  - Service Charge: `৳ 5,000.00`
  - Security Deposit Amount: `৳ 60,000.00` (2 months rent)
  - Start Date: `"2026-11-01"`
  - Notice Period: `30` days
- **Then** a `rental_contracts` record is created with:
  - `status = "active"`
  - `security_deposit_amount = "60000.00"`
  - `remaining_deposit_balance = "60000.00"`
- **And** the status of `"Flat 4B"` in `flats` updates from `"vacant"` to `"occupied"`
- **And** an audit log is written recording contract activation and deposit balance initialization.

#### Scenario 3.2.2: Double Occupancy Prevention (Failure Path)
- **Given** flat `"Flat 4B"` already has an `"active"` contract
- **When** a manager attempts to activate a second contract for `"Flat 4B"` with another tenant
- **Then** the transaction aborts with error code `"FLAT_ALREADY_OCCUPIED"`
- **And** the UI notifies the manager: `"This unit is currently occupied by an active tenant. You must terminate or transfer the existing lease first."`

---

### Story 3.3: Serving Notice Period & Checkout Handover
**As a** tenant or manager  
**I want to** submit a 30-day departure notice and conduct the final checkout inspection  
**So that** remaining bills and damage deductions can be processed against the advance deposit balance before returning the flat to inventory.

#### Scenario 3.3.1: Entering Notice Period (Happy Path)
- **Given** contract for `"Flat 4B"` is `"active"`
- **When** the tenant or manager submits departure notice with Departure Date `"2026-12-31"` and Reason `"Relocating to another city"`
- **Then** contract `status` transitions to `"notice_period"`
- **And** the manager dashboard alerts the team of the upcoming vacancy on `"2026-12-31"`.

#### Scenario 3.3.2: Terminating Contract & Releasing Unit (Happy Path)
- **Given** contract for `"Flat 4B"` is in `"notice_period"`
- **And** all final utility bills and damage deductions have been reconciled
- **When** the manager approves final checkout
- **Then** the contract transitions to `"status = 'terminated'"`
- **And** flat `"Flat 4B"` status switches from `"occupied"` to `"vacant"` (or `"under_maintenance"` if checkout notes require repainting)
- **And** an audit log records the lease closure and final deposit disposition.
