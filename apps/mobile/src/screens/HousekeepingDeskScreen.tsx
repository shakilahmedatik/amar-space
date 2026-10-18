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
            <h2 style={{ fontSize: 20, fontWeight: "bold", margin: "2px 0 0" }}>
              Room Turnover & Inspection
            </h2>
          </div>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: "bold",
              backgroundColor: cleaningCount > 0 ? "#78350f" : "#065f46",
              color: cleaningCount > 0 ? "#fef08a" : "#6ee7b7",
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
          <span>{actionSuccessNotice}</span>
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

      {/* Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setFilter("all")}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: filter === "all" ? "bold" : "500",
            backgroundColor: filter === "all" ? theme.colors.goldPrimary : theme.colors.surface,
            color: filter === "all" ? "#14110F" : theme.colors.textMuted,
            border: `1px solid ${theme.colors.border}`,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          All ({rooms.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter("cleaning")}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: filter === "cleaning" ? "bold" : "500",
            backgroundColor: filter === "cleaning" ? "#f59e0b" : theme.colors.surface,
            color: filter === "cleaning" ? "#000000" : theme.colors.textMuted,
            border: `1px solid ${theme.colors.border}`,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Cleaning ({cleaningCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter("available")}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: filter === "available" ? "bold" : "500",
            backgroundColor: filter === "available" ? "#10b981" : theme.colors.surface,
            color: filter === "available" ? "#ffffff" : theme.colors.textMuted,
            border: `1px solid ${theme.colors.border}`,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Ready ({availableCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter("occupied")}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: filter === "occupied" ? "bold" : "500",
            backgroundColor: filter === "occupied" ? "#3b82f6" : theme.colors.surface,
            color: filter === "occupied" ? "#ffffff" : theme.colors.textMuted,
            border: `1px solid ${theme.colors.border}`,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Occupied ({occupiedCount})
        </button>

        <button
          type="button"
          onClick={() => setFilter("maintenance")}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: filter === "maintenance" ? "bold" : "500",
            backgroundColor: filter === "maintenance" ? "#ef4444" : theme.colors.surface,
            color: filter === "maintenance" ? "#ffffff" : theme.colors.textMuted,
            border: `1px solid ${theme.colors.border}`,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Repair ({maintenanceCount})
        </button>
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
              ? "rgba(245, 158, 11, 0.15)"
              : isAvailable
                ? "rgba(16, 185, 129, 0.15)"
                : isOccupied
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(239, 68, 68, 0.15)";

            const statusColor = isCleaning
              ? "#fbbf24"
              : isAvailable
                ? "#34d399"
                : isOccupied
                  ? "#60a5fa"
                  : "#f87171";

            return (
              <div
                key={room.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  border: `1px solid ${isCleaning ? "#f59e0b" : theme.colors.border}`,
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
                          fontWeight: "bold",
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
                      fontWeight: "bold",
                      padding: "4px 8px",
                      borderRadius: 6,
                      backgroundColor: statusBg,
                      color: statusColor,
                      textTransform: "uppercase",
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
                        backgroundColor: "#10b981",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        minHeight: 40,
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
                        backgroundColor: "#3b82f6",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: "bold",
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
