"use client";

import { useState } from "react";
import { MobileTRPCProvider } from "./src/components/TRPCProvider";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HotelBookingAlertsScreen } from "./src/screens/HotelBookingAlertsScreen";
import { HousekeepingDeskScreen } from "./src/screens/HousekeepingDeskScreen";
import { MaintenanceDeskScreen } from "./src/screens/MaintenanceDeskScreen";
import { TenantManagementScreen } from "./src/screens/TenantManagementScreen";
import { getMobileTheme } from "./src/theme";
import type { PropertyType } from "./src/types";

type MobileTab = "dashboard" | "housekeeping" | "bookings" | "tenants" | "maintenance";

function MobileAppContent() {
  const [propertyType, setPropertyType] = useState<PropertyType>("hotel");
  const [currentTab, setCurrentTab] = useState<MobileTab>("dashboard");
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const theme = getMobileTheme(themeMode);

  return (
    <MobileTRPCProvider propertyType={propertyType}>
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
                backgroundColor:
                  propertyType === "hotel" ? theme.colors.goldPrimary : "transparent",
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
                if (currentTab === "bookings" || currentTab === "housekeeping") {
                  setCurrentTab("tenants");
                }
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
              theme={theme}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === "housekeeping" && <HousekeepingDeskScreen theme={theme} />}

          {currentTab === "bookings" && <HotelBookingAlertsScreen theme={theme} />}

          {currentTab === "tenants" && <TenantManagementScreen theme={theme} />}

          {currentTab === "maintenance" && <MaintenanceDeskScreen theme={theme} />}
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
            <>
              <button
                type="button"
                onClick={() => setCurrentTab("housekeeping")}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color:
                    currentTab === "housekeeping"
                      ? theme.colors.goldPrimary
                      : theme.colors.textMuted,
                  fontSize: 11,
                  fontWeight: currentTab === "housekeeping" ? "bold" : "500",
                  cursor: "pointer",
                }}
              >
                Turnover
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab("bookings")}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color:
                    currentTab === "bookings" ? theme.colors.goldPrimary : theme.colors.textMuted,
                  fontSize: 11,
                  fontWeight: currentTab === "bookings" ? "bold" : "500",
                  cursor: "pointer",
                }}
              >
                Arrivals
              </button>
            </>
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
              color:
                currentTab === "maintenance" ? theme.colors.goldPrimary : theme.colors.textMuted,
              fontSize: 11,
              fontWeight: currentTab === "maintenance" ? "bold" : "500",
              cursor: "pointer",
            }}
          >
            Repairs
          </button>
        </div>
      </div>
    </MobileTRPCProvider>
  );
}

export default function App() {
  return <MobileAppContent />;
}
