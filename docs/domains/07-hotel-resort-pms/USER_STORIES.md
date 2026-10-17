# Domain 07: Hotel & Resort PMS — User Stories & Acceptance Criteria

> **Standard:** Gherkin (`Given / When / Then`) with Happy Paths, Edge Cases & Negative Paths

---

### Story 7.1: Guest Direct Online Reservation via Web Engine
**As a** vacation traveler visiting Cox's Bazar  
**I want to** browse available suites on `https://sea-paradise.omniheaven.com`, select dates, and book instantly with bKash advance payment  
**So that** my vacation room is guaranteed upon arrival.

#### Scenario 7.1.1: Direct Web Reservation (Happy Path)
- **Given** `"Sea Paradise Resort"` has 3 available `"Deluxe Sea View Suite"` rooms for dates `"2026-12-10"` to `"2026-12-13"` (3 nights)
- **When** I submit booking with:
  - Guest Name: `"Mahmudul Hasan"`
  - Phone: `"+8801712345678"`, Email: `"mahmud@example.com"`
  - Adults: 2, Children: 1
  - Total Price: `৳ 24,000.00`
- **Then** a `bookings` record is created with `status = "confirmed"`, `bookingReference = "BK-202612-4019"`
- **And** an SMS confirmation with booking reference and check-in instructions is sent to the guest
- **And** the inventory calendar reduces available suites by 1.

#### Scenario 7.1.2: Overlapping Date Conflict (Edge Case / Failure)
- **Given** the last remaining suite was booked by another user 5 seconds earlier
- **When** I click "Confirm Booking"
- **Then** the reservation engine rejects the transaction with code `"ROOM_NOT_AVAILABLE"`
- **And** the UI informs me: `"This room was just booked for the selected dates. Please choose an alternate room type or dates."`

---

### Story 7.2: Front Desk Check-in with Mandatory KYC
**As a** hotel front desk receptionist  
**I want to** check in an arriving guest, verify their Bangladeshi NID or Passport, and assign an inspected clean room  
**So that** legal guest logs are maintained and the room is marked occupied.

#### Scenario 7.2.1: Successful Check-In (Happy Path)
- **Given** booking `"BK-202612-4019"` has status `"confirmed"`
- **And** room `"Room 304"` has status `"available"`
- **When** I enter Guest NID `"19892692019000123"` and click "Check In"
- **Then** the booking status updates to `"checked_in"`, `checkedInAt = NOW()`
- **And** room `"Room 304"` status transitions to `"occupied"`
- **And** an audit log records the check-in event.

#### Scenario 7.2.2: Attempted Check-In to Dirty Room Blocked (Safety Invariant)
- **Given** room `"Room 304"` has status `"cleaning"`
- **When** a receptionist attempts to check in a guest to `"Room 304"`
- **Then** the operation is rejected with error code `"ROOM_DIRTY_OR_MAINTENANCE"`
- **And** the UI alerts: `"Room 304 is currently being cleaned. Please assign an available room or wait for housekeeping inspection."`

---

### Story 7.3: Checkout & Automatic Housekeeping Dispatch
**As a** front desk manager  
**I want to** process guest checkout and settle folio extras  
**So that** the guest receives a final invoice and housekeeping is automatically scheduled to clean the room.

#### Scenario 7.3.1: Guest Checkout & Room Transition (Happy Path)
- **Given** booking `"BK-202612-4019"` has status `"checked_in"` in `"Room 304"`
- **And** room service folio charges of `৳ 2,500.00` are fully paid
- **When** I click "Process Checkout"
- **Then** the booking status transitions to `"checked_out"`, `checkedOutAt = NOW()`
- **And** `"Room 304"` automatically transitions from `"occupied"` to `"cleaning"`
- **And** the Housekeeping Companion App displays a new high-priority cleaning task for Room 304.
