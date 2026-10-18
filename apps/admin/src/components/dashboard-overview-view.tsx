"use client";

import { Badge, Button, Card, CurrencyDisplay, StatusBadge } from "@omniheaven/ui";
import type { ProductType } from "@omniheaven/validators";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  FileText,
  PlusCircle,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";

export function DashboardOverviewView({
  productType,
  organizationName,
}: {
  productType: ProductType;
  organizationName: string;
}) {
  const isHospitality = productType === "hotel" || productType === "resort";

  return (
    <div className="space-y-6">
      {/* ==================== EXECUTIVE WELCOME BANNER ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-border-gold/40 bg-gradient-to-r from-card via-surface to-card p-6 shadow-sm">
        {/* Soft Ambient Gold Glow */}
        <div
          className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold" className="px-3 py-0.5">
                Grand Heritage · {isHospitality ? "Hospitality" : "Estate"} Edition
              </Badge>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-elevated/80 border border-border text-[11px] font-semibold text-foreground tracking-wide shadow-xs">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                Active Pro Plan · 172 Days Left on Free Trial
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {organizationName}
            </h1>

            <p className="text-xs sm:text-sm text-foreground-muted flex flex-wrap items-center gap-2">
              <span>Executive Command Desk</span>
              <span className="inline-block size-1 rounded-full bg-border-gold" />
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="size-3.5" />
                All Portfolio Units Synchronized · Live Fleet Active
              </span>
            </p>
          </div>

          {/* Quick Estate Atmosphere / Ambience Widget */}
          <div className="flex items-center gap-3.5 bg-surface-elevated/70 backdrop-blur-md border border-border/80 px-4 py-3 rounded-xl shadow-xs shrink-0">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider font-bold text-foreground-muted">
                Estate Status
              </p>
              <p className="text-xs font-bold text-foreground flex items-center justify-end gap-1">
                <Sparkles className="size-3 text-primary" />
                Optimal Condition
              </p>
            </div>
            <div className="size-10 rounded-full bg-surface border border-border-gold/50 flex items-center justify-center text-primary shadow-xs">
              <Compass className="size-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ==================== EXECUTIVE QUICK ACTIONS ==================== */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button variant="luxury" size="sm" className="gap-1.5 shadow-sm">
          <PlusCircle className="size-4" />
          <span>{isHospitality ? "New Reservation" : "Register Resident"}</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FileText className="size-4 text-foreground-muted" />
          <span>{isHospitality ? "Daily Ledger" : "Generate Monthly Invoices"}</span>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Wrench className="size-4 text-foreground-muted" />
          <span>Create Maintenance Order</span>
        </Button>
        <Button variant="goldOutline" size="sm" className="gap-1.5">
          <Sparkles className="size-4" />
          <span>Concierge Protocol</span>
        </Button>
      </div>

      {/* ==================== TOP KPI CARDS (4-Grid) ==================== */}
      {isHospitality ? (
        // Hotel / Resort KPI Cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="goldAccent" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Portfolio Occupancy
              </span>
              <BedDouble className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                84.2%
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="size-3" /> +5.4%
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="gold-gradient h-1.5 rounded-full" style={{ width: "84.2%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted flex items-center justify-between">
              <span>38 of 45 rooms occupied</span>
              <span className="text-primary font-semibold">7 vacant</span>
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Today's Arrivals
              </span>
              <CalendarCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                12
              </span>
              <span className="text-xs text-foreground-muted">8 checked in</span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: "66.6%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted">4 expected before 9:00 PM</p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Daily Settled Revenue
              </span>
              <DollarSign className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={92400} large />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="size-3" /> +8.2%
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="gold-gradient h-1.5 rounded-full" style={{ width: "77%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted">
              Direct website + front desk receipts
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Rooms In Cleaning
              </span>
              <Clock className="size-4 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                5
              </span>
              <StatusBadge status="cleaning" />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: "45%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted">Housekeeping actively assigned</p>
          </Card>
        </div>
      ) : (
        // Building / Estate Flat KPI Cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="goldAccent" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Flats & Units
              </span>
              <Building2 className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                24
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                22 Occupied
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="gold-gradient h-1.5 rounded-full" style={{ width: "91.6%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted">2 vacant units available for lease</p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Monthly Rent Collected
              </span>
              <DollarSign className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={385000} large />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: "81.8%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted">18 of 22 tenant contracts settled</p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Pending Overdue Dues
              </span>
              <AlertCircle className="size-4 text-destructive" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={72000} large className="text-destructive font-bold" />
              <StatusBadge status="overdue" />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="bg-destructive h-1.5 rounded-full" style={{ width: "18.2%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted">
              4 tenants with past-due payment cycles
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Open Maintenance
              </span>
              <Wrench className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                3
              </span>
              <StatusBadge status="in_progress" />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: "50%" }} />
            </div>
            <p className="text-[11px] text-foreground-muted">Plumbing & HVAC tickets assigned</p>
          </Card>
        </div>
      )}

      {/* ==================== RECENT ACTIVITY LEDGER ==================== */}
      <Card variant="default" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {isHospitality ? "Recent Guest Reservations & Stays" : "Recent Resident Collections"}
            </h2>
            <p className="text-xs text-foreground-muted">
              Live transaction ledger synchronized with mobile concierge and payment gateway
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary font-semibold text-xs"
          >
            View All Records →
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-surface/70 text-foreground-muted uppercase font-semibold text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3">{isHospitality ? "Guest Name" : "Renter / Flat"}</th>
                <th className="px-4 py-3">{isHospitality ? "Room / Suite" : "Billing Period"}</th>
                <th className="px-4 py-3">
                  {isHospitality ? "Check-in / Check-out" : "Payment Method"}
                </th>
                <th className="px-4 py-3 text-right">Settled Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isHospitality ? (
                <>
                  <tr className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-foreground block">Tanvir Chowdhury</span>
                      <span className="text-[11px] text-foreground-muted font-normal">
                        +880 1711-223344 · VIP Tier II
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">Deluxe Ocean Suite (Room 304)</td>
                    <td className="px-4 py-3.5 text-foreground-muted">
                      Oct 17, 2026 – Oct 20, 2026
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      <CurrencyDisplay amount={25500} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status="confirmed" />
                    </td>
                  </tr>
                  <tr className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-foreground block">Farhana Rahman</span>
                      <span className="text-[11px] text-foreground-muted font-normal">
                        +880 1819-887766 · Executive Steward
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">Presidential Villa (Villa 02)</td>
                    <td className="px-4 py-3.5 text-foreground-muted">
                      Oct 18, 2026 – Oct 22, 2026
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      <CurrencyDisplay amount={96000} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status="checked_in" />
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-foreground block">Shafiqul Islam</span>
                      <span className="text-[11px] text-foreground-muted font-normal">
                        Flat 4A · Lakeview Residence
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">October 2026</td>
                    <td className="px-4 py-3.5 text-foreground-muted">
                      Oct 05, 2026 (bKash Corporate)
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      <CurrencyDisplay amount={28500} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status="paid" />
                    </td>
                  </tr>
                  <tr className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-foreground block">Nazmul Hasan</span>
                      <span className="text-[11px] text-foreground-muted font-normal">
                        Flat 2B · Lakeview Residence
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">October 2026</td>
                    <td className="px-4 py-3.5 text-foreground-muted">Oct 08, 2026 (Bank Wire)</td>
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      <CurrencyDisplay amount={32000} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status="paid" />
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
