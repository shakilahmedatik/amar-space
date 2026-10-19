# Domain 03: Renter Lifecycle & Contracts — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 03  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [x] Update `renters` table in `packages/db/src/schema/renters.ts` with: `userId` (foreign key to users), `dateOfBirth`, `nidFrontPhoto`, `nidBackPhoto`, `digitalSignatureUrl`
- [x] Add composite unique index `renters_org_nid_idx` on `(organizationId, nidNumber)`
- [x] Update `rentalContracts` table with: `serviceCharge`, `securityDepositAmount`, `remainingDepositBalance`, `noticePeriodDays`, `terminationDate`, `terminationReason`, `contractDocumentUrl`
- [x] Add index on `(organizationId, flatId, status)`
- [x] Generate Drizzle migration: `bun run db:generate`
- [x] Apply migration: `bun run db:migrate`
- [x] Seed database with 3 realistic Bangladeshi tenant profiles and active rental contracts in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [x] Define Bangladeshi NID regex validator in `packages/validators/src/renter.ts`: `^(?:\d{10}|\d{17})$`
- [x] Define Blood Group enum validator: `z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])`
- [x] Define `createRenterSchema` with full name, phone, NID, blood group, occupation, emergency contact
- [x] Define `createContractSchema` with monthly rent, service charge, advance deposit, start date, and notice days
- [x] Define `terminateContractSchema` with checkout inspection notes and refund calculations
- [x] Export domain error codes (`NID_INVALID_FORMAT`, `NID_ALREADY_EXISTS`, `FLAT_ALREADY_OCCUPIED`, `INVALID_BLOOD_GROUP`, `CONTRACT_NOT_IN_DRAFT`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [x] Implement `renterRouter` in `packages/trpc/src/routers/renter.ts`
- [x] `renter.listRenters`: Filter by search term (name, phone, NID) and pagination
- [x] `renter.getRenterById`: Returns renter KYC with contract history
- [x] `renter.createRenter`: Inserts renter with NID uniqueness check and audit log
- [x] `renter.updateRenter`: Updates renter KYC and audit log
- [x] `renter.listContracts`: Filter contracts by status and flat
- [x] `renter.createContract`: Drafts lease agreement
- [x] `renter.activateContract`: Transaction that sets `remainingDepositBalance = securityDepositAmount`, sets flat status to `occupied`, and writes audit log
- [x] `renter.submitNoticePeriod`: Transitions status to `notice_period` and alerts property manager
- [x] `renter.terminateContract`: Transaction that reconciles final deposit balance, sets flat status to `vacant`/`under_maintenance`, and writes audit log
- [x] Register `renterRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `apps/renter-portal`, `packages/ui`)
- [ ] Build "Renter Directory" table with search, blood group filter badges, and active flat chips
- [ ] Build "Register New Renter" step-wizard: Step 1 (Personal & NID), Step 2 (Family & Emergency), Step 3 (Photo Uploads / Signature)
- [ ] Build "New Tenancy Contract" drawer with rent, service charge, advance deposit calculator, and flat selector
- [ ] Build Contract Details view with live Advance Deposit Ledger widget
- [ ] Build "Notice Period & Handover" dialog with checkout checklist (Key return, meter reading verification, paint condition)
- [ ] Build Renter Portal Profile View (`apps/renter-portal`) where tenant sees their own agreement details and landlord emergency contacts
- [ ] Ensure mobile viewports (< 768px) render renter profiles with accessible 48px action buttons
- [ ] Bengali (`bn-BD`) and English (`en-US`) i18n translation strings for all renter and lease forms

### Tier 5: Security, Audit Logging & Telemetry
- [x] Enforce `manager` or `owner` role for creating renters and modifying leases
- [x] Restrict Renter Portal access so tenants can only query contracts where `renter.userId === session.user.id`
- [x] Audit log emission on renter registration, contract activation, notice submission, and contract termination
- [x] Securely sign S3/R2 upload URLs for NID card images and lease PDFs

### Tier 6: Automated Testing & QA
- [x] Unit test: NID validator accepts 10-digit smart NID, 17-digit legacy NID, and rejects other lengths/letters
- [x] Unit test: Blood group validator rejects non-ABO values
- [x] Integration test: Activating a contract on an already occupied flat throws `FLAT_ALREADY_OCCUPIED`
- [x] Integration test: Activating a contract sets flat status to `occupied` in atomic transaction
- [x] Integration test: Terminating a contract sets flat status back to vacant and preserves historical logs
- [ ] Manual smoke test: Onboard tenant, execute lease, view lease in renter portal on mobile screen
