import { Mail, MapPin, Phone, Sparkles } from "lucide-react";
import type { HotelWebsiteData } from "../types/hotel-website";

interface FooterProps {
  hotel: HotelWebsiteData;
}

export function Footer({ hotel }: FooterProps) {
  return (
    <footer className="bg-[#1a1412] text-white/70 text-xs border-t border-border-gold/30 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div
                className="size-9 rounded-full flex items-center justify-center font-serif font-bold text-white text-sm"
                style={{ backgroundColor: hotel.builderConfig.brand.accentColor }}
              >
                {hotel.name.charAt(0)}
              </div>
              <span className="text-lg font-serif font-bold text-white">{hotel.name}</span>
            </div>
            <p className="text-white/70 text-xs leading-relaxed max-w-sm">{hotel.tagline}</p>
            <div className="flex items-center gap-2 text-[11px] text-white/50">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span>{hotel.address}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] font-serif">
              Explore Resort
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#rooms" className="hover:text-primary transition-colors">
                  Suites & Private Villas
                </a>
              </li>
              <li>
                <a href="#amenities" className="hover:text-primary transition-colors">
                  Holistic Ayurvedic Spa
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-primary transition-colors">
                  Photo Gallery
                </a>
              </li>
              <li>
                <a href="#story" className="hover:text-primary transition-colors">
                  Heritage & Philosophy
                </a>
              </li>
              <li>
                <a href="#location" className="hover:text-primary transition-colors">
                  Location & Transfers
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Reservations Desk */}
          <div className="space-y-3">
            <h4 className="font-semibold text-white uppercase tracking-wider text-[11px] font-serif">
              Direct Reservations
            </h4>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Phone className="size-3.5 text-primary" />
                <a
                  href={`tel:${hotel.contactPhone}`}
                  className="hover:text-primary transition-colors"
                >
                  {hotel.contactPhone}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="size-3.5 text-primary" />
                <a
                  href={`mailto:${hotel.contactEmail}`}
                  className="hover:text-primary transition-colors"
                >
                  {hotel.contactEmail}
                </a>
              </p>
              <div className="pt-2 text-[10px] text-white/50 leading-normal">
                Check-in: {hotel.checkInTime} • Check-out: {hotel.checkOutTime}
                <br />
                {hotel.cancellationPolicy}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar & Omni Heaven Branding */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/50">
          <p>
            © {new Date().getFullYear()} {hotel.name}. All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a
              href="https://omniheaven.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-white/90 hover:text-white transition-colors bg-white/5 px-2.5 py-1 rounded-xl border border-white/10"
            >
              <Sparkles className="size-3 text-primary" />
              <span className="font-serif">omniHeaven</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
