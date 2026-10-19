import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq, schema } from "@omniheaven/db";
import {
  closeTestDb,
  createTestCaller,
  getTestDb,
  isTestDbAvailable,
  truncateAllTables,
} from "../helpers/test-db";

const isAvailable = await isTestDbAvailable();
const describeSuite = isAvailable ? describe : describe.skip;

describeSuite("Domain 07: Hotel & Resort PMS Integration Suite", () => {
  const { db } = getTestDb();
  const orgId = "org-hotel-resort-test";
  const ownerUserId = "usr-hotel-owner";
  let roomTypeId = "";
  let roomId = "";
  let bookingId = "";

  beforeAll(async () => {
    const isAvailable = await isTestDbAvailable();
    if (!isAvailable) {
      console.warn("Test DB unavailable at localhost:5433 - skipping integration suite.");
      return;
    }
    await truncateAllTables();

    // 1. Seed hotel user and organization
    await db.insert(schema.users).values({
      id: ownerUserId,
      email: "hotel-owner@omniheaven.com",
      name: "Hotel General Manager",
      emailVerified: true,
    });

    await db.insert(schema.organizations).values({
      id: orgId,
      name: "Grand Azure Resort & Spa",
      slug: "grand-azure-resort",
      productType: "hotel",
    });

    await db.insert(schema.members).values({
      id: "mem-hotel-owner",
      organizationId: orgId,
      userId: ownerUserId,
      role: "owner",
    });
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("1. Creates room type catalog item and physical room inventory", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "hotel-owner@omniheaven.com",
        name: "Hotel General Manager",
      },
      organizationId: orgId,
    });

    // Create Deluxe Suite Room Type
    const roomType = await caller.hotel.createRoomType({
      name: "Deluxe Ocean View Suite",
      description: "King bed suite with panoramic Bay of Bengal ocean view",
      basePrice: 9500,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: "king",
      bedCount: 1,
      amenities: ["Ocean View Balcony", "High-speed WiFi", "Bathtub", "Mini-bar"],
      photos: ["https://cdn.omniheaven.com/hotels/azure/deluxe-1.jpg"],
    });

    expect(roomType.id).toBeDefined();
    expect(roomType.name).toBe("Deluxe Ocean View Suite");
    expect(Number(roomType.basePrice)).toBe(9500);
    roomTypeId = roomType.id;

    // Create Physical Room 301
    const room = await caller.hotel.createRoom({
      roomTypeId: roomType.id,
      roomNumber: "301",
      floor: 3,
      status: "available",
      housekeepingNotes: "Deep sanitized",
    });

    expect(room.id).toBeDefined();
    expect(room.roomNumber).toBe("301");
    expect(room.status).toBe("available");
    roomId = room.id;
  });

  it("2. Creates staff reservation for guest with automated rate calculation", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "hotel-owner@omniheaven.com",
        name: "Hotel General Manager",
      },
      organizationId: orgId,
    });

    const booking = await caller.hotel.createReservation({
      roomTypeId,
      checkInDate: "2026-11-20",
      checkOutDate: "2026-11-23", // 3 nights @ 9500 = 28500
      guestName: "Ayesha Siddiqua",
      guestEmail: "ayesha.siddiqua@example.com",
      guestPhone: "+8801711998877",
      adultsCount: 2,
      childrenCount: 1,
      specialRequests: "Anniversary setup with flowers",
    });

    expect(booking.id).toBeDefined();
    expect(booking.bookingReference).toMatch(/^BK-/);
    expect(booking.status).toBe("confirmed");
    expect(Number(booking.totalPrice)).toBe(28500);
    bookingId = booking.id;
  });

  it("3. Checks in guest with mandatory KYC, binding room and locking status to occupied", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "hotel-owner@omniheaven.com",
        name: "Hotel General Manager",
      },
      organizationId: orgId,
    });

    const checkedIn = await caller.hotel.checkInGuest({
      bookingId,
      roomId,
      guestNidOrPassport: "A98765432",
      specialRequests: "Keycard #301 issued to guest",
    });

    expect(checkedIn.status).toBe("checked_in");
    expect(checkedIn.roomId).toBe(roomId);
    expect(checkedIn.checkedInAt).toBeDefined();

    // Verify physical room status transitioned to occupied
    const room = await db.query.rooms.findFirst({
      where: eq(schema.rooms.id, roomId),
    });
    expect(room?.status).toBe("occupied");
  });

  it("4. Prevents double-booking when no inventory is available, and prevents check-in to occupied room", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "hotel-owner@omniheaven.com",
        name: "Hotel General Manager",
      },
      organizationId: orgId,
    });

    // 1. Attempting reservation when all rooms of the type are occupied triggers ROOM_NOT_AVAILABLE
    try {
      await caller.hotel.createReservation({
        roomTypeId,
        checkInDate: "2026-11-20",
        checkOutDate: "2026-11-22",
        guestName: "Zubair Ahmed",
        guestEmail: "zubair@example.com",
        guestPhone: "+8801811998877",
        adultsCount: 1,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.message).toBe("ROOM_NOT_AVAILABLE");
    }

    // 2. Add physical room 302 to provide inventory for a second reservation
    await caller.hotel.createRoom({
      roomTypeId,
      roomNumber: "302",
      floor: 3,
    });

    const secondBooking = await caller.hotel.createReservation({
      roomTypeId,
      checkInDate: "2026-11-20",
      checkOutDate: "2026-11-22",
      guestName: "Zubair Ahmed",
      guestEmail: "zubair@example.com",
      guestPhone: "+8801811998877",
      adultsCount: 1,
    });

    // Attempt checking in 2nd booking into room 301 (which is currently occupied)
    try {
      await caller.hotel.checkInGuest({
        bookingId: secondBooking.id,
        roomId, // room 301
        guestNidOrPassport: "B12345678",
      });
      expect(true).toBe(false); // Should not succeed
    } catch (err: any) {
      expect(err.message).toBe("ROOM_DIRTY_OR_MAINTENANCE");
    }
  });

  it("5. Posts folio extra charge to active booking", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "hotel-owner@omniheaven.com",
        name: "Hotel General Manager",
      },
      organizationId: orgId,
    });

    const updated = await caller.hotel.addExtraCharge({
      bookingId,
      description: "Room service seafood dinner",
      amount: 3500,
    });

    expect(Number(updated.extraCharges)).toBe(3500);
    expect(Number(updated.totalPrice)).toBe(28500);
  });

  it("6. Checks out guest, settling balance and transitioning room to cleaning status", async () => {
    const caller = createTestCaller({
      user: {
        id: ownerUserId,
        email: "hotel-owner@omniheaven.com",
        name: "Hotel General Manager",
      },
      organizationId: orgId,
    });

    const checkedOut = await caller.hotel.checkOutGuest({
      bookingId,
      settleExtraCharges: 3500,
      paymentMethod: "card",
      notes: "Guest departed smoothly. Checked room for left items.",
    });

    expect(checkedOut.status).toBe("checked_out");
    expect(checkedOut.checkedOutAt).toBeDefined();

    // Verify room has automatically transitioned to cleaning status for housekeeping
    const room = await db.query.rooms.findFirst({
      where: eq(schema.rooms.id, roomId),
    });
    expect(room?.status).toBe("cleaning");
  });
});
