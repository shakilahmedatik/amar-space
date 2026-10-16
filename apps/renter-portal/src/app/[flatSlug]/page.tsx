"use client";

import { Badge, Button, Card, CurrencyDisplay, StatusBadge } from "@omniheaven/ui";
import { AlertTriangle, CreditCard, Download, FileText, Phone, Wrench } from "lucide-react";
import { useState } from "react";

export default function FlatPortalDashboardPage() {
  const [activeTab, setActiveTab] = useState<"bills" | "maintenance" | "notices" | "contacts">(
    "bills",
  );
  const [paidDemo, setPaidDemo] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="size-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            Ω
          </span>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Flat 4A · Lakeview Residence
            </h1>
            <p className="text-[11px] text-slate-400">Renter: Shafiqul Islam</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs text-emerald-600 bg-emerald-50/50 border-emerald-500/20"
          >
            Active Lease
          </Badge>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Current Month Rent Card */}
        <Card className="p-6 border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-slate-900 dark:to-indigo-950/20 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Current Billing Month: October 2026
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <CurrencyDisplay amount={28500} large className="text-3xl font-extrabold" />
                <StatusBadge status={paidDemo ? "paid" : "unpaid"} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {paidDemo ? (
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                  <Download className="size-3.5" /> Download Receipt
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setPaidDemo(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <CreditCard className="size-3.5" /> Pay with Paystation / bKash
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <p className="text-slate-400">Rent Amount</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">৳24,000</p>
            </div>
            <div>
              <p className="text-slate-400">Utility / Service</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">৳4,500</p>
            </div>
            <div>
              <p className="text-slate-400">Due Date</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Oct 10, 2026</p>
            </div>
            <div>
              <p className="text-slate-400">Advance Deposited</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">৳48,000</p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("bills")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "bills"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="size-4" /> Bill History
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("maintenance")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "maintenance"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Wrench className="size-4" /> Maintenance Requests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notices")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "notices"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="size-4" /> Building Notices
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "contacts"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Phone className="size-4" /> Emergency Contacts
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "bills" && (
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Payment Record (Last 6 Months)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">September 2026</p>
                  <p className="text-[11px] text-slate-400">Paid via bKash (Txn: 8A91KL0P)</p>
                </div>
                <div className="text-right">
                  <CurrencyDisplay amount={28500} className="font-bold block" />
                  <StatusBadge status="paid" />
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">August 2026</p>
                  <p className="text-[11px] text-slate-400">Paid via Bank Transfer</p>
                </div>
                <div className="text-right">
                  <CurrencyDisplay amount={28500} className="font-bold block" />
                  <StatusBadge status="paid" />
                </div>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "maintenance" && (
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Service & Repair Requests
              </h3>
              <Button size="sm" className="h-7 text-xs bg-indigo-600 text-white">
                + Report New Issue
              </Button>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-start justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Master Bedroom AC Water Dripping
                </p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Reported on Oct 14, 2026 · Caretaker assigned
                </p>
              </div>
              <StatusBadge status="in_progress" />
            </div>
          </Card>
        )}

        {activeTab === "notices" && (
          <Card className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Building Announcements
            </h3>
            <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-950 bg-amber-50/40 dark:bg-amber-950/20 space-y-1">
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold"
              >
                Scheduled Water Tank Cleaning
              </Badge>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Water supply maintenance on Saturday, Oct 24 (10:00 AM – 2:00 PM)
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Please reserve necessary water in advance. Normal supply will resume at 2:30 PM.
              </p>
            </div>
          </Card>
        )}

        {activeTab === "contacts" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Md. Rahim (Caretaker)
                </p>
                <p className="text-[11px] text-slate-400">Main Building Gate</p>
              </div>
              <a
                href="tel:01711000111"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
              >
                <Phone className="size-3" /> Call
              </a>
            </Card>

            <Card className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Building Security Desk
                </p>
                <p className="text-[11px] text-slate-400">24/7 Security Intercom</p>
              </div>
              <a
                href="tel:01822000222"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1"
              >
                <Phone className="size-3" /> Call
              </a>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
