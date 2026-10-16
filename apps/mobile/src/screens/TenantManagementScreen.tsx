import type React from "react";
import type { MobileTenantSummary } from "../types";

interface TenantManagementScreenProps {
  tenants: MobileTenantSummary[];
  onSendReminder: (tenant: MobileTenantSummary) => void;
}

export const TenantManagementScreen: React.FC<TenantManagementScreenProps> = ({
  tenants,
  onSendReminder,
}) => {
  return (
    <div style={{ padding: 16, backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>
          Tenant Directory & Collections
        </h2>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
          Residential flats and monthly rent payment monitoring
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {tenants.map((t) => (
          <div
            key={t.id}
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
                <span style={{ fontSize: 11, fontWeight: "bold", color: "#38bdf8" }}>
                  Flat {t.flatNumber}
                </span>
                <h4 style={{ fontSize: 16, fontWeight: "bold", margin: "2px 0 0" }}>
                  {t.tenantName}
                </h4>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                  {t.phone} • Due: {t.dueDate}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    padding: "2px 8px",
                    borderRadius: 10,
                    backgroundColor: t.billStatus === "paid" ? "#065f46" : "#7f1d1d",
                    color: t.billStatus === "paid" ? "#6ee7b7" : "#fca5a5",
                    textTransform: "uppercase",
                  }}
                >
                  {t.billStatus}
                </span>
                <p
                  style={{ fontSize: 14, fontWeight: "bold", margin: "4px 0 0", color: "#ffffff" }}
                >
                  ৳{t.rentAmount.toLocaleString()}
                </p>
              </div>
            </div>

            {t.billStatus !== "paid" && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: "1px solid #334155",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => onSendReminder(t)}
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
                  Send bKash SMS Reminder
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
