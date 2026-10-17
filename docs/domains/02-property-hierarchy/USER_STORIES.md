# Domain 02: Property & Unit Hierarchy — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 2.1: Multi-Story Building Registration & Rules Definition
**As a** property manager or owner  
**I want to** add a new residential building with its physical specifications, amenities, and house rules  
**So that** my property profile is complete and ready for flat configuration and tenant allocation.

#### Scenario 2.1.1: Successful Building Creation (Happy Path)
- **Given** I am authenticated with role `"owner"` or `"manager"` in organization `"dhanmondi-holdings"`
- **When** I submit the "New Building" form with:
  - Name: `"Shanta Sunrise Tower"`
  - Address: `"House 24, Road 7, Dhanmondi R/A"`
  - City: `"Dhaka"`, Thana: `"Dhanmondi"`, Postal Code: `"1205"`
  - Total Floors: `8`
  - Has Elevator: `1`, Has Generator: `1`
  - Gate Closing Time: `"23:00"` (11:00 PM)
  - Caretaker Phone: `"+8801712345678"`
- **Then** a new record is saved in `buildings`
- **And** an audit log is emitted with action `"CREATE"` for entity `"building"`
- **And** the building card appears on the Property Dashboard with status badge `"0 Units Configured"`.

#### Scenario 2.1.2: Invalid Bangladeshi Phone Format (Validation Failure)
- **Given** I am filling out the new building form
- **When** I enter Caretaker Phone as `"017123456"` (only 9 digits)
- **Then** client and server Zod validation rejects the request with code `"INVALID_PHONE_NUMBER"`
- **And** an error message indicates: `"Phone number must be a valid 11-digit Bangladeshi mobile number (+8801...)"`
- **And** no database record is created.

---

### Story 2.2: Automated Bulk Flat Generation
**As a** landlord adding an 8-story building with 2 flats per floor  
**I want to** auto-generate all 16 flats using a naming convention pattern (e.g. 1A, 1B through 8A, 8B)  
**So that** I don't have to manually create each flat one by one.

#### Scenario 2.2.1: Bulk Generate Flats (Happy Path)
- **Given** building `"Shanta Sunrise Tower"` has 8 floors
- **When** I use the "Bulk Generate Flats" wizard with:
  - Floor Range: `1` to `8`
  - Units Per Floor: `2` (Suffixes: `A`, `B`)
  - Default Bedrooms: `3`, Default Bathrooms: `3`
  - Baseline Rent: `৳ 32,000`, Baseline Service Charge: `৳ 4,500`
- **Then** 16 records are inserted into `flats` within a single database transaction
- **And** all flats are created with status `"vacant"`
- **And** an audit log records the bulk creation of 16 units.

#### Scenario 2.2.2: Duplicate Flat Number Collision (Edge Case)
- **Given** flat `"Flat 4A"` already exists in building `"Shanta Sunrise Tower"`
- **When** an administrator attempts to create another flat with number `"Flat 4A"` in the same building
- **Then** the unique database constraint `flats_org_building_flat_idx` triggers
- **And** the tRPC server catches the conflict and returns error code `"FLAT_DUPLICATE_NUMBER"`
- **And** the UI highlights the flat number input: `"A flat with number 'Flat 4A' already exists in this building."`

---

### Story 2.3: Meter Configuration & Utility Tracking Setup
**As a** building manager  
**I want to** record the prepaid electricity meter card number and gas type for each flat  
**So that** utility bills and tenant meter recharges are properly linked without billing disputes.

#### Scenario 2.3.1: Updating Utility Meter Details (Happy Path)
- **Given** flat `"Flat 3B"` is currently `"vacant"`
- **When** I update its specifications:
  - Electricity Meter Number: `"DPDC-7740291048"`
  - Electricity Meter Type: `"prepaid_card"`
  - Gas Type: `"fixed_line"`
  - Water Submeter Number: `"WM-03-B"`
- **Then** the record in `flats` updates with the new meter details
- **And** an audit log captures the change showing `oldValue` and `newValue`.

---

### Story 2.4: Safeguard Against Deleting Buildings with Active Units
**As the** platform integrity engine  
**I want to** prohibit the deletion of any building that contains active or occupied flats  
**So that** historical tenancy records, active leases, and financial data are never orphaned or destroyed.

#### Scenario 2.4.1: Building Deletion Blocked Due to Active Units
- **Given** building `"Gulshan Villa"` contains 12 flats, of which 10 have active contracts
- **When** an owner clicks "Delete Building"
- **Then** the API rejects the request with code `"BUILDING_HAS_ACTIVE_UNITS"`
- **And** the UI informs the user: `"Cannot delete building. You must terminate all active tenancy contracts and remove or archive all units first."`
- **And** the building and its flats remain completely untouched.
