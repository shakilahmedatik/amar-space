# Domain 02: Property & Unit Hierarchy — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 02  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [x] Update `flats` table schema in `packages/db/src/schema/building.ts` to include: `unitType`, `bedrooms`, `bathrooms`, `balconies`, `squareFeet`, `defaultRentAmount`, `defaultServiceCharge`, `electricityMeterNumber`, `electricityMeterType`, `gasType`, `waterSubmeterNumber`, `notes`
- [x] Add composite unique index `flats_org_building_flat_idx` on `(organizationId, buildingId, flatNumber)`
- [x] Add indexes on `(buildingId, floor)` and `(status)`
- [x] Update `buildings` schema to include: `city`, `thana`, `postalCode`, `hasElevator`, `hasGenerator`, `gateClosingTime`, `caretakerPhone`
- [x] Generate Drizzle migration: `bun run db:generate`
- [x] Apply migration: `bun run db:migrate`
- [x] Add realistic Bangladeshi building and flat fixtures in `packages/db/src/seed.ts` (e.g. 6-story building with 12 flats in Dhanmondi)

### Tier 2: Business Logic & Validators
- [x] Implement `createBuildingSchema` with BD phone regex (`/^(?:\+8801|01)[3-9]\d{8}$/`) in `packages/validators/src/building.ts`
- [x] Implement `updateBuildingSchema`
- [x] Implement `createFlatSchema` with non-negative rent and service charge validation
- [x] Implement `bulkCreateFlatsSchema` (floor start/end, letters array, default amenities)
- [x] Implement `updateFlatSchema` and `updateFlatStatusSchema`
- [x] Export domain error codes (`BUILDING_NOT_FOUND`, `BUILDING_HAS_ACTIVE_UNITS`, `FLAT_DUPLICATE_NUMBER`, `FLAT_OCCUPIED_STATUS_LOCKED`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [x] Implement `propertyRouter` in `packages/trpc/src/routers/property.ts`
- [x] `property.listBuildings`: Fetch all buildings for active organization with unit counts (occupied vs vacant)
- [x] `property.getBuildingById`: Fetch building details with emergency contact list
- [x] `property.createBuilding`: Create building with transaction and audit log
- [x] `property.updateBuilding`: Update building details and audit log
- [x] `property.deleteBuilding`: Verify zero active units before allowing deletion
- [x] `property.listFlatsByBuilding`: Filter flats by floor and status
- [x] `property.createFlat`: Single flat creation with unique number validation
- [x] `property.bulkCreateFlats`: Transaction-wrapped bulk flat generator
- [x] `property.updateFlat`: Update flat specifications and utility meters
- [x] `property.updateFlatStatus`: Allow switching between `vacant` and `under_maintenance` (block if occupied)
- [x] `property.listEmergencyContacts`, `createEmergencyContact`, `deleteEmergencyContact`
- [x] Register `propertyRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `packages/ui`)
- [x] Build Property Overview Grid showing building cards, occupancy percentage badges, and total rental value
- [x] Build "Add New Building" drawer with Thana dropdown and amenity toggles (Lift, Generator)
- [x] Build Floor & Unit Matrix View (Visual floor-by-floor layout showing flat occupancy status in green/orange/gray)
- [x] Build "Bulk Generate Flats" modal wizard with preview of generated flat codes
- [x] Build Flat Detail Drawer with edit tabs: General Specs, Utility Meters, Historical Renters
- [x] Build Emergency Contacts directory widget
- [x] Ensure mobile viewports (< 768px) render flats as clean swipeable cards with tap targets ≥ 48px
- [x] Externalize all text strings to Bengali (`bn-BD`) and English (`en-US`)

### Tier 5: Security, Audit Logging & Telemetry
- [x] Ensure all tRPC procedures require `orgProtectedProcedure` and role `manager` or `owner`
- [x] Audit log emission on building create/update/delete
- [x] Audit log emission on flat create/update/status change
- [x] Rate limit bulk creation endpoints to prevent database connection spikes

### Tier 6: Automated Testing & QA
- [x] Unit test: Bangladeshi phone number validator handles `0171...`, `+880171...`, and rejects invalid formats
- [x] Integration test: Duplicate flat number in same building throws `FLAT_DUPLICATE_NUMBER`
- [x] Integration test: Deleting a building with occupied flats throws `BUILDING_HAS_ACTIVE_UNITS`
- [x] Integration test: Bulk generating 20 flats executes in < 200ms within single transaction
- [x] Manual smoke test: Create building, generate 10 flats, edit meter info on mobile viewport
