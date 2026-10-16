"use client";

import { Badge, Card, CurrencyDisplay, StatusBadge } from "@omniheaven/ui";
import type { ProductType } from "@omniheaven/validators";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarCheck,
  Clock,
  DollarSign,
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
      {/* Welcome banner with 6-month free trial badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:to-indigo-950/30">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{organizationName}</h1>
            <Badge className="bg-indigo-600 text-white text-[11px] font-semibold px-2 py-0.5 capitalize">
              {productType} Edition
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time management dashboard, automated billing, and live property operations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 block">
              ● Pro Plan (Active)
            </span>
            <span className="text-xs text-slate-500 font-medium">
              6-Month Free Trial: 172 Days Left
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      {isHospitality ? (
        // Hotel / Resort KPI Cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Occupancy Rate</span>
              <BedDouble className="size-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">84.2%</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                <TrendingUp className="size-3 mr-0.5" /> +5.4%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">38 of 45 rooms occupied tonight</p>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Today's Arrivals</span>
              <CalendarCheck className="size-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">12</span>
              <span className="text-xs text-slate-400">8 checked in</span>
            </div>
            <p className="text-[11px] text-slate-400">4 expected before 9:00 PM</p>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Today's Revenue</span>
              <DollarSign className="size-4 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={92400} large />
            </div>
            <p className="text-[11px] text-slate-400">Direct website + front desk</p>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Rooms In Cleaning</span>
              <Clock className="size-4 text-sky-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">5</span>
              <StatusBadge status="cleaning" />
            </div>
            <p className="text-[11px] text-slate-400">Housekeeping assigned</p>
          </Card>
        </div>
      ) : (
        // Building / Flat KPI Cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Total Flats</span>
              <Building2 className="size-4 text-indigo-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">24</span>
              <span className="text-xs font-semibold text-emerald-600">22 Occupied</span>
            </div>
            <p className="text-[11px] text-slate-400">2 vacant flats ready for lease</p>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Rent Collected (This Month)</span>
              <DollarSign className="size-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={385000} large />
            </div>
            <p className="text-[11px] text-slate-400">18 of 22 renters paid</p>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Pending Overdue</span>
              <AlertCircle className="size-4 text-rose-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <CurrencyDisplay amount={72000} large className="text-rose-600" />
              <StatusBadge status="overdue" />
            </div>
            <p className="text-[11px] text-slate-400">4 renters with past-due bills</p>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Open Maintenance</span>
              <Wrench className="size-4 text-amber-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white">3</span>
              <StatusBadge status="in_progress" />
            </div>
            <p className="text-[11px] text-slate-400">Plumbing & electrical requests</p>
          </Card>
        </div>
      )}

      {/* Recent Activity Table */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {isHospitality ? "Recent Guest Reservations" : "Recent Rent Collections"}
          </h2>
          <span className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">
            View All Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-2.5">{isHospitality ? "Guest Name" : "Renter / Flat"}</th>
                <th className="px-3 py-2.5">{isHospitality ? "Room Type" : "Billing Month"}</th>
                <th className="px-3 py-2.5">
                  {isHospitality ? "Check-in / Check-out" : "Payment Date"}
                </th>
                <th className="px-3 py-2.5">Amount</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isHospitality ? (
                <>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      Tanvir Chowdhury
                      <span className="text-[11px] text-slate-400 block font-normal">
                        +8801711223344
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      Deluxe Ocean Suite (Room 304)
                    </td>
                    <td className="px-3 py-3 text-slate-500">Oct 17, 2026 – Oct 20, 2026</td>
                    <td className="px-3 py-3 font-bold">
                      <CurrencyDisplay amount={25500} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status="confirmed" />
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      Farhana Rahman
                      <span className="text-[11px] text-slate-400 block font-normal">
                        +8801819887766
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      Presidential Villa (Villa 02)
                    </td>
                    <td className="px-3 py-3 text-slate-500">Oct 18, 2026 – Oct 22, 2026</td>
                    <td className="px-3 py-3 font-bold">
                      <CurrencyDisplay amount={96000} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status="checked_in" />
                    </td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      Shafiqul Islam
                      <span className="text-[11px] text-slate-400 block font-normal">
                        Flat 4A · Lakeview Tower
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">October 2026</td>
                    <td className="px-3 py-3 text-slate-500">Oct 05, 2026 (bKash)</td>
                    <td className="px-3 py-3 font-bold">
                      <CurrencyDisplay amount={28500} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status="paid" />
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white">
                      Nazmul Hasan
                      <span className="text-[11px] text-slate-400 block font-normal">
                        Flat 2B · Lakeview Tower
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">October 2026</td>
                    <td className="px-3 py-3 text-slate-500">Oct 08, 2026 (Cash)</td>
                    <td className="px-3 py-3 font-bold">
                      <CurrencyDisplay amount={32000} />
                    </td>
                    <td className="px-3 py-3">
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
