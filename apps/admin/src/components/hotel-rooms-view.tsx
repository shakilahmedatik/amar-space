"use client";

import {
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

  // Queries
  const { data: rooms = [], refetch: refetchRooms } = trpc.hotel.listRooms.useQuery();
  const { data: roomTypes = [], refetch: refetchRoomTypes } = trpc.hotel.listRoomTypes.useQuery();

  // Mutations
  const updateRoomStatusMutation = trpc.hotel.updateRoomStatus.useMutation({
    onSuccess: () => {
      refetchRooms();
      setSelectedRoomForStatus(null);
    },
  });

  const createRoomMutation = trpc.hotel.createRoom.useMutation({
    onSuccess: () => {
      refetchRooms();
      setIsAddRoomModalOpen(false);
    },
  });

  const createRoomTypeMutation = trpc.hotel.createRoomType.useMutation({
    onSuccess: () => {
      refetchRoomTypes();
      setIsAddRoomTypeModalOpen(false);
    },
  });

  // KPI Calculations
  const _totalRoomsCount = rooms.length;
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-foreground">
            Rooms & Housekeeping
          </h2>
          <p className="text-xs sm:text-sm text-foreground-muted mt-0.5">
            Real-time housekeeping board, physical room statuses, and room type specifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-surface border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("housekeeping")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "housekeeping"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>Housekeeping Board</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "catalog"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              <Layers className="size-3.5" />
              <span>Room Types Catalog</span>
            </button>
          </div>
          {activeTab === "housekeeping" ? (
            <button
              type="button"
              onClick={() => setIsAddRoomModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="size-4" />
              <span>Add Physical Room</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddRoomTypeModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="size-4" />
              <span>Add Room Type</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Clean & Ready</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{availableCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Available for check-in</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Needs Cleaning</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Paintbrush className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{cleaningCount}</p>
          <span className="text-[11px] text-amber-600 font-medium">Turnover cleaning queue</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">In-House Guests</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <DoorOpen className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{occupiedCount}</p>
          <span className="text-[11px] text-blue-600 font-medium">Occupied suites</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted">Out of Order</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
              <Wrench className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{maintenanceCount}</p>
          <span className="text-[11px] text-rose-600 font-medium">Maintenance / repair</span>
        </div>
      </div>

      {/* HOUSEKEEPING TAB */}
      {activeTab === "housekeeping" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search by room number or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-foreground-muted font-medium">Floor:</span>
                <select
                  value={floorFilter}
                  onChange={(e) => setFloorFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
                  className="px-2.5 py-1.5 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
                <div
                  key={room.id}
                  className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                    isCleaning
                      ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                      : isAvailable
                        ? "bg-card border-border hover:border-emerald-500/50"
                        : room.status === "occupied"
                          ? "bg-blue-500/5 border-blue-500/30"
                          : "bg-rose-500/5 border-rose-500/30"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold font-mono text-foreground">
                        Room {room.roomNumber}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isAvailable
                            ? "bg-emerald-500/10 text-emerald-600"
                            : isCleaning
                              ? "bg-amber-500/20 text-amber-700 animate-pulse"
                              : room.status === "occupied"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {room.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-foreground mt-1 truncate">
                      {room.roomType?.name}
                    </p>
                    <span className="text-[11px] text-foreground-muted block">
                      Floor {room.floor} • ৳ {room.roomType?.basePrice}/night
                    </span>

                    {currentBooking && (
                      <div className="mt-3 p-2.5 rounded-xl bg-surface/80 border border-border/80 text-[11px] space-y-0.5">
                        <span className="font-semibold text-foreground block truncate">
                          Guest: {currentBooking.guestName}
                        </span>
                        <span className="text-foreground-muted text-[10px] block">
                          Checkout: {currentBooking.checkOutDate}
                        </span>
                      </div>
                    )}

                    {room.housekeepingNotes && (
                      <p className="mt-2 text-[11px] text-amber-700 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 italic">
                        &quot;{room.housekeepingNotes}&quot;
                      </p>
                    )}
                  </div>

                  {/* 1-Tap Housekeeping Status Action */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                    {isCleaning ? (
                      <button
                        type="button"
                        onClick={() => {
                          updateRoomStatusMutation.mutate({
                            roomId: room.id,
                            status: "available",
                            housekeepingNotes: "Turnover clean completed and inspected",
                          });
                        }}
                        disabled={updateRoomStatusMutation.isPending}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Mark Clean & Ready</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedRoomForStatus(room)}
                        className="w-full py-1.5 px-3 rounded-xl bg-surface hover:bg-surface/80 border border-border text-foreground text-xs font-semibold transition-colors"
                      >
                        Change Status
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ROOM TYPES CATALOG TAB */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roomTypes.map((rt) => (
            <div
              key={rt.id}
              className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{rt.name}</h3>
                  <p className="text-xs text-foreground-muted mt-0.5 line-clamp-2">
                    {rt.description || "No description provided."}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-amber-600">৳ {rt.basePrice}</span>
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
                  <span className="font-semibold text-emerald-600">
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
            </div>
          ))}
        </div>
      )}

      {/* QUICK STATUS CHANGER MODAL */}
      {selectedRoomForStatus && (
        <RoomStatusModal
          room={selectedRoomForStatus}
          isLoading={updateRoomStatusMutation.isPending}
          onClose={() => setSelectedRoomForStatus(null)}
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
          onClose={() => setIsAddRoomModalOpen(false)}
          onConfirm={(data) => createRoomMutation.mutate(data)}
        />
      )}

      {/* ADD ROOM TYPE MODAL */}
      {isAddRoomTypeModalOpen && (
        <AddRoomTypeModal
          isLoading={createRoomTypeMutation.isPending}
          onClose={() => setIsAddRoomTypeModalOpen(false)}
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
  onClose,
  onConfirm,
}: {
  room: any;
  isLoading: boolean;
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
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Room {room.roomNumber} Status</h3>
          <button type="button" onClick={onClose} className="p-1 text-foreground-muted">
            <X className="size-4" />
          </button>
        </div>

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
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
              placeholder="e.g. Linen changed, minibar restocked"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              {isLoading ? "Updating..." : "Update Status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRoomModal({
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
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Add Physical Room</h3>
          <button type="button" onClick={onClose} className="p-1 text-foreground-muted">
            <X className="size-4" />
          </button>
        </div>

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
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !roomNumber}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
            >
              {isLoading ? "Saving..." : "Add Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddRoomTypeModal({
  isLoading,
  onClose,
  onConfirm,
}: {
  isLoading: boolean;
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
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Add Room Type / Category</h3>
          <button type="button" onClick={onClose} className="p-1 text-foreground-muted">
            <X className="size-4" />
          </button>
        </div>

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
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
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
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              {isLoading ? "Creating..." : "Create Room Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
