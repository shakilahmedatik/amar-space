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
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 text-primary border border-border-gold/30 inline-block">
            Guest Impressions
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-foreground tracking-tight">
            Cherished by Discerning Travelers
          </h2>
          <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-normal">
            Read verified direct guest reviews from couples, families, and solo voyagers who made
            Grand Haven their private sanctuary.
          </p>
        </div>

        {/* Global Rating Scorecard */}
        <div className="bg-card border border-border-gold/30 rounded-2xl p-5 flex items-center gap-4 shrink-0 shadow-xs">
          <div
            className="size-14 rounded-xl flex items-center justify-center font-serif font-extrabold text-2xl text-white shadow-xs"
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
            <p className="text-xs font-serif font-bold text-foreground">
              Exceptional Overall Score
            </p>
            <p className="text-[11px] text-foreground-muted">
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
            className="bg-card rounded-2xl p-6 border border-border-gold/30 shadow-xs hover:border-border-gold/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Star Rating & Quote */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={`rev-star-${i}`} className="size-3.5 fill-current" />
                  ))}
                </div>
                <Quote className="size-6 text-border-gold/40" />
              </div>

              {/* Review Text */}
              <p className="text-xs sm:text-sm text-foreground leading-relaxed italic font-serif">
                &ldquo;{rev.comment}&rdquo;
              </p>
            </div>

            {/* Guest Meta */}
            <div className="mt-6 pt-4 border-t border-border-gold/20 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-foreground flex items-center gap-1">
                  {rev.guestName}
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 inline" />
                </p>
                <p className="text-[11px] text-foreground-muted">
                  {rev.location} • Stayed in {rev.roomName}
                </p>
              </div>
              <span className="text-[10px] text-foreground-muted font-mono">{rev.date}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
