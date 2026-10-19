import type { Database } from "@omniheaven/db";
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, schema } from "@omniheaven/db";
import { ErrorCode, throwDomainError } from "@omniheaven/errors";
import type {
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
import type { z } from "zod";
import { assertOrganizationQuota } from "../utils/quota";
import { recordAuditLog } from "./audit.service";

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;
export type ListBookingsInput = z.infer<typeof listBookingsSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type AddExtraChargeInput = z.infer<typeof addExtraChargeSchema>;
export type SearchAvailabilityInput = z.infer<typeof searchAvailabilitySchema>;
export type PublicCreateBookingInput = z.infer<typeof publicCreateBookingSchema>;

export interface ServiceActor {
  id: string;
  email: string;
  role?: string;
}

export function generateBookingReference(): string {
  const dateStr = new Date().toISOString().slice(0, 7).replace("-", "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BK-${dateStr}-${randomSuffix}`;
}

export function calculateNights(checkInDate: string, checkOutDate: string): number {
  const inTime = new Date(`${checkInDate}T12:00:00Z`).getTime();
  const outTime = new Date(`${checkOutDate}T12:00:00Z`).getTime();
  const diffDays = Math.round((outTime - inTime) / (1000 * 3600 * 24));
  return Math.max(1, diffDays);
}

/**
 * 1. List Room Types & Catalog
 */
export async function listRoomTypes(db: Database, orgId: string) {
  return db.query.roomTypes.findMany({
    where: eq(schema.roomTypes.organizationId, orgId),
    orderBy: [asc(schema.roomTypes.basePrice)],
    with: {
      rooms: true,
    },
  });
}

/**
 * 2. Create Room Type
 */
export async function createRoomType(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateRoomTypeInput,
) {
  const roomTypeId = `rt-${crypto.randomUUID()}`;
  const [created] = await db
    .insert(schema.roomTypes)
    .values({
      id: roomTypeId,
      organizationId: orgId,
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
    throwDomainError(ErrorCode.ROOM_TYPE_NOT_FOUND, "Failed to create room type");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "manager",
    },
    action: "CREATE",
    entityType: "room_type",
    entityId: created.id,
    newValue: created,
    metadata: { name: created.name, basePrice: created.basePrice },
  });

  return created;
}

/**
 * 3. Update Room Type
 */
export async function updateRoomType(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  id: string,
  data: UpdateRoomTypeInput,
) {
  const existing = await db.query.roomTypes.findFirst({
    where: and(eq(schema.roomTypes.id, id), eq(schema.roomTypes.organizationId, orgId)),
  });

  if (!existing) {
    throwDomainError(ErrorCode.ROOM_TYPE_NOT_FOUND);
  }

  const updatePayload: Partial<typeof schema.roomTypes.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.basePrice !== undefined) updatePayload.basePrice = data.basePrice.toFixed(2);
  if (data.capacityAdults !== undefined) updatePayload.capacityAdults = data.capacityAdults;
  if (data.capacityChildren !== undefined) updatePayload.capacityChildren = data.capacityChildren;
  if (data.bedType !== undefined) updatePayload.bedType = data.bedType;
  if (data.bedCount !== undefined) updatePayload.bedCount = data.bedCount;
  if (data.sizeSqFt !== undefined) {
    updatePayload.sizeSqFt = data.sizeSqFt ? data.sizeSqFt.toFixed(2) : null;
  }
  if (data.amenities !== undefined) updatePayload.amenities = data.amenities;
  if (data.photos !== undefined) updatePayload.photos = data.photos;

  const [updated] = await db
    .update(schema.roomTypes)
    .set(updatePayload)
    .where(eq(schema.roomTypes.id, id))
    .returning();

  if (!updated) {
    throwDomainError(ErrorCode.ROOM_TYPE_NOT_FOUND, "Failed to update room type");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "manager",
    },
    action: "UPDATE",
    entityType: "room_type",
    entityId: updated.id,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

/**
 * 4. List Physical Rooms
 */
export async function listRooms(db: Database, orgId: string) {
  return db.query.rooms.findMany({
    where: eq(schema.rooms.organizationId, orgId),
    orderBy: [asc(schema.rooms.floor), asc(schema.rooms.roomNumber)],
    with: {
      roomType: true,
      bookings: {
        where: eq(schema.bookings.status, "checked_in"),
        limit: 1,
      },
    },
  });
}

/**
 * 5. Create Room
 */
export async function createRoom(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateRoomInput,
) {
  const roomType = await db.query.roomTypes.findFirst({
    where: and(
      eq(schema.roomTypes.id, input.roomTypeId),
      eq(schema.roomTypes.organizationId, orgId),
    ),
  });

  if (!roomType) {
    throwDomainError(ErrorCode.ROOM_TYPE_NOT_FOUND);
  }

  const existing = await db.query.rooms.findFirst({
    where: and(
      eq(schema.rooms.organizationId, orgId),
      eq(schema.rooms.roomNumber, input.roomNumber),
    ),
  });

  if (existing) {
    throwDomainError(
      ErrorCode.ROOM_NOT_AVAILABLE,
      `Room number ${input.roomNumber} already exists in this organization.`,
    );
  }

  await assertOrganizationQuota(db, orgId, 1);

  const roomId = `room-${crypto.randomUUID()}`;
  const [room] = await db
    .insert(schema.rooms)
    .values({
      id: roomId,
      organizationId: orgId,
      roomTypeId: input.roomTypeId,
      roomNumber: input.roomNumber,
      floor: input.floor,
      status: input.status,
      housekeepingNotes: input.housekeepingNotes ?? null,
    })
    .returning();

  if (!room) {
    throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE, "Failed to create room");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "manager",
    },
    action: "CREATE",
    entityType: "room",
    entityId: room.id,
    newValue: room,
    metadata: { roomNumber: room.roomNumber, roomTypeId: room.roomTypeId },
  });

  return room;
}

