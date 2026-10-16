"use client";

import {
  BellRing,
  Car,
  Coffee,
  type LucideIcon,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Waves,
  Wifi,
} from "lucide-react";
import type { HotelAmenityItem } from "../types/hotel-website";

interface AmenitiesSectionProps {
  amenities: HotelAmenityItem[];
  accentColor: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Waves,
  Sparkles,
  UtensilsCrossed,
  BellRing,
  Car,
  Wifi,
  Coffee,
};

export function AmenitiesSection({ amenities, accentColor }: AmenitiesSectionProps) {
  return (
    <section id="amenities" className="py-20 bg-slate-100/60 border-y border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white shadow-2xs inline-block"
            style={{ color: accentColor }}
          >
            Bespoke Experiences
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-heading">
            World-Class Amenities & Holistic Wellness
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Immerse yourself in elevated comforts designed to revitalize body and soul, from
            three-tier oceanfront infinity pools to signature Ayurvedic therapies.
          </p>
        </div>

        {/* Amenities Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {amenities.map((item) => {
            const IconComponent = ICON_MAP[item.icon] || ShieldCheck;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div
                    className="size-12 rounded-xl flex items-center justify-center text-white mb-5 transition-transform duration-300 group-hover:scale-110 shadow-sm"
                    style={{ backgroundColor: accentColor }}
                  >
                    <IconComponent className="size-6" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight font-heading mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">
                  <span>Included with your stay</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
