# Domain 05: Maintenance & Notices — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 5.1: Tenant Reports Urgent Maintenance Issue with Photos
**As a** resident living in Flat 3A  
**I want to** submit a maintenance ticket with photo evidence and priority rating from my mobile portal  
**So that** the building management can dispatch a technician promptly without me having to chase the caretaker.

#### Scenario 5.1.1: Successful Ticket Submission (Happy Path)
- **Given** I am an authenticated resident in `"Flat 3A"`, `"Gulshan Heights"`
- **When** I submit a maintenance request with:
  - Title: `"Severe bathroom pipe leak under sink"`
  - Category: `"plumbing"`
  - Priority: `"urgent"`
  - Description: `"Water is dripping rapidly and pooling on the bathroom floor."`
  - Photos: `["https://s3.amarspace.com/tickets/photo1.jpg"]`
- **Then** a new record is saved in `maintenance_requests` with:
  - `status = "open"`
  - `buildingId = "bld_gulshan"`
  - `flatId = "flat_3a"`
  - `requestedByUserId = my_user_id`
- **And** the building manager receives an instant dashboard alert and push notification
- **And** an audit log records ticket creation.

#### Scenario 5.1.2: Cross-Tenant Ticket Snooping Blocked (Security Invariant)
- **Given** tenant Rafiq lives in `"Flat 5B"`
- **When** Rafiq attempts to fetch ticket details for a ticket logged by tenant Tanvir in `"Flat 3A"`
- **Then** the tRPC procedure throws error code `"FORBIDDEN_TICKET_ACCESS"`
- **And** no ticket data or photos are disclosed.

---

### Story 5.2: Work Order Assignment & Resolution with Proof
**As a** building manager  
**I want to** assign a plumber to an open request, record parts cost, and attach a post-repair photo before marking it resolved  
**So that** work is verified, costs are tracked, and the resident can confirm satisfaction.

#### Scenario 5.2.1: Resolving Ticket with Proof and Cost Tracking (Happy Path)
- **Given** ticket `#TCK-1092` has status `"in_progress"`
- **When** the manager or assigned technician marks the ticket resolved with:
  - Resolution Notes: `"Replaced cracked PVC elbow pipe and reinforced joint with Teflon tape."`
  - Resolution Photos: `["https://s3.amarspace.com/tickets/repaired_pipe.jpg"]`
  - Repair Cost: `৳ 1,200.00`
  - Cost Billed To: `"landlord"`
- **Then** the ticket updates to `status = "resolved"`, `resolvedAt = NOW()`
- **And** the tenant receives an in-app prompt to rate and close the ticket
- **And** an audit log captures the resolution details and cost.

#### Scenario 5.2.2: Resolving Without Required Diagnosis Blocked (Validation Failure)
- **Given** ticket `#TCK-1092` has status `"open"`
- **When** a user clicks "Mark Resolved" without entering resolution notes
- **Then** the mutation is rejected with error code `"RESOLUTION_NOTES_REQUIRED"`
- **And** the ticket remains in its prior state.

---

### Story 5.3: Building-Wide Digital Broadcast Notices
**As a** property manager  
**I want to** post a pinned broadcast notice regarding upcoming water tank maintenance  
**So that** all residents are alerted in advance on their resident portal and mobile devices.

#### Scenario 5.3.1: Publishing Targeted Building Notice (Happy Path)
- **Given** I am a manager in `"Dhanmondi Residence"`
- **When** I publish a notice with:
  - Title: `"Notice: Overhead Water Tank Cleaning on Friday"`
  - Body: `"Please be advised that water supply will be temporarily suspended on Friday, Nov 7, from 9:00 AM to 2:00 PM for annual water tank disinfection."`
  - Target Audience: `"specific_building"`
  - Target Building: `"Dhanmondi Residence"`
  - Is Pinned: `true`
  - Expiry Date: `"2026-11-08"`
- **Then** a `notices` record is created
- **And** all residents of `"Dhanmondi Residence"` see a high-priority pinned banner on their portal
- **And** residents of other buildings in the organization do not see this notice.
