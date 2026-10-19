import { RATE_LIMIT_PRESETS } from "@omniheaven/rate-limit";
import {
  addExtraChargeSchema,
  cancelBookingSchema,
  checkInSchema,
  checkOutSchema,
  createBookingSchema,
  createRoomSchema,
  createRoomTypeSchema,
  listBookingsSchema,
  publicCreateBookingSchema,
  searchAvailabilitySchema,
  updateRoomSchema,
  updateRoomStatusSchema,
  updateRoomTypeSchema,
} from "@omniheaven/validators";
import { z } from "zod";
import * as hotelService from "../services/hotel.service";
import {
  orgProtectedProcedure,
  publicProcedure,
  requireRole,
  router,
  trpcRateLimit,
} from "../trpc";

export const hotelRouter = router({
  // ==========================================
  // ROOM TYPES & CATALOG
  // ==========================================
  listRoomTypes: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/hotel/room-types",
        tags: ["Hotel PMS"],
        summary: "List room types with capacity and amenities",
      },
    })
    .query(async ({ ctx }) => {
      return hotelService.listRoomTypes(ctx.db, ctx.organizationId);
    }),

  createRoomType: requireRole(["owner", "manager", "admin"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/hotel/room-types",
        tags: ["Hotel PMS"],
        summary: "Create hotel room type",
      },
    })
    .input(createRoomTypeSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.createRoomType(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  updateRoomType: requireRole(["owner", "manager", "admin"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/hotel/room-types/{id}",
        tags: ["Hotel PMS"],
        summary: "Update room type details",
      },
    })
    .input(z.object({ id: z.string().min(1), data: updateRoomTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      return hotelService.updateRoomType(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input.id,
        input.data,
      );
    }),

  // ==========================================
  // PHYSICAL ROOMS & HOUSEKEEPING
  // ==========================================
  listRooms: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/hotel/rooms",
        tags: ["Hotel PMS"],
        summary: "List physical hotel rooms with live status",
      },
    })
    .query(async ({ ctx }) => {
      return hotelService.listRooms(ctx.db, ctx.organizationId);
    }),

  createRoom: requireRole(["owner", "manager", "admin"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/hotel/rooms",
        tags: ["Hotel PMS"],
        summary: "Create physical room",
      },
    })
    .input(createRoomSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.createRoom(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  updateRoom: requireRole(["owner", "manager", "admin"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/hotel/rooms/{id}",
        tags: ["Hotel PMS"],
        summary: "Update physical room details",
      },
    })
    .input(z.object({ id: z.string().min(1), data: updateRoomSchema }))
    .mutation(async ({ ctx, input }) => {
      return hotelService.updateRoom(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input.id,
        input.data,
      );
    }),

  updateRoomStatus: requireRole(["owner", "manager", "admin", "staff"])
    .meta({
      openapi: {
        method: "PATCH",
        path: "/v1/hotel/rooms/{roomId}/status",
        tags: ["Hotel PMS"],
        summary: "Update housekeeping room status",
      },
    })
    .input(updateRoomStatusSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.updateRoomStatus(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  // ==========================================
  // RESERVATIONS & FRONT DESK
  // ==========================================
  listBookings: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/hotel/bookings",
        tags: ["Hotel PMS"],
        summary: "List reservations with status and date filtering",
      },
    })
    .input(listBookingsSchema.optional())
    .query(async ({ ctx, input }) => {
      return hotelService.listBookings(ctx.db, ctx.organizationId, input);
    }),

  getBooking: orgProtectedProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/hotel/bookings/{id}",
        tags: ["Hotel PMS"],
        summary: "Get booking details by ID",
      },
    })
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return hotelService.getBooking(ctx.db, ctx.organizationId, input.id);
    }),

  createReservation: orgProtectedProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/hotel/bookings",
        tags: ["Hotel PMS"],
        summary: "Create staff reservation",
      },
    })
    .input(createBookingSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.createReservation(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  checkInGuest: requireRole(["owner", "manager", "admin", "staff"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/hotel/bookings/{bookingId}/check-in",
        tags: ["Hotel PMS"],
        summary: "Check in guest and lock room",
      },
    })
    .input(checkInSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.checkInGuest(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  checkOutGuest: requireRole(["owner", "manager", "admin", "staff"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/hotel/bookings/{bookingId}/check-out",
        tags: ["Hotel PMS"],
        summary: "Check out guest and trigger turnover cleaning",
      },
    })
    .input(checkOutSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.checkOutGuest(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  cancelBooking: requireRole(["owner", "manager", "admin"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/hotel/bookings/{bookingId}/cancel",
        tags: ["Hotel PMS"],
        summary: "Cancel reservation",
      },
    })
    .input(cancelBookingSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.cancelBooking(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  addExtraCharge: requireRole(["owner", "manager", "admin", "staff"])
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/hotel/bookings/{bookingId}/extra-charges",
        tags: ["Hotel PMS"],
        summary: "Add extra charges to active booking",
      },
    })
    .input(addExtraChargeSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.addExtraCharge(
        ctx.db,
        ctx.organizationId,
        { id: ctx.user.id, email: ctx.user.email, role: ctx.role },
        input,
      );
    }),

  // ==========================================
  // PUBLIC GUEST BOOKING ENGINE (UNAUTHENTICATED)
  // ==========================================
  publicSearchAvailability: publicProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/v1/public/hotel/search",
        tags: ["Public Hotel Booking"],
        summary: "Search live hotel room availability and calculate rates",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.PUBLIC_READ,
        keyGenerator: (ctx) => `pub-search-${ctx.requestId}`,
      }),
    )
    .input(searchAvailabilitySchema)
    .query(async ({ ctx, input }) => {
      return hotelService.publicSearchAvailability(ctx.db, input);
    }),

  publicCreateBooking: publicProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/v1/public/hotel/bookings",
        tags: ["Public Hotel Booking"],
        summary: "Create direct public guest booking",
      },
    })
    .use(
      trpcRateLimit({
        config: RATE_LIMIT_PRESETS.PUBLIC_READ,
        keyGenerator: (ctx) => `pub-booking-${ctx.requestId}`,
      }),
    )
    .input(publicCreateBookingSchema)
    .mutation(async ({ ctx, input }) => {
      return hotelService.publicCreateBooking(ctx.db, input);
    }),
});
