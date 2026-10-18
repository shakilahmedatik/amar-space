import { describe, expect, it } from "bun:test";
import { HOTEL_ERROR_CODES } from "@omniheaven/validators";
import { appRouter } from "../routers/app";

describe("Domain 07: Hotel & Resort PMS tRPC Procedures", () => {
  const orgId = "org-grand-haven";
  const managerUserId = "user-hotel-manager";
  const roomTypeId = "rt-ocean-suite";
  const roomId = "room-301";

  it("rejects unauthenticated requests to listBookings", async () => {
    const caller = appRouter.createCaller({
      db: {} as any,
      session: null,
      organizationId: null,
      requestId: "req-unauth-hotel",
    });

    try {
      await caller.hotel.listBookings();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  it("creates reservation when room dates are available and logs audit event", async () => {
    let insertedBooking: any = null;
    let auditLog: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-hotel-1", role: "manager" }),
        },
        roomTypes: {
          findFirst: async () => ({
            id: roomTypeId,
            organizationId: orgId,
            name: "Grand Ocean View Suite",
            basePrice: "14000.00",
          }),
        },
        rooms: {
          findFirst: async () => ({
            id: roomId,
            organizationId: orgId,
            roomTypeId,
            roomNumber: "301",
            status: "available",
          }),
        },
        bookings: {
          findFirst: async () => null, // No overlapping bookings
        },
      },
      insert: (_table: any) => ({
        values: (val: any) => {
          if (val.bookingReference) {
            insertedBooking = val;
            return {
              returning: async () => [val],
            };
          }
          if (val.action) {
            auditLog = val;
            return Promise.resolve();
          }
          return { returning: async () => [val] };
        },
      }),
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@grandhaven.com", name: "Resort Manager" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-res-1",
    });

    const result = await caller.hotel.createReservation({
      roomTypeId,
      roomId,
      checkInDate: "2026-11-20",
      checkOutDate: "2026-11-23", // 3 nights
      guestName: "Zubair Ahmed",
      guestEmail: "zubair@example.com",
      guestPhone: "01712345678",
      adultsCount: 2,
    });

    expect(result.guestName).toBe("Zubair Ahmed");
    expect(result.status).toBe("confirmed");
    expect(result.bookingReference.startsWith("BK-")).toBe(true);
    expect(result.totalPrice).toBe("42000.00"); // 3 * 14000
    expect(insertedBooking).not.toBeNull();
    expect(auditLog).not.toBeNull();
    expect(auditLog.action).toBe("CREATE");
  });

  it("rejects overlapping reservation for same room with ROOM_NOT_AVAILABLE", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-hotel-1", role: "manager" }),
        },
        roomTypes: {
          findFirst: async () => ({
            id: roomTypeId,
            organizationId: orgId,
            name: "Grand Ocean View Suite",
            basePrice: "14000.00",
          }),
        },
        rooms: {
          findFirst: async () => ({
            id: roomId,
            organizationId: orgId,
            roomTypeId,
            roomNumber: "301",
            status: "available",
          }),
        },
        bookings: {
          findFirst: async () => ({
            id: "bk-existing-overlap",
            roomId,
            checkInDate: "2026-11-21",
            checkOutDate: "2026-11-25",
            status: "confirmed",
          }),
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@grandhaven.com", name: "Resort Manager" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-res-overlap",
    });

    try {
      await caller.hotel.createReservation({
        roomTypeId,
        roomId,
        checkInDate: "2026-11-20",
        checkOutDate: "2026-11-24", // Overlaps with 21-25
        guestName: "Zubair Ahmed",
        guestEmail: "zubair@example.com",
        guestPhone: "01712345678",
        adultsCount: 2,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("CONFLICT");
      expect(err.message).toBe(HOTEL_ERROR_CODES.ROOM_NOT_AVAILABLE);
    }
  });

  it("blocks guest check-in if room status is cleaning or maintenance (ROOM_DIRTY_OR_MAINTENANCE)", async () => {
    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-hotel-1", role: "manager" }),
        },
      },
      transaction: async (cb: any) => {
        const tx = {
          query: {
            bookings: {
              findFirst: async () => ({
                id: "bk-ready-for-checkin",
                organizationId: orgId,
                status: "confirmed",
              }),
            },
            rooms: {
              findFirst: async () => ({
                id: roomId,
                organizationId: orgId,
                status: "cleaning", // NOT available
              }),
            },
          },
        };
        return cb(tx);
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@grandhaven.com", name: "Resort Manager" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-checkin-dirty",
    });

    try {
      await caller.hotel.checkInGuest({
        bookingId: "bk-ready-for-checkin",
        roomId,
        guestNidOrPassport: "19922692019000123",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe("BAD_REQUEST");
      expect(err.message).toBe(HOTEL_ERROR_CODES.ROOM_DIRTY_OR_MAINTENANCE);
    }
  });

  it("successful check-in updates room to occupied and booking to checked_in", async () => {
    let updatedRoom: any = null;
    let updatedBooking: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-hotel-1", role: "manager" }),
        },
      },
      transaction: async (cb: any) => {
        const tx = {
          query: {
            bookings: {
              findFirst: async () => ({
                id: "bk-checkin-1",
                organizationId: orgId,
                status: "confirmed",
                guestName: "Tanvir Hasan",
              }),
            },
            rooms: {
              findFirst: async () => ({
                id: roomId,
                organizationId: orgId,
                roomNumber: "301",
                status: "available",
              }),
            },
          },
          update: (_table: any) => ({
            set: (val: any) => ({
              where: () => {
                if (val.guestNidOrPassport) {
                  updatedBooking = { ...val, id: "bk-checkin-1", guestName: "Tanvir Hasan" };
                  return { returning: async () => [updatedBooking] };
                }
                updatedRoom = val;
                return Promise.resolve();
              },
            }),
          }),
          insert: (_table: any) => ({
            values: () => Promise.resolve(),
          }),
        };
        return cb(tx);
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@grandhaven.com", name: "Resort Manager" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-checkin-success",
    });

    const res = await caller.hotel.checkInGuest({
      bookingId: "bk-checkin-1",
      roomId,
      guestNidOrPassport: "19922692019000123",
    });

    expect(res.status).toBe("checked_in");
    expect(updatedRoom.status).toBe("occupied");
    expect(updatedBooking.guestNidOrPassport).toBe("19922692019000123");
  });

  it("checking out a guest flips room status to cleaning and booking to checked_out in single transaction", async () => {
    let updatedRoomStatus: any = null;
    let updatedBookingStatus: any = null;

    const mockDb = {
      query: {
        members: {
          findFirst: async () => ({ id: "mem-hotel-1", role: "manager" }),
        },
      },
      transaction: async (cb: any) => {
        const tx = {
          query: {
            bookings: {
              findFirst: async () => ({
                id: "bk-checkout-1",
                organizationId: orgId,
                bookingReference: "BK-202610-8801",
                roomId,
                status: "checked_in",
                extraCharges: "1000.00",
                paymentStatus: "unpaid",
              }),
            },
          },
          update: (_table: any) => ({
            set: (val: any) => ({
              where: () => {
                if (val.status === "cleaning") {
                  updatedRoomStatus = val.status;
                  return Promise.resolve();
                }
                if (val.status === "checked_out") {
                  updatedBookingStatus = val.status;
                  return {
                    returning: async () => [
                      { id: "bk-checkout-1", status: "checked_out", paymentStatus: "paid" },
                    ],
                  };
                }
                return Promise.resolve();
              },
            }),
          }),
          insert: (_table: any) => ({
            values: () => Promise.resolve(),
          }),
        };
        return cb(tx);
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: {
        user: { id: managerUserId, email: "manager@grandhaven.com", name: "Resort Manager" },
        session: { activeOrganizationId: orgId },
      } as any,
      organizationId: orgId,
      requestId: "req-checkout-success",
    });

    const res = await caller.hotel.checkOutGuest({
      bookingId: "bk-checkout-1",
      settleExtraCharges: 500,
      paymentMethod: "bkash",
    });

    expect(res.status).toBe("checked_out");
    expect(res.paymentStatus).toBe("paid");
    expect(updatedRoomStatus).toBe("cleaning");
    expect(updatedBookingStatus).toBe("checked_out");
  });

  it("publicSearchAvailability returns room types and live available room counts", async () => {
    const mockDb = {
      query: {
        roomTypes: {
          findMany: async () => [
            {
              id: roomTypeId,
              name: "Grand Ocean View Suite",
              basePrice: "14000.00",
              capacityAdults: 2,
              capacityChildren: 1,
              bedType: "king",
              bedCount: 1,
              sizeSqFt: "750.00",
              amenities: ["Ocean View", "Balcony"],
              photos: ["https://example.com/suite.jpg"],
              rooms: [{ id: "room-301" }, { id: "room-302" }],
            },
          ],
        },
        bookings: {
          findMany: async () => [
            { id: "bk-active", roomTypeId, roomId: "room-301" }, // 1 of 2 is booked
          ],
        },
      },
    };

    const caller = appRouter.createCaller({
      db: mockDb as any,
      session: null,
      organizationId: null,
      requestId: "req-public-search-1",
    });

    const results = await caller.hotel.publicSearchAvailability({
      organizationId: orgId,
      checkInDate: "2026-12-10",
      checkOutDate: "2026-12-13", // 3 nights
      adultsCount: 2,
      childrenCount: 0,
    });

    expect(results.length).toBe(1);
    expect(results[0]?.name).toBe("Grand Ocean View Suite");
    expect(results[0]?.availableRoomsCount).toBe(1); // 2 rooms total - 1 booked = 1 available
    expect(results[0]?.nights).toBe(3);
    expect(results[0]?.estimatedTotal).toBe("42000.00");
    expect(results[0]?.isAvailable).toBe(true);
  });
});
