import { Mail, MapPin, Phone, Sparkles } from "lucide-react";
import type { HotelWebsiteData } from "../types/hotel-website";

interface FooterProps {
  hotel: HotelWebsiteData;
}

export function Footer({ hotel }: FooterProps) {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div
                className="size-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: hotel.builderConfig.brand.accentColor }}
              >
                {hotel.name.charAt(0)}
              </div>
              <span className="text-lg font-bold text-white font-heading">{hotel.name}</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">{hotel.tagline}</p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <MapPin className="size-3.5 text-slate-400 shrink-0" />
              <span>{hotel.address}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Explore Resort
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#rooms" className="hover:text-white transition-colors">
                  Suites & Private Villas
                </a>
              </li>
              <li>
                <a href="#amenities" className="hover:text-white transition-colors">
                  Holistic Ayurvedic Spa
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-white transition-colors">
                  Photo Gallery
                </a>
              </li>
              <li>
                <a href="#story" className="hover:text-white transition-colors">
                  Heritage & Philosophy
                </a>
              </li>
              <li>
                <a href="#location" className="hover:text-white transition-colors">
                  Location & Transfers
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Reservations Desk */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">
              Direct Reservations
            </h4>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Phone className="size-3.5 text-slate-400" />
                <a
                  href={`tel:${hotel.contactPhone}`}
                  className="hover:text-white transition-colors"
                >
                  {hotel.contactPhone}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-3.5 text-slate-400" />
                <a
                  href={`mailto:${hotel.contactEmail}`}
                  className="hover:text-white transition-colors"
                >
                  {hotel.contactEmail}
                </a>
              </p>
              <div className="pt-2 text-[10px] text-slate-500 leading-normal">
                Check-in: {hotel.checkInTime} • Check-out: {hotel.checkOutTime}
                <br />
                {hotel.cancellationPolicy}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar & Omni Heaven Branding */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>
            © {new Date().getFullYear()} {hotel.name}. All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a
              href="https://omniheaven.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-slate-300 hover:text-white transition-colors bg-white/5 px-2.5 py-1 rounded-md border border-white/10"
            >
              <Sparkles className="size-3 text-amber-400" />
              <span>Omni Heaven</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
