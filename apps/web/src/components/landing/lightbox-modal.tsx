"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Globe, Sparkles, X } from "lucide-react";
import { useEffect } from "react";

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  theme: "champagne" | "emerald" | "obsidian";
}

const luxuryEase = [0.16, 1, 0.3, 1] as const;

export function LightboxModal({ isOpen, onClose, title, subtitle, theme }: LightboxModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
          />

          {/* Centered Modal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.35, ease: luxuryEase }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[hsl(var(--surface-elevated))] rounded-3xl border border-[hsl(var(--border-gold))]/60 shadow-2xl overflow-hidden flex flex-col z-10"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--surface))]">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-xl bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                  <Sparkles className="size-4" />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[hsl(var(--foreground))]">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-[11px] text-[hsl(var(--foreground-muted))]">{subtitle}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="http://localhost:3003"
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[hsl(var(--surface-elevated))] hover:bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] transition-colors"
                >
                  <Globe className="size-3.5 text-[hsl(var(--primary))]" />
                  <span>Open Live Demo Engine</span>
                  <ExternalLink className="size-3 opacity-60" />
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="size-8 rounded-xl bg-[hsl(var(--surface-elevated))] hover:bg-[hsl(var(--surface))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Modal Interactive Content Stage */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Theme Mockup Viewport */}
              <div
                className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 shadow-md ${
                  theme === "champagne"
                    ? "bg-[#FAF6F0] border-[#D8C29D] text-[#2A201C]"
                    : theme === "emerald"
                      ? "bg-[#F0FDF4] border-emerald-300 text-emerald-950"
                      : "bg-[#14110F] border-[#382D26] text-[#FBF8F3]"
                }`}
              >
                {/* Simulated Boutique Website Header */}
                <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-current/10 flex items-center justify-center font-serif font-bold text-xs">
                      OH
                    </div>
                    <span className="font-serif font-bold text-sm tracking-wide">
                      THE GRAND HERITAGE SANCTUARY
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium opacity-80">
                    <span className="hover:opacity-100 cursor-pointer">Suites</span>
                    <span className="hover:opacity-100 cursor-pointer">Dining</span>
                    <span className="hover:opacity-100 cursor-pointer">Experiences</span>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg bg-current/15 text-xs font-bold hover:bg-current/25 transition-colors"
                    >
                      Reserve Villa
                    </button>
                  </div>
                </div>

                {/* Simulated Hero within Lightbox */}
                <div className="py-10 text-center space-y-4 max-w-xl mx-auto">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full bg-current/10 inline-block">
                    Cox&apos;s Bazar Beachfront Sanctuary
                  </span>
                  <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight">
                    Where Undisturbed Serenity Meets Royal Refinement
                  </h2>
                  <p className="text-xs sm:text-sm opacity-80 leading-relaxed">
                    Private infinity pools overlooking the Bay of Bengal, 24-hour white-glove butler
                    service, and tailored sommelier tastings.
                  </p>
                </div>

                {/* Simulated Room Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/10 dark:border-white/10">
                  <div className="p-4 rounded-xl bg-current/5 border border-current/10 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">
                      Beachfront Pool Villa
                    </span>
                    <div className="font-serif font-bold text-base">Lotus Reflection Suite</div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ৳120,000 / night • Direct Booking 0% Fee
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-current/5 border border-current/10 space-y-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">
                      Presidential Wing
                    </span>
                    <div className="font-serif font-bold text-base">Château Imperial Haven</div>
                    <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ৳180,000 / night • Direct Booking 0% Fee
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground-muted))]">
                    Typography Pairing
                  </span>
                  <h5 className="font-bold text-[hsl(var(--foreground))]">
                    Playfair Display + Plus Jakarta Sans
                  </h5>
                  <p className="text-[11px] text-[hsl(var(--foreground-muted))]">
                    Hand-crafted editorial serif hierarchy.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground-muted))]">
                    OTA Bypass Engine
                  </span>
                  <h5 className="font-bold text-emerald-600">Zero OTA Commission</h5>
                  <p className="text-[11px] text-[hsl(var(--foreground-muted))]">
                    Instant bKash, Nagad &amp; card tokenization.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground-muted))]">
                    Subdomain Provisioning
                  </span>
                  <h5 className="font-bold text-[hsl(var(--foreground))]">Sub-second SSL</h5>
                  <p className="text-[11px] text-[hsl(var(--foreground-muted))]">
                    Custom domain CNAME or wildcard alias.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--surface))] flex items-center justify-between">
              <span className="text-[11px] text-[hsl(var(--foreground-muted))]">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] font-mono text-[10px]">
                  ESC
                </kbd>{" "}
                to exit lightbox
              </span>
              <a
                href="http://localhost:3000"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#1F1714] bg-gradient-to-r from-[#C5A880] to-[#E5C378] hover:brightness-105 shadow-sm transition-all"
              >
                Provision This Theme (Free 6 Months)
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
