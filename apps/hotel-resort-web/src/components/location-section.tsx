"use client";

import { Clock, Compass, Mail, MapPin, Navigation, Phone, Plane } from "lucide-react";
import type { HotelWebsiteData } from "../types/hotel-website";

interface LocationSectionProps {
  hotel: HotelWebsiteData;
  accentColor: string;
}

export function LocationSection({ hotel, accentColor }: LocationSectionProps) {
  return (
    <section id="location" className="py-20 bg-slate-100/60 border-t border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white shadow-2xs inline-block"
            style={{ color: accentColor }}
          >
            Coastal Destination
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-heading">
            Getting to Our Seaside Haven
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Positioned along the scenic Marine Drive overlooking the Bay of Bengal, we offer
            complimentary private airport transfers for all direct suite bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Card 1: Address & Contact */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-xl font-bold text-slate-900 font-heading">Resort Location</h3>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <MapPin className="size-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">{hotel.name}</p>
                  <p className="text-slate-500">{hotel.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="size-5 text-slate-400 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Check-In: </span>
                  <span>{hotel.checkInTime}</span>
                  <span className="mx-2">•</span>
                  <span className="font-semibold text-slate-900">Check-Out: </span>
                  <span>{hotel.checkOutTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="size-5 text-slate-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">24/7 Concierge Desk</p>
                  <a href={`tel:${hotel.contactPhone}`} className="text-indigo-600 hover:underline">
                    {hotel.contactPhone}
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="size-5 text-slate-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900">Guest Inquiries</p>
                  <a
                    href={`mailto:${hotel.contactEmail}`}
                    className="text-indigo-600 hover:underline"
                  >
                    {hotel.contactEmail}
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(hotel.address)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <Navigation className="size-4" />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </div>

          {/* Card 2: Nearby Landmarks & Distances */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-xl font-bold text-slate-900 font-heading">Nearby Landmarks</h3>

            <div className="space-y-4">
              {hotel.landmarks.map((landmark, i) => (
                <div
                  key={`landmark-${i}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {landmark.type === "airport" ? (
                      <Plane className="size-4 text-indigo-600" />
                    ) : (
                      <Compass className="size-4 text-emerald-600" />
                    )}
                    <span className="font-semibold text-slate-900">{landmark.name}</span>
                  </div>
                  <span className="text-slate-500 font-medium">{landmark.distance}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
              <span className="font-semibold">Complimentary Airport Chauffeur:</span> Our resort
              chauffeur meets you at CXB Domestic Airport arrivals gate with cold towels and
              tropical juices.
            </div>
          </div>

          {/* Card 3: Visual Map Preview */}
          <div className="relative h-80 lg:h-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs min-h-[300px]">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1000&q=80')",
              }}
            />
            <div className="absolute inset-0 bg-slate-950/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900/40 backdrop-blur-2xs">
              <div
                className="size-12 rounded-full flex items-center justify-center mb-3 shadow-lg"
                style={{ backgroundColor: accentColor }}
              >
                <MapPin className="size-6 text-white" />
              </div>
              <h4 className="font-bold text-lg font-heading">{hotel.name}</h4>
              <p className="text-xs text-white/80 mt-1 max-w-xs">{hotel.address}</p>
              <span className="mt-4 px-3 py-1 rounded-full bg-white/20 text-[11px] font-semibold backdrop-blur-md">
                Direct Marine Drive Access
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
