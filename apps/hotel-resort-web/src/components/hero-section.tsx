"use client";

import { Award, Compass, Sparkles, Star } from "lucide-react";
import type { HotelWebsiteData } from "../types/hotel-website";
import { QuickBookingBar } from "./quick-booking-bar";

interface HeroSectionProps {
  hotel: HotelWebsiteData;
  onSearch: (criteria: {
    checkIn: string;
    checkOut: string;
    roomTypeId?: string;
    adults: number;
    children: number;
  }) => void;
  onExploreSuites: () => void;
}

export function HeroSection({ hotel, onSearch, onExploreSuites }: HeroSectionProps) {
  const { hero, brand } = hotel.builderConfig;
  const bgImage =
    hero.backgroundImageUrl ||
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=80";

  return (
    <section id="hero" className="relative pb-16">
      {/* Background Image Container with Overlay */}
      <div className="relative h-[85vh] min-h-[580px] max-h-[820px] w-full overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        {/* Cinematic Multi-stop Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1412] via-[#2A201C]/70 to-[#2A201C]/40" />

        {/* Content Box */}
        <div className="relative z-20 max-w-4xl mx-auto px-4 text-center space-y-6 pt-12">
          {/* Rating / Prestige Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white tracking-wide shadow-lg">
            <div className="flex items-center gap-0.5 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={`star-${i}`} className="size-3.5 fill-current" />
              ))}
            </div>
            <span className="text-white/40">|</span>
            <span>5-Star Luxury Coastal Sanctuary</span>
            <Award className="size-3.5 text-amber-300" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1] font-heading drop-shadow-md">
            {hero.headline}
          </h1>

          {/* Subtitle / Tagline */}
          <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-normal leading-relaxed drop-shadow-xs">
            {hero.tagline || hotel.tagline}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={onExploreSuites}
              className="px-6 py-3 rounded-full text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              style={{ backgroundColor: brand.accentColor }}
            >
              {hero.ctaText || "Explore Suites & Villas"}
            </button>
          </div>

          {/* Highlights Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-white/80">
            <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
              <Compass className="size-3.5 text-amber-400" />
              Direct Beachfront Access
            </span>
            <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
              <Sparkles className="size-3.5 text-amber-400" />
              Private Infinity Pools & Butler
            </span>
            <span className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
              <Award className="size-3.5 text-amber-400" />
              Guaranteed Direct Rates
            </span>
          </div>
        </div>
      </div>

      {/* Floating Quick Booking Bar */}
      <QuickBookingBar
        roomTypes={hotel.roomTypes}
        accentColor={brand.accentColor}
        onSearch={onSearch}
      />
    </section>
  );
}
