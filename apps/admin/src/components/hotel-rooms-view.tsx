"use client";

import { Badge, Button, Card, StatusBadge } from "@omniheaven/ui";
import {
  AlertCircle,
  CheckCircle2,
  DoorOpen,
  Layers,
  Paintbrush,
  Plus,
  Search,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

export function HotelRoomsView() {
  const [activeTab, setActiveTab] = useState<"housekeeping" | "catalog">("housekeeping");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [isAddRoomTypeModalOpen, setIsAddRoomTypeModalOpen] = useState(false);
  const [selectedRoomForStatus, setSelectedRoomForStatus] = useState<any | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Queries
  const { data: rooms = [], refetch: refetchRooms } = trpc.hotel.listRooms.useQuery();
  const { data: roomTypes = [], refetch: refetchRoomTypes } = trpc.hotel.listRoomTypes.useQuery();

  // Mutations
  const updateRoomStatusMutation = trpc.hotel.updateRoomStatus.useMutation({
    onSuccess: (data) => {
      refetchRooms();
      setSelectedRoomForStatus(null);
      setActionError(null);
      setSuccessNotice(`Room ${data.roomNumber} updated to ${data.status.toUpperCase()}.`);
    },
    onError: (err) => {
      setActionError(err.message);
    },
  });

  const createRoomMutation = trpc.hotel.createRoom.useMutation({
    onSuccess: (data) => {
      refetchRooms();
      setIsAddRoomModalOpen(false);
      setActionError(null);
      setSuccessNotice(`Room ${data.roomNumber} created successfully.`);
    },
    onError: (err) => {
      setActionError(err.message);
    },
  });

  const createRoomTypeMutation = trpc.hotel.createRoomType.useMutation({
    onSuccess: (data) => {
      refetchRoomTypes();
      setIsAddRoomTypeModalOpen(false);
      setActionError(null);
      setSuccessNotice(`Room type "${data.name}" added to catalog.`);
    },
    onError: (err) => {
      setActionError(err.message);
    },
  });

  // KPI Calculations
  const availableCount = rooms.filter((r) => r.status === "available").length;
  const cleaningCount = rooms.filter((r) => r.status === "cleaning").length;
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;
  const maintenanceCount = rooms.filter((r) => r.status === "maintenance").length;

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesFloor = floorFilter === "all" || String(r.floor) === floorFilter;
    const matchesSearch =
      searchQuery === "" ||
      r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomType?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesFloor && matchesSearch;
  });

  // Extract unique floors
  const uniqueFloors = Array.from(new Set(rooms.map((r) => r.floor))).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
              Suites & Housekeeping Desk
            </h1>
            <Badge variant="gold" className="text-[11px] px-2.5 py-0.5">
              Inventory Matrix
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted mt-1">
            Real-time housekeeping board, physical suite availability, and luxury catalog
            specifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Tab Switcher */}
          <div className="flex items-center p-1 bg-surface border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("housekeeping")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "housekeeping"
                  ? "bg-card text-foreground shadow-xs border border-border-gold/50 font-bold"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5 text-primary" />
              <span>Housekeeping Board</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "catalog"
                  ? "bg-card text-foreground shadow-xs border border-border-gold/50 font-bold"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5 text-primary" />
              <span>Room Types Catalog</span>
            </button>
          </div>

          {activeTab === "housekeeping" ? (
            <Button
              variant="luxury"
              size="sm"
              onClick={() => {
                setActionError(null);
                setIsAddRoomModalOpen(true);
              }}
              className="gap-1.5 shadow-sm min-h-[40px]"
            >
              <Plus className="size-4" />
              <span>Add Physical Room</span>
            </Button>
          ) : (
            <Button
              variant="luxury"
              size="sm"
              onClick={() => {
                setActionError(null);
                setIsAddRoomTypeModalOpen(true);
              }}
              className="gap-1.5 shadow-sm min-h-[40px]"
            >
              <Plus className="size-4" />
              <span>Add Room Type</span>
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:opacity-80"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="goldAccent" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Clean & Ready
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold font-display text-foreground tabular-nums">
              {availableCount}
            </p>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Available
            </span>
          </div>
          <p className="text-[11px] text-foreground-muted">
            Inspected and ready for guest check-in
          </p>
        </Card>

        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Needs Cleaning
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Paintbrush className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold font-display text-foreground tabular-nums">
              {cleaningCount}
            </p>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              In Queue
            </span>
          </div>
          <p className="text-[11px] text-foreground-muted">Turnover cleaning active or pending</p>
        </Card>

        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              In-House Guests
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-border-gold/40">
              <DoorOpen className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold font-display text-foreground tabular-nums">
              {occupiedCount}
            </p>
            <span className="text-xs font-semibold text-primary">Occupied</span>
          </div>
          <p className="text-[11px] text-foreground-muted">Occupied suites with active folio</p>
        </Card>

        <Card variant="default" className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted">
              Out of Order
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
              <Wrench className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold font-display text-foreground tabular-nums">
              {maintenanceCount}
            </p>
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
              Maintenance
            </span>
          </div>
          <p className="text-[11px] text-foreground-muted">HVAC, plumbing or interior repairs</p>
        </Card>
      </div>

      {/* HOUSEKEEPING BOARD TAB */}
      {activeTab === "housekeeping" && (
        <div className="space-y-4">
          {/* Operational Toolbar & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search suite number or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground-muted font-medium">Floor:</span>
                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="all">All Floors</option>
                  {uniqueFloors.map((f) => (
                    <option key={f} value={String(f)}>
                      Floor {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground-muted font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available (Clean)</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredRooms.map((room) => {
              const currentBooking = room.bookings?.[0];
              const isCleaning = room.status === "cleaning";
              const isAvailable = room.status === "available";

              return (
                <Card
                  key={room.id}
                  variant={isAvailable ? "goldAccent" : "default"}
                  className="p-4 transition-all shadow-xs flex flex-col justify-between hover:border-primary/50 group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold font-sans text-foreground tabular-nums">
                        Room {room.roomNumber}
                      </span>
                      <StatusBadge status={room.status} />
                    </div>

                    <p className="text-xs font-semibold text-foreground mt-2 truncate">
                      {room.roomType?.name}
                    </p>
                    <span className="text-[11px] text-foreground-muted block mt-0.5">
                      Floor {room.floor} • ৳{Number(room.roomType?.basePrice || 0).toLocaleString()}{" "}
                      / night
                    </span>

                    {currentBooking && (
                      <div className="mt-3 p-2.5 rounded-xl bg-surface border border-border/80 text-[11px] space-y-0.5">
                        <span className="font-semibold text-foreground block truncate">
                          Guest: {currentBooking.guestName}
                        </span>
                        <span className="text-foreground-muted text-[10px] block">
                          Checkout: {currentBooking.checkOutDate}
                        </span>
                      </div>
                    )}

                    {room.housekeepingNotes && (
                      <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 italic">
                        &quot;{room.housekeepingNotes}&quot;
                      </p>
                    )}
                  </div>

                  {/* 1-Tap Housekeeping Status Action */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    {isCleaning ? (
                      <Button
                        variant="luxury"
                        size="sm"
                        onClick={() => {
                          updateRoomStatusMutation.mutate({
                            roomId: room.id,
                            status: "available",
                            housekeepingNotes: "Turnover clean completed and inspected",
                          });
                        }}
                        disabled={updateRoomStatusMutation.isPending}
                        className="w-full gap-1.5 text-xs font-bold shadow-xs"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Mark Clean & Ready</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRoomForStatus(room)}
                        className="w-full text-xs font-semibold"
                      >
                        Change Status
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ROOM TYPES CATALOG TAB */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roomTypes.map((rt) => (
            <Card
              key={rt.id}
              variant="default"
              className="p-5 space-y-4 hover:border-primary/50 transition-all shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">{rt.name}</h3>
                  <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">
                    {rt.description || "No description provided."}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-primary tabular-nums">
                    ৳{Number(rt.basePrice || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-foreground-muted block">per night</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] p-3 rounded-xl bg-surface border border-border">
                <div>
                  <span className="text-foreground-muted block">Capacity</span>
                  <span className="font-semibold text-foreground">
                    {rt.capacityAdults} Adults, {rt.capacityChildren} Kids
                  </span>
                </div>
                <div>
                  <span className="text-foreground-muted block">Bedding</span>
                  <span className="font-semibold text-foreground capitalize">
                    {rt.bedCount}x {rt.bedType}
                  </span>
                </div>
                <div>
                  <span className="text-foreground-muted block">Inventory</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {rt.rooms?.length ?? 0} physical rooms
                  </span>
                </div>
              </div>

              {rt.amenities && rt.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rt.amenities.map((item: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-surface border border-border text-[10px] font-medium text-foreground-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* QUICK STATUS CHANGER MODAL */}
      {selectedRoomForStatus && (
        <RoomStatusModal
          room={selectedRoomForStatus}
          isLoading={updateRoomStatusMutation.isPending}
          errorMessage={actionError}
          onClose={() => {
            setSelectedRoomForStatus(null);
            setActionError(null);
          }}
          onConfirm={(data) => {
            updateRoomStatusMutation.mutate({
              roomId: selectedRoomForStatus.id,
              status: data.status,
              housekeepingNotes: data.housekeepingNotes,
            });
          }}
        />
      )}

      {/* ADD ROOM MODAL */}
      {isAddRoomModalOpen && (
        <AddRoomModal
          roomTypes={roomTypes}
          isLoading={createRoomMutation.isPending}
          errorMessage={actionError}
          onClose={() => {
            setIsAddRoomModalOpen(false);
            setActionError(null);
          }}
          onConfirm={(data) => createRoomMutation.mutate(data)}
        />
      )}

      {/* ADD ROOM TYPE MODAL */}
      {isAddRoomTypeModalOpen && (
        <AddRoomTypeModal
          isLoading={createRoomTypeMutation.isPending}
          errorMessage={actionError}
          onClose={() => {
            setIsAddRoomTypeModalOpen(false);
            setActionError(null);
          }}
          onConfirm={(data) => createRoomTypeMutation.mutate(data)}
        />
      )}
    </div>
  );
}

// Subcomponents: Modals
function RoomStatusModal({
  room,
  isLoading,
  errorMessage,
  onClose,
  onConfirm,
}: {
  room: any;
  isLoading: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (data: { status: any; housekeepingNotes?: string }) => void;
}) {
  const [status, setStatus] = useState(room.status);
  const [notes, setNotes] = useState(room.housekeepingNotes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ status, housekeepingNotes: notes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border-gold/50 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="font-display text-base font-bold text-foreground">
            Room {room.roomNumber} Status
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-foreground-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modal-status-select"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Select New Status *
            </label>
            <select
              id="modal-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="available">Available (Inspected & Clean)</option>
              <option value="cleaning">Cleaning (Turnover Needed)</option>
              <option value="maintenance">Maintenance / Repair</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="modal-housekeeping-notes"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Housekeeping Notes
            </label>
            <textarea
              id="modal-housekeeping-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Linen changed, amenities restocked"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="luxury" size="sm" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRoomModal({
  roomTypes,
  isLoading,
  errorMessage,
  onClose,
  onConfirm,
}: {
  roomTypes: any[];
  isLoading: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (data: any) => void;
}) {
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id ?? "");
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTypeId || !roomNumber) return;
    onConfirm({ roomTypeId, roomNumber, floor });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border-gold/50 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="font-display text-base font-bold text-foreground">Add Physical Room</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-foreground-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modal-roomtype-select"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Room Type *
            </label>
            <select
              id="modal-roomtype-select"
              value={roomTypeId}
              onChange={(e) => setRoomTypeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="modal-room-number"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Room Number / Identifier *
            </label>
            <input
              id="modal-room-number"
              type="text"
              required
              placeholder="e.g. 401, Suite A"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="modal-room-floor"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Floor Level
            </label>
            <input
              id="modal-room-floor"
              type="number"
              min="0"
              max="100"
              required
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="luxury" size="sm" disabled={isLoading || !roomNumber}>
              {isLoading ? "Saving..." : "Add Room"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRoomTypeModal({
  isLoading,
  errorMessage,
  onClose,
  onConfirm,
}: {
  isLoading: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (data: any) => void;
}) {
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState(8500);
  const [bedType, setBedType] = useState("queen");
  const [capacityAdults, setCapacityAdults] = useState(2);
  const [capacityChildren, _setCapacityChildren] = useState(0);
  const [sizeSqFt, setSizeSqFt] = useState(450);
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || basePrice <= 0) return;
    onConfirm({
      name,
      basePrice,
      bedType,
      bedCount: 1,
      capacityAdults,
      capacityChildren,
      sizeSqFt,
      description,
      amenities: ["Air Conditioning", "High-speed WiFi", "Electric Kettle", "Room Service"],
      photos: [
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
      ],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border-gold/50 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="font-display text-base font-bold text-foreground">
            Add Room Type / Category
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-foreground-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modal-type-name"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Category Name *
            </label>
            <input
              id="modal-type-name"
              type="text"
              required
              placeholder="e.g. Royal Honeymoon Suite"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-type-price"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Base Price (BDT / night) *
              </label>
              <input
                id="modal-type-price"
                type="number"
                min="0"
                step="500"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="modal-type-bed"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Bed Type
              </label>
              <select
                id="modal-type-bed"
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="single">Single Bed</option>
                <option value="double">Double Bed</option>
                <option value="queen">Queen Bed</option>
                <option value="king">King Bed</option>
                <option value="twin">Twin Beds</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-type-adults"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Adult Capacity
              </label>
              <input
                id="modal-type-adults"
                type="number"
                min="1"
                max="10"
                value={capacityAdults}
                onChange={(e) => setCapacityAdults(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="modal-type-size"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                Size (Sq. Ft.)
              </label>
              <input
                id="modal-type-size"
                type="number"
                min="100"
                value={sizeSqFt}
                onChange={(e) => setSizeSqFt(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="modal-type-desc"
              className="block text-xs font-semibold text-foreground mb-1"
            >
              Description
            </label>
            <textarea
              id="modal-type-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key suite features, view, and furnishings"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="luxury" size="sm" disabled={isLoading || !name}>
              {isLoading ? "Creating..." : "Create Room Type"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
