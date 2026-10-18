"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  DoorOpen,
  KeyRound,
  Phone,
  Search,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import type { MobileTheme } from "../theme";
import type { MobileBookingAlert } from "../types";

interface HotelBookingAlertsScreenProps {
  theme: MobileTheme;
  initialBookings?: MobileBookingAlert[];
}

export const HotelBookingAlertsScreen: React.FC<HotelBookingAlertsScreenProps> = ({
  theme,
  initialBookings,
}) => {
  const [filter, setFilter] = useState<"all" | "pending" | "checked_in" | "checked_out">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState<any | null>(null);
  const [guestNidOrPassport, setGuestNidOrPassport] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live queries
  const {
    data: liveBookings,
    isLoading: isBookingsLoading,
    refetch,
  } = trpc.hotel.listBookings.useQuery(undefined, {
    retry: 1,
  });

  const { data: availableRooms = [] } = trpc.hotel.listRooms.useQuery(undefined, {
    retry: 1,
  });

  // Check-In Mutation
  const checkInMutation = trpc.hotel.checkInGuest.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedBookingForCheckIn(null);
      setActionError(null);
      setActionNotice("Guest checked in successfully! Room status updated to Occupied.");
      setTimeout(() => setActionNotice(null), 3500);
    },
    onError: (err) => {
      setActionError(err.message || "Failed to check in guest");
    },
  });

  const handleOpenCheckInModal = (booking: any) => {
    setSelectedBookingForCheckIn(booking);
    setGuestNidOrPassport(booking.guestNidOrPassport || "");
    setSelectedRoomId(booking.roomId || (availableRooms[0]?.id ?? ""));
    setSpecialRequests(booking.specialRequests || "");
    setActionError(null);
  };

  const handleConfirmCheckIn = () => {
    if (!selectedBookingForCheckIn) return;
    if (guestNidOrPassport.trim().length < 5) {
      setActionError(
        "A valid NID or Passport (at least 5 characters) is required for guest check-in.",
      );
      return;
    }
    if (!selectedRoomId) {
      setActionError("Please select or confirm the assigned room.");
      return;
    }

    checkInMutation.mutate({
      bookingId: selectedBookingForCheckIn.id,
      roomId: selectedRoomId,
      guestNidOrPassport: guestNidOrPassport.trim(),
      specialRequests: specialRequests.trim() || undefined,
    });
  };

  // Merge live with fallback if needed
  const displayBookings =
    liveBookings && liveBookings.length > 0
      ? liveBookings.map((b: any) => ({
          id: b.id,
          bookingReference: b.bookingReference,
          guestName: b.guestName,
          guestPhone: b.guestPhone,
          guestNidOrPassport: b.guestNidOrPassport,
          roomName: b.room?.roomNumber
            ? `Room ${b.room.roomNumber} (${b.roomType?.name || "Suite"})`
            : b.roomType?.name || "Pending Room Assignment",
          roomId: b.roomId,
          checkInDate: b.checkInDate,
          checkOutDate: b.checkOutDate,
          totalPrice: Number(b.totalPrice) || 0,
          paymentStatus: (b.paymentStatus || "unpaid") as "paid" | "unpaid" | "partially_paid",
          status: b.status as "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled",
          raw: b,
        }))
      : initialBookings && initialBookings.length > 0
        ? initialBookings.map((b) => ({
            id: b.id,
            bookingReference: `BK-${b.id}`,
            guestName: b.guestName,
            guestPhone: "+880 1711-000000",
            guestNidOrPassport: "19902692837190",
            roomName: b.roomName,
            roomId: "room-default",
            checkInDate: b.checkInDate,
            checkOutDate: "2026-10-20",
            totalPrice: b.totalPrice,
            paymentStatus: b.paymentStatus,
            status: b.status,
            raw: null,
          }))
        : [];

  const filteredBookings = displayBookings.filter((b) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.guestName.toLowerCase().includes(q);
      const matchRef = b.bookingReference.toLowerCase().includes(q);
      const matchRoom = b.roomName.toLowerCase().includes(q);
      if (!matchName && !matchRef && !matchRoom) return false;
    }

    // Filter
    if (filter === "all") return true;
    if (filter === "pending") return b.status === "confirmed" || b.status === "pending";
    if (filter === "checked_in") return b.status === "checked_in";
    if (filter === "checked_out") return b.status === "checked_out";
    return true;
  });

  const arrivalsCount = displayBookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  ).length;

  return (
    <div
      style={{
        padding: 16,
        backgroundColor: theme.colors.canvas,
        color: theme.colors.textPrimary,
        minHeight: "100%",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span
              style={{
                fontSize: 10,
                color: theme.colors.goldPrimary,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                fontWeight: "700",
              }}
            >
              Front Desk Operations
            </span>
            <h2 style={{ fontSize: 20, fontWeight: "bold", margin: "2px 0 0" }}>
              Arrivals & Guest Check-In
            </h2>
          </div>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: "bold",
              backgroundColor: arrivalsCount > 0 ? "#1e293b" : "#065f46",
              color: arrivalsCount > 0 ? theme.colors.goldPrimary : "#6ee7b7",
              border: `1px solid ${arrivalsCount > 0 ? theme.colors.borderGold : "transparent"}`,
            }}
          >
            {arrivalsCount} Due Today
          </span>
        </div>
      </div>

      {/* Notifications */}
      {actionNotice && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            fontSize: 12,
            color: "#34d399",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{actionNotice}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            fontSize: 12,
            color: "#f87171",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search Input */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            width: 14,
            height: 14,
            color: theme.colors.textMuted,
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by guest, reference, or room..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 12px 10px 34px",
            borderRadius: 10,
            backgroundColor: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.textPrimary,
            fontSize: 12,
            outline: "none",
          }}
        />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
        {(
          [
            { id: "all", label: "All Bookings" },
            { id: "pending", label: "Arrivals Queue" },
            { id: "checked_in", label: "In House" },
            { id: "checked_out", label: "Departed" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: filter === item.id ? "700" : "500",
              backgroundColor: filter === item.id ? theme.colors.goldPrimary : theme.colors.surface,
              color:
                filter === item.id
                  ? theme.isDark
                    ? "#14110F"
                    : "#1F1714"
                  : theme.colors.textMuted,
              border: `1px solid ${filter === item.id ? theme.colors.goldPrimary : theme.colors.border}`,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {isBookingsLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: theme.colors.textMuted }}>
          <Sparkles
            style={{
              width: 24,
              height: 24,
              margin: "0 auto 8px",
              animation: "spin 2s linear infinite",
            }}
          />
          <p style={{ fontSize: 13 }}>Loading hotel reservations...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "36px 16px",
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            border: `1px dashed ${theme.colors.border}`,
          }}
        >
          <DoorOpen
            style={{ width: 28, height: 28, margin: "0 auto 8px", color: theme.colors.textMuted }}
          />
          <h4 style={{ fontSize: 14, fontWeight: "600", margin: "0 0 4px" }}>
            No reservations found
          </h4>
          <p style={{ fontSize: 12, color: theme.colors.textMuted, margin: 0 }}>
            {searchQuery
              ? "Try searching for a different guest or reference"
              : "Front desk queue is all caught up"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredBookings.map((b) => {
            const isCheckedIn = b.status === "checked_in";
            const isPaid = b.paymentStatus === "paid";

            return (
              <div
                key={b.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  border: `1px solid ${isCheckedIn ? theme.colors.border : theme.colors.borderGold}`,
                  boxShadow: !isCheckedIn ? "0 2px 10px rgba(197, 168, 128, 0.08)" : undefined,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: "bold",
                          padding: "2px 6px",
                          borderRadius: 6,
                          backgroundColor: theme.colors.surfaceElevated,
                          color: theme.colors.goldPrimary,
                          border: `1px solid ${theme.colors.borderGold}`,
                        }}
                      >
                        {b.bookingReference}
                      </span>
                      <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        {b.roomName}
                      </span>
                    </div>

                    <h4
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        margin: "4px 0 0",
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {b.guestName}
                    </h4>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar
                          style={{ width: 11, height: 11, color: theme.colors.textMuted }}
                        />
                        <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          {b.checkInDate} → {b.checkOutDate}
                        </span>
                      </div>
                      {b.guestPhone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Phone style={{ width: 11, height: 11, color: theme.colors.textMuted }} />
                          <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                            {b.guestPhone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        padding: "2px 8px",
                        borderRadius: 10,
                        backgroundColor: isPaid ? "#065f46" : "#7c2d12",
                        color: isPaid ? "#6ee7b7" : "#fdba74",
                        textTransform: "uppercase",
                      }}
                    >
                      {b.paymentStatus}
                    </span>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        margin: "4px 0 0",
                        color: theme.colors.goldPrimary,
                      }}
                    >
                      ৳{b.totalPrice.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: `1px solid ${theme.colors.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                    Status:{" "}
                    <strong
                      style={{
                        color: isCheckedIn ? "#34d399" : "#fbbf24",
                        textTransform: "uppercase",
                      }}
                    >
                      {b.status.replace("_", " ")}
                    </strong>
                  </span>

                  {!isCheckedIn && b.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => handleOpenCheckInModal(b)}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: theme.colors.goldPrimary,
                        color: theme.isDark ? "#14110F" : "#1F1714",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px rgba(197, 168, 128, 0.3)",
                      }}
                    >
                      <UserCheck style={{ width: 14, height: 14 }} />
                      Verify & Check-In
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Check-In Verification Modal */}
      {selectedBookingForCheckIn && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              border: `1px solid ${theme.colors.borderGold}`,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10,
                    color: theme.colors.goldPrimary,
                    textTransform: "uppercase",
                    fontWeight: "700",
                  }}
                >
                  Front Desk Registration
                </span>
                <h3 style={{ fontSize: 17, fontWeight: "bold", margin: "2px 0 0" }}>
                  Check In: {selectedBookingForCheckIn.guestName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForCheckIn(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.colors.textMuted,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* Guest Summary Card */}
            <div
              style={{
                backgroundColor: theme.colors.canvas,
                padding: 10,
                borderRadius: 8,
                marginBottom: 12,
                border: `1px solid ${theme.colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: 11, color: theme.colors.textMuted }}>
                  Ref: {selectedBookingForCheckIn.bookingReference}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12,
                    fontWeight: "bold",
                    color: theme.colors.textPrimary,
                  }}
                >
                  {selectedBookingForCheckIn.roomName}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, color: theme.colors.textMuted }}>Total Billed</span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: "bold",
                    color: theme.colors.goldPrimary,
                  }}
                >
                  ৳{selectedBookingForCheckIn.totalPrice.toLocaleString()}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="guest-nid-input"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.colors.textMuted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Guest NID or Passport Number * (Mandatory by Law)
              </label>
              <input
                id="guest-nid-input"
                type="text"
                placeholder="e.g. NID 19882691238910 or Passport A0129381"
                value={guestNidOrPassport}
                onChange={(e) => setGuestNidOrPassport(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: theme.colors.canvas,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textPrimary,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="assigned-room-select"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.colors.textMuted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Assigned Room
              </label>
              <select
                id="assigned-room-select"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: theme.colors.canvas,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textPrimary,
                  fontSize: 12,
                  outline: "none",
                }}
              >
                {availableRooms.map((rm: any) => (
                  <option key={rm.id} value={rm.id}>
                    Room {rm.roomNumber} - {rm.roomType?.name || "Suite"} ({rm.status.toUpperCase()}
                    )
                  </option>
                ))}
                {availableRooms.length === 0 && (
                  <option value={selectedBookingForCheckIn.roomId || "room-1"}>
                    Current Room Assignment
                  </option>
                )}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="special-requests-input"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.colors.textMuted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Special Arrival Requests / Luggage Notes
              </label>
              <input
                id="special-requests-input"
                type="text"
                placeholder="e.g. Extra pillows requested, 2 suitcases assisted"
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: theme.colors.canvas,
                  border: `1px solid ${theme.colors.border}`,
                  color: theme.colors.textPrimary,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedBookingForCheckIn(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 10,
                  backgroundColor: theme.colors.surfaceElevated,
                  color: theme.colors.textMuted,
                  border: `1px solid ${theme.colors.border}`,
                  fontSize: 12,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCheckIn}
                disabled={checkInMutation.isPending}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  backgroundColor: theme.colors.goldPrimary,
                  color: theme.isDark ? "#14110F" : "#1F1714",
                  border: "none",
                  fontSize: 12,
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <KeyRound style={{ width: 14, height: 14 }} />
                {checkInMutation.isPending ? "Issuing Key..." : "Issue Key & Check-In"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
