"use client";

import { Badge, Button, Card, CurrencyDisplay, StatusBadge } from "@omniheaven/ui";
import {
  AlertTriangle,
  CreditCard,
  Download,
  FileText,
  HeartPulse,
  Phone,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { useState } from "react";

export default function FlatPortalDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "lease" | "bills" | "maintenance" | "notices" | "contacts"
  >("lease");
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
              Flat 1A · Dhanmondi Lakeview Residency
            </h1>
            <p className="text-[11px] text-slate-400">Renter: Farhana Yasmin</p>
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
                <CurrencyDisplay amount={33000} large className="text-3xl font-extrabold" />
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
              <p className="text-slate-400">Monthly Rent</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">৳28,000</p>
            </div>
            <div>
              <p className="text-slate-400">Utility / Service</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">৳5,000</p>
            </div>
            <div>
              <p className="text-slate-400">Due Date</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">Oct 07, 2026</p>
            </div>
            <div>
              <p className="text-slate-400">Advance Deposited</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 font-bold">
                ৳56,000
              </p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("lease")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "lease"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="size-4" /> Tenancy Agreement
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bills")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
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
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "contacts"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Phone className="size-4" /> Emergency Contacts
          </button>
        </div>

        {/* Tab Content: Lease Agreement */}
        {activeTab === "lease" && (
          <Card className="p-5 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tenancy Contract & Verified KYC Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Registered lease agreement for Flat 1A, Dhanmondi Lakeview Residency
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-bold text-emerald-600 bg-emerald-50/50"
              >
                Active & Verified
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Tenant National ID
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  19922612345678901
                </span>
                <span className="text-[10px] text-emerald-600 block">Smart NID Verified</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Medical Blood Group
                </span>
                <span className="font-bold text-rose-500 flex items-center gap-1">
                  <HeartPulse className="size-3" /> B+ (Positive)
                </span>
                <span className="text-[10px] text-slate-400 block">Emergency Registered</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Advance Security Holding
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ৳56,000 (2 Months)
                </span>
                <span className="text-[10px] text-slate-400 block">Escrow Ledger Protected</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Lease Start Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Jan 01, 2025
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lease Expiry</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Dec 31, 2025
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Notice Period</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">60 Days</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Resident Members</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">3 Members</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Download className="size-3.5" /> Download Signed Lease Agreement (PDF)
              </Button>
            </div>
          </Card>
        )}
        {activeTab === "bills" && (
          <div className="space-y-4">
            {/* Current Billing Month Breakdown */}
            <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Invoice #INV-202610-1A
                    </h3>
                    <StatusBadge status={paidDemo ? "paid" : "unpaid"} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Billing Month: October 2026 · Due: Oct 10, 2026
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Balance Due
                  </p>
                  <CurrencyDisplay
                    amount={paidDemo ? 0 : 38230}
                    className={`text-2xl font-black ${paidDemo ? "text-slate-400" : "text-rose-600 dark:text-rose-400"}`}
                  />
                </div>
              </div>

              {/* Line items grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Monthly Rent</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">৳28,000</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Service Charge</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">৳5,000</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Electricity (Submeter)</span>
                  <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">৳3,200</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Gas, Water & Waste</span>
                  <p className="font-bold text-sky-600 dark:text-sky-400 mt-0.5">৳2,030</p>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Total Billed:{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-300">৳38,230.00</span>
                </p>

                {paidDemo ? (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto min-h-[48px] text-xs flex items-center justify-center gap-1.5"
                  >
                    <Download className="size-4" /> Download Money Receipt (REC-202610-0014)
                  </Button>
                ) : (
                  <Button
                    onClick={() => setPaidDemo(true)}
                    className="w-full sm:w-auto min-h-[48px] text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md"
                  >
                    <CreditCard className="size-4" /> Pay ৳38,230 with bKash / Paystation
                  </Button>
                )}
              </div>
            </Card>

            {/* Historical Invoices Card */}
            <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Settled Payment Records (Audit Trail)
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        INV-202609-1A · September 2026
                      </p>
                      <StatusBadge status="paid" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Paid via bKash · TrxID: BK7819KL0P · Receipt: REC-202609-0011
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CurrencyDisplay amount={37850} className="font-extrabold text-sm block" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] flex items-center gap-1"
                    >
                      <Download className="size-3" /> Receipt
                    </Button>
                  </div>
                </div>

                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-white">
                        INV-202608-1A · August 2026
                      </p>
                      <StatusBadge status="paid" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Paid via City Bank Transfer · TrxID: CBL-881920 · Receipt: REC-202608-0009
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CurrencyDisplay amount={37900} className="font-extrabold text-sm block" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[11px] flex items-center gap-1"
                    >
                      <Download className="size-3" /> Receipt
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
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
