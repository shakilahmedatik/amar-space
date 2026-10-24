"use client";

import { useLanguage } from "@omniheaven/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  FileCheck,
  Globe,
  Hotel,
  Layers,
  Palette,
  Receipt,
  Smartphone,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { LightboxModal } from "./lightbox-modal";
import { useToast } from "./toast-provider";

type BentoEdition = "hotel" | "residential";
type ThemePalette = "champagne" | "emerald" | "obsidian";

const luxuryEase = [0.16, 1, 0.3, 1] as const;

export function BentoFeatures() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [edition, setEdition] = useState<BentoEdition>("hotel");
  const [activePalette, setActivePalette] = useState<ThemePalette>("champagne");

  // Lightbox modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Progressive disclosure states
  const [showBookingSpecs, setShowBookingSpecs] = useState(false);
  const [showLedgerSpecs, setShowLedgerSpecs] = useState(false);

  const handlePaletteChange = (palette: ThemePalette) => {
    setActivePalette(palette);
    const titles = {
      champagne: "Royal Heritage & Champagne",
      emerald: "Coastal Emerald Resort",
      obsidian: "Obsidian Noir Sanctuary",
    };
    showToast({
      title: `Theme Palette Switched: ${titles[palette]}`,
      description: "CSS design tokens and typography hierarchy re-rendered instantly.",
      type: "gold",
    });
  };

  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--primary))]">
          {t("bento.tag", "Unprecedented Architecture")}
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl text-[hsl(var(--foreground))] font-bold mt-3 mb-4 tracking-tight">
          {t("bento.title", "Engineered for Opulent Hospitality & High-Yield Residences")}
        </h2>
        <p className="text-sm sm:text-base text-[hsl(var(--foreground-muted))] leading-relaxed">
          {t(
            "bento.subtitle",
            "Switch seamlessly between commercial guest booking workflows and residential monthly tenancy collections. Everything is unified in one sovereign operating system.",
          )}
        </p>

        {/* Edition Selector Tabs */}
        <div className="inline-flex items-center bg-[hsl(var(--surface))] p-1.5 rounded-2xl border border-[hsl(var(--border))] mt-8 shadow-xs">
          <button
            type="button"
            onClick={() => setEdition("hotel")}
            className="relative px-6 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer z-10"
          >
            {edition === "hotel" && (
              <motion.div
                layoutId="bento-tab-active"
                className="absolute inset-0 bg-[hsl(var(--surface-elevated))] rounded-xl shadow-xs border border-[hsl(var(--border-gold))]/60 -z-10"
                transition={{ duration: 0.25, ease: luxuryEase }}
              />
            )}
            <Hotel
              className={`size-4 ${
                edition === "hotel"
                  ? "text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--foreground-muted))]"
              }`}
            />
            <span
              className={
                edition === "hotel"
                  ? "text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--foreground-muted))]"
              }
            >
              {t("bento.hotelTab", "Hotel & Resort Edition")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEdition("residential")}
            className="relative px-6 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer z-10"
          >
            {edition === "residential" && (
              <motion.div
                layoutId="bento-tab-active"
                className="absolute inset-0 bg-[hsl(var(--surface-elevated))] rounded-xl shadow-xs border border-[hsl(var(--border-gold))]/60 -z-10"
                transition={{ duration: 0.25, ease: luxuryEase }}
              />
            )}
            <Building2
              className={`size-4 ${
                edition === "residential"
                  ? "text-[hsl(var(--primary))]"
                  : "text-[hsl(var(--foreground-muted))]"
              }`}
            />
            <span
              className={
                edition === "residential"
                  ? "text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--foreground-muted))]"
              }
            >
              {t("bento.resTab", "Building & Residential Edition")}
            </span>
          </button>
        </div>
      </div>

      {/* BENTO CONTAINER */}
      <AnimatePresence mode="wait">
        {/* HOTEL & RESORT EDITION BENTO */}
        {edition === "hotel" && (
          <motion.div
            key="hotel-bento"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: luxuryEase }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6"
          >
            {/* Bento Card 1: 0% Direct Booking Engine (Wide 7 cols) */}
            <div className="lg:col-span-7 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 sm:p-8 border border-[hsl(var(--border-gold))]/40 shadow-xs hover:shadow-luxury transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="size-11 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/50">
                    <CreditCard className="size-5" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {t("bento.card1Badge", "0% OTA Commission")}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
                  {t("bento.card1Title", "Bespoke Direct Booking Engine")}
                </h3>
                <p className="text-xs sm:text-sm text-[hsl(var(--foreground-muted))] leading-relaxed mb-6">
                  {t(
                    "bento.card1Desc",
                    "Eliminate 18–25% intermediary commissions from Agoda or Booking.com. Guests book directly on your branded domain with zero friction, real-time villa availability calendar, instant room add-ons, and instant cryptographic PDF check-in vouchers.",
                  )}
                </p>
              </div>

              {/* Interactive Booking Voucher Miniature */}
              <div className="bg-[hsl(var(--surface))] rounded-2xl p-4 sm:p-5 border border-[hsl(var(--border))] relative space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Direct Guest Reservation Engine</span>
                  </div>
                  <span className="text-emerald-700 font-bold">Auto-Settled via bKash</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                      Check-In
                    </span>
                    <strong className="text-[hsl(var(--foreground))]">14 Jun 2025</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                      Selected Villa
                    </span>
                    <strong className="text-[hsl(var(--foreground))]">Lotus Reflection</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                      Commission Saved
                    </span>
                    <strong className="text-emerald-700 font-bold">৳28,500 (100% Retained)</strong>
                  </div>
                </div>

                {/* Progressive Disclosure: Booking Specifications */}
                <div className="pt-2 border-t border-[hsl(var(--border))]">
                  <button
                    type="button"
                    onClick={() => setShowBookingSpecs(!showBookingSpecs)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
                  >
                    <span>
                      {showBookingSpecs
                        ? "Hide Technical Specifications"
                        : "Progressive Disclosure: View Engine Specs"}
                    </span>
                    <ChevronDown
                      className={`size-3.5 transition-transform ${showBookingSpecs ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showBookingSpecs && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="text-[11px] text-[hsl(var(--foreground-muted))] pt-2 space-y-1"
                      >
                        <p>• Multi-Currency settlement: BDT ৳, USD $, EUR € supported natively.</p>
                        <p>• Automated seasonal pricing matrix with weekend dynamic markups.</p>
                        <p>• Webhook integration with front-desk POS and housekeeping logs.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Boutique Website Builder (5 cols) with LIVE PALETTE SWITCHER & LIGHTBOX */}
            <div className="lg:col-span-5 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 sm:p-8 border border-[hsl(var(--border-gold))]/40 shadow-xs hover:shadow-luxury transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="size-11 rounded-2xl bg-[hsl(var(--surface))] text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border))]">
                    <Palette className="size-5" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--primary))] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye className="size-3.5" />
                    <span>{t("bento.openLightbox", "Open Lightbox")}</span>
                  </button>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
                  {t("bento.card2Title", "Boutique Website Builder")}
                </h3>
                <p className="text-xs sm:text-sm text-[hsl(var(--foreground-muted))] leading-relaxed mb-4">
                  {t(
                    "bento.card2Desc",
                    "Launch high-converting, editorially styled websites for your estate in minutes. Choose from Royal Champagne, Emerald Coast, or Alabaster Noir palettes.",
                  )}
                </p>

                {/* Palette Switcher Controls */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => handlePaletteChange("champagne")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      activePalette === "champagne"
                        ? "bg-[#C5A880]/20 text-[#9E7D47] border-[#C5A880]"
                        : "bg-[hsl(var(--surface))] text-[hsl(var(--foreground-muted))] border-transparent"
                    }`}
                  >
                    Royal Champagne
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaletteChange("emerald")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      activePalette === "emerald"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-400"
                        : "bg-[hsl(var(--surface))] text-[hsl(var(--foreground-muted))] border-transparent"
                    }`}
                  >
                    Emerald Coast
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaletteChange("obsidian")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      activePalette === "obsidian"
                        ? "bg-[#1E1815] text-[#FBF8F3] border-[#6E583B]"
                        : "bg-[hsl(var(--surface))] text-[hsl(var(--foreground-muted))] border-transparent"
                    }`}
                  >
                    Obsidian Noir
                  </button>
                </div>
              </div>

              {/* Dynamic Theme Mockup Box (Clicking triggers Lightbox) */}
              <div
                onClick={() => setIsLightboxOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setIsLightboxOpen(true);
                }}
                tabIndex={0}
                role="button"
                className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02] shadow-sm ${
                  activePalette === "champagne"
                    ? "bg-[#FAF6F0] border-[#D8C29D] text-[#2A201C]"
                    : activePalette === "emerald"
                      ? "bg-[#F0FDF4] border-emerald-300 text-emerald-950"
                      : "bg-[#14110F] border-[#382D26] text-[#FBF8F3]"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-serif font-bold pb-2 border-b border-black/10 dark:border-white/10">
                  <span>Theme: {activePalette.toUpperCase()}</span>
                  <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 flex items-center gap-1">
                    <Eye className="size-3" /> Click to Expand Lightbox
                  </span>
                </div>
                <div className="mt-2 text-xs font-serif font-bold">
                  The Sanctuary at Cox&apos;s Bazar
                </div>
                <div className="text-[10px] opacity-75 mt-0.5">
                  Ultra-luxury beachfront suites with private butler services.
                </div>
              </div>
            </div>

            {/* Bento Card 3: Mobile Concierge & QR Key (4 cols) */}
            <div className="lg:col-span-4 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 border border-[hsl(var(--border))] shadow-xs space-y-3">
              <span className="size-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/40">
                <Smartphone className="size-5" />
              </span>
              <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                {t("bento.card3Title", "Manager Mobile Concierge")}
              </h4>
              <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed">
                {t(
                  "bento.card3Desc",
                  "Native iOS & Android companion app for front-desk teams. Receive instant push notifications on guest arrivals and biometric verification.",
                )}
              </p>
              <div className="pt-2 text-[11px] font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                <span>Push notifications under 200ms</span>
              </div>
            </div>

            {/* Bento Card 4: Housekeeping & White-Glove Audit (4 cols) */}
            <div className="lg:col-span-4 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 border border-[hsl(var(--border))] shadow-xs space-y-3">
              <span className="size-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/40">
                <FileCheck className="size-5" />
              </span>
              <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                {t("bento.card4Title", "Housekeeping Turnover Matrix")}
              </h4>
              <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed">
                {t(
                  "bento.card4Desc",
                  "Real-time room status switches (Vacant Clean, Maintenance, Turnaround) with photo evidence upload and sommelier bar restocking logs.",
                )}
              </p>
              <div className="pt-2 text-[11px] font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                <span>Audited for 5-star standards</span>
              </div>
            </div>

            {/* Bento Card 5: Bespoke Subdomains & Domains (4 cols) */}
            <div className="lg:col-span-4 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 border border-[hsl(var(--border))] shadow-xs space-y-3">
              <span className="size-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/40">
                <Globe className="size-5" />
              </span>
              <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                {t("bento.card5Title", "Bespoke Edge Subdomains")}
              </h4>
              <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed">
                {t(
                  "bento.card5Desc",
                  "Automatic provisioning of [slug].omniheaven.com or your own custom domain with wildcard SSL certificates.",
                )}
              </p>
              <div className="pt-2 text-[11px] font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                <span>Instant SSL via Cloudflare Edge</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* RESIDENTIAL & ESTATE EDITION BENTO */}
        {edition === "residential" && (
          <motion.div
            key="res-bento"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: luxuryEase }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6"
          >
            {/* Bento Card 1: Automated 1st-of-Month Bill Generator (7 cols) */}
            <div className="lg:col-span-7 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 sm:p-8 border border-[hsl(var(--border-gold))]/40 shadow-xs hover:shadow-luxury transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="size-11 rounded-2xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/50">
                    <Receipt className="size-5" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {t("bento.resCard1Badge", "Auto-Dispatched on 1st")}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
                  {t("bento.resCard1Title", "Automated Monthly Ledger & Utility Invoicing")}
                </h3>
                <p className="text-xs sm:text-sm text-[hsl(var(--foreground-muted))] leading-relaxed mb-6">
                  {t(
                    "bento.resCard1Desc",
                    "Generate itemized monthly rent folios (Base Rent, Water, Gas, Service Charge, Electricity) on the 1st of every month with zero manual bookkeeping.",
                  )}
                </p>
              </div>

              {/* Utility Ledger Breakdown Preview */}
              <div className="bg-[hsl(var(--surface))] rounded-2xl p-4 sm:p-5 border border-[hsl(var(--border))] space-y-3 text-xs">
                <div className="flex justify-between font-bold text-[hsl(var(--foreground))] pb-2 border-b border-[hsl(var(--border))]">
                  <span>Flat 14-C Itemized Ledger</span>
                  <span className="text-emerald-700 font-bold">Total: ৳104,200</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[hsl(var(--foreground-secondary))]">
                  <div>
                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] block">
                      Rent
                    </span>
                    <strong>৳85,000</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] block">
                      Service
                    </span>
                    <strong>৳10,000</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] block">
                      DESCO Power
                    </span>
                    <strong>৳6,800</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] block">
                      WASA Water
                    </span>
                    <strong>৳2,400</strong>
                  </div>
                </div>

                {/* Progressive Disclosure */}
                <div className="pt-2 border-t border-[hsl(var(--border))]">
                  <button
                    type="button"
                    onClick={() => setShowLedgerSpecs(!showLedgerSpecs)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-[hsl(var(--primary))] hover:underline cursor-pointer"
                  >
                    <span>
                      {showLedgerSpecs
                        ? "Hide Automation Details"
                        : "Progressive Disclosure: View Bank & SMS Automation"}
                    </span>
                    <ChevronDown
                      className={`size-3.5 transition-transform ${showLedgerSpecs ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showLedgerSpecs && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="text-[11px] text-[hsl(var(--foreground-muted))] pt-2 space-y-1"
                      >
                        <p>• Automated bKash Merchant TrxID matching algorithm.</p>
                        <p>• Instant SMS notification via Infobip / Twilio Bangladesh Gateway.</p>
                        <p>• Automatic NBR tax deduction certificates attached as PDF.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Dedicated Tenant Portal (5 cols) */}
            <div className="lg:col-span-5 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 sm:p-8 border border-[hsl(var(--border-gold))]/40 shadow-xs hover:shadow-luxury transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="size-11 rounded-2xl bg-[hsl(var(--surface))] text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border))]">
                    <Users className="size-5" />
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[hsl(var(--foreground-muted))]">
                    renter.omniheaven.com
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
                  {t("bento.resCard2Title", "Dedicated Resident Portal")}
                </h3>
                <p className="text-xs sm:text-sm text-[hsl(var(--foreground-muted))] leading-relaxed mb-4">
                  {t(
                    "bento.resCard2Desc",
                    "Tenants log in using their secure flat access code to review statement archives, download official tax clearance receipts, and message caretakers.",
                  )}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <CheckCircle2 className="size-4" />
                  <span>Instant Tax Certificates Available</span>
                </div>
                <p className="text-[11px] text-[hsl(var(--foreground-muted))]">
                  NBR-compliant PDF receipts generated instantly upon bKash or card clearance.
                </p>
              </div>
            </div>

            {/* Bento Card 3: Maintenance Ticketing Desk (4 cols) */}
            <div className="lg:col-span-4 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 border border-[hsl(var(--border))] shadow-xs space-y-3">
              <span className="size-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/40">
                <Wrench className="size-5" />
              </span>
              <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                {t("bento.resCard3Title", "Maintenance Dispatch Desk")}
              </h4>
              <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed">
                {t(
                  "bento.resCard3Desc",
                  "Tenants report facility issues with photo attachments. Dispatch technicians and log repair expenses directly into the building ledger.",
                )}
              </p>
              <div className="pt-2 text-[11px] font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                <span>Real-time resolution auditing</span>
              </div>
            </div>

            {/* Bento Card 4: Automated bKash Reconciliation (4 cols) */}
            <div className="lg:col-span-4 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 border border-[hsl(var(--border))] shadow-xs space-y-3">
              <span className="size-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/40">
                <CreditCard className="size-5" />
              </span>
              <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                {t("bento.resCard4Title", "bKash Tokenized Merchant")}
              </h4>
              <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed">
                {t(
                  "bento.resCard4Desc",
                  "Native webhooks automatically map payments to tenant flats instantly with zero manual matching of bKash TrxID strings.",
                )}
              </p>
              <div className="pt-2 text-[11px] font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                <span>Auto TrxID verification</span>
              </div>
            </div>

            {/* Bento Card 5: Multi-Building Portfolio HQ (4 cols) */}
            <div className="lg:col-span-4 bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 border border-[hsl(var(--border))] shadow-xs space-y-3">
              <span className="size-10 rounded-xl bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] flex items-center justify-center border border-[hsl(var(--border-gold))]/40">
                <Layers className="size-5" />
              </span>
              <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                {t("bento.resCard5Title", "Multi-Building Portfolio HQ")}
              </h4>
              <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed">
                {t(
                  "bento.resCard5Desc",
                  "Manage residential towers in Gulshan, Dhanmondi, and Banani simultaneously under one master executive account.",
                )}
              </p>
              <div className="pt-2 text-[11px] font-semibold text-[hsl(var(--primary))] flex items-center gap-1">
                <span>Multi-tenant organizational scope</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal Window */}
      <LightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        title={`Boutique Theme Showcase: ${activePalette.toUpperCase()}`}
        subtitle="Full High-Definition Preview of the Guest-Facing Booking Engine"
        theme={activePalette}
      />
    </section>
  );
}
