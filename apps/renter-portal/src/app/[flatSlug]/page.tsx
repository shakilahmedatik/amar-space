"use client";

import { Badge, Button, Card, CurrencyDisplay, StatusBadge } from "@omniheaven/ui";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  HeartPulse,
  Phone,
  Pin,
  Plus,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { use, useState } from "react";
import { TenantLeaseModal } from "../../components/tenant-lease-modal";
import { TenantPaymentModal } from "../../components/tenant-payment-modal";
import { TenantReceiptModal } from "../../components/tenant-receipt-modal";
import { TenantReportProblemModal } from "../../components/tenant-report-problem-modal";
import { trpc } from "../../lib/trpc";

interface PageProps {
  params: Promise<{ flatSlug: string }>;
}

export default function FlatPortalDashboardPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const flatSlug = resolvedParams?.flatSlug || "flat-1a";

  const [activeTab, setActiveTab] = useState<
    "lease" | "bills" | "maintenance" | "notices" | "contacts"
  >("bills");

  // Modals state
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);
  const [selectedBillForReceipt, setSelectedBillForReceipt] = useState<any | null>(null);
  const [isLeaseModalOpen, setIsLeaseModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState<string | null>(null);

  // tRPC Queries
  const { data: portalData, refetch: refetchBilling } = trpc.billing.getPortalFlatBilling.useQuery({
    flatSlug,
  });

  const { data: myTickets = [], refetch: refetchTickets } =
    trpc.operations.getMyMaintenanceRequests.useQuery();

  // Derived data with robust fallbacks
  const flat = portalData?.flat ?? {
    flatNumber: "1A",
    floor: 1,
    unitType: "residential",
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1450,
    status: "occupied",
    electricityMeterNumber: "DESCO-44910283",
    waterSubmeterNumber: "DWASA-10294",
    gasType: "pipeline",
  };

  const building = portalData?.building ?? {
    name: "Dhanmondi Lakeview Residency",
    address: "House 42, Road 8/A, Dhanmondi, Dhaka-1209",
    caretakerPhone: "01711000111",
    gateClosingTime: "11:30 PM",
  };

  const contract = portalData?.contract ?? {
    id: "contract-farhana-1a",
    status: "active",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    monthlyRent: "28000.00",
    serviceCharge: "5000.00",
    advanceDepositAmount: "56000.00",
    remainingDepositBalance: "56000.00",
    noticePeriodDays: 60,
    renter: {
      fullName: "Farhana Yasmin",
      phone: "01712345678",
      nidNumber: "19922612345678901",
      occupation: "Senior Software Architect",
      emergencyContactName: "Saiful Islam (Spouse)",
      emergencyContactNumber: "01819000111",
    },
  };

  const bills = portalData?.bills ?? [];

  // Active or latest bill
  const currentBill = bills.find((b) => b.status === "unpaid" || b.status === "partially_paid") ||
    bills[0] || {
      id: "bill-farhana-202611",
      billNumber: "INV-202611-1A",
      billingMonth: "2026-11",
      rentAmount: "28000.00",
      serviceChargeAmount: "5000.00",
      gasAmount: "1080.00",
      waterAmount: "650.00",
      electricityAmount: "3450.00",
      wasteAndOtherAmount: "300.00",
      lateFeeAmount: "0.00",
      totalAmount: "38480.00",
      advanceAdjustedAmount: "0.00",
      amountPaid: "0.00",
      balanceDue: "38480.00",
      status: "unpaid",
      dueDate: "2026-11-10",
      notes: "November bill generated automatically",
    };

  const isCurrentPaid = currentBill.status === "paid" || currentBill.status === "adjusted";
  const currentBalanceDue = parseFloat(currentBill.balanceDue || "0");

  const notices = portalData?.notices ?? [];
  const emergencyContacts = portalData?.emergencyContacts ?? [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Top Navigation */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="size-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
            Ω
          </span>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              Flat {flat.flatNumber} · {building.name}
            </h1>
            <p className="text-[11px] text-slate-400">
              Renter: {contract.renter.fullName} · Floor {flat.floor}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs text-emerald-600 bg-emerald-50/50 border-emerald-500/20 font-semibold"
          >
            Active Tenancy
          </Badge>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Payment Confirmation Banner */}
        {paymentSuccessNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>{paymentSuccessNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentSuccessNotice(null)}
              className="text-emerald-600 hover:text-emerald-700 font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Current Month Rent & Billing Card */}
        <Card className="p-6 border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-slate-900 dark:to-indigo-950/20 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Current Billing Period: {currentBill.billingMonth}
              </p>
              <div className="flex items-baseline gap-3 mt-1">
                <CurrencyDisplay
                  amount={
                    currentBalanceDue > 0
                      ? currentBalanceDue
                      : parseFloat(currentBill.totalAmount || "0")
                  }
                  large
                  className="text-3xl font-extrabold"
                />
                <StatusBadge status={currentBill.status as any} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Invoice: {currentBill.billNumber} · Due: {currentBill.dueDate || "10th of Month"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCurrentPaid ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBillForReceipt(currentBill)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-white dark:bg-slate-800 shadow-xs"
                >
                  <Download className="size-3.5 text-indigo-600" /> Download Money Receipt
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setSelectedBillForPayment(currentBill)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md min-h-[38px] px-4"
                >
                  <CreditCard className="size-3.5" /> Pay with bKash / Card
                </Button>
              )}
            </div>
          </div>

          {/* Quick breakdown metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <p className="text-slate-400">Monthly Rent</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                ৳
                {parseFloat(currentBill.rentAmount || contract.monthlyRent).toLocaleString("en-BD")}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Utility / Service</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                ৳
                {(
                  parseFloat(currentBill.serviceChargeAmount || contract.serviceCharge) +
                  parseFloat(currentBill.electricityAmount || "0") +
                  parseFloat(currentBill.gasAmount || "0") +
                  parseFloat(currentBill.waterAmount || "0") +
                  parseFloat(currentBill.wasteAndOtherAmount || "0")
                ).toLocaleString("en-BD")}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Due Date</p>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {currentBill.dueDate || "10th"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Advance Escrow Deposit</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 font-bold">
                ৳
                {parseFloat(
                  contract.remainingDepositBalance || contract.advanceDepositAmount || "0",
                ).toLocaleString("en-BD")}
              </p>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("bills")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "bills"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileText className="size-4" /> Itemized Bill History
          </button>
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
            onClick={() => setActiveTab("maintenance")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "maintenance"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Wrench className="size-4" /> Maintenance Tickets
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notices")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "notices"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="size-4" /> Building Notices ({notices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "contacts"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Phone className="size-4" /> Emergency Contacts
          </button>
        </div>

        {/* Tab Content: Itemized Bill History */}
        {activeTab === "bills" && (
          <div className="space-y-4">
            {/* Active Bill Detailed Breakdown */}
            <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Invoice #{currentBill.billNumber}
                    </h3>
                    <StatusBadge status={currentBill.status as any} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Period: {currentBill.billingMonth} · Due: {currentBill.dueDate || "10th"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Balance Due
                  </p>
                  <CurrencyDisplay
                    amount={currentBalanceDue}
                    className={`text-2xl font-black ${
                      currentBalanceDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"
                    }`}
                  />
                </div>
              </div>

              {/* Line items grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Monthly Rent</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-sm">
                    ৳{parseFloat(currentBill.rentAmount || "0").toLocaleString("en-BD")}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Service Charge</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 text-sm">
                    ৳{parseFloat(currentBill.serviceChargeAmount || "0").toLocaleString("en-BD")}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Electricity Submeter</span>
                  <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 text-sm">
                    ৳{parseFloat(currentBill.electricityAmount || "0").toLocaleString("en-BD")}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block">Gas, Water & Waste</span>
                  <p className="font-bold text-sky-600 dark:text-sky-400 mt-0.5 text-sm">
                    ৳
                    {(
                      parseFloat(currentBill.gasAmount || "0") +
                      parseFloat(currentBill.waterAmount || "0") +
                      parseFloat(currentBill.wasteAndOtherAmount || "0")
                    ).toLocaleString("en-BD")}
                  </p>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Total Bill Amount:{" "}
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    ৳{parseFloat(currentBill.totalAmount || "0").toLocaleString("en-BD")}.00
                  </span>
                </p>

                {currentBalanceDue <= 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedBillForReceipt(currentBill)}
                    className="w-full sm:w-auto min-h-[44px] text-xs flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Download className="size-4 text-indigo-600" /> View / Print Official Money
                    Receipt
                  </Button>
                ) : (
                  <Button
                    onClick={() => setSelectedBillForPayment(currentBill)}
                    className="w-full sm:w-auto min-h-[44px] text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-2 shadow-md"
                  >
                    <CreditCard className="size-4" /> Pay ৳
                    {currentBalanceDue.toLocaleString("en-BD")} with bKash / Card
                  </Button>
                )}
              </div>
            </Card>

            {/* Historical Invoices Card */}
            <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Payment History & Settled Invoices
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {bills.map((b) => (
                  <div
                    key={b.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {b.billNumber} · {b.billingMonth}
                        </p>
                        <StatusBadge status={b.status as any} />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {b.notes || `Rent and utilities for ${b.billingMonth}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <CurrencyDisplay
                        amount={parseFloat(b.totalAmount || "0")}
                        className="font-extrabold text-sm block"
                      />
                      {b.status === "paid" || b.status === "adjusted" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBillForReceipt(b)}
                          className="h-8 text-[11px] flex items-center gap-1"
                        >
                          <Download className="size-3 text-indigo-600" /> Receipt
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setSelectedBillForPayment(b)}
                          className="h-8 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Tab Content: Tenancy Agreement */}
        {activeTab === "lease" && (
          <Card className="p-5 space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tenancy Contract & Verified KYC Profile
                </h3>
                <p className="text-xs text-slate-500">
                  Registered lease agreement for Flat {flat.flatNumber}, {building.name}
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
                  {contract.renter.nidNumber || "19922612345678901"}
                </span>
                <span className="text-[10px] text-emerald-600 block">Smart NID Verified</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Emergency Medical Contact
                </span>
                <span className="font-bold text-rose-500 flex items-center gap-1">
                  <HeartPulse className="size-3" />{" "}
                  {contract.renter.emergencyContactName || "Spouse Contact"}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {(contract.renter as any).emergencyContactNumber ||
                    (contract.renter as any).emergencyContactPhone ||
                    "Emergency Active"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">
                  Advance Security Holding
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ৳
                  {parseFloat(
                    contract.remainingDepositBalance || contract.advanceDepositAmount || "0",
                  ).toLocaleString("en-BD")}
                </span>
                <span className="text-[10px] text-slate-400 block">Digital Escrow Protected</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[11px]">Lease Start Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {contract.startDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Lease Expiry</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {contract.endDate || "Ongoing"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Notice Period</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {contract.noticePeriodDays} Days
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Apartment Size</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {flat.squareFeet} sq ft ({flat.bedrooms} Bed, {flat.bathrooms} Bath)
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLeaseModalOpen(true)}
                className="text-xs gap-1.5 shadow-xs"
              >
                <Download className="size-3.5 text-indigo-600" /> View & Print Tenancy Agreement
                (চুক্তিপত্র)
              </Button>
            </div>
          </Card>
        )}

        {/* Tab Content: Maintenance Requests */}
        {activeTab === "maintenance" && (
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Service & Repair Requests
                </h3>
                <p className="text-[11px] text-slate-400">
                  Submit maintenance tickets and track caretaker resolution
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsReportModalOpen(true)}
                className="h-9 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 min-h-[36px]"
              >
                <Plus className="size-3.5" /> Report Issue
              </Button>
            </div>

            {myTickets.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <Wrench className="size-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No maintenance requests reported
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Experiencing plumbing leaks, electrical problems, or AC issues? Report them
                  directly.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsReportModalOpen(true)}
                  className="h-8 text-xs mt-2"
                >
                  Report a Problem
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {t.title}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize font-medium">
                            {t.category}
                          </Badge>
                          {t.priority === "urgent" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-bold text-rose-600 bg-rose-500/10 border-rose-500/20"
                            >
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Reported on{" "}
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                          {t.assignedToStaff &&
                            ` · Technician: ${t.assignedToStaff.name || "Assigned"}`}
                        </p>
                      </div>
                      <StatusBadge status={t.status as any} />
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t.description}
                    </p>

                    {/* Resolution details if resolved */}
                    {t.status === "resolved" && t.resolutionNotes && (
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 text-[11px] space-y-1">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 block flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Resolution Report
                        </span>
                        <p className="text-emerald-900 dark:text-emerald-200">
                          {t.resolutionNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tab Content: Building Announcements */}
        {activeTab === "notices" && (
          <Card className="p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Building Advisories & Notices
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct announcements from {building.name} property management
              </p>
            </div>

            {notices.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <Bell className="size-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No active announcements
                </p>
                <p className="text-[11px] text-slate-400">
                  All systems operating normally. Notices will appear here when published.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-xl border space-y-2 text-xs transition-all ${
                      n.isPinned
                        ? "border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {n.isPinned && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold flex items-center gap-1"
                          >
                            <Pin className="size-3" /> Pinned
                          </Badge>
                        )}
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                          {n.title}
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {n.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tab Content: Emergency Contacts */}
        {activeTab === "contacts" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Md. Rahim (Head Caretaker)
                </p>
                <p className="text-[11px] text-slate-400">
                  Main Building Gate & Intercom ({building.caretakerPhone})
                </p>
              </div>
              <a
                href={`tel:${building.caretakerPhone || "01711000111"}`}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 min-h-[44px]"
              >
                <Phone className="size-3" /> Call
              </a>
            </Card>

            <Card className="p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Building Security Desk
                </p>
                <p className="text-[11px] text-slate-400">24/7 Security Intercom & Night Gate</p>
              </div>
              <a
                href="tel:01822000222"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 min-h-[44px]"
              >
                <Phone className="size-3" /> Call
              </a>
            </Card>

            {emergencyContacts.map((c: any) => (
              <Card key={c.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-[11px] text-slate-400 capitalize">
                    {c.role} ({c.type})
                  </p>
                </div>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 min-h-[44px]"
                  >
                    <Phone className="size-3" /> Call
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Tenant Payment Modal */}
      {selectedBillForPayment && (
        <TenantPaymentModal
          isOpen={!!selectedBillForPayment}
          onClose={() => setSelectedBillForPayment(null)}
          bill={selectedBillForPayment}
          flatNumber={flat.flatNumber}
          buildingName={building.name}
          onSuccess={(payment) => {
            refetchBilling();
            setPaymentSuccessNotice(
              `Payment of ৳${parseFloat(payment.amount).toLocaleString("en-BD")} successfully recorded via ${payment.paymentMethod.toUpperCase()} (Receipt: ${payment.receiptNumber}).`,
            );
          }}
        />
      )}

      {/* Tenant Money Receipt Modal */}
      {selectedBillForReceipt && (
        <TenantReceiptModal
          isOpen={!!selectedBillForReceipt}
          onClose={() => setSelectedBillForReceipt(null)}
          bill={selectedBillForReceipt}
          flatNumber={flat.flatNumber}
          floor={flat.floor}
          buildingName={building.name}
          buildingAddress={building.address}
          renterName={contract.renter.fullName}
          renterPhone={contract.renter.phone}
          renterNid={contract.renter.nidNumber}
        />
      )}

      {/* Tenant Tenancy Agreement Modal */}
      {isLeaseModalOpen && (
        <TenantLeaseModal
          isOpen={isLeaseModalOpen}
          onClose={() => setIsLeaseModalOpen(false)}
          contract={contract}
          flatNumber={flat.flatNumber}
          floor={flat.floor}
          buildingName={building.name}
          buildingAddress={building.address}
        />
      )}

      {/* Tenant Report Problem Modal */}
      <TenantReportProblemModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={() => refetchTickets()}
      />
    </div>
  );
}
