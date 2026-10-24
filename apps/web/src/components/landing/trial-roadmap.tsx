"use client";

import { useLanguage } from "@omniheaven/ui";
import { CheckCircle2, Sparkles } from "lucide-react";

export function TrialRoadmap() {
  const { t } = useLanguage();

  const steps = [
    {
      step: "01",
      phase: t("roadmap.s1Phase", "Provisioning"),
      title: t("roadmap.s1Title", "Instant 3-Minute Setup"),
      description: t(
        "roadmap.s1Desc",
        "Name your property, reserve your custom subdomain, and immediately unlock your administrative dashboard. Zero credit card or paperwork required.",
      ),
      highlight: t("roadmap.s1Highlight", "Zero Upfront Cost"),
    },
    {
      step: "02",
      phase: t("roadmap.s2Phase", "Operation"),
      title: t("roadmap.s2Title", "180 Days Full Pro Access"),
      description: t(
        "roadmap.s2Desc",
        "Every module is active: Boutique Web Builder, Renter Portal, direct bookings, multi-staff governance, and automated bKash reconciliation.",
      ),
      highlight: t("roadmap.s2Highlight", "Unlimited Transactions"),
    },
    {
      step: "03",
      phase: t("roadmap.s3Phase", "Evaluation"),
      title: t("roadmap.s3Title", "Decide with Zero Lock-In"),
      description: t(
        "roadmap.s3Desc",
        "After 6 months, seamlessly continue on our transparent monthly subscription or export your complete forensic SQL database anytime.",
      ),
      highlight: t("roadmap.s3Highlight", "Full Data Portability"),
    },
  ];

  return (
    <section
      id="guarantee"
      className="py-24 bg-[hsl(var(--surface))]/40 border-t border-[hsl(var(--border))]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--primary))] flex items-center justify-center gap-1.5">
            <Sparkles className="size-3.5 text-[hsl(var(--primary))]" />
            <span>{t("roadmap.tag", "Zero-Risk Sovereign Guarantee")}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-[hsl(var(--foreground))] font-bold tracking-tight">
            {t("roadmap.title", "Why We Provide 6 Months 100% Free")}
          </h2>
          <p className="text-sm sm:text-base text-[hsl(var(--foreground-muted))] leading-relaxed">
            {t(
              "roadmap.subtitle",
              "We understand property owners and hoteliers hesitate to adopt new software because of cumbersome onboarding and upfront lock-ins. We are confident omniHeaven will streamline your operations and maximize your occupancy that you pay nothing for 180 days.",
            )}
          </p>
        </div>

        {/* 3-Step Stepped Progress Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="bg-[hsl(var(--surface-elevated))] rounded-3xl p-7 border border-[hsl(var(--border-gold))]/40 shadow-xs hover:shadow-luxury transition-all duration-300 flex flex-col justify-between space-y-6 group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-serif text-3xl font-bold text-[hsl(var(--primary))]">
                    {s.step}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--border-gold))]/40">
                    {s.phase}
                  </span>
                </div>
                <h4 className="font-serif text-xl font-bold text-[hsl(var(--foreground))] mb-2">
                  {s.title}
                </h4>
                <p className="text-xs sm:text-sm text-[hsl(var(--foreground-muted))] leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--primary))] flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>{s.highlight}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
