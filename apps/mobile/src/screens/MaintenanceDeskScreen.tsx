import type React from "react";
import type { MobileMaintenanceTicket } from "../types";

interface MaintenanceDeskScreenProps {
  tickets: MobileMaintenanceTicket[];
  onResolveTicket: (id: string) => void;
}

export const MaintenanceDeskScreen: React.FC<MaintenanceDeskScreenProps> = ({
  tickets,
  onResolveTicket,
}) => {
  return (
    <div style={{ padding: 16, backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>Maintenance & Repair Desk</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
          Track urgent resident and room repair requests
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            style={{
              backgroundColor: "#1e293b",
              borderRadius: 12,
              padding: 14,
              border: "1px solid #334155",
            }}
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
            >
              <div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    padding: "2px 6px",
                    borderRadius: 6,
                    backgroundColor: "#334155",
                    color: "#cbd5e1",
                    textTransform: "uppercase",
                    marginRight: 6,
                  }}
                >
                  {ticket.unit}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  {ticket.category.toUpperCase()}
                </span>
                <h4 style={{ fontSize: 15, fontWeight: "bold", margin: "4px 0 0" }}>
                  {ticket.title}
                </h4>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                  Reported: {ticket.reportedDate}
                </p>
              </div>

              <span
                style={{
                  fontSize: 10,
                  fontWeight: "bold",
                  padding: "2px 8px",
                  borderRadius: 10,
                  backgroundColor: ticket.urgency === "urgent" ? "#7f1d1d" : "#78350f",
                  color: ticket.urgency === "urgent" ? "#fca5a5" : "#fde68a",
                  textTransform: "uppercase",
                }}
              >
                {ticket.urgency}
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid #334155",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Status: <strong style={{ color: "#ffffff" }}>{ticket.status.toUpperCase()}</strong>
              </span>

              {ticket.status !== "resolved" && (
                <button
                  type="button"
                  onClick={() => onResolveTicket(ticket.id)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#10b981",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
