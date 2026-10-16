"use client";

import { useState } from "react";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HotelBookingAlertsScreen } from "./src/screens/HotelBookingAlertsScreen";
import { MaintenanceDeskScreen } from "./src/screens/MaintenanceDeskScreen";
import { TenantManagementScreen } from "./src/screens/TenantManagementScreen";
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
      unit: "Flat 4B",
      category: "plumbing",
      title: "Kitchen sink drain pipe slight leakage",
      urgency: "medium",
      status: "assigned",
      reportedDate: "2026-10-15",
    },
  ]);

  const handleCheckInGuest = (id: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "checked_in" } : b)));
  };

  const handleSendReminder = (tenant: MobileTenantSummary) => {
    alert(`bKash payment reminder sent via SMS to ${tenant.tenantName} (${tenant.phone})`);
  };

  const handleResolveTicket = (id: string) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: "resolved" } : t)));
  };

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "0 auto",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top Mobile Bar */}
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#1e293b",
          borderBottom: "1px solid #334155",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: "bold", color: "#ffffff" }}>
          Omni Heaven Mobile
        </span>

        {/* Property Switcher Toggle */}
        <div
          style={{
            display: "flex",
            gap: 4,
            backgroundColor: "#0f172a",
            padding: 2,
            borderRadius: 8,
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
              backgroundColor: propertyType === "hotel" ? "#6366f1" : "transparent",
              color: "#ffffff",
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
              backgroundColor: propertyType === "building" ? "#10b981" : "transparent",
              color: "#ffffff",
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
          backgroundColor: "#1e293b",
          borderTop: "1px solid #334155",
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
            color: currentTab === "dashboard" ? "#38bdf8" : "#94a3b8",
            fontSize: 11,
            fontWeight: "bold",
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
              color: currentTab === "bookings" ? "#38bdf8" : "#94a3b8",
              fontSize: 11,
              fontWeight: "bold",
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
              color: currentTab === "tenants" ? "#38bdf8" : "#94a3b8",
              fontSize: 11,
              fontWeight: "bold",
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
            color: currentTab === "maintenance" ? "#38bdf8" : "#94a3b8",
            fontSize: 11,
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Repairs
        </button>
      </div>
    </div>
  );
}
