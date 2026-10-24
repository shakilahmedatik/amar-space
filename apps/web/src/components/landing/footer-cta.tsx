"use client";

import { useLanguage } from "@omniheaven/ui";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";

export function FooterCta() {
  const { t } = useLanguage();
  const [propertyName, setPropertyName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = propertyName ? `?property=${encodeURIComponent(propertyName)}` : "";
    window.location.href = `http://localhost:3000${query}`;
  };

  return (
    <section className="relative py-24 bg-gradient-to-br from-[#332418] via-[#2A1D15] to-[#1F1714] text-white border-t border-[#D8C29D]/40 overflow-hidden text-center">
      {/* Ambient Radial Backlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-[#C5A880]/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-7">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C5A880]/15 text-[#E5C378] border border-[#C5A880]/30 text-xs font-semibold">
          <Sparkles className="size-3.5 text-[#E5C378]" />
          <span>{t("cta.badge", "Inaugural Royal Heritage Pass • 180 Days Complimentary")}</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
          {t("cta.title", "Ready to Elevate Your Estate to 5-Star Digital Precision?")}
        </h2>

        <p className="text-sm sm:text-base md:text-lg text-[#EADBCE]/85 max-w-2xl mx-auto leading-relaxed">
          {t(
            "cta.subtitle",
            "Join visionary hoteliers, luxury resorts, and high-yield residential estates across Bangladesh. Provision your sovereign administrative workspace in 3 minutes.",
          )}
        </p>

        {/* Quick Provisioning Form */}
        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto flex flex-col sm:flex-row items-center gap-3 bg-[hsl(var(--surface-elevated))]/10 p-2 rounded-2xl border border-[#D8C29D]/40 backdrop-blur-md shadow-luxury"
        >
          <input
            type="text"
            value={propertyName}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder={t("cta.inputPlaceholder", "Enter hotel or property name...")}
            className="w-full px-4 py-3.5 rounded-xl bg-transparent text-white placeholder:text-[#EADBCE]/50 text-xs focus:outline-none"
          />
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] via-[#E5C378] to-[#C5A880] text-[#1F1714] font-bold text-xs shadow-gold-glow hover:brightness-105 active:scale-95 transition-all whitespace-nowrap flex items-center justify-center gap-2"
          >
            <span>{t("cta.submit", "Claim 6 Months Free")}</span>
            <ArrowRight className="size-3.5" />
          </button>
        </form>

        {/* Trust Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#EADBCE]/80 font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-400" />
            {t("cta.trustNoCard", "No credit card required")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-400" />
            {t("cta.trustNoFees", "Zero transaction fees")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-400" />
            {t("cta.trustPortability", "Full data portability")}
          </span>
        </div>
      </div>
    </section>
  );
}
