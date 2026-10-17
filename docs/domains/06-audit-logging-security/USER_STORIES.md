# Domain 06: Audit Logging & Security — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 6.1: Owner Audits Financial Discrepancy & Bill Adjustments
**As an** organization Owner  
**I want to** view a chronological audit trail showing who modified a utility charge or applied an advance adjustment  
**So that** I have 100% accountability over my staff and cash collection.

#### Scenario 6.1.1: Tracing Advance Adjustment Author (Happy Path)
- **Given** I am an authenticated Owner in `"Bashundhara Heights"`
- **When** I open the Audit Log viewer filtered by Entity Type `"advance_adjustment"` and Entity ID `"adj_9941"`
- **Then** the audit entry displays:
  - Actor: `"Manager Karim (karim@bashundhara.com)"`
  - Action: `"ADJUST"`
  - Before State: `{"remainingDepositBalance": "60000.00"}`
  - After State: `{"remainingDepositBalance": "30000.00"}`
  - Note: `"Adjusting November rent against deposit"`
  - IP Address: `"103.114.98.22"` (Dhaka, Bangladesh)
  - Timestamp: `"2026-11-02 14:22:10 GMT+6"`.

#### Scenario 6.1.2: Renter or Staff Attempt to View Audit Logs Blocked (Access Control)
- **Given** a user is logged in with role `"staff"` or `"member"` (renter)
- **When** they attempt to execute `audit.listAuditLogs`
- **Then** the server halts the procedure with error code `"AUDIT_FORBIDDEN"`
- **And** no audit records or user activities are revealed.

---

### Story 6.2: Atomic Audit Writing Guarantee
**As the** platform reliability engine  
**I want to** ensure that no business mutation is committed without a corresponding audit log  
**So that** phantom mutations without accountability can never exist in the database.

#### Scenario 6.2.1: Transaction Rollback on Audit Failure (Negative Invariant)
- **Given** a manager initiates a tenancy contract termination
- **When** an artificial database constraint or disk error prevents writing the audit log record
- **Then** the entire database transaction rolls back
- **And** the contract remains in its original state
- **And** an alert is logged with code `"AUDIT_LOG_WRITE_FAILED"`.

---

### Story 6.3: Exporting Certified Audit Report for Legal/Tax Compliance
**As a** real estate owner or chartered accountant  
**I want to** export a date-filtered CSV of all financial and lease audit logs for the fiscal quarter  
**So that** I can provide certified records to auditors or tax authorities in Bangladesh.

#### Scenario 6.3.1: Exporting 90-Day Audit Report (Happy Path)
- **Given** I am an authenticated Owner
- **When** I request an audit export for Date Range `"2026-07-01"` to `"2026-09-30"`
- **Then** a sanitized CSV stream containing actor, action, before/after diffs, and timestamps is generated
- **And** the export event itself is recorded in the audit log for compliance.
