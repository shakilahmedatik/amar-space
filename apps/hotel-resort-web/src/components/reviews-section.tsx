"use client";

import { CheckCircle2, Quote, Star } from "lucide-react";
import type { HotelReviewItem } from "../types/hotel-website";

interface ReviewsSectionProps {
  reviews: HotelReviewItem[];
  rating: number;
  reviewCount: number;
  accentColor: string;
}

export function ReviewsSection({ reviews, rating, reviewCount, accentColor }: ReviewsSectionProps) {
  return (
    <section id="reviews" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="space-y-3 max-w-2xl">
          <span
            className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 inline-block"
            style={{ color: accentColor }}
          >
            Guest Impressions
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight font-heading">
            Cherished by Discerning Travelers
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Read verified direct guest reviews from couples, families, and solo voyagers who made
            Grand Haven their private sanctuary.
          </p>
        </div>

        {/* Global Rating Scorecard */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex items-center gap-4 shrink-0 shadow-2xs">
          <div
            className="size-14 rounded-xl flex items-center justify-center font-extrabold text-2xl text-white shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            {rating.toFixed(1)}
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-500 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={`rating-star-${i}`} className="size-4 fill-current" />
              ))}
            </div>
            <p className="text-xs font-bold text-slate-900">Exceptional Overall Score</p>
            <p className="text-[11px] text-slate-400">
              Based on {reviewCount} verified guest reviews
            </p>
          </div>
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Star Rating & Quote */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={`rev-star-${i}`} className="size-3.5 fill-current" />
                  ))}
                </div>
                <Quote className="size-6 text-slate-200" />
              </div>

              {/* Review Text */}
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>

            {/* Guest Meta */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  {rev.guestName}
                  <CheckCircle2 className="size-3 text-emerald-600 inline" />
                </p>
                <p className="text-[11px] text-slate-400">
                  {rev.location} • Stayed in {rev.roomName}
                </p>
              </div>
              <span className="text-[10px] text-slate-400">{rev.date}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
