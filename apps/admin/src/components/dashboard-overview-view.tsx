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
import { trpc } from "../lib/trpc";

export function DashboardOverviewView({
  productType,
  organizationName,
}: {
  productType: ProductType;
  organizationName: string;
}) {
  const isHospitality = productType === "hotel" || productType === "resort";

  // Live tRPC queries
  const { data: buildings = [] } = trpc.property.listBuildings.useQuery();
  const { data: billsData } = trpc.billing.listBills.useQuery({ limit: 50 });
  const { data: rooms = [] } = trpc.hotel.listRooms.useQuery(undefined, {
    enabled: isHospitality,
  });
  const { data: bookings = [] } = trpc.hotel.listBookings.useQuery({}, { enabled: isHospitality });
  const { data: maintenanceData } = trpc.operations.listMaintenanceRequests.useQuery(
    { limit: 20 },
    { enabled: !isHospitality },
  );

  // Compute live hospitality stats
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const vacantRooms = rooms.filter((r) => r.status === "available").length;
  const cleaningRooms = rooms.filter((r) => r.status === "cleaning").length;
  const hospitalityOccupancyRate =
    totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : "0.0";

  const todayArrivals = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "checked_in",
  ).length;
  const checkedInCount = bookings.filter((b) => b.status === "checked_in").length;
  const dailyRevenue = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + Number(b.totalPrice || 0) + Number(b.extraCharges || 0), 0);

  // Compute live residential / estate stats
  const totalUnits = buildings.reduce((acc, b) => acc + (b.stats?.totalFlats || 0), 0);
  const occupiedUnits = buildings.reduce((acc, b) => acc + (b.stats?.occupiedFlats || 0), 0);
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const estateOccupancyRate =
    totalUnits > 0 ? ((occupiedUnits / totalUnits) * 100).toFixed(1) : "0.0";

  const monthlyCollected = billsData?.metrics?.totalCollected || 0;
  const settledBillsCount = (billsData?.bills || []).filter((b) => b.status === "paid").length;
  const totalBillsCount = billsData?.bills?.length || 0;

  const pendingDues = billsData?.metrics?.totalOutstanding || 0;
  const overdueCount = (billsData?.bills || []).filter(
    (b) => b.status === "overdue" || Number(b.balanceDue || 0) > 0,
  ).length;

  const openMaintenanceCount = (maintenanceData || []).filter(
    (m) => m.status === "open" || m.status === "in_progress",
  ).length;

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
                {hospitalityOccupancyRate}%
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="size-3" /> Live
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className="gold-gradient h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, Number(hospitalityOccupancyRate)))}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-foreground-muted flex items-center justify-between">
              <span>
                {occupiedRooms} of {totalRooms} rooms occupied
              </span>
              <span className="text-primary font-semibold">{vacantRooms} vacant</span>
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Active & Upcoming Arrivals
              </span>
              <CalendarCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                {todayArrivals}
              </span>
              <span className="text-xs text-foreground-muted">{checkedInCount} checked in</span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{
                  width: `${todayArrivals > 0 ? (checkedInCount / todayArrivals) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-foreground-muted">
              {Math.max(0, todayArrivals - checkedInCount)} expected arrivals
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Settled Booking Revenue
              </span>
              <DollarSign className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={dailyRevenue} large />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="size-3" /> Live
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div className="gold-gradient h-1.5 rounded-full" style={{ width: "100%" }} />
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
                {cleaningRooms}
              </span>
              <StatusBadge status="cleaning" />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className="bg-sky-500 h-1.5 rounded-full transition-all"
                style={{
                  width: `${totalRooms > 0 ? (cleaningRooms / totalRooms) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-foreground-muted">Housekeeping turnover underway</p>
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
                {totalUnits}
              </span>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {occupiedUnits} Occupied ({estateOccupancyRate}%)
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className="gold-gradient h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, Number(estateOccupancyRate)))}%` }}
              />
            </div>
            <p className="text-[11px] text-foreground-muted">
              {vacantUnits} vacant {vacantUnits === 1 ? "unit" : "units"} available for lease
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Rent & Dues Collected
              </span>
              <DollarSign className="size-4 text-primary" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={monthlyCollected} large />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{
                  width: `${totalBillsCount > 0 ? (settledBillsCount / totalBillsCount) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-foreground-muted">
              {settledBillsCount} of {totalBillsCount} resident invoices settled
            </p>
          </Card>

          <Card variant="default" className="p-5 space-y-3">
            <div className="flex items-center justify-between text-foreground-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Pending Overdue Dues
              </span>
              <AlertCircle className="size-4 text-destructive" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={pendingDues} large className="text-destructive font-bold" />
              <StatusBadge status={overdueCount > 0 ? "overdue" : "paid"} />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className="bg-destructive h-1.5 rounded-full transition-all"
                style={{
                  width: `${totalBillsCount > 0 ? (overdueCount / totalBillsCount) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-foreground-muted">
              {overdueCount} {overdueCount === 1 ? "invoice" : "invoices"} with outstanding balances
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
                {openMaintenanceCount}
              </span>
              <StatusBadge status={openMaintenanceCount > 0 ? "in_progress" : "paid"} />
            </div>
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-border/50">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all"
                style={{ width: `${openMaintenanceCount > 0 ? 50 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-foreground-muted">Active maintenance & repair orders</p>
          </Card>
        </div>
      )}

      {/* ==================== RECENT ACTIVITY LEDGER ==================== */}
      <Card variant="default" className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {isHospitality ? "Recent Guest Reservations & Stays" : "Recent Resident Invoices"}
            </h2>
            <p className="text-xs text-foreground-muted">
              Live transaction ledger synchronized with property database
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
                <th className="px-4 py-3">
                  {isHospitality ? "Booking Reference" : "Billing Period"}
                </th>
                <th className="px-4 py-3">{isHospitality ? "Check-in / Check-out" : "Due Date"}</th>
                <th className="px-4 py-3 text-right">Settled Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isHospitality ? (
                bookings.length > 0 ? (
                  bookings.slice(0, 5).map((booking) => (
                    <tr key={booking.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-foreground block">
                          {booking.guestName}
                        </span>
                        <span className="text-[11px] text-foreground-muted font-normal">
                          {booking.guestPhone} · {booking.guestEmail}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-foreground">
                        {booking.bookingReference}
                      </td>
                      <td className="px-4 py-3.5 text-foreground-muted">
                        {booking.checkInDate} – {booking.checkOutDate}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-foreground">
                        <CurrencyDisplay
                          amount={
                            Number(booking.totalPrice || 0) + Number(booking.extraCharges || 0)
                          }
                        />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={booking.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-foreground-muted">
                      No hospitality reservations found yet.
                    </td>
                  </tr>
                )
              ) : billsData?.bills && billsData.bills.length > 0 ? (
                billsData.bills.slice(0, 5).map((bill) => (
                  <tr key={bill.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-foreground block">
                        {bill.contract?.renter?.fullName || "Resident"}
                      </span>
                      <span className="text-[11px] text-foreground-muted font-normal">
                        Flat {bill.contract?.flat?.flatNumber || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-foreground">{bill.billingMonth}</td>
                    <td className="px-4 py-3.5 text-foreground-muted">{bill.dueDate}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-foreground">
                      <CurrencyDisplay amount={Number(bill.amountPaid || bill.totalAmount || 0)} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <StatusBadge status={bill.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-foreground-muted">
                    No billing transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
