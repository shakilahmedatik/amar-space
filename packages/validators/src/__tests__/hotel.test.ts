import { describe, expect, it } from "bun:test";
import {
  addExtraChargeSchema,
  checkDateOverlap,
  checkInSchema,
  checkOutSchema,
  createBookingSchema,
  createRoomSchema,
  createRoomTypeSchema,
  HOTEL_ERROR_CODES,
  publicCreateBookingSchema,
  searchAvailabilitySchema,
  updateRoomStatusSchema,
} from "../hotel";

describe("Domain 07: Hotel & Resort PMS Validator Rules", () => {
  it("validates createRoomTypeSchema successfully with defaults", () => {
    const valid = createRoomTypeSchema.parse({
      name: "Deluxe Ocean View",
      basePrice: 9500,
      description: "Direct sea view suite",
    });

    expect(valid.name).toBe("Deluxe Ocean View");
    expect(valid.basePrice).toBe(9500);
    expect(valid.capacityAdults).toBe(2);
    expect(valid.capacityChildren).toBe(0);
    expect(valid.bedType).toBe("queen");
    expect(valid.amenities).toEqual([]);
    expect(valid.photos).toEqual([]);
  });

  it("validates createRoomSchema and updateRoomStatusSchema", () => {
    const room = createRoomSchema.parse({
      roomTypeId: "rt-deluxe",
      roomNumber: "304",
      floor: 3,
      status: "available",
      housekeepingNotes: "Clean and inspected",
    });

    expect(room.roomNumber).toBe("304");
    expect(room.status).toBe("available");

    const statusUpdate = updateRoomStatusSchema.parse({
      roomId: "room-304",
      status: "cleaning",
      housekeepingNotes: "Linen change in progress",
    });

    expect(statusUpdate.status).toBe("cleaning");
    expect(statusUpdate.housekeepingNotes).toBe("Linen change in progress");
  });

  it("enforces checkOutDate strictly greater than checkInDate in createBookingSchema", () => {
    const validBooking = createBookingSchema.parse({
      roomTypeId: "rt-deluxe",
      checkInDate: "2026-11-10",
      checkOutDate: "2026-11-14",
      guestName: "Sadman Sakib",
      guestEmail: "sadman@example.com",
      guestPhone: "01712345678",
      adultsCount: 2,
    });

    expect(validBooking.checkInDate).toBe("2026-11-10");
    expect(validBooking.checkOutDate).toBe("2026-11-14");

    // Equal dates (same day checkout) -> rejected
    expect(() =>
      createBookingSchema.parse({
        roomTypeId: "rt-deluxe",
        checkInDate: "2026-11-10",
        checkOutDate: "2026-11-10",
        guestName: "Sadman Sakib",
        guestEmail: "sadman@example.com",
        guestPhone: "01712345678",
      }),
    ).toThrow();

    // Check-out before check-in -> rejected
    expect(() =>
      createBookingSchema.parse({
        roomTypeId: "rt-deluxe",
        checkInDate: "2026-11-15",
        checkOutDate: "2026-11-10",
        guestName: "Sadman Sakib",
        guestEmail: "sadman@example.com",
        guestPhone: "01712345678",
      }),
    ).toThrow();
  });

  it("requires mandatory guest NID or Passport in checkInSchema", () => {
    const valid = checkInSchema.parse({
      bookingId: "bk-12345",
      roomId: "room-304",
      guestNidOrPassport: "19942692019000341",
    });

    expect(valid.guestNidOrPassport).toBe("19942692019000341");

    // Missing or too short NID/Passport -> rejected
    expect(() =>
      checkInSchema.parse({
        bookingId: "bk-12345",
        roomId: "room-304",
        guestNidOrPassport: "123",
      }),
    ).toThrow();
  });

  it("validates checkOutSchema and addExtraChargeSchema", () => {
    const checkout = checkOutSchema.parse({
      bookingId: "bk-12345",
      settleExtraCharges: 1500,
      paymentMethod: "bkash",
      notes: "Minibar drinks settled",
    });

    expect(checkout.settleExtraCharges).toBe(1500);
    expect(checkout.paymentMethod).toBe("bkash");

    const charge = addExtraChargeSchema.parse({
      bookingId: "bk-12345",
      description: "Extra bed setup + Laundry",
      amount: 800,
    });

    expect(charge.amount).toBe(800);

    // Negative charge amount -> rejected
    expect(() =>
      addExtraChargeSchema.parse({
        bookingId: "bk-12345",
        description: "Invalid charge",
        amount: -50,
      }),
    ).toThrow();
  });

  it("validates searchAvailabilitySchema and publicCreateBookingSchema for direct guest booking engine", () => {
    const search = searchAvailabilitySchema.parse({
      organizationId: "org-grand-haven",
      checkInDate: "2026-12-01",
      checkOutDate: "2026-12-04",
      adultsCount: 2,
      childrenCount: 1,
    });

    expect(search.organizationId).toBe("org-grand-haven");
    expect(search.adultsCount).toBe(2);

    const publicBooking = publicCreateBookingSchema.parse({
      organizationId: "org-grand-haven",
      roomTypeId: "rt-ocean-suite",
      checkInDate: "2026-12-01",
      checkOutDate: "2026-12-04",
      guestName: "Fariha Anjum",
      guestEmail: "fariha@example.com",
      guestPhone: "01812345678",
      adultsCount: 2,
    });

    expect(publicBooking.guestName).toBe("Fariha Anjum");
  });

  it("calculates date interval overlaps accurately via checkDateOverlap", () => {
    // Exact overlap: Nov 10 - Nov 15 vs Nov 12 - Nov 14
    expect(checkDateOverlap("2026-11-10", "2026-11-15", "2026-11-12", "2026-11-14")).toBe(true);

    // Staggered overlap: Nov 10 - Nov 13 vs Nov 12 - Nov 16
    expect(checkDateOverlap("2026-11-10", "2026-11-13", "2026-11-12", "2026-11-16")).toBe(true);

    // Back-to-back booking (checkout 12:00 vs checkin 14:00 on Nov 13) does NOT overlap
    expect(checkDateOverlap("2026-11-10", "2026-11-13", "2026-11-13", "2026-11-16")).toBe(false);

    // Completely disjoint intervals do NOT overlap
    expect(checkDateOverlap("2026-11-01", "2026-11-05", "2026-11-10", "2026-11-15")).toBe(false);
  });

  it("exports standard domain error codes", () => {
    expect(HOTEL_ERROR_CODES.ROOM_NOT_AVAILABLE).toBe("ROOM_NOT_AVAILABLE");
    expect(HOTEL_ERROR_CODES.ROOM_DIRTY_OR_MAINTENANCE).toBe("ROOM_DIRTY_OR_MAINTENANCE");
    expect(HOTEL_ERROR_CODES.CHECKIN_BEFORE_DATE).toBe("CHECKIN_BEFORE_DATE");
    expect(HOTEL_ERROR_CODES.OVERLAPPING_DATES).toBe("OVERLAPPING_DATES");
    expect(HOTEL_ERROR_CODES.BOOKING_NOT_FOUND).toBe("BOOKING_NOT_FOUND");
  });
});
