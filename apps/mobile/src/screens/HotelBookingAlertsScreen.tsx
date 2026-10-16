import type React from "react";
import type { MobileBookingAlert } from "../types";

interface HotelBookingAlertsScreenProps {
  bookings: MobileBookingAlert[];
  onCheckInGuest: (id: string) => void;
}

export const HotelBookingAlertsScreen: React.FC<HotelBookingAlertsScreenProps> = ({
  bookings,
  onCheckInGuest,
}) => {
  return (
    <div style={{ padding: 16, backgroundColor: "#0f172a", color: "#f8fafc", minHeight: "100%" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>Hotel Bookings & Arrivals</h2>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0" }}>
          Real-time reservations and front-desk check-in queue
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bookings.map((b) => (
          <div
            key={b.id}
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
                <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: "600" }}>
                  {b.roomName}
                </span>
                <h4 style={{ fontSize: 16, fontWeight: "bold", margin: "2px 0 0" }}>
                  {b.guestName}
                </h4>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>
                  Check-in Date: {b.checkInDate}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    padding: "2px 8px",
                    borderRadius: 10,
                    backgroundColor: b.paymentStatus === "paid" ? "#065f46" : "#7c2d12",
                    color: b.paymentStatus === "paid" ? "#6ee7b7" : "#fdba74",
                    textTransform: "uppercase",
                  }}
                >
                  {b.paymentStatus}
                </span>
                <p
                  style={{ fontSize: 14, fontWeight: "bold", margin: "4px 0 0", color: "#ffffff" }}
                >
                  ৳{b.totalPrice.toLocaleString()}
                </p>
              </div>
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
                Status:{" "}
                <strong style={{ color: "#ffffff" }}>
                  {b.status.replace("_", " ").toUpperCase()}
                </strong>
              </span>

              {b.status !== "checked_in" && (
                <button
                  type="button"
                  onClick={() => onCheckInGuest(b.id)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#6366f1",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Verify & Check-In
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
