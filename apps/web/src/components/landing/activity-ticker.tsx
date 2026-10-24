"use client";

import { Activity } from "lucide-react";

interface TickerItem {
  id: string;
  property: string;
  action: string;
  time: string;
  type: "booking" | "utility" | "housekeeping" | "voucher";
}

const TICKER_ITEMS: TickerItem[] = [
  {
    id: "t1",
    property: "The Grand Sylhet Resort",
    action: "Booked Royal Suite (৳142,000 • saved ৳25,500 OTA fee)",
    time: "2m ago",
    type: "booking",
  },
  {
    id: "t2",
    property: "Gulshan Tower One",
    action: "Auto-cleared 24 tenant utility invoices via bKash",
    time: "6m ago",
    type: "utility",
  },
  {
    id: "t3",
    property: "Cox's Bazar Sea Haven",
    action: "Marked 18 villas Inspected & Keycard Ready",
    time: "9m ago",
    type: "housekeeping",
  },
  {
    id: "t4",
    property: "Château Alabaster",
    action: "Direct PDF Voucher generated for Helipad Arrival",
    time: "14m ago",
    type: "voucher",
  },
  {
    id: "t5",
    property: "Banani Residence Nine",
    action: "Dispatched monthly gas & power statement via WhatsApp",
    time: "18m ago",
    type: "utility",
  },
];

export function ActivityTicker() {
  return (
    <div className="w-full bg-[hsl(var(--surface))] border-y border-[hsl(var(--border))] py-3 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto px-4 flex items-center">
        {/* Fixed Left Badge */}
        <div className="hidden sm:flex items-center gap-2 pr-6 border-r border-[hsl(var(--border))] mr-6 shrink-0 text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
          <Activity className="size-4 text-[hsl(var(--primary))] animate-pulse" />
          <span>Live Activity</span>
        </div>

        {/* Continuous Animated Marquee Track */}
        <div className="overflow-hidden flex-1 relative">
          <div className="animate-marquee flex items-center gap-8 text-xs text-[hsl(var(--foreground-secondary))]">
            {/* Render twice for seamless loop */}
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center gap-2.5 whitespace-nowrap"
              >
                <span
                  className={`size-2 rounded-full ${
                    item.type === "booking"
                      ? "bg-emerald-500"
                      : item.type === "utility"
                        ? "bg-[hsl(var(--primary))]"
                        : item.type === "housekeeping"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                  }`}
                />
                <span className="font-bold text-[hsl(var(--foreground))]">{item.property}:</span>
                <span className="text-[hsl(var(--foreground-muted))]">{item.action}</span>
                <span className="text-[10px] text-[hsl(var(--foreground-muted))]/60 font-mono">
                  {item.time}
                </span>
                <span className="text-[hsl(var(--primary))]/40 ml-4">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