/**
 * 6. Update Room
 */
export async function updateRoom(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  id: string,
  data: UpdateRoomInput,
) {
  const existing = await db.query.rooms.findFirst({
    where: and(eq(schema.rooms.id, id), eq(schema.rooms.organizationId, orgId)),
  });

  if (!existing) {
    throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE, "Room not found");
  }

  const updatePayload: Partial<typeof schema.rooms.$inferInsert> & { updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (data.roomNumber !== undefined) updatePayload.roomNumber = data.roomNumber;
  if (data.floor !== undefined) updatePayload.floor = data.floor;
  if (data.roomTypeId !== undefined) updatePayload.roomTypeId = data.roomTypeId;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.housekeepingNotes !== undefined) {
    updatePayload.housekeepingNotes = data.housekeepingNotes;
  }

  const [updated] = await db
    .update(schema.rooms)
    .set(updatePayload)
    .where(eq(schema.rooms.id, id))
    .returning();

  if (!updated) {
    throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE, "Failed to update room");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "manager",
    },
    action: "UPDATE",
    entityType: "room",
    entityId: updated.id,
    oldValue: existing,
    newValue: updated,
  });

  return updated;
}

/**
 * 7. Update Room Status (Housekeeping)
 */
export async function updateRoomStatus(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: UpdateRoomStatusInput,
) {
  const room = await db.query.rooms.findFirst({
    where: and(eq(schema.rooms.id, input.roomId), eq(schema.rooms.organizationId, orgId)),
  });

  if (!room) {
    throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE, "Room not found");
  }

  const [updated] = await db
    .update(schema.rooms)
    .set({
      status: input.status,
      housekeepingNotes: input.housekeepingNotes ?? room.housekeepingNotes,
      updatedAt: new Date(),
    })
    .where(eq(schema.rooms.id, input.roomId))
    .returning();

  if (!updated) {
    throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE, "Failed to update room status");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "staff",
    },
    action: "UPDATE",
    entityType: "room",
    entityId: room.id,
    oldValue: { status: room.status, housekeepingNotes: room.housekeepingNotes },
    newValue: { status: updated.status, housekeepingNotes: updated.housekeepingNotes },
    metadata: { reason: "Housekeeping status update" },
  });

  return updated;
}

/**
 * 8. List Bookings
 */
export async function listBookings(db: Database, orgId: string, input?: ListBookingsInput) {
  const whereConditions = [eq(schema.bookings.organizationId, orgId)];

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

  return db.query.bookings.findMany({
    where: and(...whereConditions),
    orderBy: [desc(schema.bookings.createdAt)],
    limit: input?.limit ?? 50,
    with: {
      roomType: true,
      room: true,
    },
  });
}

/**
 * 9. Get Booking by ID
 */
export async function getBooking(db: Database, orgId: string, bookingId: string) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(schema.bookings.id, bookingId), eq(schema.bookings.organizationId, orgId)),
    with: {
      roomType: true,
      room: true,
      payments: true,
    },
  });

  if (!booking) {
    throwDomainError(ErrorCode.BOOKING_NOT_FOUND);
  }

  return booking;
}

/**
 * 10. Create Reservation
 */
