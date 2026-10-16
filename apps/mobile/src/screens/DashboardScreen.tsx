import type React from "react";
import type { MobileOverviewStats, PropertyType } from "../types";

interface DashboardScreenProps {
  propertyType: PropertyType;
  stats: MobileOverviewStats;
  onNavigateTab: (tab: "bookings" | "tenants" | "maintenance") => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  propertyType,
  stats,
  onNavigateTab,
}) => {
  return (
    <div style={{ padding: 16, backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100%" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}
        >
          {propertyType === "hotel" ? "Hotel & Resort Manager" : "Building & Flat Manager"}
        </span>
        <h1 style={{ fontSize: 22, fontWeight: "bold", margin: "4px 0 0" }}>
          Omni Heaven Mobile Desk
        </h1>
      </div>

      {/* Quick Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {propertyType === "hotel" ? (
          <>
            <div style={{ backgroundColor: "#1e293b", padding: 14, borderRadius: 12 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Today Arrivals</span>
              <p style={{ fontSize: 24, fontWeight: "bold", margin: "4px 0 0", color: "#38bdf8" }}>
                {stats.todayCheckIns} Guests
              </p>
            </div>
            <div style={{ backgroundColor: "#1e293b", padding: 14, borderRadius: 12 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Rooms Occupied</span>
              <p style={{ fontSize: 24, fontWeight: "bold", margin: "4px 0 0", color: "#4ade80" }}>
                {stats.occupiedRooms} / {stats.occupiedRooms + stats.availableRooms}
              </p>
            </div>
          </>
        ) : (
          <>
            <div style={{ backgroundColor: "#1e293b", padding: 14, borderRadius: 12 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Unpaid Rent Bills</span>
              <p style={{ fontSize: 24, fontWeight: "bold", margin: "4px 0 0", color: "#f87171" }}>
                {stats.unpaidRentCount} Flats
              </p>
            </div>
            <div style={{ backgroundColor: "#1e293b", padding: 14, borderRadius: 12 }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Pending Repairs</span>
              <p style={{ fontSize: 24, fontWeight: "bold", margin: "4px 0 0", color: "#fbbf24" }}>
                {stats.pendingMaintenance} Tickets
              </p>
            </div>
          </>
        )}
      </div>

      {/* Monthly Revenue Banner */}
      <div style={{ backgroundColor: "#1e293b", padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase" }}>
          Current Month Revenue
        </span>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginTop: 4,
          }}
        >
          <p style={{ fontSize: 28, fontWeight: "bold", margin: 0, color: "#ffffff" }}>
            ৳{stats.monthlyRevenueBdt.toLocaleString()}
          </p>
          <span style={{ fontSize: 12, color: "#4ade80", fontWeight: "600" }}>
            +18.4% vs last month
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <h3 style={{ fontSize: 14, fontWeight: "bold", marginBottom: 10, color: "#cbd5e1" }}>
        Quick Management Actions
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {propertyType === "hotel" ? (
          <button
            type="button"
            onClick={() => onNavigateTab("bookings")}
            style={{
              padding: 14,
              backgroundColor: "#6366f1",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontWeight: "bold",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Review Arrivals & Check-Ins →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigateTab("tenants")}
            style={{
              padding: 14,
              backgroundColor: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: 10,
              fontWeight: "bold",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Review Tenant Rent Collections →
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigateTab("maintenance")}
          style={{
            padding: 14,
            backgroundColor: "#334155",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            fontWeight: "bold",
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
