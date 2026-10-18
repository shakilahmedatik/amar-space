"use client";

import { ArrowRight, Bed, Check, Eye, Maximize2, Users } from "lucide-react";
import { useState } from "react";
import type { HotelRoomTypeView } from "../types/hotel-website";
import { RoomModal } from "./room-modal";

interface RoomsSectionProps {
  roomTypes: HotelRoomTypeView[];
  accentColor: string;
  onBookRoom: (room: HotelRoomTypeView) => void;
}

export function RoomsSection({ roomTypes, accentColor, onBookRoom }: RoomsSectionProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [activeModalRoom, setActiveModalRoom] = useState<HotelRoomTypeView | null>(null);

  const filteredRooms = roomTypes.filter((room) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "villas") return room.name.toLowerCase().includes("villa");
    if (selectedFilter === "suites") return room.name.toLowerCase().includes("suite");
    if (selectedFilter === "ocean")
      return (
        room.name.toLowerCase().includes("ocean") || room.name.toLowerCase().includes("beachfront")
      );
    return true;
  });

  return (
    <section id="rooms" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 inline-block"
          style={{ color: accentColor }}
        >
          Accommodations & Sanctuaries
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-heading">
          Handcrafted Suites & Ocean Villas
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          Designed in harmony with indigenous coastal architecture, each sanctuary offers expansive
          living spaces, private terraces, and bespoke luxury amenities.
        </p>

        {/* Filter Tabs */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "all", label: "All Residences" },
            { id: "villas", label: "Private Pool Villas" },
            { id: "suites", label: "Ocean Suites" },
            { id: "ocean", label: "Beachfront Views" },
          ].map((tab) => {
            const isActive = selectedFilter === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRooms.map((room) => {
          const photo =
            room.photos[0] ||
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80";

          return (
            <div
              key={room.id}
              className="group bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              {/* Photo Area */}
              <div className="relative h-64 w-full overflow-hidden bg-slate-100">
                <div
                  className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${photo})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {room.tag && (
                  <span
                    className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-md uppercase tracking-wider"
                    style={{ backgroundColor: accentColor }}
                  >
                    {room.tag}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModalRoom(room)}
                  className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="size-3.5" />
                  <span>View Photos</span>
                </button>
              </div>

              {/* Room Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight font-heading group-hover:text-indigo-900 transition-colors">
                    {room.name}
                  </h3>

                  {/* Room Specs */}
                  <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5 text-slate-400" />
                      {room.capacityAdults} Guests
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Bed className="size-3.5 text-slate-400" />
                      {room.bedType.toUpperCase()}
                    </span>
                    {room.sizeSqFt && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Maximize2 className="size-3.5 text-slate-400" />
                          {room.sizeSqFt} sq ft
                        </span>
                      </>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {room.description}
                  </p>

                  {/* Amenities Preview */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {room.amenities.slice(0, 3).map((amenity, i) => (
                      <span
                        key={`am-chip-${i}`}
                        className="text-[10px] font-medium bg-slate-50 text-slate-600 px-2.5 py-1 rounded-md border border-slate-100 flex items-center gap-1"
                      >
                        <Check className="size-2.5 text-emerald-600" />
                        {amenity}
                      </span>
                    ))}
                    {room.amenities.length > 3 && (
                      <span className="text-[10px] font-medium text-slate-400 self-center">
                        +{room.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                  {/* Live Inventory Status */}
                  {room.availableRoomCount !== undefined && (
                    <div className="mt-3 flex items-center">
                      {room.availableRoomCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {room.availableRoomCount}{" "}
                          {room.availableRoomCount === 1 ? "room" : "rooms"} available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          Sold Out for Selected Dates
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing & CTA */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      From
                    </span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-2xl font-extrabold text-slate-900">
                        ৳{room.basePrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">/ night</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={room.availableRoomCount === 0}
                    onClick={() => onBookRoom(room)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 ${
                      room.availableRoomCount === 0
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                    style={{
                      backgroundColor: room.availableRoomCount === 0 ? "#64748b" : accentColor,
                    }}
                  >
                    <span>{room.availableRoomCount === 0 ? "Sold Out" : "Book Suite"}</span>
                    {room.availableRoomCount !== 0 && <ArrowRight className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Room Detail Modal */}
      <RoomModal
        room={activeModalRoom}
        accentColor={accentColor}
        onClose={() => setActiveModalRoom(null)}
        onBookRoom={onBookRoom}
      />
    </section>
  );
}
