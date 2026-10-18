"use client";

import { Calendar, Search, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import type { HotelRoomTypeView } from "../types/hotel-website";

interface QuickBookingBarProps {
  roomTypes: HotelRoomTypeView[];
  accentColor: string;
  onSearch: (criteria: {
    checkIn: string;
    checkOut: string;
    roomTypeId?: string;
    adults: number;
    children: number;
  }) => void;
}

export function QuickBookingBar({ roomTypes, accentColor, onSearch }: QuickBookingBarProps) {
  const today = new Date().toISOString().split("T")[0] || "";
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0] || "";

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [selectedRoomType, setSelectedRoomType] = useState<string>("");
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      checkIn,
      checkOut,
      roomTypeId: selectedRoomType || undefined,
      adults,
      children,
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto -mt-14 relative z-30 px-4">
      <div className="bg-card rounded-2xl shadow-2xl border-2 border-border-gold/40 p-4 sm:p-6 transition-all hover:shadow-primary/10">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
        >
          {/* Check-In Date */}
          <div className="space-y-1.5">
            <label
              htmlFor="quick-checkin"
              className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider"
            >
              <Calendar className="size-3.5 text-primary" />
              Check-In
            </label>
            <input
              id="quick-checkin"
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Check-Out Date */}
          <div className="space-y-1.5">
            <label
              htmlFor="quick-checkout"
              className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider"
            >
              <Calendar className="size-3.5 text-primary" />
              Check-Out
            </label>
            <input
              id="quick-checkout"
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Room / Guests */}
          <div className="space-y-1.5">
            <label
              htmlFor="quick-roomtype"
              className="flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider"
            >
              <Users className="size-3.5 text-primary" />
              Room & Guests
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <select
                id="quick-roomtype"
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
                className="w-full text-xs font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary truncate"
              >
                <option value="">Any Villa</option>
                {roomTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Number of Adults"
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full text-xs font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value={1}>1 Adult</option>
                <option value={2}>2 Adults</option>
                <option value={3}>3 Adults</option>
                <option value={4}>4+ Adults</option>
              </select>
              <select
                aria-label="Number of Children"
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="w-full text-xs font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value={0}>0 Kids</option>
                <option value={1}>1 Kid</option>
                <option value={2}>2 Kids</option>
                <option value={3}>3+ Kids</option>
              </select>
            </div>
          </div>

          {/* Search Button */}
          <div>
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              <Search className="size-4" />
              <span>Check Availability</span>
            </button>
          </div>
        </form>

        {/* Guarantee Banner */}
        <div className="mt-4 pt-3 border-t border-border-gold/20 flex flex-wrap items-center justify-between text-[11px] text-foreground-muted gap-2">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Direct Booking Perk: Guaranteed Best Rate + Welcome Fruit Basket</span>
          </div>
          <div className="text-foreground-muted">
            Free cancellation up to 48 hours prior to arrival
          </div>
        </div>
      </div>
    </div>
  );
}
