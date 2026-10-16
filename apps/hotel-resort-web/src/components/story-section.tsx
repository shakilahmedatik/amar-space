"use client";

import type { HotelWebsiteData } from "../types/hotel-website";

interface StorySectionProps {
  story: HotelWebsiteData["story"];
  accentColor: string;
}

export function StorySection({ story, accentColor }: StorySectionProps) {
  return (
    <section id="story" className="py-24 bg-slate-900 text-white overflow-hidden relative">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Text Column */}
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-amber-300 inline-block border border-white/10">
              {story.badge}
            </span>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight font-heading">
              {story.headline}
            </h2>

            <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed font-light">
              {story.paragraphs.map((p, i) => (
                <p key={`p-${i}`}>{p}</p>
              ))}
            </div>

            {/* Stat Counters Grid */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-white/10">
              {story.stats.map((stat, i) => (
                <div key={`stat-${i}`} className="space-y-1">
                  <span
                    className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading block"
                    style={{ color: accentColor }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual Image Column */}
          <div className="relative">
            <div className="relative h-[480px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-1000 hover:scale-105"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80')",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
                <p className="text-xs text-white/90 font-medium italic">
                  &ldquo;A sanctuary where Bengal&apos;s natural coastal splendor is paired with
                  uncompromised five-star architectural elegance.&rdquo;
                </p>
                <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mt-1">
                  — Architectural Digest Hospitality Review
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
