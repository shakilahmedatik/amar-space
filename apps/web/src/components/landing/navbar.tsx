"use client";

import { LanguageToggle, ThemeToggle, useLanguage } from "@omniheaven/ui";
import { ArrowRight, Compass, Headphones } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface NavbarProps {
  onOpenDrawer: () => void;
  onStartTour: () => void;
}

export function Navbar({ onOpenDrawer, onStartTour }: NavbarProps) {
  const { t, isBangla } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <aside className="relative z-50 bg-[#332418] text-[#FBF8F3] border-b border-[#D8C29D]/40 py-2 px-4 text-xs font-medium tracking-wide">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#C5A880]/20 text-[#E5C378] border border-[#C5A880]/40 text-[10px] uppercase font-bold tracking-wider">
              {t("banner.inaugural")}
            </span>
            <span className="text-[#EADBCE]">{t("banner.offer")}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hidden md:inline-flex items-center gap-1.5 text-[#C5A880]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t("banner.gateway")}
            </span>
            <a
              href="#calculator"
              className="text-[#E5C378] hover:text-white underline decoration-[#D8C29D]/60 hover:decoration-white transition-colors font-semibold"
            >
              {t("banner.calc")}
            </a>
          </div>
        </div>
      </aside>

      {/* 2. STICKY GLASS NAVIGATION BAR */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl transition-all duration-300 border-b ${
          isScrolled
            ? "bg-[hsl(var(--surface))]/90 border-[hsl(var(--border-gold))]/40 shadow-sm py-3"
            : "bg-[hsl(var(--surface))]/75 border-[hsl(var(--border))]/70 py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="size-10 rounded-xl bg-gradient-to-br from-[#C5A880] to-[#9E7D47] text-[#1F1714] flex items-center justify-center font-serif font-bold text-lg shadow-sm border border-[#D8C29D]/60 group-hover:scale-105 transition-transform">
              OH
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-serif font-bold tracking-tight text-[hsl(var(--foreground))]">
                  omniHeaven
                </span>
                <span className="text-[9px] uppercase tracking-wider font-mono font-bold px-1.5 py-0.5 rounded bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--border-gold))]/40">
                  OS v4.8
                </span>
              </div>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[hsl(var(--primary))] block">
                {isBangla ? "লাক্সারি হসপিটালিটি ও এস্টেট ওএস" : "Luxury Hospitality & Estate System"}
              </span>
            </div>
          </Link>

          {/* Navigation Anchors */}
          <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold text-[hsl(var(--foreground-muted))]">
            <a
              href="#cockpit"
              className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1"
            >
              <span>{t("nav.liveConsole")}</span>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </a>
            <a href="#features" className="hover:text-[hsl(var(--primary))] transition-colors">
              {t("nav.modules")}
            </a>
            <a href="#calculator" className="hover:text-[hsl(var(--primary))] transition-colors">
              {t("nav.calculator")}
            </a>
            <a href="#sovereignty" className="hover:text-[hsl(var(--primary))] transition-colors">
              {t("nav.sovereignty")}
            </a>
            <button
              type="button"
              onClick={onStartTour}
              className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Compass className="size-3.5 text-[hsl(var(--primary))]" />
              <span>{t("nav.tour")}</span>
            </button>
            <button
              type="button"
              onClick={onOpenDrawer}
              className="hover:text-[hsl(var(--primary))] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Headphones className="size-3.5 text-[hsl(var(--primary))]" />
              <span>{t("nav.concierge")}</span>
            </button>
          </nav>

          {/* Right Action CTAs + Global Switchers */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Global Language Toggle */}
            <LanguageToggle variant="pill" />

            {/* Global Theme Toggle (Light / Dark) */}
            <ThemeToggle variant="icon" />

            {/* Manager Sign In */}
            <a
              href="http://localhost:3000"
              className="hidden lg:inline-flex text-xs font-bold text-[hsl(var(--foreground-secondary))] hover:text-[hsl(var(--foreground))] px-3 py-2 rounded-xl hover:bg-[hsl(var(--surface-elevated))] border border-transparent hover:border-[hsl(var(--border))] transition-all"
            >
              {t("nav.signIn")}
            </a>

            {/* Free Trial CTA */}
            <a
              href="http://localhost:3000"
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-[#1F1714] bg-gradient-to-r from-[#C5A880] via-[#E5C378] to-[#C5A880] hover:brightness-105 shadow-sm border border-[#D8C29D] transition-all flex items-center gap-1.5 active:scale-95 group whitespace-nowrap"
            >
              <span>{t("nav.trialBtn")}</span>
              <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </header>
    </>
  );
}
