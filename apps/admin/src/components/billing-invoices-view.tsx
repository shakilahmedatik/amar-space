"use client";

import {
  Badge,
  Button,
  Card,
  CurrencyDisplay,
  Input,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@omniheaven/ui";
import {
  Calendar,
  Coins,
  CreditCard,
  FileText,
  Filter,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import { AdjustAdvanceModal } from "./adjust-advance-modal";
import { BillDetailsModal } from "./bill-details-modal";
import { GenerateMonthlyBillsModal } from "./generate-monthly-bills-modal";
import { RecordPaymentModal } from "./record-payment-modal";

export function BillingInvoicesView() {
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedBillIdForDetails, setSelectedBillIdForDetails] = useState<string | null>(null);
  const [selectedBillIdForPayment, setSelectedBillIdForPayment] = useState<string | null>(null);
  const [advanceAdjustmentTarget, setAdvanceAdjustmentTarget] = useState<{
    contractId: string;
    billId: string;
  } | null>(null);

  // Fetch Bills & Rollup Metrics
  const { data, isLoading, refetch } = trpc.billing.listBills.useQuery({
    billingMonth: selectedMonth || undefined,
    status: selectedStatus === "all" ? undefined : (selectedStatus as any),
  });

  const bills = data?.bills || [];
  const metrics = data?.metrics || {
    totalBilled: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalAdvanceAdjusted: 0,
  };

  // Search filter
  const filteredBills = bills.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.billNumber.toLowerCase().includes(term) ||
      b.contract.renter.fullName.toLowerCase().includes(term) ||
      b.contract.flat.flatNumber.toLowerCase().includes(term) ||
      b.contract.flat.building.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Bills, Utilities & Financial Ledger
            </h1>
            <Badge variant="gold" className="text-[11px] px-2.5 py-0.5">
              Financial Engine
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-foreground-muted mt-1 max-w-2xl">
            Track monthly invoices, automated utility calculations (electric, gas, water), advance
            deposit drawdowns, and multi-channel rent payments.
          </p>
        </div>

        <Button
          variant="luxury"
          onClick={() => setIsGenerateOpen(true)}
          className="flex items-center gap-2 min-h-[44px] shadow-sm font-semibold"
        >
          <Plus className="size-4" />
          <span>Generate Monthly Bills</span>
        </Button>
      </div>

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card variant="goldAccent" className="p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
              Total Invoiced
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-border-gold/40">
              <FileText className="size-4" />
            </div>
          </div>
          <div>
            <CurrencyDisplay
              amount={metrics.totalBilled}
              large
              className="text-2xl font-bold font-display text-foreground tabular-nums"
            />
            <p className="text-[11px] text-foreground-muted mt-1">Across all selected bills</p>
          </div>
        </Card>

        <Card variant="default" className="p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
              Total Collected
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <CurrencyDisplay
              amount={metrics.totalCollected}
              large
              className="text-2xl font-bold font-display text-emerald-700 dark:text-emerald-400 tabular-nums"
            />
            <p className="text-[11px] text-foreground-muted mt-1">bKash, Bank & Cash collected</p>
          </div>
        </Card>

        <Card variant="default" className="p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
              Outstanding Dues
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
              <TrendingDown className="size-4" />
            </div>
          </div>
          <div>
            <CurrencyDisplay
              amount={metrics.totalOutstanding}
              large
              className="text-2xl font-bold font-display text-destructive tabular-nums"
            />
            <p className="text-[11px] text-foreground-muted mt-1">Receivable from active tenants</p>
          </div>
        </Card>

        <Card variant="default" className="p-5 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider">
              Advance Adjusted
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Coins className="size-4" />
            </div>
          </div>
          <div>
            <CurrencyDisplay
              amount={metrics.totalAdvanceAdjusted}
              large
              className="text-2xl font-bold font-display text-primary tabular-nums"
            />
            <p className="text-[11px] text-foreground-muted mt-1">Drawn from deposit ledger</p>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-surface border-border space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3 top-3 text-foreground-muted pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Flat, Tenant name, or Bill #..."
              className="pl-9 h-10 text-xs"
            />
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-foreground-muted shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Billing Months</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
            </select>
          </div>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <span className="text-[11px] font-semibold text-foreground-muted mr-1 uppercase tracking-wider flex items-center gap-1">
            <Filter className="size-3" />
            Status:
          </span>
          {[
            { id: "all", label: "All Bills" },
            { id: "unpaid", label: "Unpaid" },
            { id: "partially_paid", label: "Partially Paid" },
            { id: "paid", label: "Paid" },
            { id: "adjusted", label: "Advance Adjusted" },
            { id: "overdue", label: "Overdue" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStatus(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] ${
                selectedStatus === st.id
                  ? "bg-card text-foreground font-bold shadow-xs border border-border-gold/50"
                  : "bg-surface hover:bg-surface/80 text-foreground-muted"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Main Table / Mobile Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-surface-muted" />
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <Card className="p-12 text-center bg-surface border-border">
          <Receipt className="size-12 text-foreground-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-foreground">No Invoices Found</h3>
          <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
            No bills match your current filters. Click "Generate Monthly Bills" to create invoices
            for your active tenancy contracts.
          </p>
          <Button
            onClick={() => setIsGenerateOpen(true)}
            variant="outline"
            className="mt-4 text-xs min-h-[44px]"
          >
            Generate First Batch
          </Button>
        </Card>
      ) : (
        <>
          {/* Desktop Table (hidden on small viewports) */}
          <div className="hidden md:block rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-surface-muted/50 text-[11px] uppercase tracking-wider text-foreground-muted">
                <TableRow>
                  <TableHead className="py-3 px-4">Invoice / Month</TableHead>
                  <TableHead className="py-3 px-4">Flat & Tenant</TableHead>
                  <TableHead className="py-3 px-4">Rent + Service</TableHead>
                  <TableHead className="py-3 px-4">Utilities</TableHead>
                  <TableHead className="py-3 px-4">Total Billed</TableHead>
                  <TableHead className="py-3 px-4">Paid / Adjusted</TableHead>
                  <TableHead className="py-3 px-4">Balance Due</TableHead>
                  <TableHead className="py-3 px-4">Status</TableHead>
                  <TableHead className="py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border text-xs">
                {filteredBills.map((bill) => {
                  const utilitiesTotal =
                    parseFloat(bill.gasAmount || "0") +
                    parseFloat(bill.waterAmount || "0") +
                    parseFloat(bill.electricityAmount || "0") +
                    parseFloat(bill.wasteAndOtherAmount || "0") +
                    parseFloat(bill.lateFeeAmount || "0");
                  const balanceDueNum = parseFloat(bill.balanceDue || "0");
                  const remainingDeposit = parseFloat(bill.contract.remainingDepositBalance || "0");

                  return (
                    <TableRow key={bill.id} className="hover:bg-surface-muted/30 transition-colors">
                      <TableCell className="py-3 px-4">
                        <div className="font-bold text-foreground">{bill.billNumber}</div>
                        <div className="text-[11px] text-foreground-muted">
                          Month: {bill.billingMonth}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          Flat {bill.contract.flat.flatNumber}
                        </div>
                        <div className="text-[11px] text-foreground-muted">
                          {bill.contract.renter.fullName}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <CurrencyDisplay
                          amount={
                            parseFloat(bill.rentAmount) +
                            parseFloat(bill.serviceChargeAmount || "0")
                          }
                          className="font-semibold text-foreground"
                        />
                        <div className="text-[10px] text-foreground-muted">
                          Rent: ৳{bill.rentAmount}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          ৳{utilitiesTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-foreground-muted">
                          Elec: ৳{bill.electricityAmount} · Gas: ৳{bill.gasAmount}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <CurrencyDisplay
                          amount={parseFloat(bill.totalAmount)}
                          className="font-bold text-foreground text-sm"
                        />
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳
                          {(
                            parseFloat(bill.amountPaid || "0") +
                            parseFloat(bill.advanceAdjustedAmount || "0")
                          ).toLocaleString()}
                        </div>
                        {parseFloat(bill.advanceAdjustedAmount || "0") > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            (Adv: ৳{bill.advanceAdjustedAmount})
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <CurrencyDisplay
                          amount={balanceDueNum}
                          className={`font-bold ${
                            balanceDueNum > 0
                              ? "text-rose-600 dark:text-rose-400 text-sm"
                              : "text-foreground-muted"
                          }`}
                        />
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <StatusBadge status={bill.status as any} />
                      </TableCell>

                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedBillIdForDetails(bill.id)}
                            className="text-xs min-h-[36px]"
                          >
                            Details / Utilities
                          </Button>

                          {balanceDueNum > 0 && (
                            <Button
                              variant="luxury"
                              size="sm"
                              onClick={() => setSelectedBillIdForPayment(bill.id)}
                              className="text-xs min-h-[36px] font-bold flex items-center gap-1 shadow-xs"
                            >
                              <CreditCard className="size-3" />
                              Pay
                            </Button>
                          )}

                          {balanceDueNum > 0 && remainingDeposit > 0 && (
                            <Button
                              variant="goldOutline"
                              size="sm"
                              onClick={() =>
                                setAdvanceAdjustmentTarget({
                                  contractId: bill.contractId,
                                  billId: bill.id,
                                })
                              }
                              className="text-xs min-h-[36px]"
                            >
                              Adjust Adv.
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout (< 768px, >= 48px touch targets) */}
          <div className="block md:hidden space-y-3">
            {filteredBills.map((bill) => {
              const balanceDueNum = parseFloat(bill.balanceDue || "0");
              const remainingDeposit = parseFloat(bill.contract.remainingDepositBalance || "0");

              return (
                <Card key={bill.id} className="p-4 bg-surface border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{bill.billNumber}</span>
                        <StatusBadge status={bill.status as any} />
                      </div>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        Flat {bill.contract.flat.flatNumber} · {bill.contract.renter.fullName}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-foreground-muted uppercase">Due</p>
                      <CurrencyDisplay
                        amount={balanceDueNum}
                        className={`text-base font-extrabold ${
                          balanceDueNum > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground-muted"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-surface-muted text-xs">
                    <div>
                      <span className="text-[10px] text-foreground-muted">Total Billed:</span>
                      <p className="font-semibold text-foreground">৳{bill.totalAmount}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-foreground-muted">Paid / Adjusted:</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        ৳
                        {(
                          parseFloat(bill.amountPaid || "0") +
                          parseFloat(bill.advanceAdjustedAmount || "0")
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Accessible 48px touch action buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedBillIdForDetails(bill.id)}
                        className="text-xs min-h-[48px]"
                      >
                        Utility Entry
                      </Button>

                      {balanceDueNum > 0 && (
                        <Button
                          onClick={() => setSelectedBillIdForPayment(bill.id)}
                          className="text-xs min-h-[48px] bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1.5"
                        >
                          <CreditCard className="size-4" />
                          Record Pay
                        </Button>
                      )}
                    </div>

                    {balanceDueNum > 0 && remainingDeposit > 0 && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          setAdvanceAdjustmentTarget({
                            contractId: bill.contractId,
                            billId: bill.id,
                          })
                        }
                        className="text-xs min-h-[48px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      >
                        Adjust from Advance (৳{remainingDeposit.toLocaleString()} avail.)
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Global Modals for Billing */}
      <GenerateMonthlyBillsModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        onSuccess={() => refetch()}
      />

      <BillDetailsModal
        billId={selectedBillIdForDetails}
        open={!!selectedBillIdForDetails}
        onOpenChange={(open) => !open && setSelectedBillIdForDetails(null)}
        onOpenPayment={(id) => setSelectedBillIdForPayment(id)}
        onOpenAdvanceAdjustment={(cId, bId) =>
          setAdvanceAdjustmentTarget({ contractId: cId, billId: bId })
        }
      />

      <RecordPaymentModal
        billId={selectedBillIdForPayment}
        open={!!selectedBillIdForPayment}
        onOpenChange={(open) => !open && setSelectedBillIdForPayment(null)}
        onSuccess={() => refetch()}
      />

      <AdjustAdvanceModal
        contractId={advanceAdjustmentTarget?.contractId || null}
        billId={advanceAdjustmentTarget?.billId || null}
        open={!!advanceAdjustmentTarget}
        onOpenChange={(open) => !open && setAdvanceAdjustmentTarget(null)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
