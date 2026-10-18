# Domain 07: Hotel & Resort PMS — 6-Tier Task Checklist

> **Tracking:** Checkbox Progress Tracker for Domain 07  
> **Target:** 100% Quality & Production Verification

---

### Tier 1: Database & Migrations
- [x] Ensure `roomTypes` table in `packages/db/src/schema/hotel.ts` has: `capacityAdults`, `capacityChildren`, `bedType`, `bedCount`, `sizeSqFt`, `amenities`, `photos`
- [x] Add `housekeepingNotes` to `rooms` table
- [x] Ensure `bookings` table has: `bookingReference`, `adultsCount`, `childrenCount`, `totalPrice`, `extraCharges`, `guestNidOrPassport`, `checkedInAt`, `checkedOutAt`
- [x] Add indexes on `(organizationId, checkInDate, checkOutDate)` and `bookingReference`
- [x] Run migration check: `bun run db:generate` and `bun run db:migrate`
- [x] Add seed fixtures for 1 resort with 4 room types and 12 rooms in `packages/db/src/seed.ts`

### Tier 2: Business Logic & Validators
- [x] Define `createRoomTypeSchema` and `updateRoomTypeSchema` in `packages/validators/src/hotel.ts`
- [x] Define `createBookingSchema` with date validation (`checkOutDate > checkInDate`)
- [x] Define `checkInSchema` with mandatory guest NID or Passport
- [x] Implement date-range overlap checker: `isRoomAvailable(db, roomId, checkIn, checkOut)`
- [x] Export domain error codes (`ROOM_NOT_AVAILABLE`, `ROOM_DIRTY_OR_MAINTENANCE`, `CHECKIN_BEFORE_DATE`, `OVERLAPPING_DATES`)

### Tier 3: API & Server Procedures (Hono + tRPC)
- [x] Implement `hotelRouter` in `packages/trpc/src/routers/hotel.ts`
- [x] `hotel.listRoomTypes`, `createRoomType`, `updateRoomType`
- [x] `hotel.listRooms`: Live floor grid with statuses (`available`, `occupied`, `cleaning`, `maintenance`)
- [x] `hotel.updateRoomStatus`: Allows housekeeping staff to switch room to `available`
- [x] `hotel.listBookings`: Filter by date range, guest, and status
- [x] `hotel.createReservation`: Transaction that locks room dates and generates booking reference
- [x] `hotel.checkInGuest`: Verifies room is `available`, sets room to `occupied`, sets booking to `checked_in`
- [x] `hotel.checkOutGuest`: Settles charges, sets booking to `checked_out`, flips room to `cleaning`
- [x] `hotel.publicSearchAvailability`: Public endpoint for direct hotel booking engine (`apps/hotel-resort-web`)
- [x] Register `hotelRouter` in main `appRouter` (`packages/trpc/src/routers/app.ts`)

### Tier 4: UI/UX & Responsive Frontends (`apps/admin`, `apps/hotel-resort-web`, `packages/ui`)
- [x] Build Front Desk Calendar / Tape Chart (Room vs Date matrix with color-coded reservation blocks)
- [x] Build "Quick Check-in" modal with instant guest NID input
- [x] Build Housekeeping Dashboard showing rooms needing cleaning, inspection, and maintenance
- [x] Build Folio & Room Charges drawer for adding food, beverage, and laundry items
- [x] Build Guest Booking Engine (`apps/hotel-resort-web`) with room photo carousels, date picker, and bKash checkout
- [x] Mobile-first viewports with touch-friendly room status toggles (≥48px)
- [x] Bengali (`bn-BD`) and English (`en-US`) i18n translation keys

### Tier 5: Security, Audit Logging & Telemetry
- [x] Role authorization: Frontdesk procedures require `staff`, `manager`, or `owner`
- [x] Rate limiting on public booking search and creation endpoints
- [x] Audit log emission on reservation creation, guest check-in, check-out, and room status changes

### Tier 6: Automated Testing & QA
- [x] Unit test: Check-out date must be strictly greater than check-in date
- [x] Integration test: Booking the same room for overlapping dates throws `ROOM_NOT_AVAILABLE`
- [x] Integration test: Checking out a guest flips room status to `cleaning` in single transaction
- [x] Manual smoke test: Complete public guest booking on mobile, check in guest from admin, complete checkout
