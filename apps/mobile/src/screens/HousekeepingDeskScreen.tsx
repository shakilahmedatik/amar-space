"use client";

import { AlertCircle, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import type { MobileTheme } from "../theme";

interface HousekeepingDeskScreenProps {
  theme: MobileTheme;
}

export const HousekeepingDeskScreen: React.FC<HousekeepingDeskScreenProps> = ({ theme }) => {
  const [filter, setFilter] = useState<
    "all" | "cleaning" | "available" | "occupied" | "maintenance"
  >("all");
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live queries
  const { data: rooms = [], isLoading, refetch } = trpc.hotel.listRooms.useQuery();

  // Mutation
  const updateStatusMutation = trpc.hotel.updateRoomStatus.useMutation({
    onSuccess: (updated) => {
      refetch();
      setActionError(null);
      setActionSuccessNotice(
        `Room ${updated.roomNumber} status updated to ${updated.status.toUpperCase()}`,
      );
      setTimeout(() => setActionSuccessNotice(null), 3500);
    },
    onError: (err) => {
      setActionError(err.message || "Failed to update room status");
    },
  });

  const handleQuickTurnover = (roomId: string, currentStatus: string) => {
    setActionError(null);
    const nextStatus =
      currentStatus === "cleaning"
        ? "available"
        : currentStatus === "maintenance"
          ? "available"
          : "cleaning";
    const notes =
      nextStatus === "available"
        ? "Inspected & sanitized by mobile caretaker"
        : "Turnover cleaning required";

    updateStatusMutation.mutate({
      roomId,
      status: nextStatus as any,
      housekeepingNotes: notes,
    });
  };

  const filteredRooms = rooms.filter((r: any) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const cleaningCount = rooms.filter((r: any) => r.status === "cleaning").length;
  const availableCount = rooms.filter((r: any) => r.status === "available").length;
  const occupiedCount = rooms.filter((r: any) => r.status === "occupied").length;
  const maintenanceCount = rooms.filter((r: any) => r.status === "maintenance").length;

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
              Field Housekeeping Operations
            </span>
            <h2
              style={{
                fontSize: 22,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: "600",
                margin: "2px 0 0",
                letterSpacing: "-0.25px",
                color: theme.colors.textPrimary,
              }}
            >
              Room Turnover & Inspection
            </h2>
          </div>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: "700",
              backgroundColor:
                cleaningCount > 0
                  ? theme.isDark
                    ? "rgba(217, 119, 6, 0.2)"
                    : "#FEF3C7"
                  : theme.isDark
                    ? "rgba(30, 130, 76, 0.2)"
                    : "#EAF7F0",
              color:
                cleaningCount > 0
                  ? theme.isDark
                    ? "#fde68a"
                    : "#D97706"
                  : theme.isDark
                    ? "#6ee7b7"
                    : "#1E824C",
              border: `1px solid ${
                cleaningCount > 0
                  ? theme.isDark
                    ? "rgba(217, 119, 6, 0.4)"
                    : "#FDE68A"
                  : theme.isDark
                    ? "rgba(30, 130, 76, 0.4)"
                    : "#B7E4C7"
              }`,
            }}
          >
            {cleaningCount} Needs Clean
          </span>
        </div>
      </div>

      {/* Success / Error alerts */}
      {actionSuccessNotice && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            backgroundColor: theme.isDark ? "rgba(30, 130, 76, 0.2)" : "#EAF7F0",
            border: `1px solid ${theme.isDark ? "rgba(30, 130, 76, 0.4)" : "#B7E4C7"}`,
            fontSize: 12,
            color: theme.isDark ? "#6ee7b7" : "#1E824C",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{actionSuccessNotice}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            backgroundColor: theme.isDark ? "rgba(192, 57, 43, 0.2)" : "#FDF0ED",
            border: `1px solid ${theme.isDark ? "rgba(192, 57, 43, 0.4)" : "#F8D7DA"}`,
            fontSize: 12,
            color: theme.isDark ? "#fca5a5" : "#C0392B",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 14,
        }}
      >
        {[
          { id: "all", label: `All (${rooms.length})` },
          { id: "cleaning", label: `Cleaning (${cleaningCount})` },
          { id: "available", label: `Ready (${availableCount})` },
          { id: "occupied", label: `Occupied (${occupiedCount})` },
          { id: "maintenance", label: `Repair (${maintenanceCount})` },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id as any)}
            style={{
              padding: "7px 14px",
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
              boxShadow: filter === item.id ? "0 2px 8px rgba(197, 168, 128, 0.3)" : "none",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Room Cards List */}
      {isLoading ? (
        <div
          style={{ textAlign: "center", padding: 32, color: theme.colors.textMuted, fontSize: 13 }}
        >
          Loading live room inventory...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 32,
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            border: `1px dashed ${theme.colors.border}`,
            color: theme.colors.textMuted,
            fontSize: 13,
          }}
        >
          No rooms match the selected filter.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredRooms.map((room: any) => {
            const isCleaning = room.status === "cleaning";
            const isAvailable = room.status === "available";
            const isOccupied = room.status === "occupied";
            const isMaintenance = room.status === "maintenance";

            const statusBg = isCleaning
              ? theme.isDark
                ? "rgba(217, 119, 6, 0.2)"
                : "#FEF3C7"
              : isAvailable
                ? theme.isDark
                  ? "rgba(30, 130, 76, 0.2)"
                  : "#EAF7F0"
                : isOccupied
                  ? theme.isDark
                    ? "rgba(197, 168, 128, 0.15)"
                    : "#F4EDE7"
                  : theme.isDark
                    ? "rgba(192, 57, 43, 0.2)"
                    : "#FDF0ED";

            const statusColor = isCleaning
              ? theme.isDark
                ? "#fde68a"
                : "#D97706"
              : isAvailable
                ? theme.isDark
                  ? "#6ee7b7"
                  : "#1E824C"
                : isOccupied
                  ? theme.colors.goldPrimary
                  : theme.isDark
                    ? "#fca5a5"
                    : "#C0392B";

            const statusBorder = isCleaning
              ? theme.isDark
                ? "rgba(217, 119, 6, 0.4)"
                : "#FDE68A"
              : isAvailable
                ? theme.isDark
                  ? "rgba(30, 130, 76, 0.4)"
                  : "#B7E4C7"
                : isOccupied
                  ? theme.colors.borderGold
                  : theme.isDark
                    ? "rgba(192, 57, 43, 0.4)"
                    : "#F8D7DA";

            return (
              <div
                key={room.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 14,
                  padding: 14,
                  border: `1px solid ${isCleaning ? theme.colors.borderGold : theme.colors.border}`,
                  boxShadow: isCleaning
                    ? theme.isDark
                      ? "0 4px 14px rgba(0, 0, 0, 0.3)"
                      : "0 4px 14px rgba(197, 168, 128, 0.15)"
                    : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 16,
                          fontFamily: "'Playfair Display', Georgia, serif",
                          fontWeight: "600",
                          color: theme.colors.textPrimary,
                        }}
                      >
                        Room {room.roomNumber}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: theme.colors.canvas,
                          color: theme.colors.textMuted,
                          border: `1px solid ${theme.colors.border}`,
                        }}
                      >
                        Floor {room.floor}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: 11,
                        color: theme.colors.textMuted,
                        marginTop: 2,
                        display: "block",
                      }}
                    >
                      {room.roomType?.name || "Standard Suite"}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      padding: "4px 8px",
                      borderRadius: 20,
                      backgroundColor: statusBg,
                      color: statusColor,
                      border: `1px solid ${statusBorder}`,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {room.status === "cleaning" ? "Turnover Required" : room.status}
                  </span>
                </div>

                {/* Housekeeping Notes */}
                {room.housekeepingNotes && (
                  <p
                    style={{
                      fontSize: 11,
                      color: theme.colors.textMuted,
                      margin: 0,
                      padding: "6px 10px",
                      borderRadius: 6,
                      backgroundColor: theme.colors.canvas,
                      border: `1px solid ${theme.colors.border}`,
                    }}
                  >
                    📝 {room.housekeepingNotes}
                  </p>
                )}

                {/* Quick Action Button */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${theme.colors.border}`,
                  }}
                >
                  {isCleaning && (
                    <button
                      type="button"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => handleQuickTurnover(room.id, room.status)}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: theme.colors.goldPrimary,
                        color: theme.isDark ? "#14110F" : "#1F1714",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minHeight: 40,
                        boxShadow: "0 2px 8px rgba(197, 168, 128, 0.35)",
                      }}
                    >
                      <Sparkles style={{ width: 14, height: 14 }} />
                      1-Tap: Mark Clean & Ready
                    </button>
                  )}

                  {isMaintenance && (
                    <button
                      type="button"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => handleQuickTurnover(room.id, room.status)}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: theme.colors.surfaceElevated,
                        color: theme.colors.textPrimary,
                        border: `1px solid ${theme.colors.borderGold}`,
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minHeight: 40,
                      }}
                    >
                      <Wrench style={{ width: 14, height: 14 }} />
                      Mark Repair Complete
                    </button>
                  )}

                  {isAvailable && (
                    <button
                      type="button"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => handleQuickTurnover(room.id, room.status)}
                      style={{
                        padding: "6px 10px",
                        backgroundColor: "transparent",
                        color: theme.colors.textMuted,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: 6,
                        fontSize: 10,
                        fontWeight: "500",
                        cursor: "pointer",
                      }}
                    >
                      Send to Turnover
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
