"use client";

import { useLanguage } from "@omniheaven/ui";
import { motion, useScroll, useSpring } from "framer-motion";
import { Compass, Headphones } from "lucide-react";
import { useEffect, useState } from "react";

interface ScrollAffixProps {
  onOpenDrawer: () => void;
  onStartTour: () => void;
}

const SECTION_IDS = ["hero", "cockpit", "features", "calculator", "sovereignty", "faq"] as const;

export function ScrollAffix({ onOpenDrawer, onStartTour }: ScrollAffixProps) {
  const { t } = useLanguage();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [activeSection, setActiveSection] = useState("hero");

  const sections = [
    { id: "hero", label: t("nav.overview", "Overview") },
    { id: "cockpit", label: t("nav.liveConsole", "Live Cockpit") },
    { id: "features", label: t("nav.modules", "Modules") },
    { id: "calculator", label: t("nav.calculator", "ROI Engine") },
    { id: "sovereignty", label: t("nav.sovereignty", "Sovereign Cloud") },
    { id: "faq", label: t("nav.advisory", "Advisory") },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 250;
      for (const sectionId of SECTION_IDS) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 1. TOP SCROLL PROGRESS BAR */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C5A880] via-[#E5C378] to-[#9E7D47] origin-left z-50 pointer-events-none"
        style={{ scaleX }}
      />

      {/* 2. FLOATING BREADCRUMB AFFIX (Desktop Only) */}
      <div className="fixed top-24 right-6 z-30 hidden xl:flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="p-2 rounded-2xl bg-[hsl(var(--surface-elevated))]/80 backdrop-blur-md border border-[hsl(var(--border-gold))]/40 shadow-sm flex flex-col gap-1 text-[11px] font-semibold">
          {sections.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
                  isActive
                    ? "bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] font-bold shadow-2xs"
                    : "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isActive ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"
                  }`}
                />
                <span>{s.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* 3. STICKY BOTTOM DOCK (Concierge & Interactive Tour Trigger) */}
      <div className="fixed bottom-6 left-6 z-40 flex items-center gap-3">
        {/* Interactive Tour Button */}
        <button
          type="button"
          onClick={onStartTour}
          className="px-4 py-2.5 rounded-2xl bg-[hsl(var(--surface-elevated))]/95 backdrop-blur-xl border border-[hsl(var(--border-gold))]/60 text-xs font-bold text-[hsl(var(--foreground))] shadow-luxury hover:bg-[hsl(var(--surface))] transition-all flex items-center gap-2 active:scale-95 cursor-pointer group"
        >
          <Compass className="size-4 text-[hsl(var(--primary))] group-hover:rotate-45 transition-transform" />
          <span className="hidden sm:inline">{t("affix.tour", "Start Interactive Tour")}</span>
          <span className="sm:hidden">{t("nav.tour", "Tour")}</span>
        </button>

        {/* Floating Concierge Drawer Button */}
        <button
          type="button"
          onClick={onOpenDrawer}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#C5A880] to-[#E5C378] text-[#1F1714] text-xs font-bold shadow-gold-glow hover:brightness-105 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
        >
          <Headphones className="size-4 text-[#1F1714]" />
          <span className="hidden sm:inline">{t("affix.concierge", "Concierge Desk")}</span>
          <span className="sm:hidden">{t("nav.concierge", "Concierge")}</span>
        </button>
      </div>
    </>
  );
}
