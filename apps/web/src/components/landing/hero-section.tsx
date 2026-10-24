"use client";

import { useLanguage } from "@omniheaven/ui";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, CheckCircle2, Compass, Headphones, Sparkles } from "lucide-react";
import { useRef } from "react";
import { ProductCockpit } from "./product-cockpit";

const luxuryEase = [0.16, 1, 0.3, 1] as const;

interface HeroSectionProps {
  onStartTour: () => void;
  onOpenDrawer: () => void;
}

export function HeroSection({ onStartTour, onOpenDrawer }: HeroSectionProps) {
  const { t, isBangla } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Parallax transform values
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const badgeY = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);

  return (
    <section id="hero" ref={containerRef} className="relative pt-16 sm:pt-24 pb-20 overflow-hidden">
      {/* Parallax Ambient Champagne Mesh Glows */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-[#C5A880]/15 via-amber-500/10 to-[#C5A880]/5 blur-[140px] rounded-full pointer-events-none -z-10"
      />

      <div className="max-w-5xl mx-auto px-4 text-center space-y-8 relative z-10">
        {/* Top Floating Pill with Parallax */}
        <motion.div
          style={{ y: badgeY }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: luxuryEase }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--primary))]/10 border border-[hsl(var(--border-gold))]/40 text-xs font-semibold text-[hsl(var(--primary))] shadow-2xs"
        >
          <Sparkles className="size-3.5 text-[hsl(var(--primary))]" />
          <span>{t("hero.badge")}</span>
        </motion.div>

        {/* Editorial Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: luxuryEase }}
          className={`text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-[1.15] ${
            isBangla ? "font-bangla" : "font-serif"
          }`}
        >
          {t("hero.title")}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: luxuryEase }}
          className={`text-base sm:text-lg md:text-xl text-[hsl(var(--foreground-muted))] max-w-3xl mx-auto leading-relaxed ${
            isBangla ? "font-bangla" : "font-sans"
          }`}
        >
          {t("hero.subtitle")}
        </motion.p>

        {/* Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: luxuryEase }}
          className="pt-2 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="http://localhost:3000"
            className="px-8 py-4 rounded-xl text-sm font-bold text-[#1F1714] bg-gradient-to-r from-[#C5A880] via-[#E5C378] to-[#C5A880] hover:brightness-105 shadow-md border border-[#D8C29D] transition-all active:scale-95 flex items-center gap-2 group cursor-pointer"
          >
            <span>{t("hero.ctaPrimary")}</span>
            <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <button
            type="button"
            onClick={onStartTour}
            className="px-6 py-4 rounded-xl text-sm font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border-gold))]/40 hover:bg-[hsl(var(--surface))] hover:border-[hsl(var(--border-gold))] transition-all flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
          >
            <Compass className="size-4 text-[hsl(var(--primary))]" />
            <span>{t("hero.ctaTour")}</span>
          </button>

          <button
            type="button"
            onClick={onOpenDrawer}
            className="px-5 py-4 rounded-xl text-sm font-bold text-[hsl(var(--foreground-secondary))] bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] transition-all flex items-center gap-2 shadow-2xs active:scale-95 cursor-pointer"
          >
            <Headphones className="size-4 text-[hsl(var(--primary))]" />
            <span>{t("hero.ctaConcierge")}</span>
          </button>
        </motion.div>

        {/* Guarantee Trust Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32, ease: luxuryEase }}
          className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[hsl(var(--foreground-muted))] font-medium"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-[hsl(var(--primary))]" />
            {t("hero.trustNoCard")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-[hsl(var(--primary))]" />
            {t("hero.trustBkash")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-[hsl(var(--primary))]" />
            {t("hero.trustStaff")}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-[hsl(var(--primary))]" />
            {t("hero.trustPrivacy")}
          </span>
        </motion.div>
      </div>

      {/* Floating 2.5D Cockpit Sandbox */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: luxuryEase }}
        className="mt-14"
      >
        <ProductCockpit />
      </motion.div>
    </section>
  );
}
