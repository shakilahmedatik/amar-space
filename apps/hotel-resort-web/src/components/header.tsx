"use client";

import { Check, Menu, Palette, Phone, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { HotelWebsiteData } from "../types/hotel-website";

interface HeaderProps {
  hotel: HotelWebsiteData;
  activeTheme: string;
  onThemeChange?: (
    themeSlug: "classic-luxury" | "modern-minimal" | "coastal-resort" | "boutique-haven",
  ) => void;
  onOpenBooking: () => void;
}

const THEME_OPTIONS = [
  { id: "classic-luxury", label: "Classic Luxury", font: "Playfair Display", color: "#c5a880" },
  { id: "modern-minimal", label: "Modern Minimal", font: "Plus Jakarta", color: "#10b981" },
  { id: "coastal-resort", label: "Coastal Resort", font: "Outfit", color: "#f97316" },
  { id: "boutique-haven", label: "Boutique Haven", font: "Playfair Display", color: "#c2410c" },
] as const;

export function Header({ hotel, activeTheme, onThemeChange, onOpenBooking }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Monogram & Name */}
        <a href="#hero" className="flex items-center gap-3 group">
          <div
            className="size-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm transition-transform group-hover:scale-105"
            style={{ backgroundColor: hotel.builderConfig.brand.primaryColor }}
          >
            {hotel.name.charAt(0)}
          </div>
          <div>
            <span
              className="text-lg sm:text-xl font-bold tracking-tight block font-heading"
              style={{ color: hotel.builderConfig.brand.primaryColor }}
            >
              {hotel.name}
            </span>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-slate-400 block">
              {hotel.city}, {hotel.country}
            </span>
          </div>
        </a>

        {/* Desktop Nav Items */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#rooms" className="hover:text-slate-900 transition-colors">
            Suites & Villas
          </a>
          <a href="#amenities" className="hover:text-slate-900 transition-colors">
            Amenities
          </a>
          <a href="#gallery" className="hover:text-slate-900 transition-colors">
            Gallery
          </a>
          <a href="#story" className="hover:text-slate-900 transition-colors">
            Our Story
          </a>
          <a href="#reviews" className="hover:text-slate-900 transition-colors">
            Guest Reviews
          </a>
          <a href="#location" className="hover:text-slate-900 transition-colors">
            Location
          </a>
        </nav>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Switcher Preview Button */}
          {onThemeChange && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700"
                title="Preview this hotel site in different themes"
              >
                <Palette className="size-3.5 text-indigo-600" />
                <span className="capitalize">{activeTheme.replace("-", " ")}</span>
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-slate-100 p-2 z-50">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Interactive Theme Switcher
                  </div>
                  {THEME_OPTIONS.map((theme) => {
                    const isSelected = activeTheme === theme.id;
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => {
                          onThemeChange(theme.id);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                          isSelected
                            ? "bg-slate-100 text-slate-900 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: theme.color }}
                          />
                          <span>{theme.label}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 text-slate-900" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick Call */}
          <a
            href={`tel:${hotel.contactPhone}`}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Phone className="size-3.5 text-slate-400" />
            <span>{hotel.contactPhone}</span>
          </a>

          {/* Direct Booking CTA */}
          <button
            type="button"
            onClick={onOpenBooking}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 flex items-center gap-2"
            style={{ backgroundColor: hotel.builderConfig.brand.accentColor }}
          >
            <Sparkles className="size-4" />
            <span>Book Now</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1 text-sm font-medium text-slate-700">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="py-2 px-3 rounded-md hover:bg-slate-50 text-left"
            >
              Suites & Villas
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("amenities")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="py-2 px-3 rounded-md hover:bg-slate-50 text-left"
            >
              Amenities & Experiences
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="py-2 px-3 rounded-md hover:bg-slate-50 text-left"
            >
              Photo Gallery
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("story")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="py-2 px-3 rounded-md hover:bg-slate-50 text-left"
            >
              Our Story & Heritage
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="py-2 px-3 rounded-md hover:bg-slate-50 text-left"
            >
              Guest Reviews
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                document.getElementById("location")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="py-2 px-3 rounded-md hover:bg-slate-50 text-left"
            >
              Location & Directions
            </button>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <a
              href={`tel:${hotel.contactPhone}`}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 py-1"
            >
              <Phone className="size-4 text-slate-400" />
              <span>{hotel.contactPhone}</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full py-3 rounded-lg text-sm font-semibold text-white text-center shadow-sm"
              style={{ backgroundColor: hotel.builderConfig.brand.accentColor }}
            >
              Check Availability & Book Direct
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
