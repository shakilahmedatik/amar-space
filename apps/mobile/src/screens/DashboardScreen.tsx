"use client";

import type React from "react";
import { trpc } from "../lib/trpc";
import type { MobileTheme } from "../theme";
import type { MobileOverviewStats, PropertyType } from "../types";

interface DashboardScreenProps {
  propertyType: PropertyType;
  stats?: MobileOverviewStats;
  theme: MobileTheme;
  onNavigateTab: (tab: "bookings" | "tenants" | "maintenance" | "housekeeping") => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  propertyType,
  stats: initialStats,
  theme,
  onNavigateTab,
}) => {
  const { colors, card } = theme;

  // Live queries for real-time dashboard indicators
  const { data: liveRooms = [] } = trpc.hotel.listRooms.useQuery(undefined, {
    enabled: propertyType === "hotel",
    retry: 1,
  });

  const { data: liveBookings = [] } = trpc.hotel.listBookings.useQuery(undefined, {
    enabled: propertyType === "hotel",
    retry: 1,
  });

  const { data: billsData } = trpc.billing.listBills.useQuery(undefined, {
    enabled: propertyType === "building",
    retry: 1,
  });
  const liveBills = billsData?.bills || [];

  const { data: liveTickets = [] } = trpc.operations.listMaintenanceRequests.useQuery(undefined, {
    retry: 1,
  });

  // Calculate live statistics
  const liveAvailableRooms = liveRooms.filter((r: any) => r.status === "available").length;
  const liveOccupiedRooms = liveRooms.filter((r: any) => r.status === "occupied").length;
  const liveCleaningRooms = liveRooms.filter((r: any) => r.status === "cleaning").length;
  const liveTodayArrivals = liveBookings.filter(
    (b: any) => b.status === "confirmed" || b.status === "pending",
  ).length;

  const liveUnpaidBills = liveBills.filter((b: any) => b.status !== "paid").length;
  const livePendingTickets = liveTickets.filter(
    (t: any) => t.status === "open" || t.status === "assigned" || t.status === "in_progress",
  ).length;

  const liveHotelRevenue = liveBookings
    .filter((b: any) => b.paymentStatus === "paid")
    .reduce((sum: number, b: any) => sum + (Number(b.totalPrice) || 0), 0);

  const liveBuildingRevenue =
    billsData?.metrics?.totalCollected !== undefined
      ? billsData.metrics.totalCollected
      : liveBills
          .filter((b: any) => b.status === "paid")
          .reduce((sum: number, b: any) => sum + (Number(b.totalAmount) || 0), 0);

  const stats: MobileOverviewStats = {
    todayCheckIns: liveBookings.length > 0 ? liveTodayArrivals : (initialStats?.todayCheckIns ?? 4),
    availableRooms: liveRooms.length > 0 ? liveAvailableRooms : (initialStats?.availableRooms ?? 8),
    occupiedRooms: liveRooms.length > 0 ? liveOccupiedRooms : (initialStats?.occupiedRooms ?? 34),
    pendingMaintenance:
      liveTickets.length > 0 ? livePendingTickets : (initialStats?.pendingMaintenance ?? 3),
    monthlyRevenueBdt:
      propertyType === "hotel"
        ? liveHotelRevenue > 0
          ? liveHotelRevenue
          : (initialStats?.monthlyRevenueBdt ?? 845000)
        : liveBuildingRevenue > 0
          ? liveBuildingRevenue
          : (initialStats?.monthlyRevenueBdt ?? 650000),
    unpaidRentCount: liveBills.length > 0 ? liveUnpaidBills : (initialStats?.unpaidRentCount ?? 2),
  };

  return (
    <div
      style={{
        padding: 16,
        backgroundColor: colors.canvas,
        color: colors.textPrimary,
        minHeight: "100%",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            fontSize: 11,
            color: colors.goldPrimary,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            fontWeight: "600",
          }}
        >
          {propertyType === "hotel" ? "Hotel & Resort Manager" : "Residential Estate Manager"}
        </span>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: "bold",
            margin: "4px 0 0",
            color: colors.textPrimary,
          }}
        >
          omniHeaven Mobile Desk
        </h1>
      </div>

      {/* Quick Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {propertyType === "hotel" ? (
          <>
            <div style={{ ...card, padding: 14 }}>
              <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
                Today Arrivals
              </span>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  margin: "4px 0 0",
                  color: colors.goldPrimary,
                }}
              >
                {stats.todayCheckIns} Guests
              </p>
            </div>
            <div style={{ ...card, padding: 14 }}>
              <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
                Rooms Occupied
              </span>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  margin: "4px 0 0",
                  color: colors.textPrimary,
                }}
              >
                {stats.occupiedRooms} / {stats.occupiedRooms + stats.availableRooms}
              </p>
            </div>
          </>
        ) : (
          <>
            <div style={{ ...card, padding: 14 }}>
              <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
                Unpaid Rent Bills
              </span>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  margin: "4px 0 0",
                  color: colors.error,
                }}
              >
                {stats.unpaidRentCount} Flats
              </p>
            </div>
            <div style={{ ...card, padding: 14 }}>
              <span style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase" }}>
                Pending Repairs
              </span>
              <p
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  margin: "4px 0 0",
                  color: colors.warning,
                }}
              >
                {stats.pendingMaintenance} Tickets
              </p>
            </div>
          </>
        )}
      </div>

      {/* Monthly Revenue Banner */}
      <div
        style={{
          ...card,
          padding: 18,
          marginBottom: 20,
          borderColor: colors.borderGold,
          background: theme.isDark
            ? "linear-gradient(180deg, rgba(39, 32, 28, 0.95) 0%, rgba(30, 24, 21, 0.85) 100%)"
            : "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 246, 240, 0.85) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              color: colors.goldPrimary,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: "600",
            }}
          >
            Current Month Revenue
          </span>
          <span
            style={{
              fontSize: 10,
              backgroundColor: `${colors.success}20`,
              color: colors.success,
              padding: "2px 8px",
              borderRadius: 12,
              fontWeight: "600",
            }}
          >
            +18.4%
          </span>
        </div>
        <p
          style={{
            fontSize: 28,
            fontWeight: "bold",
            margin: "6px 0 0",
            color: colors.textPrimary,
          }}
        >
          ৳{stats.monthlyRevenueBdt.toLocaleString()}
        </p>
      </div>

      {/* Quick Action Buttons */}
      <h3
        style={{
          fontSize: 13,
          fontWeight: "600",
          marginBottom: 10,
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        Quick Management Actions
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {propertyType === "hotel" ? (
          <>
            <button
              type="button"
              onClick={() => onNavigateTab("bookings")}
              style={{
                padding: 14,
                backgroundColor: colors.goldPrimary,
                color: theme.isDark ? "#14110F" : "#1F1714",
                border: "none",
                borderRadius: 10,
                fontWeight: "bold",
                fontSize: 13,
                cursor: "pointer",
                boxShadow: `0 4px 12px ${colors.goldGlow}`,
              }}
            >
              Review Arrivals & Check-Ins ({stats.todayCheckIns}) →
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("housekeeping")}
              style={{
                padding: 14,
                backgroundColor: colors.surfaceElevated,
                color: colors.textPrimary,
                border: `1px solid ${colors.borderGold}`,
                borderRadius: 10,
                fontWeight: "600",
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Housekeeping & Room Turnover Desk</span>
              {liveCleaningRooms > 0 && (
                <span
                  style={{
                    backgroundColor: "#78350f",
                    color: "#fef08a",
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 8,
                    fontWeight: "bold",
                  }}
                >
                  {liveCleaningRooms} Needs Clean
                </span>
              )}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onNavigateTab("tenants")}
            style={{
              padding: 14,
              backgroundColor: colors.goldPrimary,
              color: theme.isDark ? "#14110F" : "#1F1714",
              border: "none",
              borderRadius: 10,
              fontWeight: "bold",
              fontSize: 13,
              cursor: "pointer",
              boxShadow: `0 4px 12px ${colors.goldGlow}`,
            }}
          >
            Review Tenant Rent Collections ({stats.unpaidRentCount} Due) →
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigateTab("maintenance")}
          style={{
            padding: 14,
            backgroundColor: colors.surfaceElevated,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            fontWeight: "600",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Maintenance Desk ({stats.pendingMaintenance} Open Tickets) →
        </button>
      </div>
    </div>
  );
};
