# Domain 04: Billing, Finance & Adjustments — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 4.1: Automated Monthly Batch Invoicing
**As an** estate accountant or property manager  
**I want to** trigger monthly bill generation on the 1st of the month for all active tenants in a building  
**So that** rent, fixed service charges, and utility line items are accurately invoiced with a standardized due date (10th of the month).

#### Scenario 4.1.1: Successful Batch Invoicing (Happy Path)
- **Given** building `"Dhanmondi Heights"` has 10 active tenancy contracts for month `"2026-11"`
- **When** I trigger "Generate November 2026 Bills" with Due Date `"2026-11-10"`
- **Then** 10 records are inserted into `bills` within a single database transaction
- **And** for each bill:
  - `rent_amount` matches contract's `monthlyRent`
  - `service_charge_amount` matches contract's `serviceCharge`
  - `balance_due = rent_amount + service_charge_amount`
  - `status = "unpaid"`
- **And** SMS / in-app notifications are dispatched to all 10 tenants
- **And** an audit log records batch generation of 10 bills.

#### Scenario 4.1.2: Idempotency Protection Against Duplicate Invoicing (Edge Case)
- **Given** bills for month `"2026-11"` have already been generated for `"Dhanmondi Heights"`
- **When** the manager accidentally clicks "Generate November 2026 Bills" again
- **Then** the unique constraint `bills_org_contract_month_idx` protects the database
- **And** the procedure reports: `"10 bills already exist for November 2026. 0 new bills created."`
- **And** existing amounts, payments, and balances remain completely unchanged.

---

### Story 4.2: Applying Advance Deposit Adjustments Against Rent Bills
**As a** landlord or manager  
**I want to** adjust a tenant's monthly bill against their security deposit balance (e.g. for their final months of tenancy)  
**So that** the tenant does not pay cash, and their deposit balance is legally and transparently decremented.

#### Scenario 4.2.1: Full Bill Adjustment from Advance Deposit (Happy Path)
- **Given** tenant Tanvir has a contract with `remainingDepositBalance = ৳ 60,000.00`
- **And** bill `#INV-202611-04B` has `totalAmount = ৳ 30,000.00` and `balanceDue = ৳ 30,000.00`
- **When** I execute "Adjust Against Advance" for amount `৳ 30,000.00` with Note `"Adjusting November rent against 2-month advance deposit as per departure agreement"`
- **Then** an `advance_adjustments` record is created with:
  - `amount = "30000.00"`
  - `balanceBefore = "60000.00"`
  - `balanceAfter = "30000.00"`
- **And** the contract's `remainingDepositBalance` is updated to `৳ 30,000.00`
- **And** bill `#INV-202611-04B` updates:
  - `advanceAdjustedAmount = "30000.00"`
  - `balanceDue = "0.00"`
  - `status = "adjusted"`
- **And** an audit log records the adjustment with actor user ID.

#### Scenario 4.2.2: Adjustment Exceeding Remaining Deposit Balance (Failure Path)
- **Given** a tenant has only `৳ 10,000.00` remaining in their advance deposit balance
- **And** their current bill balance is `৳ 25,000.00`
- **When** a manager attempts to adjust `৳ 25,000.00` from the deposit
- **Then** the transaction aborts with error code `"DEPOSIT_INSUFFICIENT"`
- **And** the UI displays: `"Cannot adjust ৳ 25,000.00. Available advance balance is only ৳ 10,000.00."`
- **And** neither the contract balance nor the bill balance is modified.

---

### Story 4.3: Digital MFS & Cash Payment Recording
**As a** resident or building caretaker  
**I want to** record a rent payment with bKash TrxID or Cash Receipt Number  
**So that** the bill's balance due is cleared and an instant printable payment receipt is generated.

#### Scenario 4.3.1: Recording bKash Mobile Banking Payment (Happy Path)
- **Given** bill `#INV-202611-04B` has `balanceDue = ৳ 35,000.00`
- **When** a payment is recorded with:
  - Amount: `৳ 35,000.00`
  - Payment Method: `"bkash"`
  - Transaction ID: `"BL9X88012A"`
  - Payment Date: `"2026-11-05"`
- **Then** a `payments` record is created with auto-generated `receiptNumber = "REC-202611-0042"`
- **And** the bill updates to `amountPaid = "35000.00"`, `balanceDue = "0.00"`, `status = "paid"`
- **And** a PDF/digital receipt is immediately available for download in Bengali and English.

#### Scenario 4.3.2: Partial Payment Handling
- **Given** bill `#INV-202611-04B` has `balanceDue = ৳ 30,000.00`
- **When** the tenant pays `৳ 15,000.00` cash
- **Then** a `payments` record is inserted for `৳ 15,000.00`
- **And** the bill updates to `amountPaid = "15000.00"`, `balanceDue = "15000.00"`, `status = "partially_paid"`
- **And** the receipt reflects remaining unpaid balance of `৳ 15,000.00`.
