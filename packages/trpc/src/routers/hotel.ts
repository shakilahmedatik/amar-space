import { and, asc, desc, eq, gt, gte, inArray, lt, lte, schema } from "@omniheaven/db";
import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  addExtraChargeSchema,
  cancelBookingSchema,
  checkInSchema,
  checkOutSchema,
  createBookingSchema,
  createRoomSchema,
  createRoomTypeSchema,
  HOTEL_ERROR_CODES,
  listBookingsSchema,
  publicCreateBookingSchema,
  searchAvailabilitySchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  updateRoomTypeSchema,
} from "@omniheaven/validators";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  orgProtectedProcedure,
  publicProcedure,
  requireRole,
  router,
  trpcRateLimit,
} from "../trpc";
import { recordAuditLog } from "../utils/audit";

function generateBookingReference(): string {
  const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BK-${dateStr}-${randomSuffix}`;
}

function calculateNights(checkInDate: string, checkOutDate: string): number {
  const inTime = new Date(`${checkInDate}T12:00:00Z`).getTime();
  const outTime = new Date(`${checkOutDate}T12:00:00Z`).getTime();
  const diffDays = Math.round((outTime - inTime) / (1000 * 3600 * 24));
  return Math.max(1, diffDays);
}

export const hotelRouter = router({
  // ==========================================
  // ROOM TYPES & CATALOG
  // ==========================================
  listRoomTypes: orgProtectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.roomTypes.findMany({
      where: eq(schema.roomTypes.organizationId, ctx.organizationId),
      orderBy: [asc(schema.roomTypes.basePrice)],
      with: {
        rooms: true,
      },
    });
  }),

  createRoomType: requireRole(["owner", "manager", "admin"])
    .input(createRoomTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const roomTypeId = `rt-${crypto.randomUUID()}`;
      const [created] = await ctx.db
        .insert(schema.roomTypes)
        .values({
          id: roomTypeId,
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description ?? null,
          basePrice: input.basePrice.toFixed(2),
          capacityAdults: input.capacityAdults,
          capacityChildren: input.capacityChildren,
          bedType: input.bedType,
          bedCount: input.bedCount,
          sizeSqFt: input.sizeSqFt ? input.sizeSqFt.toFixed(2) : null,
          amenities: input.amenities,
          photos: input.photos,
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create room type",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "manager",
        },
        action: "CREATE",
        entityType: "room_type",
        entityId: created.id,
        newValue: created,
        metadata: { name: created.name, basePrice: created.basePrice },
      });

      return created;
    }),

  updateRoomType: requireRole(["owner", "manager", "admin"])
    .input(z.object({ id: z.string().min(1), data: updateRoomTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.roomTypes.findFirst({
        where: and(
          eq(schema.roomTypes.id, input.id),
          eq(schema.roomTypes.organizationId, ctx.organizationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: HOTEL_ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        });
      }

      const updatePayload: Record<string, any> = { updatedAt: new Date() };
      if (input.data.name !== undefined) updatePayload.name = input.data.name;
      if (input.data.description !== undefined) updatePayload.description = input.data.description;
      if (input.data.basePrice !== undefined)
        updatePayload.basePrice = input.data.basePrice.toFixed(2);
      if (input.data.capacityAdults !== undefined)
        updatePayload.capacityAdults = input.data.capacityAdults;
      if (input.data.capacityChildren !== undefined)
        updatePayload.capacityChildren = input.data.capacityChildren;
      if (input.data.bedType !== undefined) updatePayload.bedType = input.data.bedType;
      if (input.data.bedCount !== undefined) updatePayload.bedCount = input.data.bedCount;
      if (input.data.sizeSqFt !== undefined) {
        updatePayload.sizeSqFt = input.data.sizeSqFt ? input.data.sizeSqFt.toFixed(2) : null;
      }
      if (input.data.amenities !== undefined) updatePayload.amenities = input.data.amenities;
      if (input.data.photos !== undefined) updatePayload.photos = input.data.photos;

      const [updated] = await ctx.db
        .update(schema.roomTypes)
        .set(updatePayload)
        .where(eq(schema.roomTypes.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update room type",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "manager",
        },
        action: "UPDATE",
        entityType: "room_type",
        entityId: updated.id,
        oldValue: existing,
        newValue: updated,
      });

      return updated;
    }),

  // ==========================================
  // PHYSICAL ROOMS & HOUSEKEEPING
  // ==========================================
  listRooms: orgProtectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.rooms.findMany({
      where: eq(schema.rooms.organizationId, ctx.organizationId),
      orderBy: [asc(schema.rooms.floor), asc(schema.rooms.roomNumber)],
      with: {
        roomType: true,
        bookings: {
          where: eq(schema.bookings.status, "checked_in"),
          limit: 1,
        },
      },
    });
  }),

  createRoom: requireRole(["owner", "manager", "admin"])
    .input(createRoomSchema)
    .mutation(async ({ ctx, input }) => {
      const roomType = await ctx.db.query.roomTypes.findFirst({
        where: and(
          eq(schema.roomTypes.id, input.roomTypeId),
          eq(schema.roomTypes.organizationId, ctx.organizationId),
        ),
      });

      if (!roomType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: HOTEL_ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        });
      }

      const existing = await ctx.db.query.rooms.findFirst({
        where: and(
          eq(schema.rooms.organizationId, ctx.organizationId),
          eq(schema.rooms.roomNumber, input.roomNumber),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Room number ${input.roomNumber} already exists in this organization.`,
        });
      }

      const roomId = `room-${crypto.randomUUID()}`;
      const [room] = await ctx.db
        .insert(schema.rooms)
        .values({
          id: roomId,
          organizationId: ctx.organizationId,
          roomTypeId: input.roomTypeId,
          roomNumber: input.roomNumber,
          floor: input.floor,
          status: input.status,
          housekeepingNotes: input.housekeepingNotes ?? null,
        })
        .returning();

      if (!room) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create room",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "manager",
        },
        action: "CREATE",
        entityType: "room",
        entityId: room.id,
        newValue: room,
        metadata: { roomNumber: room.roomNumber, roomTypeId: room.roomTypeId },
      });

      return room;
    }),

  updateRoom: requireRole(["owner", "manager", "admin"])
    .input(z.object({ id: z.string().min(1), data: updateRoomSchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.rooms.findFirst({
        where: and(
          eq(schema.rooms.id, input.id),
          eq(schema.rooms.organizationId, ctx.organizationId),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      const updatePayload: Record<string, any> = { updatedAt: new Date() };
      if (input.data.roomNumber !== undefined) updatePayload.roomNumber = input.data.roomNumber;
      if (input.data.floor !== undefined) updatePayload.floor = input.data.floor;
      if (input.data.roomTypeId !== undefined) updatePayload.roomTypeId = input.data.roomTypeId;
      if (input.data.status !== undefined) updatePayload.status = input.data.status;
      if (input.data.housekeepingNotes !== undefined) {
        updatePayload.housekeepingNotes = input.data.housekeepingNotes;
      }

      const [updated] = await ctx.db
        .update(schema.rooms)
        .set(updatePayload)
        .where(eq(schema.rooms.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update room",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "manager",
        },
        action: "UPDATE",
        entityType: "room",
        entityId: updated.id,
        oldValue: existing,
        newValue: updated,
      });

      return updated;
    }),

  updateRoomStatus: requireRole(["owner", "manager", "admin", "staff"])
    .input(updateRoomStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const room = await ctx.db.query.rooms.findFirst({
        where: and(
          eq(schema.rooms.id, input.roomId),
          eq(schema.rooms.organizationId, ctx.organizationId),
        ),
      });

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      const [updated] = await ctx.db
        .update(schema.rooms)
        .set({
          status: input.status,
          housekeepingNotes: input.housekeepingNotes ?? room.housekeepingNotes,
          updatedAt: new Date(),
        })
        .where(eq(schema.rooms.id, input.roomId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update room status",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "staff",
        },
        action: "UPDATE",
        entityType: "room",
        entityId: room.id,
        oldValue: { status: room.status, housekeepingNotes: room.housekeepingNotes },
        newValue: { status: updated.status, housekeepingNotes: updated.housekeepingNotes },
        metadata: { reason: "Housekeeping status update" },
      });

      return updated;
    }),

  // ==========================================
  // RESERVATIONS & FRONT DESK
  // ==========================================
  listBookings: orgProtectedProcedure
    .input(listBookingsSchema.optional())
    .query(async ({ ctx, input }) => {
      const whereConditions = [eq(schema.bookings.organizationId, ctx.organizationId)];

      if (input?.status) {
        whereConditions.push(eq(schema.bookings.status, input.status));
      }
      if (input?.roomTypeId) {
        whereConditions.push(eq(schema.bookings.roomTypeId, input.roomTypeId));
      }
      if (input?.roomId) {
        whereConditions.push(eq(schema.bookings.roomId, input.roomId));
      }
      if (input?.startDate) {
        whereConditions.push(gte(schema.bookings.checkInDate, input.startDate));
      }
      if (input?.endDate) {
        whereConditions.push(lte(schema.bookings.checkOutDate, input.endDate));
      }

      return ctx.db.query.bookings.findMany({
        where: and(...whereConditions),
        orderBy: [desc(schema.bookings.createdAt)],
        limit: input?.limit ?? 50,
        with: {
          roomType: true,
          room: true,
        },
      });
    }),

  getBooking: orgProtectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const booking = await ctx.db.query.bookings.findFirst({
        where: and(
          eq(schema.bookings.id, input.id),
          eq(schema.bookings.organizationId, ctx.organizationId),
        ),
        with: {
          roomType: true,
          room: true,
          payments: true,
        },
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: HOTEL_ERROR_CODES.BOOKING_NOT_FOUND,
        });
      }

      return booking;
    }),

  createReservation: orgProtectedProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const roomType = await ctx.db.query.roomTypes.findFirst({
        where: and(
          eq(schema.roomTypes.id, input.roomTypeId),
          eq(schema.roomTypes.organizationId, ctx.organizationId),
        ),
      });

      if (!roomType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: HOTEL_ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        });
      }

      if (input.roomId) {
        const room = await ctx.db.query.rooms.findFirst({
          where: and(
            eq(schema.rooms.id, input.roomId),
            eq(schema.rooms.organizationId, ctx.organizationId),
          ),
        });

        if (!room) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assigned room not found",
          });
        }

        const overlapping = await ctx.db.query.bookings.findFirst({
          where: and(
            eq(schema.bookings.organizationId, ctx.organizationId),
            eq(schema.bookings.roomId, input.roomId),
            inArray(schema.bookings.status, ["confirmed", "checked_in"]),
            lt(schema.bookings.checkInDate, input.checkOutDate),
            gt(schema.bookings.checkOutDate, input.checkInDate),
          ),
        });

        if (overlapping) {
          throw new TRPCError({
            code: "CONFLICT",
            message: HOTEL_ERROR_CODES.ROOM_NOT_AVAILABLE,
          });
        }
      } else {
        const allRoomsOfType = await ctx.db.query.rooms.findMany({
          where: and(
            eq(schema.rooms.organizationId, ctx.organizationId),
            eq(schema.rooms.roomTypeId, input.roomTypeId),
          ),
        });

        if (allRoomsOfType.length === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: HOTEL_ERROR_CODES.ROOM_NOT_AVAILABLE,
          });
        }

        const bookedRooms = await ctx.db.query.bookings.findMany({
          where: and(
            eq(schema.bookings.organizationId, ctx.organizationId),
            eq(schema.bookings.roomTypeId, input.roomTypeId),
            inArray(schema.bookings.status, ["confirmed", "checked_in"]),
            lt(schema.bookings.checkInDate, input.checkOutDate),
            gt(schema.bookings.checkOutDate, input.checkInDate),
          ),
        });

        if (bookedRooms.length >= allRoomsOfType.length) {
          throw new TRPCError({
            code: "CONFLICT",
            message: HOTEL_ERROR_CODES.ROOM_NOT_AVAILABLE,
          });
        }
      }

      const nights = calculateNights(input.checkInDate, input.checkOutDate);
      const computedPrice = (Number(roomType.basePrice) * nights).toFixed(2);
      const finalPrice = input.totalPrice ? input.totalPrice.toFixed(2) : computedPrice;
      const bookingReference = generateBookingReference();
      const bookingId = `bk-${crypto.randomUUID()}`;

      const [booking] = await ctx.db
        .insert(schema.bookings)
        .values({
          id: bookingId,
          organizationId: ctx.organizationId,
          bookingReference,
          roomTypeId: input.roomTypeId,
          roomId: input.roomId ?? null,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          guestNidOrPassport: input.guestNidOrPassport ?? null,
          specialRequests: input.specialRequests ?? null,
          adultsCount: input.adultsCount,
          childrenCount: input.childrenCount,
          totalPrice: finalPrice,
          extraCharges: "0.00",
          status: "confirmed",
          paymentStatus: "unpaid",
        })
        .returning();

      if (!booking) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "manager",
        },
        action: "CREATE",
        entityType: "booking",
        entityId: booking.id,
        newValue: booking,
        metadata: {
          bookingReference,
          guestName: booking.guestName,
          totalPrice: booking.totalPrice,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
        },
      });

      return booking;
    }),

  checkInGuest: requireRole(["owner", "manager", "admin", "staff"])
    .input(checkInSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const booking = await tx.query.bookings.findFirst({
          where: and(
            eq(schema.bookings.id, input.bookingId),
            eq(schema.bookings.organizationId, ctx.organizationId),
          ),
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: HOTEL_ERROR_CODES.BOOKING_NOT_FOUND,
          });
        }

        if (booking.status === "checked_in") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Guest is already checked in for this booking.",
          });
        }

        if (booking.status === "cancelled") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot check in a cancelled booking.",
          });
        }

        const room = await tx.query.rooms.findFirst({
          where: and(
            eq(schema.rooms.id, input.roomId),
            eq(schema.rooms.organizationId, ctx.organizationId),
          ),
        });

        if (!room) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Assigned room does not exist.",
          });
        }

        // DOMAIN INVARIANT 2: Housekeeping State Machine Lock
        if (room.status !== "available" && room.status !== "reserved") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: HOTEL_ERROR_CODES.ROOM_DIRTY_OR_MAINTENANCE,
          });
        }

        const activeOccupant = await tx.query.bookings.findFirst({
          where: and(
            eq(schema.bookings.roomId, input.roomId),
            eq(schema.bookings.status, "checked_in"),
          ),
        });

        if (activeOccupant && activeOccupant.id !== booking.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: HOTEL_ERROR_CODES.ROOM_NOT_AVAILABLE,
          });
        }

        await tx
          .update(schema.rooms)
          .set({
            status: "occupied",
            updatedAt: new Date(),
          })
          .where(eq(schema.rooms.id, input.roomId));

        const [updatedBooking] = await tx
          .update(schema.bookings)
          .set({
            status: "checked_in",
            roomId: input.roomId,
            guestNidOrPassport: input.guestNidOrPassport,
            specialRequests: input.specialRequests ?? booking.specialRequests,
            checkedInAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.bookings.id, input.bookingId))
          .returning();

        if (!updatedBooking) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update booking status",
          });
        }

        await recordAuditLog(tx, {
          orgId: ctx.organizationId,
          actor: {
            userId: ctx.user.id,
            email: ctx.user.email,
            role: ctx.role ?? "staff",
          },
          action: "UPDATE",
          entityType: "booking",
          entityId: updatedBooking.id,
          oldValue: { status: booking.status, roomId: booking.roomId },
          newValue: { status: updatedBooking.status, roomId: updatedBooking.roomId },
          metadata: {
            actionDetail: "Guest checked in",
            roomNumber: room.roomNumber,
            guestName: updatedBooking.guestName,
          },
        });

        return updatedBooking;
      });
    }),

  checkOutGuest: requireRole(["owner", "manager", "admin", "staff"])
    .input(checkOutSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const booking = await tx.query.bookings.findFirst({
          where: and(
            eq(schema.bookings.id, input.bookingId),
            eq(schema.bookings.organizationId, ctx.organizationId),
          ),
          with: { room: true },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: HOTEL_ERROR_CODES.BOOKING_NOT_FOUND,
          });
        }

        if (booking.status !== "checked_in") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot check out a booking that is not currently checked in.",
          });
        }

        const newExtraCharges = (
          Number(booking.extraCharges) + (input.settleExtraCharges ?? 0)
        ).toFixed(2);

        // DOMAIN INVARIANT 3: Automatic Checkout Housekeeping Trigger
        if (booking.roomId) {
          await tx
            .update(schema.rooms)
            .set({
              status: "cleaning",
              housekeepingNotes: `Turnover cleaning required after checkout of ${booking.bookingReference}`,
              updatedAt: new Date(),
            })
            .where(eq(schema.rooms.id, booking.roomId));
        }

        const [checkedOutBooking] = await tx
          .update(schema.bookings)
          .set({
            status: "checked_out",
            paymentStatus: "paid",
            extraCharges: newExtraCharges,
            checkedOutAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.bookings.id, input.bookingId))
          .returning();

        if (!checkedOutBooking) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to complete checkout",
          });
        }

        await recordAuditLog(tx, {
          orgId: ctx.organizationId,
          actor: {
            userId: ctx.user.id,
            email: ctx.user.email,
            role: ctx.role ?? "staff",
          },
          action: "UPDATE",
          entityType: "booking",
          entityId: checkedOutBooking.id,
          oldValue: { status: booking.status, paymentStatus: booking.paymentStatus },
          newValue: {
            status: checkedOutBooking.status,
            paymentStatus: checkedOutBooking.paymentStatus,
          },
          metadata: {
            actionDetail: "Guest checkout completed. Room flipped to cleaning.",
            settledCharges: input.settleExtraCharges,
            paymentMethod: input.paymentMethod,
          },
        });

        return checkedOutBooking;
      });
    }),

  cancelBooking: requireRole(["owner", "manager", "admin"])
    .input(cancelBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.query.bookings.findFirst({
        where: and(
          eq(schema.bookings.id, input.bookingId),
          eq(schema.bookings.organizationId, ctx.organizationId),
        ),
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: HOTEL_ERROR_CODES.BOOKING_NOT_FOUND,
        });
      }

      if (booking.status === "checked_in" || booking.status === "checked_out") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel a booking that has already ${booking.status}.`,
        });
      }

      const [cancelled] = await ctx.db
        .update(schema.bookings)
        .set({
          status: "cancelled",
          cancellationReason: input.cancellationReason,
          updatedAt: new Date(),
        })
        .where(eq(schema.bookings.id, input.bookingId))
        .returning();

      if (!cancelled) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel booking",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "manager",
        },
        action: "UPDATE",
        entityType: "booking",
        entityId: cancelled.id,
        oldValue: { status: booking.status },
        newValue: { status: cancelled.status, cancellationReason: cancelled.cancellationReason },
      });

      return cancelled;
    }),

  addExtraCharge: requireRole(["owner", "manager", "admin", "staff"])
    .input(addExtraChargeSchema)
    .mutation(async ({ ctx, input }) => {
      const booking = await ctx.db.query.bookings.findFirst({
        where: and(
          eq(schema.bookings.id, input.bookingId),
          eq(schema.bookings.organizationId, ctx.organizationId),
        ),
      });

      if (!booking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: HOTEL_ERROR_CODES.BOOKING_NOT_FOUND,
        });
      }

      const currentCharges = Number(booking.extraCharges || "0.00");
      const updatedCharges = (currentCharges + input.amount).toFixed(2);

      const [updated] = await ctx.db
        .update(schema.bookings)
        .set({
          extraCharges: updatedCharges,
          updatedAt: new Date(),
        })
        .where(eq(schema.bookings.id, input.bookingId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add extra charge",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: ctx.organizationId,
        actor: {
          userId: ctx.user.id,
          email: ctx.user.email,
          role: ctx.role ?? "staff",
        },
        action: "UPDATE",
        entityType: "booking",
        entityId: updated.id,
        oldValue: { extraCharges: booking.extraCharges },
        newValue: { extraCharges: updated.extraCharges },
        metadata: {
          chargeDescription: input.description,
          addedAmount: input.amount,
        },
      });

      return updated;
    }),

  // ==========================================
  // PUBLIC GUEST BOOKING ENGINE (UNAUTHENTICATED)
  // ==========================================
  publicSearchAvailability: publicProcedure
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.PUBLIC_READ,
        keyGenerator: (ctx) => `pub-search-${ctx.requestId}`,
      }),
    )
    .input(searchAvailabilitySchema)
    .query(async ({ ctx, input }) => {
      const roomTypes = await ctx.db.query.roomTypes.findMany({
        where: eq(schema.roomTypes.organizationId, input.organizationId),
        with: {
          rooms: true,
        },
      });

      const overlappingBookings = await ctx.db.query.bookings.findMany({
        where: and(
          eq(schema.bookings.organizationId, input.organizationId),
          inArray(schema.bookings.status, ["confirmed", "checked_in"]),
          lt(schema.bookings.checkInDate, input.checkOutDate),
          gt(schema.bookings.checkOutDate, input.checkInDate),
        ),
      });

      return roomTypes
        .filter(
          (rt) =>
            rt.capacityAdults >= input.adultsCount && rt.capacityChildren >= input.childrenCount,
        )
        .map((rt) => {
          const totalRoomsCount = rt.rooms.length;
          const bookedCount = overlappingBookings.filter((b) => b.roomTypeId === rt.id).length;
          const availableRoomsCount = Math.max(0, totalRoomsCount - bookedCount);
          const nights = calculateNights(input.checkInDate, input.checkOutDate);
          const estimatedTotal = (Number(rt.basePrice) * nights).toFixed(2);

          return {
            id: rt.id,
            name: rt.name,
            description: rt.description,
            basePrice: rt.basePrice,
            capacityAdults: rt.capacityAdults,
            capacityChildren: rt.capacityChildren,
            bedType: rt.bedType,
            bedCount: rt.bedCount,
            sizeSqFt: rt.sizeSqFt,
            amenities: rt.amenities,
            photos: rt.photos,
            availableRoomsCount,
            nights,
            estimatedTotal,
            isAvailable: availableRoomsCount > 0,
          };
        });
    }),

  publicCreateBooking: publicProcedure
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.PUBLIC_READ,
        keyGenerator: (ctx) => `pub-booking-${ctx.requestId}`,
      }),
    )
    .input(publicCreateBookingSchema)
    .mutation(async ({ ctx, input }) => {
      const roomType = await ctx.db.query.roomTypes.findFirst({
        where: and(
          eq(schema.roomTypes.id, input.roomTypeId),
          eq(schema.roomTypes.organizationId, input.organizationId),
        ),
        with: { rooms: true },
      });

      if (!roomType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: HOTEL_ERROR_CODES.ROOM_TYPE_NOT_FOUND,
        });
      }

      const overlappingBookings = await ctx.db.query.bookings.findMany({
        where: and(
          eq(schema.bookings.organizationId, input.organizationId),
          eq(schema.bookings.roomTypeId, input.roomTypeId),
          inArray(schema.bookings.status, ["confirmed", "checked_in"]),
          lt(schema.bookings.checkInDate, input.checkOutDate),
          gt(schema.bookings.checkOutDate, input.checkInDate),
        ),
      });

      const totalRoomsCount = roomType.rooms.length;
      if (overlappingBookings.length >= totalRoomsCount || totalRoomsCount === 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: HOTEL_ERROR_CODES.ROOM_NOT_AVAILABLE,
        });
      }

      const bookedRoomIds = new Set(overlappingBookings.map((b) => b.roomId).filter(Boolean));
      const freeRoom = roomType.rooms.find((r) => !bookedRoomIds.has(r.id));

      const nights = calculateNights(input.checkInDate, input.checkOutDate);
      const totalPrice = (Number(roomType.basePrice) * nights).toFixed(2);
      const bookingReference = generateBookingReference();
      const bookingId = `bk-${crypto.randomUUID()}`;

      const [booking] = await ctx.db
        .insert(schema.bookings)
        .values({
          id: bookingId,
          organizationId: input.organizationId,
          bookingReference,
          roomTypeId: input.roomTypeId,
          roomId: freeRoom ? freeRoom.id : null,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          adultsCount: input.adultsCount,
          childrenCount: input.childrenCount,
          specialRequests: input.specialRequests ?? null,
          totalPrice,
          extraCharges: "0.00",
          status: "confirmed",
          paymentStatus: "unpaid",
        })
        .returning();

      if (!booking) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create public booking",
        });
      }

      await recordAuditLog(ctx.db, {
        orgId: input.organizationId,
        actor: {
          userId: "public-guest",
          email: input.guestEmail,
          role: "guest",
        },
        action: "CREATE",
        entityType: "booking",
        entityId: booking.id,
        newValue: booking,
        metadata: {
          channel: "direct_web_booking",
          bookingReference,
          nights,
          totalPrice,
        },
      });

      return booking;
    }),
});
