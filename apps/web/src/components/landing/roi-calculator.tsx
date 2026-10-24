"use client";
import { useLanguage } from "@omniheaven/ui";
import { ArrowRight, Calculator, Info } from "lucide-react";
import { useId, useState } from "react";

export function RoiCalculator() {
  const { t } = useLanguage();
  const [propertyType, setPropertyType] = useState<"hotel" | "residential">("hotel");
  const [units, setUnits] = useState<number>(25);
  const [rate, setRate] = useState<number>(45000);
  const [occupancy, setOccupancy] = useState<number>(75);

  const unitsInputId = useId();
  const rateInputId = useId();
  const occupancyInputId = useId();

  // Calculations
  const isHotel = propertyType === "hotel";

  // Hotel: Daily Room Rate * Units * (Occupancy/100) * 365 days
  const annualGrossRevenue = isHotel
    ? units * rate * (occupancy / 100) * 365
    : units * rate * (occupancy / 100) * 12;

  // 20% standard OTA commission (Booking.com / Agoda)
  const annualOtaCommissionSaved = Math.round(annualGrossRevenue * 0.2);

  // Post-trial monthly cost
  const monthlyCost = isHotel
    ? 2500 + Math.max(0, units - 10) * 100
    : 1500 + Math.max(0, units - 10) * 50;

  return (
    <section
      id="calculator"
      className="py-24 bg-[hsl(var(--surface))]/50 border-y border-[hsl(var(--border))]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--primary))] flex items-center justify-center gap-1.5">
            <Calculator className="size-3.5 text-[hsl(var(--primary))]" />
            <span>{t("calc.tag", "Interactive ROI & OTA Savings Engine")}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-[hsl(var(--foreground))] font-bold mt-2 mb-4 tracking-tight">
            {t("calc.title", "Calculate How Much Capital You Retain")}
          </h2>
          <p className="text-sm sm:text-base text-[hsl(var(--foreground-muted))] leading-relaxed">
            {t(
              "calc.subtitle",
              "Eliminate foreign OTA booking taxes and automated manual utility leakage. Test your estate dimensions below.",
            )}
          </p>

          {/* Mode Switcher */}
          <div className="inline-flex items-center bg-[hsl(var(--surface-elevated))] p-1 rounded-2xl border border-[hsl(var(--border))] mt-6 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setPropertyType("hotel");
                setRate(45000);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                propertyType === "hotel"
                  ? "bg-[hsl(var(--primary))] text-[#1F1714] shadow-xs"
                  : "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {t("calc.hotelMode", "Hotels & Luxury Resorts")}
            </button>
            <button
              type="button"
              onClick={() => {
                setPropertyType("residential");
                setRate(75000);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                propertyType === "residential"
                  ? "bg-[hsl(var(--primary))] text-[#1F1714] shadow-xs"
                  : "text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {t("calc.resMode", "Residential Towers & Flats")}
            </button>
          </div>
        </div>

        {/* Calculator Main Stage */}
        <div className="bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 sm:p-10 border border-[hsl(var(--border-gold))]/40 shadow-luxury-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls Column (7 Cols) */}
            <div className="lg:col-span-7 space-y-7">
              {/* Slider 1: Units */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor={unitsInputId}
                    className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]"
                  >
                    {isHotel
                      ? t("calc.unitsHotel", "Total Rooms & Suites")
                      : t("calc.unitsRes", "Total Flats & Commercial Units")}
                  </label>
                  <span className="text-sm font-serif font-bold text-[hsl(var(--primary))] bg-[hsl(var(--surface))] px-3 py-1 rounded-xl border border-[hsl(var(--border))]">
                    {units} Units
                  </span>
                </div>
                <input
                  id={unitsInputId}
                  type="range"
                  min={5}
                  max={150}
                  step={5}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="w-full h-2 bg-[hsl(var(--border))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                />
                <div className="flex justify-between text-[10px] text-[hsl(var(--foreground-muted))] font-mono">
                  <span>5 Units (Boutique)</span>
                  <span>75 Units (Resort)</span>
                  <span>150 Units (Estate)</span>
                </div>
              </div>

              {/* Slider 2: Average Daily Rate / Monthly Rent */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor={rateInputId}
                    className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]"
                  >
                    {isHotel
                      ? t("calc.rateHotel", "Average Daily Room Rate (ADR)")
                      : t("calc.rateRes", "Average Monthly Rent Per Flat")}
                  </label>
                  <span className="text-sm font-serif font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--surface))] px-3 py-1 rounded-xl border border-[hsl(var(--border))]">
                    ৳{rate.toLocaleString()} BDT
                  </span>
                </div>
                <input
                  id={rateInputId}
                  type="range"
                  min={isHotel ? 10000 : 25000}
                  max={isHotel ? 250000 : 200000}
                  step={isHotel ? 5000 : 5000}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-full h-2 bg-[hsl(var(--border))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                />
                <div className="flex justify-between text-[10px] text-[hsl(var(--foreground-muted))] font-mono">
                  <span>৳{isHotel ? "10,000" : "25,000"} BDT</span>
                  <span>৳{isHotel ? "120,000" : "100,000"} BDT</span>
                  <span>৳{isHotel ? "250,000+" : "200,000+"} Luxury</span>
                </div>
              </div>

              {/* Slider 3: Occupancy */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor={occupancyInputId}
                    className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--foreground))]"
                  >
                    {t("calc.occupancyLabel", "Estimated Average Occupancy")}
                  </label>
                  <span className="text-sm font-serif font-bold text-[hsl(var(--foreground))] bg-[hsl(var(--surface))] px-3 py-1 rounded-xl border border-[hsl(var(--border))]">
                    {occupancy}% Occupied
                  </span>
                </div>
                <input
                  id={occupancyInputId}
                  type="range"
                  min={30}
                  max={98}
                  step={1}
                  value={occupancy}
                  onChange={(e) => setOccupancy(Number(e.target.value))}
                  className="w-full h-2 bg-[hsl(var(--border))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--primary))]"
                />
                <div className="flex justify-between text-[10px] text-[hsl(var(--foreground-muted))] font-mono">
                  <span>30% Low Season</span>
                  <span>65% Balanced</span>
                  <span>98% High Peak</span>
                </div>
              </div>

              <div className="p-3.5 bg-[hsl(var(--surface))] rounded-2xl border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground-secondary))] flex items-start gap-2.5">
                <Info className="size-4 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                <span>
                  {isHotel
                    ? t(
                        "calc.infoHotel",
                        "Based on a conservative 20% aggregate OTA commission benchmark (Booking.com, Agoda, Expedia) versus omniHeaven's 0% Direct Engine.",
                      )
                    : t(
                        "calc.infoRes",
                        "Eliminates utility collection leakage, bounced cheques, and physical paper accounting overhead.",
                      )}
                </span>
              </div>
            </div>

            {/* Right Results Column (5 Cols) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#332418] via-[#2A1D15] to-[#1F1714] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-[#D8C29D]/40 relative overflow-hidden flex flex-col justify-between space-y-6">
              <div className="absolute -right-8 -bottom-8 size-40 bg-[#C5A880]/20 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A880]/20 text-[#E5C378] border border-[#C5A880]/40 text-[10px] uppercase font-bold tracking-wider mb-4">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span>{t("calc.freeTier", "180 Days Included Free")}</span>
                </div>

                <div className="text-xs text-[#EADBCE] uppercase tracking-wider font-semibold">
                  {isHotel
                    ? t("calc.annualSavedHotel", "Estimated Annual OTA Fees Saved")
                    : t("calc.annualSavedRes", "Annual Cash Flow Managed")}
                </div>

                <div className="font-serif text-3xl sm:text-4xl font-extrabold text-[#E5C378] my-2 tracking-tight tabular-nums">
                  ৳ {annualOtaCommissionSaved.toLocaleString()}
                </div>

                <p className="text-xs text-[#EADBCE]/85 leading-relaxed">
                  {isHotel
                    ? "Net capital returned directly to your estate ledger rather than foreign travel agencies."
                    : "Zero percent transaction commission on monthly tenant rent clearances."}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#D8C29D]/30 text-xs">
                <div className="flex justify-between items-center text-[#EADBCE]">
                  <span>First 180 Days (Launch Offer)</span>
                  <span className="font-bold text-white text-sm">৳0 Free</span>
                </div>
                <div className="flex justify-between items-center text-[#EADBCE]">
                  <span>{t("calc.postTrialTier", "Post-Trial Transparent Tier")}</span>
                  <span className="font-mono text-[#E5C378]">
                    ৳{monthlyCost.toLocaleString()} {t("calc.monthFlat", "/ month flat")}
                  </span>
                </div>
                <div className="pt-2">
                  <a
                    href="http://localhost:3000"
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C5A880] via-[#E5C378] to-[#C5A880] text-[#1F1714] font-bold text-xs tracking-wide shadow-gold-glow hover:brightness-105 active:scale-95 transition-all text-center flex items-center justify-center gap-2 group"
                  >
                    <span>{t("calc.claimPass", "Claim 180-Day Complimentary Pass")}</span>
                    <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
