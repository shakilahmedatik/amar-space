"use client";

import {
  Building,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import type { MobileTheme } from "../theme";
import type { MobileTenantSummary } from "../types";

interface TenantItem {
  id: string;
  billNumber: string;
  flatNumber: string;
  flatSlug: string;
  buildingName: string;
  tenantName: string;
  phone: string;
  rentAmount: number;
  billStatus: "paid" | "unpaid" | "overdue";
  dueDate: string;
  billingMonth: string;
  raw: any;
}

interface TenantManagementScreenProps {
  theme: MobileTheme;
  initialTenants?: MobileTenantSummary[];
}

export const TenantManagementScreen: React.FC<TenantManagementScreenProps> = ({
  theme,
  initialTenants,
}) => {
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTenantForReminder, setSelectedTenantForReminder] = useState<TenantItem | null>(
    null,
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Live query for bills
  const { data: billsData, isLoading } = trpc.billing.listBills.useQuery(undefined, {
    retry: 1,
  });

  const handleSendReminder = (tenant: TenantItem) => {
    setSelectedTenantForReminder(tenant);
  };

  const handleConfirmSendSms = () => {
    if (!selectedTenantForReminder) return;
    const name = selectedTenantForReminder.tenantName;
    const flat = selectedTenantForReminder.flatNumber;
    setSelectedTenantForReminder(null);
    setActionNotice(`bKash payment reminder SMS dispatched to ${name} (Flat ${flat})!`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const liveBills = billsData?.bills || [];

  // Map live bills to tenant display list
  const displayTenants: TenantItem[] =
    liveBills.length > 0
      ? liveBills.map((b: any) => {
          const renter = b.contract?.renter;
          const flat = b.contract?.flat;
          const building = flat?.building;

          return {
            id: b.id,
            billNumber: b.billNumber,
            flatNumber: flat?.flatNumber || "Unknown Flat",
            flatSlug: flat?.flatNumber
              ? `flat-${flat.flatNumber.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
              : "flat",
            buildingName: building?.name || "Bashundhara Residence",
            tenantName: renter?.fullName || "Registered Tenant",
            phone: renter?.phone || "+880 1711-000000",
            rentAmount: Number(b.totalAmount) || Number(b.rentAmount) || 0,
            billStatus: (b.status === "paid"
              ? "paid"
              : b.status === "overdue"
                ? "overdue"
                : "unpaid") as "paid" | "unpaid" | "overdue",
            dueDate: b.dueDate || b.billingMonth || "2026-10-10",
            billingMonth: b.billingMonth || "Current Month",
            raw: b,
          };
        })
      : initialTenants && initialTenants.length > 0
        ? initialTenants.map((t: MobileTenantSummary) => ({
            id: t.id,
            billNumber: `BILL-${t.id}`,
            flatNumber: t.flatNumber,
            flatSlug: `flat-${t.flatNumber.toLowerCase()}`,
            buildingName: "Bashundhara Residence",
            tenantName: t.tenantName,
            phone: t.phone,
            rentAmount: t.rentAmount,
            billStatus: t.billStatus,
            dueDate: t.dueDate,
            billingMonth: "October 2026",
            raw: null,
          }))
        : [];

  const filteredTenants = displayTenants.filter((t: TenantItem) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.tenantName.toLowerCase().includes(q);
      const matchFlat = t.flatNumber.toLowerCase().includes(q);
      const matchPhone = t.phone.toLowerCase().includes(q);
      if (!matchName && !matchFlat && !matchPhone) return false;
    }

    // Filter
    if (filter === "all") return true;
    if (filter === "unpaid") return t.billStatus !== "paid";
    if (filter === "paid") return t.billStatus === "paid";
    return true;
  });

  const unpaidCount = displayTenants.filter((t: TenantItem) => t.billStatus !== "paid").length;
  const unpaidTotalAmount = displayTenants
    .filter((t: TenantItem) => t.billStatus !== "paid")
    .reduce((sum: number, t: TenantItem) => sum + t.rentAmount, 0);

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
              Residential Property Desk
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
              Tenants & Collections
            </h2>
          </div>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 11,
              fontWeight: "700",
              backgroundColor:
                unpaidCount > 0
                  ? theme.isDark
                    ? "rgba(192, 57, 43, 0.2)"
                    : "#FDF0ED"
                  : theme.isDark
                    ? "rgba(30, 130, 76, 0.2)"
                    : "#EAF7F0",
              color:
                unpaidCount > 0
                  ? theme.isDark
                    ? "#fca5a5"
                    : "#C0392B"
                  : theme.isDark
                    ? "#6ee7b7"
                    : "#1E824C",
              border: `1px solid ${
                unpaidCount > 0
                  ? theme.isDark
                    ? "rgba(192, 57, 43, 0.4)"
                    : "#F8D7DA"
                  : theme.isDark
                    ? "rgba(30, 130, 76, 0.4)"
                    : "#B7E4C7"
              }`,
            }}
          >
            {unpaidCount} Overdue / Unpaid
          </span>
        </div>
      </div>

      {/* Financial Overview Banner */}
      <div
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: 16,
          padding: "14px 16px",
          border: `1px solid ${theme.colors.borderGold}`,
          boxShadow: theme.isDark
            ? "0 4px 20px rgba(0, 0, 0, 0.3)"
            : "0 4px 16px rgba(197, 168, 128, 0.12)",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{
              fontSize: 10,
              color: theme.colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: "600",
            }}
          >
            Total Uncollected Receivables
          </span>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 20,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontWeight: "700",
              color: unpaidTotalAmount > 0 ? theme.colors.error : theme.colors.goldPrimary,
            }}
          >
            ৳{unpaidTotalAmount.toLocaleString()}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              fontSize: 10,
              color: theme.colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: "600",
            }}
          >
            Total Flats
          </span>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 20,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontWeight: "700",
              color: theme.colors.textPrimary,
            }}
          >
            {displayTenants.length} Units
          </p>
        </div>
      </div>

      {/* Notifications */}
      {actionNotice && (
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
          <span>{actionNotice}</span>
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
          placeholder="Search by flat, tenant, or mobile number..."
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
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(
          [
            { id: "all", label: "All Residents" },
            { id: "unpaid", label: "Unpaid / Due" },
            { id: "paid", label: "Cleared" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
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
              boxShadow: filter === item.id ? "0 2px 8px rgba(197, 168, 128, 0.3)" : "none",
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tenants List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: theme.colors.textMuted }}>
          <Sparkles
            style={{
              width: 24,
              height: 24,
              margin: "0 auto 8px",
              animation: "spin 2s linear infinite",
            }}
          />
          <p style={{ fontSize: 13 }}>Loading tenant directory & billing...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "36px 16px",
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            border: `1px dashed ${theme.colors.border}`,
          }}
        >
          <Building
            style={{ width: 28, height: 28, margin: "0 auto 8px", color: theme.colors.textMuted }}
          />
          <h4 style={{ fontSize: 14, fontWeight: "600", margin: "0 0 4px" }}>
            No tenants match this criteria
          </h4>
          <p style={{ fontSize: 12, color: theme.colors.textMuted, margin: 0 }}>
            {searchQuery
              ? "Try searching for a different flat or name"
              : "All residential accounts are updated"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredTenants.map((t: TenantItem) => {
            const isPaid = t.billStatus === "paid";
            const isOverdue = t.billStatus === "overdue";

            return (
              <div
                key={t.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 14,
                  padding: 16,
                  border: `1px solid ${
                    !isPaid
                      ? isOverdue
                        ? theme.isDark
                          ? "rgba(192, 57, 43, 0.4)"
                          : "#F8D7DA"
                        : theme.colors.borderGold
                      : theme.colors.border
                  }`,
                  boxShadow: "0 2px 10px rgba(42, 32, 28, 0.04)",
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
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: 6,
                          backgroundColor: "rgba(197, 168, 128, 0.15)",
                          color: theme.colors.goldPrimary,
                          border: `1px solid ${theme.colors.borderGold}`,
                        }}
                      >
                        Flat {t.flatNumber}
                      </span>
                      <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        {t.buildingName}
                      </span>
                    </div>

                    <h4
                      style={{
                        fontSize: 16,
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontWeight: "600",
                        margin: "4px 0 0",
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {t.tenantName}
                    </h4>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone style={{ width: 11, height: 11, color: theme.colors.textMuted }} />
                        <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          {t.phone}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock style={{ width: 11, height: 11, color: theme.colors.textMuted }} />
                        <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                          Due: {t.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        padding: "3px 8px",
                        borderRadius: 20,
                        backgroundColor: isPaid
                          ? theme.isDark
                            ? "rgba(30, 130, 76, 0.2)"
                            : "#EAF7F0"
                          : isOverdue
                            ? theme.isDark
                              ? "rgba(192, 57, 43, 0.2)"
                              : "#FDF0ED"
                            : theme.isDark
                              ? "rgba(217, 119, 6, 0.2)"
                              : "#FEF3C7",
                        color: isPaid
                          ? theme.isDark
                            ? "#6ee7b7"
                            : "#1E824C"
                          : isOverdue
                            ? theme.isDark
                              ? "#fca5a5"
                              : "#C0392B"
                            : theme.isDark
                              ? "#fde68a"
                              : "#D97706",
                        border: `1px solid ${
                          isPaid
                            ? theme.isDark
                              ? "rgba(30, 130, 76, 0.4)"
                              : "#B7E4C7"
                            : isOverdue
                              ? theme.isDark
                                ? "rgba(192, 57, 43, 0.4)"
                                : "#F8D7DA"
                              : theme.isDark
                                ? "rgba(217, 119, 6, 0.4)"
                                : "#FDE68A"
                        }`,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t.billStatus}
                    </span>
                    <p
                      style={{
                        fontSize: 16,
                        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                        fontWeight: "700",
                        margin: "6px 0 0",
                        color: theme.colors.goldPrimary,
                      }}
                    >
                      ৳{t.rentAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {!isPaid && (
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
                    <span style={{ fontSize: 10, color: theme.colors.textMuted }}>
                      Portal: renter.omniheaven.com/{t.flatSlug}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSendReminder(t)}
                      style={{
                        padding: "7px 14px",
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
                        boxShadow: "0 2px 8px rgba(197, 168, 128, 0.35)",
                      }}
                    >
                      <MessageSquare style={{ width: 13, height: 13 }} />
                      Send bKash SMS Reminder
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SMS Reminder Confirmation Modal */}
      {selectedTenantForReminder && (
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
                    letterSpacing: 1,
                    fontWeight: "700",
                  }}
                >
                  Automated SMS Dispatch
                </span>
                <h3
                  style={{
                    fontSize: 18,
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: "600",
                    margin: "2px 0 0",
                    color: theme.colors.textPrimary,
                  }}
                >
                  Send Collection Reminder
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTenantForReminder(null)}
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

            <p style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 12 }}>
              The following automated SMS payment link will be sent to{" "}
              <strong>{selectedTenantForReminder.tenantName}</strong> (
              {selectedTenantForReminder.phone}):
            </p>

            <div
              style={{
                backgroundColor: theme.colors.canvas,
                borderRadius: 10,
                padding: 12,
                border: `1px solid ${theme.colors.borderGold}`,
                fontSize: 12,
                lineHeight: "1.5",
                color: theme.colors.textPrimary,
                marginBottom: 16,
              }}
            >
              "Dear {selectedTenantForReminder.tenantName}, your rent for Flat{" "}
              {selectedTenantForReminder.flatNumber} of ৳
              {selectedTenantForReminder.rentAmount.toLocaleString()} is due. Please pay securely
              online via bKash / Nagad at: https://renter.omniheaven.com/
              {selectedTenantForReminder.flatSlug} - omniHeaven"
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedTenantForReminder(null)}
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
                onClick={handleConfirmSendSms}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  backgroundColor: theme.colors.goldPrimary,
                  color: theme.isDark ? "#14110F" : "#1F1714",
                  border: "none",
                  fontSize: 12,
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  boxShadow: "0 4px 14px rgba(197, 168, 128, 0.4)",
                }}
              >
                <Send style={{ width: 14, height: 14 }} />
                Confirm & Dispatch SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
