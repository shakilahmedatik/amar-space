# omniHeaven API Reference & Procedure Catalog

> **Protocol:** tRPC v11 + OpenAPI 3.1 Specification  
> **Interactive Docs:** Mounted at `http://localhost:4000/api/docs` (Scalar UI)  
> **OpenAPI JSON Spec:** Available at `http://localhost:4000/api/openapi.json`  
> **Base URL:** `http://localhost:4000/trpc`  
> **Last Updated:** October 19, 2026

---

## Overview

The omniHeaven API provides complete programmatic access for residential property management, commercial estates, and hotel/resort operations. All mutations require appropriate role authorization and emit structured audit logs.

### Standard Request Headers
| Header | Description | Required |
|---|---|:---:|
| `Authorization` | Bearer token / Better Auth session cookie | Yes (Protected procedures) |
| `x-organization-id` | UUID of the active organization context | Yes (Tenant procedures) |
| `x-request-id` | Client-generated or gateway-assigned correlation ID | Optional (Auto-generated) |

---

## 1. Health Router (`health.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `health.check` | Query | Public | None | Returns service status, version, and server timestamp |

---

## 2. Organization Router (`organization.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `organization.getActiveOrganization` | Query | Member+ | `GLOBAL_HTTP` | Returns details and subscription of the active organization |
| `organization.getBySlug` | Query | Public | `PUBLIC_READ` | Public organization lookup by unique slug |
| `organization.checkSlugAvailability` | Query | Public | `PUBLIC_READ` | Real-time validation checking if an organization slug is free |
| `organization.listMyOrganizations` | Query | User | `GLOBAL_HTTP` | Lists all organizations the authenticated user belongs to |
| `organization.create` | Mutation | User | `MUTATIONS_STANDARD` | Creates a new organization, assigns caller as sole owner, starts trial |
| `organization.update` | Mutation | Owner, Admin | `MUTATIONS_STANDARD` | Updates organization metadata, branding, and contact info |
| `organization.switchActive` | Mutation | Member+ | `MUTATIONS_STANDARD` | Sets the active organization ID in the user's database session |
| `organization.listMembers` | Query | Member+ | `GLOBAL_HTTP` | Paginated listing of members belonging to active organization |
| `organization.listInvitations` | Query | Manager+ | `GLOBAL_HTTP` | Lists pending and past team member invitations |
| `organization.inviteMember` | Mutation | Owner, Admin | `INVITATIONS` (10/hr) | Invites a team member with 7-day expiration and role assignment |
| `organization.acceptInvitation` | Mutation | User | `MUTATIONS_STANDARD` | Accepts a pending invitation matching the user's email |
| `organization.updateMemberRole` | Mutation | Owner, Admin | `MUTATIONS_STANDARD` | Updates member role (enforces sole-owner protection) |
| `organization.removeMember` | Mutation | Owner, Admin | `MUTATIONS_STANDARD` | Removes member from organization (enforces sole-owner check) |

---

## 3. Property & Building Router (`property.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `property.listBuildings` | Query | Staff+ | `GLOBAL_HTTP` | Lists all buildings belonging to active organization |
| `property.getBuildingById` | Query | Staff+ | `GLOBAL_HTTP` | Retrieves specific building details, flat counts, and rules |
| `property.createBuilding` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Creates a new building (address, floors, amenities) |
| `property.updateBuilding` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Updates building configuration, rules, caretaker info |
| `property.deleteBuilding` | Mutation | Owner, Admin | `MUTATIONS_STANDARD` | Soft-deletes / deletes building if all flats are vacant |
| `property.listFlats` | Query | Staff+ | `GLOBAL_HTTP` | Lists flats filtered by building, floor, or status |
| `property.getFlatById` | Query | Staff+ | `GLOBAL_HTTP` | Retrieves flat details, utility meter IDs, and current lease |
| `property.createFlat` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Creates single flat unit (enforces SaaS plan unit quota) |
| `property.updateFlat` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Updates flat bedrooms, square feet, default rent & service charge |
| `property.bulkCreateFlats` | Mutation | Manager+ | `MUTATIONS_BULK` (10/5m) | Generates floor-by-floor unit grids in a single atomic transaction |
| `property.listEmergencyContacts`| Query | Member+ | `GLOBAL_HTTP` | Returns caretaker, police, WASA, fire service emergency contacts |
| `property.addEmergencyContact` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Adds emergency contact for a specific building |
| `property.deleteEmergencyContact`| Mutation | Manager+ | `MUTATIONS_STANDARD`| Removes emergency contact entry |

---

