"use client";

import { useLanguage } from "@omniheaven/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileText,
  Heart,
  Hotel,
  Layers,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "./toast-provider";

type CockpitTab = "hotel" | "residential" | "guest";

interface RoomItem {
  id: string;
  number: string;
  name: string;
  guest: string;
  nights: string;
  rate: number;
  status: "occupied" | "housekeeping" | "available";
}

const INITIAL_ROOMS: RoomItem[] = [
  {
    id: "r1",
    number: "201",
    name: "Grand Imperial Penthouse",
    guest: "Duchess Althea Morosini",
    nights: "3 Nights",
    rate: 145000,
    status: "occupied",
  },
  {
    id: "r2",
    number: "102",
    name: "Château Presidential Haven",
    guest: "Turnover in Progress • White-Glove Audit",
    nights: "Due Today",
    rate: 180000,
    status: "housekeeping",
  },
  {
    id: "r3",
    number: "101",
    name: "Lotus Reflection Ocean Villa",
    guest: "Inspected & Keycard Ready",
    nights: "Direct Booked",
    rate: 120000,
    status: "available",
  },
];

interface FlatFolio {
  id: string;
  flat: string;
  tenant: string;
  rent: number;
  utilities: number;
  status: "paid" | "pending" | "processing";
  method: string;
}

const INITIAL_FOLIOS: FlatFolio[] = [
  {
    id: "f1",
    flat: "Tower 1 • 8-A",
    tenant: "Tariqul Islam (Executive MD)",
    rent: 85000,
    utilities: 9400,
    status: "paid",
    method: "Auto-cleared via bKash Merchant",
  },
  {
    id: "f2",
    flat: "Tower 1 • 12-B",
    tenant: "Dr. Farzana Rahman",
    rent: 92000,
    utilities: 11200,
    status: "paid",
    method: "Bank Wire Transfer (City Bank)",
  },
  {
    id: "f3",
    flat: "Tower 2 • Penthouse 18",
    tenant: "Naveed Chowdhury",
    rent: 165000,
    utilities: 18500,
    status: "processing",
    method: "1st-of-Month Ledger Sent",
  },
];