export async function createReservation(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CreateBookingInput,
) {
  const roomType = await db.query.roomTypes.findFirst({
    where: and(
      eq(schema.roomTypes.id, input.roomTypeId),
      eq(schema.roomTypes.organizationId, orgId),
    ),
  });

  if (!roomType) {
    throwDomainError(ErrorCode.ROOM_TYPE_NOT_FOUND);
  }

  if (input.roomId) {
    const room = await db.query.rooms.findFirst({
      where: and(eq(schema.rooms.id, input.roomId), eq(schema.rooms.organizationId, orgId)),
    });

    if (!room) {
      throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE, "Assigned room not found");
    }

    const overlapping = await db.query.bookings.findFirst({
      where: and(
        eq(schema.bookings.organizationId, orgId),
        eq(schema.bookings.roomId, input.roomId),
        inArray(schema.bookings.status, ["confirmed", "checked_in"]),
        lt(schema.bookings.checkInDate, input.checkOutDate),
        gt(schema.bookings.checkOutDate, input.checkInDate),
      ),
    });

    if (overlapping) {
      throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE);
    }
  } else {
    const allRoomsOfType = await db.query.rooms.findMany({
      where: and(
        eq(schema.rooms.organizationId, orgId),
        eq(schema.rooms.roomTypeId, input.roomTypeId),
      ),
    });

    if (allRoomsOfType.length === 0) {
      throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE);
    }

    const bookedRooms = await db.query.bookings.findMany({
      where: and(
        eq(schema.bookings.organizationId, orgId),
        eq(schema.bookings.roomTypeId, input.roomTypeId),
        inArray(schema.bookings.status, ["confirmed", "checked_in"]),
        lt(schema.bookings.checkInDate, input.checkOutDate),
        gt(schema.bookings.checkOutDate, input.checkInDate),
      ),
    });

    if (bookedRooms.length >= allRoomsOfType.length) {
      throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE);
    }
  }

  const nights = calculateNights(input.checkInDate, input.checkOutDate);
  const computedPrice = (Number(roomType.basePrice) * nights).toFixed(2);
  const finalPrice = input.totalPrice ? input.totalPrice.toFixed(2) : computedPrice;
  const bookingReference = generateBookingReference();
  const bookingId = `bk-${crypto.randomUUID()}`;

  const [booking] = await db
    .insert(schema.bookings)
    .values({
      id: bookingId,
      organizationId: orgId,
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
    throwDomainError(ErrorCode.BOOKING_NOT_FOUND, "Failed to create booking");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "manager",
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
}

/**
 * 11. Check In Guest
 */
export async function checkInGuest(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CheckInInput,
) {
  return db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: and(
        eq(schema.bookings.id, input.bookingId),
        eq(schema.bookings.organizationId, orgId),
      ),
    });

    if (!booking) {
      throwDomainError(ErrorCode.BOOKING_NOT_FOUND);
    }

    if (booking.status === "checked_in") {
      throwDomainError(
        ErrorCode.BOOKING_NOT_FOUND,
        "Guest is already checked in for this booking.",
      );
    }

    if (booking.status === "cancelled") {
      throwDomainError(ErrorCode.BOOKING_NOT_FOUND, "Cannot check in a cancelled booking.");
    }

    const room = await tx.query.rooms.findFirst({
      where: and(eq(schema.rooms.id, input.roomId), eq(schema.rooms.organizationId, orgId)),
    });

    if (!room) {
      throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE, "Assigned room does not exist.");
    }

    if (room.status !== "available" && room.status !== "reserved") {
      throwDomainError(ErrorCode.ROOM_DIRTY_OR_MAINTENANCE);
    }

    const activeOccupant = await tx.query.bookings.findFirst({
      where: and(
        eq(schema.bookings.roomId, input.roomId),
        eq(schema.bookings.status, "checked_in"),
      ),
    });

    if (activeOccupant && activeOccupant.id !== booking.id) {
      throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE);
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
      throwDomainError(ErrorCode.BOOKING_NOT_FOUND, "Failed to update booking status");
    }

    await recordAuditLog(tx, {
      orgId,
      actor: {
        userId: actor.id,
        email: actor.email,
        role: actor.role ?? "staff",
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
}

/**
 * 12. Check Out Guest
 */
export async function checkOutGuest(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CheckOutInput,
) {
  return db.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: and(
        eq(schema.bookings.id, input.bookingId),
        eq(schema.bookings.organizationId, orgId),
      ),
      with: { room: true },
    });

    if (!booking) {
      throwDomainError(ErrorCode.BOOKING_NOT_FOUND);
    }

    if (booking.status !== "checked_in") {
      throwDomainError(
        ErrorCode.BOOKING_NOT_FOUND,
        "Cannot check out a booking that is not currently checked in.",
      );
    }

    const newExtraCharges = (
      Number(booking.extraCharges) + (input.settleExtraCharges ?? 0)
    ).toFixed(2);

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
      throwDomainError(ErrorCode.BOOKING_NOT_FOUND, "Failed to complete checkout");
    }

    await recordAuditLog(tx, {
      orgId,
      actor: {
        userId: actor.id,
        email: actor.email,
        role: actor.role ?? "staff",
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
}

/**
 * 13. Cancel Booking
 */
export async function cancelBooking(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: CancelBookingInput,
) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(schema.bookings.id, input.bookingId), eq(schema.bookings.organizationId, orgId)),
  });

  if (!booking) {
    throwDomainError(ErrorCode.BOOKING_NOT_FOUND);
  }

  if (booking.status === "checked_in" || booking.status === "checked_out") {
    throwDomainError(
      ErrorCode.BOOKING_NOT_FOUND,
      `Cannot cancel a booking that has already ${booking.status}.`,
    );
  }

  const [cancelled] = await db
    .update(schema.bookings)
    .set({
      status: "cancelled",
      cancellationReason: input.cancellationReason,
      updatedAt: new Date(),
    })
    .where(eq(schema.bookings.id, input.bookingId))
    .returning();

  if (!cancelled) {
    throwDomainError(ErrorCode.BOOKING_NOT_FOUND, "Failed to cancel booking");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "manager",
    },
    action: "UPDATE",
    entityType: "booking",
    entityId: cancelled.id,
    oldValue: { status: booking.status },
    newValue: { status: cancelled.status, cancellationReason: cancelled.cancellationReason },
  });

  return cancelled;
}

