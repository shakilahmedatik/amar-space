"use client";

import { useState } from "react";
import type { HotelGalleryItem } from "../types/hotel-website";

interface GallerySectionProps {
  gallery: HotelGalleryItem[];
  accentColor: string;
}

export function GallerySection({ gallery, accentColor }: GallerySectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredGallery = gallery.filter((item) => {
    if (activeCategory === "all") return true;
    return item.category === activeCategory;
  });

  return (
    <section id="gallery" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 inline-block"
          style={{ color: accentColor }}
        >
          Visual Odyssey
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-heading">
          Moments of Serenity & Grandeur
        </h2>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          Explore the architecture, coastal views, private villas, and dining settings of our resort
          sanctuary.
        </p>

        {/* Category Tabs */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "all", label: "All Photos" },
            { id: "grounds", label: "Grounds & Beach" },
            { id: "rooms", label: "Suites & Villas" },
            { id: "wellness", label: "Ananda Spa" },
            { id: "dining", label: "Gourmet Dining" },
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
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

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGallery.map((item) => (
          <div
            key={item.id}
            className="group relative h-72 sm:h-80 rounded-2xl overflow-hidden bg-slate-100 shadow-xs hover:shadow-xl transition-all duration-300"
          >
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-108"
              style={{ backgroundImage: `url(${item.url})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
              <p className="text-white text-sm font-semibold leading-snug drop-shadow-sm">
                {item.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
