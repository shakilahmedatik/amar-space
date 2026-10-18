"use client";

import { AlertCircle, CheckCircle2, Clock, Flame, Search, Sparkles, Wrench, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import type { MobileTheme } from "../theme";
import type { MobileMaintenanceTicket } from "../types";

interface MaintenanceDeskScreenProps {
  theme: MobileTheme;
  initialTickets?: MobileMaintenanceTicket[];
}

export const MaintenanceDeskScreen: React.FC<MaintenanceDeskScreenProps> = ({
  theme,
  initialTickets,
}) => {
  const [filter, setFilter] = useState<"all" | "active" | "urgent" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicketForResolve, setSelectedTicketForResolve] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState(
    "Inspected and repaired on-site by field caretaker.",
  );
  const [repairCost, setRepairCost] = useState("0.00");
  const [costBilledTo, setCostBilledTo] = useState<"landlord" | "tenant" | "shared">("landlord");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Live tRPC Query
  const {
    data: liveTickets,
    isLoading,
    refetch,
  } = trpc.operations.listMaintenanceRequests.useQuery(undefined, {
    retry: 1,
  });

  // Resolve Mutation
  const resolveMutation = trpc.operations.resolveMaintenanceRequest.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedTicketForResolve(null);
      setActionError(null);
      setActionNotice("Maintenance ticket resolved and verified successfully!");
      setTimeout(() => setActionNotice(null), 3500);
    },
    onError: (err) => {
      setActionError(err.message || "Failed to resolve maintenance ticket");
    },
  });

  const handleOpenResolveModal = (ticket: any) => {
    setSelectedTicketForResolve(ticket);
    setResolutionNotes("Inspected and repaired on-site by field caretaker.");
    setRepairCost("0.00");
    setCostBilledTo("landlord");
    setActionError(null);
  };

  const handleSubmitResolution = () => {
    if (!selectedTicketForResolve) return;
    if (resolutionNotes.trim().length < 5) {
      setActionError("Please provide at least 5 characters for resolution notes.");
      return;
    }

    resolveMutation.mutate({
      requestId: selectedTicketForResolve.id,
      resolutionNotes: resolutionNotes.trim(),
      repairCost: repairCost,
      costBilledTo: costBilledTo,
      resolutionPhotoUrls: [],
    });
  };

  // Merge liveTickets with fallback initialTickets if live is empty/loading
  const displayTickets =
    liveTickets && liveTickets.length > 0
      ? liveTickets.map((t: any) => ({
          id: t.id,
          unit: t.flat ? `Flat ${t.flat.flatNumber}` : t.building?.name || "Common Area",
          category: (t.category || "other") as
            | "plumbing"
            | "electrical"
            | "ac"
            | "carpentry"
            | "other",
          title: t.title,
          urgency: (t.priority === "emergency" || t.priority === "high"
            ? "urgent"
            : t.priority === "medium"
              ? "medium"
              : "low") as "low" | "medium" | "urgent",
          status: (t.status === "resolved" || t.status === "closed"
            ? "resolved"
            : t.status === "assigned"
              ? "assigned"
              : "open") as "open" | "assigned" | "resolved",
          reportedDate: new Date(t.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          raw: t,
        }))
      : initialTickets && initialTickets.length > 0
        ? initialTickets.map((t) => ({ ...t, raw: null }))
        : [];

  const filteredTickets = displayTickets.filter((t) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchUnit = t.unit.toLowerCase().includes(q);
      const matchCategory = t.category.toLowerCase().includes(q);
      if (!matchTitle && !matchUnit && !matchCategory) return false;
    }

    // Filter
    if (filter === "all") return true;
    if (filter === "active") return t.status !== "resolved";
    if (filter === "urgent") return t.urgency === "urgent" && t.status !== "resolved";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  const activeCount = displayTickets.filter((t) => t.status !== "resolved").length;
  const urgentCount = displayTickets.filter(
    (t) => t.urgency === "urgent" && t.status !== "resolved",
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
              Field Operations Desk
            </span>
            <h2 style={{ fontSize: 20, fontWeight: "bold", margin: "2px 0 0" }}>
              Maintenance & Repairs
            </h2>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {urgentCount > 0 && (
              <span
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: "bold",
                  backgroundColor: "#7f1d1d",
                  color: "#fca5a5",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Flame style={{ width: 12, height: 12 }} />
                {urgentCount} Urgent
              </span>
            )}
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: "bold",
                backgroundColor: theme.colors.surfaceElevated,
                color: theme.colors.goldPrimary,
                border: `1px solid ${theme.colors.borderGold}`,
              }}
            >
              {activeCount} Active
            </span>
          </div>
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
      <div
        style={{
          position: "relative",
          marginBottom: 12,
        }}
      >
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
          placeholder="Search by flat, issue, or category..."
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
            { id: "all", label: "All Tickets" },
            { id: "urgent", label: "Urgent 🔥" },
            { id: "active", label: "Pending" },
            { id: "resolved", label: "Resolved" },
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

      {/* Tickets List */}
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
          <p style={{ fontSize: 13 }}>Loading maintenance requests...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "36px 16px",
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            border: `1px dashed ${theme.colors.border}`,
          }}
        >
          <Wrench
            style={{ width: 28, height: 28, margin: "0 auto 8px", color: theme.colors.textMuted }}
          />
          <h4 style={{ fontSize: 14, fontWeight: "600", margin: "0 0 4px" }}>
            No maintenance tickets found
          </h4>
          <p style={{ fontSize: 12, color: theme.colors.textMuted, margin: 0 }}>
            {searchQuery
              ? "Try refining your search terms"
              : "All units are in optimal operating condition"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredTickets.map((ticket) => {
            const isUrgent = ticket.urgency === "urgent";
            const isResolved = ticket.status === "resolved";

            return (
              <div
                key={ticket.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  border: `1px solid ${isUrgent && !isResolved ? "#7f1d1d" : theme.colors.border}`,
                  boxShadow:
                    isUrgent && !isResolved ? "0 0 12px rgba(239, 68, 68, 0.15)" : undefined,
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
                          fontSize: 10,
                          fontWeight: "bold",
                          padding: "2px 6px",
                          borderRadius: 6,
                          backgroundColor: theme.colors.surfaceElevated,
                          color: theme.colors.goldPrimary,
                          border: `1px solid ${theme.colors.borderGold}`,
                          textTransform: "uppercase",
                        }}
                      >
                        {ticket.unit}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: theme.colors.textMuted,
                          textTransform: "uppercase",
                          fontWeight: "600",
                        }}
                      >
                        {ticket.category}
                      </span>
                    </div>

                    <h4
                      style={{
                        fontSize: 15,
                        fontWeight: "bold",
                        margin: "2px 0 0",
                        color: theme.colors.textPrimary,
                      }}
                    >
                      {ticket.title}
                    </h4>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Clock style={{ width: 11, height: 11, color: theme.colors.textMuted }} />
                      <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        Reported: {ticket.reportedDate}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      padding: "3px 8px",
                      borderRadius: 10,
                      backgroundColor: isUrgent
                        ? "#7f1d1d"
                        : ticket.urgency === "medium"
                          ? "#78350f"
                          : "#1e293b",
                      color: isUrgent
                        ? "#fca5a5"
                        : ticket.urgency === "medium"
                          ? "#fde68a"
                          : "#cbd5e1",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {ticket.urgency}
                  </span>
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
                        color: isResolved
                          ? "#34d399"
                          : ticket.status === "assigned"
                            ? "#60a5fa"
                            : "#fbbf24",
                        textTransform: "uppercase",
                      }}
                    >
                      {ticket.status}
                    </strong>
                  </span>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => handleOpenResolveModal(ticket)}
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
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      <CheckCircle2 style={{ width: 13, height: 13 }} />
                      Resolve Request
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedTicketForResolve && (
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
                  Resolution Verification
                </span>
                <h3 style={{ fontSize: 17, fontWeight: "bold", margin: "2px 0 0" }}>
                  Resolve {selectedTicketForResolve.unit}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketForResolve(null)}
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

            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="resolution-notes-textarea"
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.colors.textMuted,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Resolution Diagnosis & Notes *
              </label>
              <textarea
                id="resolution-notes-textarea"
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
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

            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}
            >
              <div>
                <label
                  htmlFor="repair-cost-input"
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: theme.colors.textMuted,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Repair Cost (BDT ৳)
                </label>
                <input
                  id="repair-cost-input"
                  type="number"
                  step="50"
                  min="0"
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: theme.colors.canvas,
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.textPrimary,
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="cost-billed-to-select"
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: theme.colors.textMuted,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Cost Billed To
                </label>
                <select
                  id="cost-billed-to-select"
                  value={costBilledTo}
                  onChange={(e) => setCostBilledTo(e.target.value as any)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: theme.colors.canvas,
                    border: `1px solid ${theme.colors.border}`,
                    color: theme.colors.textPrimary,
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option value="landlord">Landlord (Estate)</option>
                  <option value="tenant">Tenant</option>
                  <option value="shared">Shared 50/50</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedTicketForResolve(null)}
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
                onClick={handleSubmitResolution}
                disabled={resolveMutation.isPending}
                style={{
                  flex: 2,
                  padding: "12px",
                  borderRadius: 10,
                  backgroundColor: "#10b981",
                  color: "#ffffff",
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
                {resolveMutation.isPending ? "Resolving..." : "Confirm & Mark Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