/**
 * 14. Add Extra Charge
 */
export async function addExtraCharge(
  db: Database,
  orgId: string,
  actor: ServiceActor,
  input: AddExtraChargeInput,
) {
  const booking = await db.query.bookings.findFirst({
    where: and(eq(schema.bookings.id, input.bookingId), eq(schema.bookings.organizationId, orgId)),
  });

  if (!booking) {
    throwDomainError(ErrorCode.BOOKING_NOT_FOUND);
  }

  const currentCharges = Number(booking.extraCharges || "0.00");
  const updatedCharges = (currentCharges + input.amount).toFixed(2);

  const [updated] = await db
    .update(schema.bookings)
    .set({
      extraCharges: updatedCharges,
      updatedAt: new Date(),
    })
    .where(eq(schema.bookings.id, input.bookingId))
    .returning();

  if (!updated) {
    throwDomainError(ErrorCode.BOOKING_NOT_FOUND, "Failed to add extra charge");
  }

  await recordAuditLog(db, {
    orgId,
    actor: {
      userId: actor.id,
      email: actor.email,
      role: actor.role ?? "staff",
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
}

/**
 * 15. Public Search Availability
 */
export async function publicSearchAvailability(db: Database, input: SearchAvailabilityInput) {
  const roomTypes = await db.query.roomTypes.findMany({
    where: eq(schema.roomTypes.organizationId, input.organizationId),
    with: {
      rooms: true,
    },
  });

  const overlappingBookings = await db.query.bookings.findMany({
    where: and(
      eq(schema.bookings.organizationId, input.organizationId),
      inArray(schema.bookings.status, ["confirmed", "checked_in"]),
      lt(schema.bookings.checkInDate, input.checkOutDate),
      gt(schema.bookings.checkOutDate, input.checkInDate),
    ),
  });

  return roomTypes
    .filter(
      (rt) => rt.capacityAdults >= input.adultsCount && rt.capacityChildren >= input.childrenCount,
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
}

/**
 * 16. Public Create Booking
 */
export async function publicCreateBooking(db: Database, input: PublicCreateBookingInput) {
  const roomType = await db.query.roomTypes.findFirst({
    where: and(
      eq(schema.roomTypes.id, input.roomTypeId),
      eq(schema.roomTypes.organizationId, input.organizationId),
    ),
    with: { rooms: true },
  });

  if (!roomType) {
    throwDomainError(ErrorCode.ROOM_TYPE_NOT_FOUND);
  }

  const overlappingBookings = await db.query.bookings.findMany({
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
    throwDomainError(ErrorCode.ROOM_NOT_AVAILABLE);
  }

  const bookedRoomIds = new Set(overlappingBookings.map((b) => b.roomId).filter(Boolean));
  const freeRoom = roomType.rooms.find((r) => !bookedRoomIds.has(r.id));

  const nights = calculateNights(input.checkInDate, input.checkOutDate);
  const totalPrice = (Number(roomType.basePrice) * nights).toFixed(2);
  const bookingReference = generateBookingReference();
  const bookingId = `bk-${crypto.randomUUID()}`;

  const [booking] = await db
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
    throwDomainError(ErrorCode.BOOKING_NOT_FOUND, "Failed to create public booking");
  }

  await recordAuditLog(db, {
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
      paymentMethod: input.paymentMethod ?? "pay_at_hotel",
      bookingReference,
      nights,
      totalPrice,
    },
  });

  return booking;
}
