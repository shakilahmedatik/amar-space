"use client";

import {
  Bed,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import type { HotelRoomTypeView } from "../types/hotel-website";

interface RoomModalProps {
  room: HotelRoomTypeView | null;
  accentColor: string;
  onClose: () => void;
  onBookRoom: (room: HotelRoomTypeView) => void;
}

export function RoomModal({ room, accentColor, onClose, onBookRoom }: RoomModalProps) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  if (!room) return null;

  const photos =
    room.photos.length > 0
      ? room.photos
      : [
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
        ];

  const nextPhoto = () => {
    setActivePhotoIdx((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 size-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close Modal"
        >
          <X className="size-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Photo Gallery Header */}
          <div className="relative h-72 sm:h-96 w-full bg-slate-900 overflow-hidden">
            <div
              className="w-full h-full bg-cover bg-center transition-all duration-300"
              style={{ backgroundImage: `url(${photos[activePhotoIdx]})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="size-6" />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {photos.map((_, i) => (
                    <button
                      type="button"
                      key={`dot-${i}`}
                      onClick={() => setActivePhotoIdx(i)}
                      className={`h-2 rounded-full transition-all ${
                        activePhotoIdx === i ? "w-6 bg-white" : "w-2 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {room.tag && (
              <span
                className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                {room.tag}
              </span>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
                  {room.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4 text-slate-400" />
                    Up to {room.capacityAdults} Adults, {room.capacityChildren} Children
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Bed className="size-4 text-slate-400" />
                    {room.bedCount} {room.bedType.toUpperCase()} Bed(s)
                  </span>
                  {room.sizeSqFt && (
                    <span className="flex items-center gap-1.5">
                      <Maximize2 className="size-4 text-slate-400" />
                      {room.sizeSqFt} sq ft / {Math.round(room.sizeSqFt * 0.0929)} m²
                    </span>
                  )}
                </div>
              </div>

              {/* Price display */}
              <div className="sm:text-right">
                <span className="text-xs text-slate-400 uppercase tracking-wider block">
                  Starting from
                </span>
                <div className="flex items-baseline sm:justify-end gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ৳{room.basePrice.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ night</span>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium block">
                  Includes complimentary breakfast buffet
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                About this Residence
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                {room.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Suite Amenities & Inclusions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {room.amenities.map((amenity, i) => (
                  <div
                    key={`amenity-${i}`}
                    className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                  >
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guarantee Policy */}
            <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Flexible Booking & Guarantee</p>
                <p className="text-amber-800/80">
                  Free cancellation up to 48 hours before check-in. Instant confirmation voucher
                  issued upon booking.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">Total per night</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-slate-900">
                ৳{room.basePrice.toLocaleString()}
              </span>
              {room.availableRoomCount !== undefined && (
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    room.availableRoomCount > 0
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-rose-700 bg-rose-50"
                  }`}
                >
                  {room.availableRoomCount > 0 ? `${room.availableRoomCount} left` : "Sold out"}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={room.availableRoomCount === 0}
              onClick={() => {
                onClose();
                onBookRoom(room);
              }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 ${
                room.availableRoomCount === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              style={{ backgroundColor: room.availableRoomCount === 0 ? "#64748b" : accentColor }}
            >
              <Sparkles className="size-4" />
              <span>{room.availableRoomCount === 0 ? "Sold Out" : "Reserve Suite Now"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