export function ProductCockpit() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<CockpitTab>("hotel");
  const [rooms, setRooms] = useState<RoomItem[]>(INITIAL_ROOMS);
  const [folios, setFolios] = useState<FlatFolio[]>(INITIAL_FOLIOS);
  const [isDownloadingVoucher, setIsDownloadingVoucher] = useState(false);
  const [voucherDownloaded, setVoucherDownloaded] = useState(false);
  const [isDispatchingBills, setIsDispatchingBills] = useState(false);
  const [billsDispatched, setBillsDispatched] = useState(false);

  // Progressive Disclosure states
  const [showHotelAudit, setShowHotelAudit] = useState(false);
  const [showUtilityMeters, setShowUtilityMeters] = useState(false);

  // Skeleton screen simulator
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);

  // Micro-interaction states
  const [isFavorited, setIsFavorited] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(true);
  const [isQrGenerated, setIsQrGenerated] = useState(false);

  const toggleRoomStatus = (id: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const nextStatus: RoomItem["status"] =
          r.status === "available"
            ? "occupied"
            : r.status === "occupied"
              ? "housekeeping"
              : "available";

        showToast({
          title: `Suite ${r.number} Updated`,
          description: `Status changed to ${nextStatus.toUpperCase()} • Butler dispatch updated.`,
          type: "success",
        });

        return { ...r, status: nextStatus };
      }),
    );
  };

  const handleDownloadVoucher = () => {
    setIsDownloadingVoucher(true);
    setTimeout(() => {
      setIsDownloadingVoucher(false);
      setVoucherDownloaded(true);
      showToast({
        title: "Cryptographic Voucher Generated",
        description: "PDF voucher #OH-SYL-2025-0891 downloaded with 0% OTA fee.",
        type: "gold",
      });
      setTimeout(() => setVoucherDownloaded(false), 3000);
    }, 1200);
  };

  const handleDispatchBills = () => {
    setIsDispatchingBills(true);
    setTimeout(() => {
      setIsDispatchingBills(false);
      setBillsDispatched(true);
      setFolios((prev) => prev.map((f) => ({ ...f, status: "paid" })));
      showToast({
        title: "Folios Dispatched & Cleared",
        description: "bKash SMS payment links sent to 48 tenants. Real-time reconciliation active.",
        type: "success",
      });
      setTimeout(() => setBillsDispatched(false), 3500);
    }, 1400);
  };

  const handleSimulateSkeleton = () => {
    setIsLoadingSkeleton(true);
    showToast({
      title: "Simulating Cold Data Retrieval",
      description: "Demonstrating skeleton screen transition under high load...",
      type: "info",
    });
    setTimeout(() => {
      setIsLoadingSkeleton(false);
      showToast({
        title: "Live Edge Data Rehydrated",
        description: "PostgreSQL read replica responded in 18ms.",
        type: "success",
      });
    }, 1500);
  };

  const handleCopyDomain = () => {
    navigator.clipboard.writeText("grand-sanctuary.omniheaven.com");
    setCopiedDomain(true);
    showToast({
      title: "Domain Copied",
      description: "'grand-sanctuary.omniheaven.com' copied to clipboard.",
      type: "gold",
    });
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
    showToast({
      title: !isFavorited ? "Estate Added to Bookmarks" : "Estate Removed from Bookmarks",
      description: !isFavorited
        ? "The Royal Grand Pavilion saved to executive favorites."
        : "Removed from favorites.",
      type: "gold",
    });
  };

  return (
    <div id="cockpit" className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      {/* 2.5D Perspective Cockpit Container */}
      <div className="relative rounded-3xl p-1 bg-gradient-to-b from-[#D8C29D]/80 via-[#C5A880]/30 to-[#EADBCE]/40 shadow-luxury-lg">
        {/* Soft Ambient Champagne Backlight Glow */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-[#C5A880]/20 via-[#E5C378]/25 to-[#C5A880]/15 rounded-3xl blur-2xl pointer-events-none -z-10" />

        {/* Cockpit Shell */}
        <div className="bg-[hsl(var(--surface-elevated))] rounded-[22px] border border-[hsl(var(--border-gold))]/40 p-4 sm:p-6 lg:p-7 overflow-hidden">
          {/* Top Control Bar with Micro-interactions */}
          <div className="flex flex-col sm:flex-row items-center justify-between pb-5 mb-6 border-b border-[hsl(var(--border))]/80 gap-4">
            {/* Left: Estate Status Indicator & Bookmark Micro-interaction */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="size-8 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] flex items-center justify-center transition-all cursor-pointer group active:scale-90"
                title="Bookmark Estate"
              >
                <Heart
                  className={`size-4 transition-colors ${
                    isFavorited
                      ? "fill-red-500 text-red-500 scale-110"
                      : "text-[hsl(var(--foreground-muted))] group-hover:text-red-400"
                  }`}
                />
              </button>

              <div className="h-4 w-[1px] bg-[hsl(var(--border))]" />

              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-[hsl(var(--foreground))] tracking-tight">
                  The Royal Grand Pavilion &amp; Villas
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-[hsl(var(--foreground-muted))] hidden sm:inline-block">
                  Live Console v4.8
                </span>
              </div>
            </div>

            {/* Center: Interactive Tab Switcher */}
            <div className="inline-flex items-center bg-[hsl(var(--surface))] p-1 rounded-2xl border border-[hsl(var(--border))] text-xs font-semibold shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("hotel")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === "hotel"
                    ? "bg-[hsl(var(--surface-elevated))] text-[#1F1714] shadow-xs border border-[#D8C29D]/60"
                    : "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Hotel className="size-3.5 text-[hsl(var(--primary))]" />
                <span>{t("cockpit.tabHotel")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("residential")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === "residential"
                    ? "bg-[hsl(var(--surface-elevated))] text-[#1F1714] shadow-xs border border-[#D8C29D]/60"
                    : "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Building2 className="size-3.5 text-[hsl(var(--primary))]" />
                <span>{t("cockpit.tabResidential")}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("guest")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  activeTab === "guest"
                    ? "bg-[hsl(var(--surface-elevated))] text-[#1F1714] shadow-xs border border-[#D8C29D]/60"
                    : "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                <Smartphone className="size-3.5 text-[hsl(var(--primary))]" />
                <span>{t("cockpit.tabGuest")}</span>
              </button>
            </div>

            {/* Right: Skeleton Screen Simulator Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSimulateSkeleton}
                className="px-2.5 py-1.5 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-[11px] font-semibold text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Toggle Skeleton Loading State"
              >
                <Zap className="size-3 text-[hsl(var(--primary))]" />
                <span>{t("cockpit.simulateSkeleton")}</span>
              </button>
            </div>
          </div>

          {/* SKELETON SCREEN PLACEHOLDER MODE */}
          {isLoadingSkeleton ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 bg-[hsl(var(--surface))] rounded-2xl p-5 space-y-3">
                  <div className="h-4 bg-[hsl(var(--border))] rounded w-1/3" />
                  <div className="h-14 bg-[hsl(var(--border))]/70 rounded-xl" />
                  <div className="h-14 bg-[hsl(var(--border))]/70 rounded-xl" />
                  <div className="h-14 bg-[hsl(var(--border))]/70 rounded-xl" />
                </div>
                <div className="lg:col-span-5 space-y-4">
                  <div className="h-28 bg-[hsl(var(--surface))] rounded-2xl p-5" />
                  <div className="h-32 bg-[hsl(var(--surface))] rounded-2xl p-5" />
                </div>
              </div>
            </div>
          ) : (
            /* COCKPIT ACTIVE VIEWS */
            <div className="min-h-[380px]">
              <AnimatePresence mode="wait">
                {/* TAB 1: HOTEL FRONT DESK */}
                {activeTab === "hotel" && (
                  <motion.div
                    key="hotel-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Left: Suite Matrix (7 cols) */}
                      <div className="lg:col-span-7 bg-[hsl(var(--surface))]/70 rounded-2xl p-4 sm:p-5 border border-[hsl(var(--border))] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="size-6 rounded-lg bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                                🏨
                              </span>
                              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                                Live Suite &amp; Villa Matrix
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-[hsl(var(--foreground-muted))]">
                              Click row to toggle state
                            </span>
                          </div>

                          <div className="space-y-3">
                            {rooms.map((room) => (
                              <div
                                key={room.id}
                                onClick={() => toggleRoomStatus(room.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    toggleRoomStatus(room.id);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                className="bg-[hsl(var(--surface-elevated))] rounded-xl p-3.5 border border-[hsl(var(--border))] flex items-center justify-between hover:border-[hsl(var(--border-gold))] transition-all cursor-pointer shadow-2xs hover:shadow-xs group active:scale-[0.99]"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="size-9 rounded-xl bg-[hsl(var(--primary))]/15 text-[#4A3728] font-serif font-bold text-xs flex items-center justify-center border border-[#C5A880]/30 group-hover:scale-105 transition-transform">
                                    {room.number}
                                  </span>
                                  <div>
                                    <h4 className="text-xs font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                                      {room.name}
                                    </h4>
                                    <p className="text-[11px] text-[hsl(var(--foreground-muted))]">
                                      {room.guest} • {room.nights}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {room.status === "occupied" && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                      <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                      Occupied
                                    </span>
                                  )}
                                  {room.status === "housekeeping" && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                                      <RefreshCw className="size-2.5 animate-spin" />
                                      Turnover
                                    </span>
                                  )}
                                  {room.status === "available" && (
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                                      <span className="size-1.5 rounded-full bg-blue-500" />
                                      Available
                                    </span>
                                  )}

                                  <span className="text-xs font-bold text-[hsl(var(--foreground))] tabular-nums">
                                    ৳{room.rate.toLocaleString()}
                                    <span className="text-[10px] text-[hsl(var(--foreground-muted))] font-normal">
                                      /nt
                                    </span>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between text-[11px] text-[hsl(var(--foreground-muted))]">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            Automated sync with Butler Folio &amp; Valet
                          </span>
                          <span className="text-[hsl(var(--primary))] font-bold">
                            Interactive Sandbox Active
                          </span>
                        </div>
                      </div>

                      {/* Right: RevPAR & Direct Booking Voucher (5 cols) */}
                      <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                        {/* RevPAR Metric Card */}
                        <div className="bg-gradient-to-br from-[hsl(var(--surface))] to-[hsl(var(--surface-elevated))] rounded-2xl p-5 border border-[hsl(var(--border-gold))]/60 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground-muted))]">
                              Daily Estate RevPAR
                            </span>
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <ArrowUpRight className="size-3" />
                              +14.8% vs Last Cycle
                            </span>
                          </div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-serif text-3xl font-bold text-[hsl(var(--foreground))] tabular-nums">
                              ৳842,500
                            </span>
                            <span className="text-xs text-[hsl(var(--foreground-muted))]">
                              BDT / Day
                            </span>
                          </div>
                          <p className="text-[11px] text-[hsl(var(--foreground-secondary))]">
                            Direct booking ratio:{" "}
                            <strong className="text-[hsl(var(--foreground))] font-bold">
                              92.4%
                            </strong>{" "}
                            (Saved ৳126,375 in OTA commissions today).
                          </p>
                        </div>

                        {/* Direct Booking Voucher Interactive Card */}
                        <div className="bg-[hsl(var(--surface))] rounded-2xl p-5 border border-[hsl(var(--border))] space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                              <FileText className="size-3.5 text-[hsl(var(--primary))]" />
                              Live Guest Booking Voucher
                            </span>
                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              0% Fee Verified
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-xs space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-[hsl(var(--foreground-muted))]">Guest:</span>
                              <span className="font-semibold text-[hsl(var(--foreground))]">
                                Duchess Althea Morosini
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[hsl(var(--foreground-muted))]">
                                Voucher Ref:
                              </span>
                              <span className="font-mono text-[11px] text-[hsl(var(--primary))] font-bold">
                                #OH-SYL-2025-0891
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[hsl(var(--foreground-muted))]">
                                Settlement:
                              </span>
                              <span className="font-semibold text-emerald-600">
                                bKash Merchant Direct
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleDownloadVoucher}
                            disabled={isDownloadingVoucher}
                            className="w-full py-2.5 rounded-xl bg-[hsl(var(--surface-elevated))] hover:bg-[hsl(var(--surface))] border border-[hsl(var(--border-gold))]/60 text-xs font-bold text-[hsl(var(--foreground))] transition-all flex items-center justify-center gap-2 active:scale-98 shadow-2xs cursor-pointer"
                          >
                            {isDownloadingVoucher ? (
                              <>
                                <RefreshCw className="size-3.5 animate-spin text-[hsl(var(--primary))]" />
                                <span>Generating Cryptographic Voucher...</span>
                              </>
                            ) : voucherDownloaded ? (
                              <>
                                <Check className="size-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">
                                  PDF Voucher Generated!
                                </span>
                              </>
                            ) : (
                              <>
                                <Download className="size-3.5 text-[hsl(var(--primary))]" />
                                <span>Simulate Voucher Download</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progressive Disclosure: Forensic Audit Trail */}
                    <div className="border border-[hsl(var(--border))] rounded-2xl overflow-hidden bg-[hsl(var(--surface-elevated))]">
                      <button
                        type="button"
                        onClick={() => setShowHotelAudit(!showHotelAudit)}
                        className="w-full px-5 py-3 text-left flex items-center justify-between text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="size-4 text-[hsl(var(--primary))]" />
                          <span>Progressive Disclosure: View Sommelier &amp; Butler Audit Log</span>
                        </span>
                        <ChevronDown
                          className={`size-4 text-[hsl(var(--foreground-muted))] transition-transform ${
                            showHotelAudit ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {showHotelAudit && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-5 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground-secondary))] space-y-2 bg-[hsl(var(--surface))]/40"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">
                                <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                                  Sommelier Cellar
                                </span>
                                <strong className="text-[hsl(var(--foreground))]">
                                  Château Margaux 2015 Dispatched
                                </strong>
                              </div>
                              <div className="p-3 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">
                                <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                                  Villa Temperature
                                </span>
                                <strong className="text-[hsl(var(--foreground))]">
                                  21.5°C Preset (Butler verified)
                                </strong>
                              </div>
                              <div className="p-3 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">
                                <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                                  Cryptographic Hash
                                </span>
                                <strong className="font-mono text-[10px] text-[hsl(var(--primary))] truncate block">
                                  0x8f2a...c891 (Immutable)
                                </strong>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* TAB 2: RESIDENTIAL ESTATE LEDGER */}
                {activeTab === "residential" && (
                  <motion.div
                    key="residential-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Left: Folios List (7 cols) */}
                      <div className="lg:col-span-7 bg-[hsl(var(--surface))]/70 rounded-2xl p-4 sm:p-5 border border-[hsl(var(--border))] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="size-6 rounded-lg bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                                🏢
                              </span>
                              <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                                1st-of-Month Automated Folio Ledger
                              </span>
                            </div>
                            <span className="text-[11px] font-medium text-emerald-600 font-bold">
                              94.6% Auto-Reconciled
                            </span>
                          </div>

                          <div className="space-y-3">
                            {folios.map((folio) => (
                              <div
                                key={folio.id}
                                className="bg-[hsl(var(--surface-elevated))] rounded-xl p-3.5 border border-[hsl(var(--border))] flex items-center justify-between shadow-2xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-serif font-bold text-xs text-[hsl(var(--foreground))]">
                                      {folio.flat}
                                    </span>
                                    <span className="text-[10px] text-[hsl(var(--foreground-muted))]">
                                      • {folio.tenant}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[hsl(var(--foreground-secondary))] mt-0.5">
                                    Base: ৳{folio.rent.toLocaleString()} + Util: ৳
                                    {folio.utilities.toLocaleString()}
                                  </p>
                                  <span className="text-[10px] font-mono text-[hsl(var(--primary))]">
                                    {folio.method}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-bold text-[hsl(var(--foreground))] block tabular-nums">
                                    ৳{(folio.rent + folio.utilities).toLocaleString()}
                                  </span>
                                  {folio.status === "paid" ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <Check className="size-2.5" /> Cleared
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                      <Clock className="size-2.5" /> Sent via SMS
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[hsl(var(--border))] flex items-center justify-between text-[11px] text-[hsl(var(--foreground-muted))]">
                          <span>Zero manual paper receipts required</span>
                          <span className="text-[hsl(var(--primary))] font-bold">
                            Gulshan Tower One Sample
                          </span>
                        </div>
                      </div>

                      {/* Right: Dispatch Card (5 cols) */}
                      <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                        <div className="bg-[hsl(var(--surface))] rounded-2xl p-5 border border-[hsl(var(--border))] space-y-4">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground-muted))] block mb-1">
                              Monthly Utility Recovery
                            </span>
                            <div className="flex items-baseline justify-between mb-2">
                              <span className="font-serif text-2xl font-bold text-[hsl(var(--foreground))] tabular-nums">
                                ৳1,420,000
                              </span>
                              <span className="text-xs font-semibold text-emerald-600">
                                94.6% Recovered
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-[hsl(var(--surface-elevated))] rounded-full overflow-hidden border border-[hsl(var(--border))]">
                              <div
                                className="h-full bg-gradient-to-r from-[#C5A880] to-emerald-500 rounded-full transition-all duration-700"
                                style={{ width: "94.6%" }}
                              />
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-xs space-y-2">
                            <div className="flex items-center justify-between text-[hsl(var(--foreground-muted))]">
                              <span>SMS Notifications Sent:</span>
                              <span className="font-bold text-[hsl(var(--foreground))]">
                                48 Tenants
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[hsl(var(--foreground-muted))]">
                              <span>Auto-Tax Certificate Ready:</span>
                              <span className="font-bold text-emerald-600">
                                Yes (NBR Certified)
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleDispatchBills}
                            disabled={isDispatchingBills}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#E5C378] text-[#1F1714] font-bold text-xs shadow-sm hover:brightness-105 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                          >
                            {isDispatchingBills ? (
                              <>
                                <RefreshCw className="size-3.5 animate-spin text-[#1F1714]" />
                                <span>Dispatching bKash Payment Links...</span>
                              </>
                            ) : billsDispatched ? (
                              <>
                                <Check className="size-3.5 text-emerald-900" />
                                <span>Folios Auto-Dispatched &amp; Cleared!</span>
                              </>
                            ) : (
                              <>
                                <Send className="size-3.5" />
                                <span>Simulate 1st-of-Month Bill Dispatch</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border-gold))]/40 text-xs text-[hsl(var(--foreground-secondary))] flex items-center gap-3">
                          <ShieldCheck className="size-5 text-[hsl(var(--primary))] shrink-0" />
                          <span>
                            Integrated with local Bangladesh utility APIs: DESCO, WASA &amp; Titas
                            Gas.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progressive Disclosure: Utility Meter Telemetry */}
                    <div className="border border-[hsl(var(--border))] rounded-2xl overflow-hidden bg-[hsl(var(--surface-elevated))]">
                      <button
                        type="button"
                        onClick={() => setShowUtilityMeters(!showUtilityMeters)}
                        className="w-full px-5 py-3 text-left flex items-center justify-between text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="size-4 text-[hsl(var(--primary))]" />
                          <span>Progressive Disclosure: View WASA &amp; DESCO Meter Telemetry</span>
                        </span>
                        <ChevronDown
                          className={`size-4 text-[hsl(var(--foreground-muted))] transition-transform ${
                            showUtilityMeters ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {showUtilityMeters && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-5 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground-secondary))] space-y-2 bg-[hsl(var(--surface))]/40"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">
                                <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                                  DESCO Smart Meter #
                                </span>
                                <strong className="font-mono text-xs text-[hsl(var(--foreground))]">
                                  #DSC-GLS-90214
                                </strong>
                              </div>
                              <div className="p-3 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">
                                <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                                  WASA Flow Sensor
                                </span>
                                <strong className="text-xs text-[hsl(var(--foreground))]">
                                  14.2 m³ (Normal Consumption)
                                </strong>
                              </div>
                              <div className="p-3 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))]">
                                <span className="text-[10px] text-[hsl(var(--foreground-muted))] uppercase block">
                                  NBR Automated E-TIN
                                </span>
                                <strong className="text-xs text-emerald-700">
                                  Auto-Certificate Issued
                                </strong>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {/* TAB 3: GUEST ENGINE & QR */}
                {activeTab === "guest" && (
                  <motion.div
                    key="guest-tab"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-5"
                  >
                    {/* Left: Guest Booking Viewport (7 cols) */}
                    <div className="lg:col-span-7 bg-[hsl(var(--surface))]/70 rounded-2xl p-4 sm:p-5 border border-[hsl(var(--border))] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-6 rounded-lg bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] flex items-center justify-center font-bold text-xs">
                            📱
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]">
                            Boutique Guest Engine Viewport
                          </span>
                        </div>

                        {/* Copy Subdomain Micro-interaction */}
                        <button
                          type="button"
                          onClick={handleCopyDomain}
                          className="px-2.5 py-1 rounded-lg bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-[10px] font-mono text-[hsl(var(--primary))] flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          {copiedDomain ? (
                            <Check className="size-3" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                          <span>grand-sanctuary.omniheaven.com</span>
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">
                              Curated Villa Reservation
                            </span>
                            <h4 className="font-serif text-base font-bold text-[hsl(var(--foreground))]">
                              Lotus Reflection Ocean Villa
                            </h4>
                            <p className="text-xs text-[hsl(var(--foreground-muted))]">
                              Cox&apos;s Bazar Heritage Wing • Private Infinity Pool
                            </p>
                          </div>
                          <span className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                            ৳120,000<span className="text-xs font-normal">/nt</span>
                          </span>
                        </div>

                        {/* Add-on Selector */}
                        <div className="pt-2 border-t border-[hsl(var(--border))] space-y-2">
                          <span className="text-[11px] font-bold text-[hsl(var(--foreground))] block">
                            Curated Concierge Add-Ons:
                          </span>
                          <label className="flex items-center justify-between p-2.5 rounded-lg bg-[hsl(var(--surface))] border border-[hsl(var(--border))] cursor-pointer hover:border-[hsl(var(--border-gold))] transition-colors">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedAddon}
                                onChange={(e) => {
                                  setSelectedAddon(e.target.checked);
                                  showToast({
                                    title: e.target.checked
                                      ? "VIP Helipad Transfer Added"
                                      : "Add-On Removed",
                                    description: e.target.checked
                                      ? "৳25,000 added to direct guest voucher."
                                      : "Total recalculated.",
                                    type: "gold",
                                  });
                                }}
                                className="size-4 accent-[hsl(var(--primary))] rounded"
                              />
                              <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                                Helipad Transfer &amp; VIP Fast-Track
                              </span>
                            </div>
                            <span className="text-xs font-bold text-[hsl(var(--primary))]">
                              +৳25,000
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[hsl(var(--foreground-muted))]">
                        <span>Instant zero-friction checkout</span>
                        <span className="font-bold text-emerald-600">
                          Total Payable: ৳{(120000 + (selectedAddon ? 25000 : 0)).toLocaleString()}{" "}
                          BDT
                        </span>
                      </div>
                    </div>

                    {/* Right: QR Key Generator (5 cols) */}
                    <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                      <div className="bg-[hsl(var(--surface))] rounded-2xl p-5 border border-[hsl(var(--border))] text-center space-y-3">
                        <div className="size-16 rounded-2xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border-gold))]/60 mx-auto flex items-center justify-center text-[hsl(var(--primary))] shadow-sm">
                          <QrCode className="size-8" />
                        </div>

                        <div>
                          <h4 className="font-serif text-sm font-bold text-[hsl(var(--foreground))]">
                            Cryptographic Contactless QR Key
                          </h4>
                          <p className="text-xs text-[hsl(var(--foreground-muted))] mt-1">
                            Guests tap phone at the villa reader for biometric entry without
                            stopping at the front desk.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsQrGenerated(!isQrGenerated);
                            showToast({
                              title: !isQrGenerated
                                ? "Biometric QR Key Generated"
                                : "QR Key Revoked",
                              description: !isQrGenerated
                                ? "Token #OH-KEY-9941 provisioned with 72h validity."
                                : "Key expired safely.",
                              type: "gold",
                            });
                          }}
                          className="w-full py-2.5 rounded-xl bg-[hsl(var(--surface-elevated))] hover:bg-[hsl(var(--surface))] border border-[hsl(var(--border-gold))]/60 text-xs font-bold text-[hsl(var(--foreground))] transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                        >
                          <Sparkles className="size-3.5 text-[hsl(var(--primary))]" />
                          <span>
                            {isQrGenerated ? "Revoke QR Key" : "Generate Live Test QR Key"}
                          </span>
                        </button>

                        {isQrGenerated && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200"
                          >
                            Token Verified: #OH-KEY-9941 (Expires in 72h)
                          </motion.div>
                        )}
                      </div>

                      <div className="p-4 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground-secondary))] flex items-center gap-3">
                        <CreditCard className="size-5 text-[hsl(var(--primary))] shrink-0" />
                        <span>
                          Supports bKash, Nagad, Visa, Mastercard, AMEX &amp; Apple Pay natively.
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