## 4. Renter Lifecycle Router (`renter.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `renter.listRenters` | Query | Staff+ | `GLOBAL_HTTP` | Lists all registered tenants in the active organization |
| `renter.getRenterById` | Query | Staff+ | `GLOBAL_HTTP` | Retrieves full tenant KYC (NID, blood group, family members) |
| `renter.registerRenter` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Registers tenant with mandatory Bangladeshi NID & blood group |
| `renter.updateRenter` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Updates tenant contact details, emergency contacts, photos |
| `renter.checkNidAvailability` | Query | Staff+ | `GLOBAL_HTTP` | Validates NID format and checks for overlapping active leases |
| `renter.listContracts` | Query | Staff+ | `GLOBAL_HTTP` | Lists rental contracts with status (`active`, `notice`, `ended`) |
| `renter.getContractById` | Query | Staff+ | `GLOBAL_HTTP` | Fetches lease terms, monthly rent, deposit balance, PDF link |
| `renter.createContract` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Issues lease agreement, records security deposit, flips flat to occupied |
| `renter.terminateContract` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Initiates notice period / move-out settlement, returns deposit |
| `renter.renewContract` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Extends contract period with revised rent or terms |
| `renter.getMyRenterProfile` | Query | Member | `GLOBAL_HTTP` | Returns authenticated tenant's personal KYC record |
| `renter.getMyContracts` | Query | Member | `GLOBAL_HTTP` | Lists active and historical leases for the logged-in tenant |

---

## 5. Billing & Finance Router (`billing.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `billing.listBills` | Query | Manager+ | `GLOBAL_HTTP` | Lists monthly invoices filtered by month, building, flat, status |
| `billing.getBillById` | Query | Manager+ | `GLOBAL_HTTP` | Full invoice breakdown (rent, service charge, gas, water, electric) |
| `billing.generateMonthlyBill` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Generates a single flat's monthly invoice with auto-calculated dues |
| `billing.bulkGenerateBills` | Mutation | Manager+ | `MUTATIONS_BULK` (10/5m) | Batch-generates invoices for an entire building for given month |
| `billing.recordPayment` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Records cash, bank, or bKash payment; generates receipt number |
| `billing.listPayments` | Query | Manager+ | `GLOBAL_HTTP` | Lists payment ledger transactions with receipt IDs |
| `billing.getPaymentReceipt` | Query | Member+ | `GLOBAL_HTTP` | Returns printable receipt for a completed payment |
| `billing.adjustAdvanceDeposit`| Mutation | Owner, Admin | `MUTATIONS_STANDARD` | Deducts from advance security deposit against an unpaid invoice |
| `billing.listAdvanceAdjustments`| Query | Manager+ | `GLOBAL_HTTP` | Audit history of all advance deposit adjustments |
| `billing.getBillSummary` | Query | Manager+ | `GLOBAL_HTTP` | Financial aggregates: total billed, total collected, total dues |
| `billing.getMyBills` | Query | Member | `GLOBAL_HTTP` | Lists invoices for the logged-in tenant's flat |
| `billing.getMyBillById` | Query | Member | `GLOBAL_HTTP` | Details of a specific invoice owned by the tenant |
| `billing.getMyPayments` | Query | Member | `GLOBAL_HTTP` | Payment history and receipts for the logged-in tenant |

---

## 6. Maintenance & Operations Router (`operations.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `operations.listMaintenanceRequests` | Query | Staff+ | `GLOBAL_HTTP` | Lists work orders by status (`open`, `in_progress`, `resolved`) |
| `operations.getMaintenanceRequestById` | Query | Staff+ | `GLOBAL_HTTP` | Ticket details, issue category, photos, resolution notes |
| `operations.createMaintenanceRequest` | Mutation | Staff+ | `MUTATIONS_STANDARD` | Opens work order for a flat or common building area |
| `operations.assignStaffToRequest` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Assigns maintenance staff member and transitions status |
| `operations.resolveMaintenanceRequest` | Mutation | Staff+ | `MUTATIONS_STANDARD` | Closes ticket with repair costs, billing party, proof photos |
| `operations.listNotices` | Query | Staff+ | `GLOBAL_HTTP` | Lists broadcast notices for buildings/tenants |
| `operations.createNotice` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Publishes broadcast notice with target audience and expiry |
| `operations.pinNotice` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Pins notice to the top of tenant feeds |
| `operations.deleteNotice` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Removes broadcast notice |
| `operations.getMyMaintenanceRequests` | Query | Member | `GLOBAL_HTTP` | Lists maintenance tickets submitted by the logged-in tenant |
| `operations.createMyMaintenanceRequest`| Mutation | Member | `MUTATIONS_STANDARD` | Submits maintenance ticket for tenant's own flat |
| `operations.getMyNotices` | Query | Member | `GLOBAL_HTTP` | Returns active notices targeted to the tenant's building |

---

