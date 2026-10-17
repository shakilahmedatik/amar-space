# Domain 04: Billing, Finance & Adjustments — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 04  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [ ] Create `bills` table in `packages/db/src/schema/billing.ts` with: `billNumber`, `billingMonth`, `rentAmount`, `serviceChargeAmount`, `gasAmount`, `waterAmount`, `electricityAmount`, `wasteAndOtherAmount`, `lateFeeAmount`, `totalAmount`, `advanceAdjustedAmount`, `amountPaid`, `balanceDue`, `status`, `dueDate`, `notes`
- [ ] Add composite unique index `bills_org_contract_month_idx` on `(organizationId, contractId, billingMonth)`
- [ ] Add indexes on `(organizationId, status)` and `(organizationId, dueDate)`
- [ ] Create `advanceAdjustments` table in `packages/db/src/schema/billing.ts` with: `contractId`, `adjustedAgainstBillId`, `adjustmentType`, `amount`, `balanceBefore`, `balanceAfter`, `note`, `adjustedBy`
- [ ] Create `payments` table with: `billId`, `amount`, `paymentMethod`, `transactionId`, `paymentDate`, `receiptNumber`, `receivedBy`, `note`
- [ ] Generate Drizzle migration: `bun run db:generate`
- [ ] Apply migration: `bun run db:migrate`
- [ ] Add billing and advance adjustment seed fixtures in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [ ] Define `generateMonthlyBillsSchema` with building ID, month format `YYYY-MM`, and due date in `packages/validators/src/billing.ts`
- [ ] Define `updateBillUtilitiesSchema` with non-negative validation for gas, water, electricity meter diff, waste charges
- [ ] Define `applyAdvanceAdjustmentSchema` with amount, contractId, billId, note
- [ ] Implement atomic mathematical validator: `balanceDue === totalAmount - advanceAdjustedAmount - amountPaid`
- [ ] Implement deposit balance safety check: `remainingDepositBalance - adjustmentAmount >= 0`
- [ ] Export domain error codes (`BILL_ALREADY_EXISTS`, `DEPOSIT_INSUFFICIENT`, `BILL_ALREADY_PAID`, `PAYMENT_EXCEEDS_BALANCE`, `INVALID_TRANSACTION_ID`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [ ] Implement `billingRouter` in `packages/trpc/src/routers/billing.ts`
- [ ] `billing.listBills`: Filter by month, status, flat, with total receivable calculation
- [ ] `billing.getBillById`: Returns bill line items, linked payments, and adjustment history
- [ ] `billing.generateMonthlyBills`: Batch generates invoices for all active contracts in a building within a single transaction
- [ ] `billing.updateBillUtilities`: Recalculates total and balance due, updates status, writes audit log
- [ ] `billing.applyAdvanceAdjustment`: Atomic transaction that writes `advance_adjustments`, decrements contract `remainingDepositBalance`, credits `bill.advanceAdjustedAmount`, recalculates `balanceDue`, and writes audit log
- [ ] `billing.listAdvanceAdjustments`: Retrieves chronological adjustment history for a lease
- [ ] `billing.recordPayment`: Transaction that inserts `payments`, updates `bill.amountPaid` and `balanceDue`, updates status to `paid` or `partially_paid`, and writes audit log
- [ ] `billing.getReceiptById`: Generates printable receipt data contract
- [ ] Register `billingRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `apps/renter-portal`, `packages/ui`)
- [ ] Build Financial Summary Cards: Total Billed, Total Collected, Total Outstanding, Advance Deposit Held
- [ ] Build Monthly Invoices Table with filters for Status (`unpaid`, `partially_paid`, `paid`, `adjusted`, `overdue`), Month, and Flat
- [ ] Build "Generate Monthly Bills" modal with confirmation preview of total tenants to bill
- [ ] Build "Bill Details & Utility Entry" modal with breakdown of Rent, Service Charge, Gas, Electricity, Water
- [ ] Build "Adjust Against Advance Deposit" modal showing current advance balance, requested adjustment, and projected balance
- [ ] Build "Record Payment" modal with method selector (bKash, Nagad, Cash, Bank) and instant receipt generator
- [ ] Build Renter Portal "My Bills & Payment History" screen (`apps/renter-portal`) with direct "Pay with bKash" action
- [ ] Mobile-first responsive invoice cards with minimum 48px touch targets
- [ ] Bengali (`bn-BD`) and English (`en-US`) i18n support including Bengali numeral formatting

### Tier 5: Security, Audit Logging & Telemetry
- [ ] Enforce `manager` or `owner` role for generating bills, adjusting advance deposits, and recording payments
- [ ] Enforce tenant access control so renters can only view bills associated with their own lease
- [ ] Audit log emission on bill generation, utility updates, advance adjustments, and payment receipts
- [ ] Ensure currency calculations use precise string/decimal math without floating point drift

### Tier 6: Automated Testing & QA
- [ ] Unit test: Financial balance recalculation handles partial payments, advance adjustments, and late fees correctly
- [ ] Integration test: Adjusting advance when remaining balance is insufficient throws `DEPOSIT_INSUFFICIENT` and leaves ledger untouched
- [ ] Integration test: Advance adjustment decrements contract `remainingDepositBalance` and bill `balanceDue` atomically
- [ ] Integration test: Batch bill generation is idempotent and does not create duplicate bills for same month
- [ ] Integration test: Recording payment exceeding `balanceDue` throws `PAYMENT_EXCEEDS_BALANCE`
- [ ] Manual smoke test: Generate monthly bills, apply advance adjustment to one, pay another via bKash on mobile screen
