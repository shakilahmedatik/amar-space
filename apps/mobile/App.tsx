"use client";

import { useState } from "react";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HotelBookingAlertsScreen } from "./src/screens/HotelBookingAlertsScreen";
import { MaintenanceDeskScreen } from "./src/screens/MaintenanceDeskScreen";
import { TenantManagementScreen } from "./src/screens/TenantManagementScreen";
import { getMobileTheme } from "./src/theme";
import type {
  MobileBookingAlert,
  MobileMaintenanceTicket,
  MobileOverviewStats,
  MobileTenantSummary,
  PropertyType,
} from "./src/types";

export default function App() {
  const [propertyType, setPropertyType] = useState<PropertyType>("hotel");
  const [currentTab, setCurrentTab] = useState<
    "dashboard" | "bookings" | "tenants" | "maintenance"
  >("dashboard");
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const theme = getMobileTheme(themeMode);

  // Mock State
  const [stats] = useState<MobileOverviewStats>({
    todayCheckIns: 4,
    availableRooms: 8,
    occupiedRooms: 34,
    pendingMaintenance: 3,
    monthlyRevenueBdt: 845000,
    unpaidRentCount: 2,
  });

  const [bookings, setBookings] = useState<MobileBookingAlert[]>([
    {
      id: "b-1",
      guestName: "Tanvir Rahman",
      roomName: "Presidential Ocean Villa",
      checkInDate: "2026-10-17",
      totalPrice: 84000,
      paymentStatus: "paid",
      status: "confirmed",
    },
    {
      id: "b-2",
      guestName: "Sarah Jenkins",
      roomName: "Royal Beachfront Suite",
      checkInDate: "2026-10-17",
      totalPrice: 57000,
      paymentStatus: "paid",
      status: "confirmed",
    },
    {
      id: "b-3",
      guestName: "Mahfuzur Chowdhury",
      roomName: "Deluxe Garden Sanctuary",
      checkInDate: "2026-10-18",
      totalPrice: 33000,
      paymentStatus: "unpaid",
      status: "confirmed",
    },
  ]);

  const [tenants] = useState<MobileTenantSummary[]>([
    {
      id: "t-1",
      flatNumber: "4B",
      tenantName: "Rafiqul Islam",
      phone: "+880 1711-234567",
      rentAmount: 32000,
      billStatus: "overdue",
      dueDate: "2026-10-05",
    },
    {
      id: "t-2",
      flatNumber: "7A",
      tenantName: "Farhana Yasmin",
      phone: "+880 1819-876543",
      rentAmount: 28000,
      billStatus: "paid",
      dueDate: "2026-10-05",
    },
    {
      id: "t-3",
      flatNumber: "2C",
      tenantName: "Kabir Hossain",
      phone: "+880 1912-345678",
      rentAmount: 25000,
      billStatus: "unpaid",
      dueDate: "2026-10-10",
    },
  ]);

  const [tickets, setTickets] = useState<MobileMaintenanceTicket[]>([
    {
      id: "m-1",
      unit: "Villa 102",
      category: "ac",
      title: "Master bedroom split AC cooling slowly",
      urgency: "urgent",
      status: "open",
      reportedDate: "2026-10-16",
    },
    {
      id: "m-2",
      unit: "Suite 404",
      category: "plumbing",
      title: "Jacuzzi water pressure low",
      urgency: "medium",
      status: "assigned",
      reportedDate: "2026-10-17",
    },
    {
      id: "m-3",
      unit: "Flat 4B",
      category: "electrical",
      title: "Corridor light fixture flickering",
      urgency: "low",
      status: "open",
      reportedDate: "2026-10-17",
    },
  ]);

  const handleCheckInGuest = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "checked_in" as const } : b)),
    );
  };

  const handleResolveTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "resolved" as const } : t)),
    );
  };

  const handleSendReminder = (tenant: MobileTenantSummary) => {
    console.log(`Sending reminder to tenant: ${tenant.tenantName}`);
  };

  return (
    <div
      style={{
        maxWidth: 440,
        margin: "0 auto",
        backgroundColor: theme.colors.canvas,
        color: theme.colors.textPrimary,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 0 40px rgba(0,0,0,0.5)",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Top Mobile Bar */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: theme.colors.surface,
          borderBottom: `1px solid ${theme.colors.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 16,
              fontWeight: "bold",
              color: theme.colors.textPrimary,
            }}
          >
            omni<span style={{ color: theme.colors.goldPrimary }}>Heaven</span>
          </span>
          <button
            type="button"
            onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
            style={{
              padding: "2px 8px",
              fontSize: 10,
              backgroundColor: "transparent",
              color: theme.colors.textMuted,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {themeMode === "dark" ? "☀️ Day" : "🌙 Night"}
          </button>
        </div>

        {/* Property Switcher Toggle */}
        <div
          style={{
            display: "flex",
            gap: 2,
            backgroundColor: theme.colors.canvas,
            padding: 2,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setPropertyType("hotel");
              if (currentTab === "tenants") setCurrentTab("bookings");
            }}
            style={{
              padding: "4px 8px",
              backgroundColor: propertyType === "hotel" ? theme.colors.goldPrimary : "transparent",
              color:
                propertyType === "hotel"
                  ? theme.isDark
                    ? "#14110F"
                    : "#1F1714"
                  : theme.colors.textMuted,
              border: "none",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Hotel
          </button>
          <button
            type="button"
            onClick={() => {
              setPropertyType("building");
              if (currentTab === "bookings") setCurrentTab("tenants");
            }}
            style={{
              padding: "4px 8px",
              backgroundColor:
                propertyType === "building" ? theme.colors.goldPrimary : "transparent",
              color:
                propertyType === "building"
                  ? theme.isDark
                    ? "#14110F"
                    : "#1F1714"
                  : theme.colors.textMuted,
              border: "none",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Building
          </button>
        </div>
      </div>

      {/* Screen Body */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 60 }}>
        {currentTab === "dashboard" && (
          <DashboardScreen
            propertyType={propertyType}
            stats={stats}
            theme={theme}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === "bookings" && (
          <HotelBookingAlertsScreen bookings={bookings} onCheckInGuest={handleCheckInGuest} />
        )}

        {currentTab === "tenants" && (
          <TenantManagementScreen tenants={tenants} onSendReminder={handleSendReminder} />
        )}

        {currentTab === "maintenance" && (
          <MaintenanceDeskScreen tickets={tickets} onResolveTicket={handleResolveTicket} />
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          backgroundColor: theme.colors.surface,
          borderTop: `1px solid ${theme.colors.border}`,
          display: "flex",
          justifyContent: "space-around",
          padding: "10px 0",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentTab("dashboard")}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: currentTab === "dashboard" ? theme.colors.goldPrimary : theme.colors.textMuted,
            fontSize: 11,
            fontWeight: currentTab === "dashboard" ? "bold" : "500",
            cursor: "pointer",
          }}
        >
          Overview
        </button>

        {propertyType === "hotel" ? (
          <button
            type="button"
            onClick={() => setCurrentTab("bookings")}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: currentTab === "bookings" ? theme.colors.goldPrimary : theme.colors.textMuted,
              fontSize: 11,
              fontWeight: currentTab === "bookings" ? "bold" : "500",
              cursor: "pointer",
            }}
          >
            Bookings
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentTab("tenants")}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: currentTab === "tenants" ? theme.colors.goldPrimary : theme.colors.textMuted,
              fontSize: 11,
              fontWeight: currentTab === "tenants" ? "bold" : "500",
              cursor: "pointer",
            }}
          >
            Renters
          </button>
        )}

        <button
          type="button"
          onClick={() => setCurrentTab("maintenance")}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: currentTab === "maintenance" ? theme.colors.goldPrimary : theme.colors.textMuted,
            fontSize: 11,
            fontWeight: currentTab === "maintenance" ? "bold" : "500",
            cursor: "pointer",
          }}
        >
          Repairs
        </button>
      </div>
    </div>
  );
}