## 7. Audit Logging Router (`audit.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `audit.listAuditLogs` | Query | Owner, Admin | `GLOBAL_HTTP` | Paginated listing of immutable system activity logs |
| `audit.getAuditLogById` | Query | Owner, Admin | `GLOBAL_HTTP` | Returns full JSON before/after state diff of a specific event |
| `audit.getEntityAuditTrail` | Query | Owner, Admin | `GLOBAL_HTTP` | Chronological audit trail for a single entity (flat, lease, bill) |

---

## 8. Hotel & Resort PMS Router (`hotel.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `hotel.listRoomTypes` | Query | Staff+ | `GLOBAL_HTTP` | Lists room categories (Deluxe, Suite), capacities, amenities |
| `hotel.getRoomTypeById` | Query | Staff+ | `GLOBAL_HTTP` | Room type specifications, photos, and base nightly rates |
| `hotel.createRoomType` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Creates new room category |
| `hotel.updateRoomType` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Updates room type capacity, pricing, and descriptions |
| `hotel.listRooms` | Query | Staff+ | `GLOBAL_HTTP` | Live room grid with statuses (`available`, `occupied`, `cleaning`, `maintenance`) |
| `hotel.getRoomById` | Query | Staff+ | `GLOBAL_HTTP` | Room details and housekeeping status notes |
| `hotel.createRoom` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Adds physical room unit (enforces SaaS quota) |
| `hotel.updateRoomStatus` | Mutation | Staff+ | `MUTATIONS_STANDARD` | Housekeeping toggle (e.g. flips 'cleaning' -> 'available') |
| `hotel.listBookings` | Query | Staff+ | `GLOBAL_HTTP` | Reservations filtered by date range, guest, and status |
| `hotel.getBookingById` | Query | Staff+ | `GLOBAL_HTTP` | Reservation folio, room allocation, extra charges, guest KYC |
| `hotel.createReservation` | Mutation | Staff+ | `MUTATIONS_STANDARD` | Locks room dates, verifies non-overlap, generates reference |
| `hotel.checkInGuest` | Mutation | Staff+ | `MUTATIONS_STANDARD` | Requires NID/Passport; flips room to 'occupied' and booking to 'checked_in' |
| `hotel.checkOutGuest` | Mutation | Staff+ | `MUTATIONS_STANDARD` | Finalizes folio balance, flips room to 'cleaning', completes booking |
| `hotel.cancelBooking` | Mutation | Manager+ | `MUTATIONS_STANDARD` | Cancels reservation and releases room date locks |
| `hotel.addExtraCharge` | Mutation | Staff+ | `MUTATIONS_STANDARD` | Adds food, beverage, or laundry charges to active folio |
| `hotel.publicSearchAvailability` | Query | Public | `PUBLIC_READ` | Direct guest booking engine room search with date checks |
| `hotel.publicCreateBooking` | Mutation | Public | `MUTATIONS_STANDARD` | Guest self-service reservation checkout |

---

## 9. Superadmin Platform SaaS Router (`superadmin.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `superadmin.getPlatformStats` | Query | Superadmin | `GLOBAL_HTTP` | Platform-wide KPIs (total tenants, total units, MRR, occupancy) |
| `superadmin.listAllOrganizations` | Query | Superadmin | `GLOBAL_HTTP` | Paginated directory of all registered organizations |
| `superadmin.getOrganizationDetails` | Query | Superadmin | `GLOBAL_HTTP` | Deep-dive tenant view (member list, subscription, billing) |
| `superadmin.suspendOrganization` | Mutation | Superadmin | `MUTATIONS_STANDARD` | Suspends organization and revokes all active user sessions |
| `superadmin.reinstateOrganization` | Mutation | Superadmin | `MUTATIONS_STANDARD` | Restores suspended organization to active standing |
| `superadmin.updateOrganizationPlan` | Mutation | Superadmin | `MUTATIONS_STANDARD` | Manually overrides subscription plan or extends trial period |
| `superadmin.listSubscriptionPlans` | Query | Public | `GLOBAL_HTTP` | Lists available SaaS plans (`starter`, `pro`, `enterprise`) |
| `superadmin.createSubscriptionPlan` | Mutation | Superadmin | `MUTATIONS_STANDARD` | Creates or updates platform SaaS pricing tiers |

---

## 10. Storage & Upload Router (`upload.*`)

| Procedure | Type | Access | Rate Limit | Description |
|---|:---:|:---:|:---:|---|
| `upload.getPresignedUploadUrl` | Mutation | User | `MUTATIONS_STANDARD` | Generates 10-minute S3 PUT presigned upload URL |
| `upload.getPresignedReadUrl` | Query | User | `GLOBAL_HTTP` | Generates 60-minute S3 GET presigned URL for private documents |
