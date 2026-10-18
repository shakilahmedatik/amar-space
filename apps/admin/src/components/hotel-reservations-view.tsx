"use client";

import {
  Calendar as CalendarIcon,
  DoorOpen,
  Filter,
  Grid,
  List,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

export function HotelReservationsView() {
  const [activeViewMode, setActiveViewMode] = useState<"matrix" | "table">("matrix");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState<any | null>(null);
  const [selectedBookingForCheckOut, setSelectedBookingForCheckOut] = useState<any | null>(null);
  const [selectedBookingForCharge, setSelectedBookingForCharge] = useState<any | null>(null);

  // Queries
  const { data: bookings = [], refetch: refetchBookings } = trpc.hotel.listBookings.useQuery({});
  const { data: rooms = [], refetch: refetchRooms } = trpc.hotel.listRooms.useQuery();
  const { data: roomTypes = [] } = trpc.hotel.listRoomTypes.useQuery();

  // Mutations
  const createReservationMutation = trpc.hotel.createReservation.useMutation({
    onSuccess: () => {
      refetchBookings();
      setIsNewBookingModalOpen(false);
    },
  });

  const checkInMutation = trpc.hotel.checkInGuest.useMutation({
    onSuccess: () => {
      refetchBookings();
      refetchRooms();
      setSelectedBookingForCheckIn(null);
    },
  });

  const checkOutMutation = trpc.hotel.checkOutGuest.useMutation({
    onSuccess: () => {
      refetchBookings();
      refetchRooms();
      setSelectedBookingForCheckOut(null);
    },
  });

  const addChargeMutation = trpc.hotel.addExtraCharge.useMutation({
    onSuccess: () => {
      refetchBookings();
      setSelectedBookingForCharge(null);
    },
  });

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.guestPhone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  // Metrics
  const activeBookingsCount = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "checked_in",
  ).length;
  const inHouseGuestsCount = bookings.filter((b) => b.status === "checked_in").length;
  const totalRoomsCount = rooms.length;
  const occupancyPercent =
    totalRoomsCount > 0 ? Math.round((inHouseGuestsCount / totalRoomsCount) * 100) : 0;

  // Next 7 days for tape chart
  const today = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    return dateStr || "";
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
            Front Desk & Tape Chart
          </h2>
          <p className="text-xs sm:text-sm text-foreground-muted mt-0.5">
            Real-time room occupancy matrix, arrival check-in, folio settling, and room allocation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-surface border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setActiveViewMode("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeViewMode === "matrix"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Grid className="size-3.5" />
              <span>Tape Chart</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeViewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <List className="size-3.5" />
              <span>Table List</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsNewBookingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="size-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Occupancy Rate</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <DoorOpen className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{occupancyPercent}%</p>
          <span className="text-[11px] text-foreground-muted">
            {inHouseGuestsCount} of {totalRoomsCount} rooms occupied
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">In-House Guests</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <UserCheck className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{inHouseGuestsCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Currently checked in</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Active Bookings</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <CalendarIcon className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{activeBookingsCount}</p>
          <span className="text-[11px] text-foreground-muted">Confirmed & Arriving</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Room Inventory</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Users className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{totalRoomsCount}</p>
          <span className="text-[11px] text-foreground-muted">Across {roomTypes.length} types</span>
        </div>
      </div>

      {/* TAPE CHART MATRIX VIEW */}
      {activeViewMode === "matrix" && (
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Room Tape Chart Calendar</h3>
              <p className="text-xs text-foreground-muted">
                7-day occupancy timeline with color-coded reservation blocks.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-foreground-muted">Checked In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-foreground-muted">Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-slate-400 inline-block" />
                <span className="text-foreground-muted">Available</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-3 font-semibold text-foreground min-w-[120px] sticky left-0 bg-surface z-10">
                    Room
                  </th>
                  {next7Days.map((dateStr) => {
                    const dateObj = new Date(dateStr);
                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNum = dateObj.getDate();
                    return (
                      <th
                        key={dateStr}
                        className="p-3 font-semibold text-foreground text-center min-w-[130px] border-l border-border"
                      >
                        <span className="block text-[11px] text-foreground-muted uppercase">
                          {dayName}
                        </span>
                        <span className="text-sm font-bold">{dayNum}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-surface/50 transition-colors">
                    <td className="p-3 sticky left-0 bg-card z-10 border-r border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">Room {room.roomNumber}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                            room.status === "available"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : room.status === "occupied"
                                ? "bg-blue-500/10 text-blue-600"
                                : room.status === "cleaning"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-rose-500/10 text-rose-600"
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-foreground-muted block mt-0.5 truncate max-w-[100px]">
                        {room.roomType?.name}
                      </span>
                    </td>

                    {next7Days.map((dateStr) => {
                      // Find if this room has a booking covering this date
                      const bookingForDate = bookings.find(
                        (b) =>
                          b.roomId === room.id &&
                          (b.status === "confirmed" || b.status === "checked_in") &&
                          b.checkInDate <= dateStr &&
                          b.checkOutDate > dateStr,
                      );

                      if (bookingForDate) {
                        const isCheckedIn = bookingForDate.status === "checked_in";
                        return (
                          <td
                            key={dateStr}
                            className="p-1.5 border-l border-border text-center align-middle"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (isCheckedIn) {
                                  setSelectedBookingForCheckOut(bookingForDate);
                                } else {
                                  setSelectedBookingForCheckIn(bookingForDate);
                                }
                              }}
                              className={`w-full p-2 rounded-lg text-left transition-transform active:scale-95 ${
                                isCheckedIn
                                  ? "bg-emerald-600/90 text-white hover:bg-emerald-700"
                                  : "bg-amber-500/90 text-white hover:bg-amber-600"
                              }`}
                            >
                              <span className="font-bold block truncate text-[11px]">
                                {bookingForDate.guestName}
                              </span>
                              <span className="text-[9px] opacity-80 block truncate">
                                {bookingForDate.bookingReference}
                              </span>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={dateStr}
                          className="p-1.5 border-l border-border text-center align-middle bg-surface/20"
                        >
                          <span className="text-[11px] text-foreground-muted/40 font-mono">
                            Free
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE LIST VIEW */}
      {activeViewMode === "table" && (
        <div className="p-4 sm:p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search by guest, reference, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-foreground-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface border-b border-border text-foreground-muted">
                  <th className="p-3 font-semibold">Reference</th>
                  <th className="p-3 font-semibold">Guest</th>
                  <th className="p-3 font-semibold">Room & Type</th>
                  <th className="p-3 font-semibold">Stay Dates</th>
                  <th className="p-3 font-semibold">Total Price</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-surface/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-foreground">
                      {b.bookingReference}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-foreground">{b.guestName}</p>
                      <p className="text-[11px] text-foreground-muted">{b.guestPhone}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-foreground">
                        {b.room ? `Room ${b.room.roomNumber}` : "Unallocated"}
                      </span>
                      <p className="text-[11px] text-foreground-muted">{b.roomType?.name}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-foreground">
                        {b.checkInDate} → {b.checkOutDate}
                      </p>
                      <p className="text-[10px] text-foreground-muted">
                        {b.adultsCount} Adults, {b.childrenCount} Children
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-foreground">৳ {b.totalPrice}</p>
                      {Number(b.extraCharges) > 0 && (
                        <p className="text-[10px] text-amber-600">
                          +৳ {b.extraCharges} Folio Extras
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          b.status === "checked_in"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : b.status === "confirmed"
                              ? "bg-amber-500/10 text-amber-600"
                              : b.status === "checked_out"
                                ? "bg-slate-500/10 text-slate-600"
                                : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {b.status === "confirmed" && (
                        <button
                          type="button"
                          onClick={() => setSelectedBookingForCheckIn(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors"
                        >
                          Check In
                        </button>
                      )}
                      {b.status === "checked_in" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForCharge(b)}
                            className="px-2 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface/80 text-foreground text-[11px] font-medium"
                          >
                            + Charge
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForCheckOut(b)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition-colors"
                          >
                            Check Out
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK CHECK-IN MODAL */}
      {selectedBookingForCheckIn && (
        <CheckInModal
          booking={selectedBookingForCheckIn}
          availableRooms={rooms.filter(
            (r) =>
              r.roomTypeId === selectedBookingForCheckIn.roomTypeId &&
              (r.status === "available" || r.id === selectedBookingForCheckIn.roomId),
          )}
          isLoading={checkInMutation.isPending}
          onClose={() => setSelectedBookingForCheckIn(null)}
          onConfirm={(data) => {
            checkInMutation.mutate({
              bookingId: selectedBookingForCheckIn.id,
              roomId: data.roomId,
              guestNidOrPassport: data.guestNidOrPassport,
              specialRequests: data.specialRequests,
            });
          }}
        />
      )}

      {/* CHECK-OUT & FOLIO SETTLEMENT MODAL */}
      {selectedBookingForCheckOut && (
        <CheckOutModal
          booking={selectedBookingForCheckOut}
          isLoading={checkOutMutation.isPending}
          onClose={() => setSelectedBookingForCheckOut(null)}
          onConfirm={(data) => {
            checkOutMutation.mutate({
              bookingId: selectedBookingForCheckOut.id,
              settleExtraCharges: data.settleExtraCharges,
              paymentMethod: data.paymentMethod,
              notes: data.notes,
            });
          }}
        />
      )}

      {/* ADD FOLIO EXTRA CHARGE MODAL */}
      {selectedBookingForCharge && (
        <AddFolioChargeModal
          booking={selectedBookingForCharge}
          isLoading={addChargeMutation.isPending}
          onClose={() => setSelectedBookingForCharge(null)}
          onConfirm={(data) => {
            addChargeMutation.mutate({
              bookingId: selectedBookingForCharge.id,
              description: data.description,
              amount: data.amount,
            });
          }}
        />
      )}

      {/* NEW RESERVATION MODAL */}
      {isNewBookingModalOpen && (
        <NewReservationModal
          roomTypes={roomTypes}
          isLoading={createReservationMutation.isPending}
          onClose={() => setIsNewBookingModalOpen(false)}
          onConfirm={(data) => createReservationMutation.mutate(data)}
        />
      )}
    </div>
  );
}

// Subcomponents: Modals
function CheckInModal({
  booking,
  availableRooms,
  isLoading,
  onClose,
  onConfirm,
}: {
  booking: any;
  availableRooms: any[];
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (data: {
    roomId: string;
    guestNidOrPassport: string;
    specialRequests?: string;
  }) => void;
}) {
  const [selectedRoomId, setSelectedRoomId] = useState(
    booking.roomId || (availableRooms[0]?.id ?? ""),
  );
  const [guestNidOrPassport, setGuestNidOrPassport] = useState(booking.guestNidOrPassport || "");
  const [specialRequests, setSpecialRequests] = useState(booking.specialRequests || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !guestNidOrPassport) return;
    onConfirm({
      roomId: selectedRoomId,
      guestNidOrPassport,
      specialRequests,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Guest Check-In</h3>
            <p className="text-xs text-foreground-muted">{booking.bookingReference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface border border-border text-xs space-y-1">
            <p className="font-semibold text-foreground">Guest: {booking.guestName}</p>
            <p className="text-foreground-muted">Phone: {booking.guestPhone}</p>
            <p className="text-foreground-muted">
              Dates: {booking.checkInDate} to {booking.checkOutDate}
            </p>
          </div>

          <div>
            <label
              htmlFor="checkin-room"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Assign Physical Room *
            </label>
            <select
              id="checkin-room"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            >
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.roomNumber} (Floor {r.floor}) — Status: {r.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="checkin-nid"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Bangladeshi NID or Foreign Passport Number *
            </label>
            <input
              id="checkin-nid"
              type="text"
              required
              placeholder="e.g. 19912692019000456 or A04892140"
              value={guestNidOrPassport}
              onChange={(e) => setGuestNidOrPassport(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden focus:border-primary"
            />
            <span className="text-[10px] text-foreground-muted mt-1 block">
              Mandatory government KYC compliance for hospitality check-ins.
            </span>
          </div>

          <div>
            <label
              htmlFor="checkin-requests"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Special Requests / Notes
            </label>
            <textarea
              id="checkin-requests"
              rows={2}
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Extra pillows provided, late checkout requested"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !guestNidOrPassport}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Complete Check-In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckOutModal({
  booking,
  isLoading,
  onClose,
  onConfirm,
}: {
  booking: any;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (data: { settleExtraCharges: number; paymentMethod: any; notes?: string }) => void;
}) {
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, _setNotes] = useState("");

  const currentExtraCharges = Number(booking.extraCharges || 0);
  const _finalPayable = currentExtraCharges + additionalCharges;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      settleExtraCharges: additionalCharges,
      paymentMethod,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Process Checkout</h3>
            <p className="text-xs text-foreground-muted">{booking.bookingReference}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-surface border border-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-foreground-muted">Guest</span>
              <span className="font-semibold text-foreground">{booking.guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Room</span>
              <span className="font-semibold text-foreground">
                Room {booking.room?.roomNumber ?? "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground-muted">Room Base Rate</span>
              <span className="font-bold text-foreground">৳ {booking.totalPrice}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>Existing Folio Charges</span>
              <span className="font-bold">৳ {currentExtraCharges.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="checkout-incidentals"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Add Final Incidentals / Minibar (BDT)
            </label>
            <input
              id="checkout-incidentals"
              type="number"
              min="0"
              step="50"
              value={additionalCharges}
              onChange={(e) => setAdditionalCharges(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="checkout-payment-method"
              className="block text-xs font-semibold text-foreground mb-1.5"
            >
              Payment Method for Folio Settle
            </label>
            <select
              id="checkout-payment-method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            >
              <option value="cash">Cash Collection</option>
              <option value="bkash">bKash Merchant Pay</option>
              <option value="nagad">Nagad MFS</option>
              <option value="card">Credit / Debit Card POS</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700">
            <span className="font-bold block mb-1">Notice:</span>
            Upon checkout, Room {booking.room?.roomNumber} will automatically transition to{" "}
            <strong>Cleaning</strong> status to trigger turnover housekeeping.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              {isLoading ? "Settling..." : "Settle & Checkout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddFolioChargeModal({
  booking,
  isLoading,
  onClose,
  onConfirm,
}: {
  booking: any;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (data: { description: string; amount: number }) => void;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || amount <= 0) return;
    onConfirm({ description, amount });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground">Add Folio Charge</h3>
            <p className="text-[11px] text-foreground-muted">{booking.bookingReference}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-foreground-muted">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="folio-charge-description"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Description *
            </label>
            <input
              id="folio-charge-description"
              type="text"
              required
              placeholder="e.g. Room Service Dining, Laundry"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor="folio-charge-amount"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Amount (৳) *
            </label>
            <input
              id="folio-charge-amount"
              type="number"
              min="50"
              step="50"
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !description || amount <= 0}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              {isLoading ? "Saving..." : "Add to Folio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewReservationModal({
  roomTypes,
  isLoading,
  onClose,
  onConfirm,
}: {
  roomTypes: any[];
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
}) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0] || "";
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0] || "";

  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? "");
  const [checkInDate, setCheckInDate] = useState(tomorrow);
  const [checkOutDate, setCheckOutDate] = useState(in3Days);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [adultsCount, _setAdultsCount] = useState(2);
  const [childrenCount, _setChildrenCount] = useState(0);

  const selectedType = roomTypes.find((r) => r.id === roomTypeId);
  const nights = Math.max(
    1,
    Math.round(
      (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 3600 * 24),
    ),
  );
  const estimatedTotal = selectedType ? (Number(selectedType.basePrice) * nights).toFixed(2) : "0";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      roomTypeId,
      checkInDate,
      checkOutDate,
      guestName,
      guestEmail,
      guestPhone,
      adultsCount,
      childrenCount,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-base font-bold text-foreground">Create Walk-in Reservation</h3>
          <button type="button" onClick={onClose} className="p-1 text-foreground-muted">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="res-checkin-date"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Check-In Date *
              </label>
              <input
                id="res-checkin-date"
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
              />
            </div>
            <div>
              <label
                htmlFor="res-checkout-date"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Check-Out Date *
              </label>
              <input
                id="res-checkout-date"
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="res-room-type"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Room Type *
            </label>
            <select
              id="res-room-type"
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name} — ৳ {rt.basePrice}/night ({rt.bedType} bed)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="res-guest-name"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Guest Full Name *
              </label>
              <input
                id="res-guest-name"
                type="text"
                required
                placeholder="e.g. Mahfuzur Rahman"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
              />
            </div>
            <div>
              <label
                htmlFor="res-guest-phone"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Phone Number (BD) *
              </label>
              <input
                id="res-guest-phone"
                type="tel"
                required
                placeholder="01712345678"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="res-guest-email"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Guest Email Address *
            </label>
            <input
              id="res-guest-email"
              type="email"
              required
              placeholder="guest@example.com"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs">
            <span className="text-foreground-muted">Calculated Total ({nights} nights)</span>
            <span className="font-bold text-foreground text-sm">৳ {estimatedTotal}</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !guestName || !guestPhone || !guestEmail}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
            >
              {isLoading ? "Creating..." : "Confirm Reservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
