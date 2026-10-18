"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omniheaven/ui";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  HeartPulse,
  Loader2,
  LogOut,
  Phone,
  Shield,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

export interface ContractRecord {
  id: string;
  organizationId: string;
  renterId: string;
  flatId: string;
  monthlyRent: string | number;
  serviceCharge: string | number;
  securityDepositAmount: string | number;
  remainingDepositBalance: string | number;
  startDate: string;
  endDate?: string | null;
  noticePeriodDays: number;
  status: "draft" | "pending_signature" | "active" | "notice_period" | "terminated";
  terminationDate?: string | null;
  terminationReason?: string | null;
  contractDocumentUrl?: string | null;
  renter?: {
    id: string;
    fullName: string;
    phone: string;
    nidNumber: string;
    bloodGroup: string;
    occupation: string;
  } | null;
  flat?: {
    id: string;
    flatNumber: string;
    floor: number;
    squareFeet?: number | null;
    bedrooms?: number | null;
    building?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

interface ContractDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContractRecord | null;
  onUpdated?: () => void;
}

export function ContractDetailModal({
  open,
  onOpenChange,
  contract,
  onUpdated,
}: ContractDetailModalProps) {
  const queryClient = useQueryClient();

  const [activeSubView, setActiveSubView] = useState<"details" | "notice" | "terminate">("details");

  // Notice Period State
  const [expectedDepartureDate, setExpectedDepartureDate] = useState("2026-11-30");
  const [noticeReason, setNoticeReason] = useState("");

  // Terminate & Handover State
  const [terminationDate, setTerminationDate] = useState("2026-11-30");
  const [terminationReason, setTerminationReason] = useState("Tenancy concluding upon notice");
  const [deductions, setDeductions] = useState<number>(0);
  const [nextFlatStatus, setNextFlatStatus] = useState<"vacant" | "under_maintenance">("vacant");
  const [inspectionNotes, setInspectionNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activateMutation = trpc.renter.activateContract.useMutation();
  const noticeMutation = trpc.renter.submitNoticePeriod.useMutation();
  const terminateMutation = trpc.renter.terminateContract.useMutation();

  if (!contract) return null;

  const rentNum = Number(contract.monthlyRent || 0);
  const serviceNum = Number(contract.serviceCharge || 0);
  const depositNum = Number(contract.securityDepositAmount || 0);
  const balanceNum = Number(contract.remainingDepositBalance || 0);
  const refundAmount = Math.max(0, balanceNum - deductions);

  const handleActivate = async () => {
    setErrorMsg(null);
    try {
      await activateMutation.mutateAsync({
        contractId: contract.id,
        initialDepositReceived: true,
      });
      await queryClient.invalidateQueries();
      onUpdated?.();
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to activate contract.");
    }
  };

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!noticeReason.trim()) {
      setErrorMsg("Please specify the reason for departure notice.");
      return;
    }
    try {
      await noticeMutation.mutateAsync({
        contractId: contract.id,
        expectedDepartureDate,
        reason: noticeReason.trim(),
      });
      await queryClient.invalidateQueries();
      onUpdated?.();
      setActiveSubView("details");
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit departure notice.");
    }
  };

  const handleTerminateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await terminateMutation.mutateAsync({
        contractId: contract.id,
        terminationDate,
        terminationReason: terminationReason.trim(),
        deductions,
        refundAmount,
        nextFlatStatus,
        inspectionNotes: inspectionNotes.trim() || null,
      });
      await queryClient.invalidateQueries();
      onUpdated?.();
      setActiveSubView("details");
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to terminate tenancy contract.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="size-4" />
              </span>
              <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-foreground">
                Tenancy Lease Agreement
              </DialogTitle>
            </div>

            {/* Status Badge */}
            <Badge
              variant="outline"
              className={`text-xs font-bold uppercase tracking-wider ${
                contract.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : contract.status === "notice_period"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : contract.status === "draft"
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-surface text-foreground-muted border-border"
              }`}
            >
              {contract.status === "active"
                ? "Active Tenancy"
                : contract.status === "notice_period"
                  ? "Notice Period"
                  : contract.status === "draft"
                    ? "Draft Agreement"
                    : "Terminated"}
            </Badge>
          </div>

          <DialogDescription className="text-xs text-foreground-muted">
            {contract.flat?.building?.name || "Residential Property"} · Flat{" "}
            {contract.flat?.flatNumber || "1A"}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* VIEW 1: Contract Details & Advance Deposit Ledger */}
        {activeSubView === "details" && (
          <div className="space-y-5 pt-2">
            {/* Tenant KYC Card */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Tenant Details
                </span>
                {contract.renter?.bloodGroup && (
                  <Badge variant="outline" className="text-rose-500 font-bold text-[10px]">
                    <HeartPulse className="size-3 mr-1" />
                    Blood: {contract.renter.bloodGroup}
                  </Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {contract.renter?.fullName || "Registered Tenant"}
                  </h4>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {contract.renter?.occupation || "Professional"}
                  </p>
                </div>
                <div className="text-xs text-foreground-muted space-y-0.5 sm:text-right">
                  <p className="flex items-center gap-1 sm:justify-end">
                    <Phone className="size-3 text-primary" /> {contract.renter?.phone}
                  </p>
                  <p className="flex items-center gap-1 sm:justify-end">
                    <Shield className="size-3 text-primary" /> NID: {contract.renter?.nidNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Ledger & Rent Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Monthly Rent
                </span>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  ৳{rentNum.toLocaleString()}
                </p>
                <p className="text-[10px] text-foreground-muted">Net rental fee</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Service Charge
                </span>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  ৳{serviceNum.toLocaleString()}
                </p>
                <p className="text-[10px] text-foreground-muted">Lift, security & generator</p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                  Total Monthly
                </span>
                <p className="text-lg font-bold text-primary tabular-nums">
                  ৳{(rentNum + serviceNum).toLocaleString()}
                </p>
                <p className="text-[10px] text-foreground-muted">Due by 7th of month</p>
              </div>
            </div>

            {/* Advance Deposit Ledger Widget */}
            <div className="p-4 rounded-2xl bg-card border border-primary/30 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <CreditCard className="size-3.5" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-foreground">
                      Advance Security Deposit Ledger
                    </h5>
                    <p className="text-[10px] text-foreground-muted">
                      Managed holding balance for damage and utility settlement
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-bold text-primary">
                  Holding Active
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                <div>
                  <span className="text-[10px] text-foreground-muted">
                    Initial Advance Deposited
                  </span>
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    ৳{depositNum.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-foreground-muted">Remaining Balance</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    ৳{balanceNum.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Dates & Timeline */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface border border-border text-xs">
              <div>
                <span className="text-[10px] text-foreground-muted block">Start Date</span>
                <span className="font-semibold text-foreground">{contract.startDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-foreground-muted block">End Date</span>
                <span className="font-semibold text-foreground">
                  {contract.endDate || "Open-ended"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-foreground-muted block">Notice Period</span>
                <span className="font-semibold text-foreground">
                  {contract.noticePeriodDays} Days
                </span>
              </div>
            </div>

            {/* Departure Notice Banner if active notice */}
            {contract.status === "notice_period" && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="size-4 text-amber-500" />
                  <span>
                    Departure Notice Active (Move-out: {contract.terminationDate || "Pending"})
                  </span>
                </div>
                <p className="text-[11px] opacity-90">
                  Reason: {contract.terminationReason || "Tenant departure announced."}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <DialogFooter className="pt-4 border-t border-border flex flex-col sm:flex-row justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 text-xs"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {contract.status === "draft" && (
                  <Button
                    type="button"
                    variant="luxury"
                    disabled={activateMutation.isPending}
                    onClick={handleActivate}
                    className="h-11 text-xs gap-1.5 min-h-[44px]"
                  >
                    {activateMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Activate Tenancy Lease
                  </Button>
                )}

                {contract.status === "active" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveSubView("notice")}
                    className="h-11 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <Clock className="size-3.5 mr-1" />
                    Submit Departure Notice
                  </Button>
                )}

                {(contract.status === "active" || contract.status === "notice_period") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveSubView("terminate")}
                    className="h-11 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                  >
                    <LogOut className="size-3.5 mr-1" />
                    Terminate & Checkout
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        )}

        {/* VIEW 2: Submit Notice Period */}
        {activeSubView === "notice" && (
          <form onSubmit={handleNoticeSubmit} className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
              <p className="font-bold">Formal Departure Notice Submission</p>
              <p className="text-[11px] mt-0.5">
                Transition this agreement to notice status. The property manager can begin listing
                the flat for prospective renters.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-date" className="text-xs font-semibold text-foreground">
                Expected Departure Date *
              </Label>
              <Input
                id="notice-date"
                type="date"
                value={expectedDepartureDate}
                onChange={(e) => setExpectedDepartureDate(e.target.value)}
                className="h-11 text-xs bg-surface border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-reason" className="text-xs font-semibold text-foreground">
                Reason for Departure *
              </Label>
              <textarea
                id="notice-reason"
                rows={3}
                placeholder="e.g. Relocating to Chittagong for workplace posting / Purchased own apartment"
                value={noticeReason}
                onChange={(e) => setNoticeReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSubView("details")}
                className="h-11 text-xs"
              >
                Back to Details
              </Button>
              <Button
                type="submit"
                variant="luxury"
                disabled={noticeMutation.isPending}
                className="h-11 text-xs gap-1.5 min-h-[44px]"
              >
                {noticeMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Confirm Notice Period
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* VIEW 3: Terminate & Handover Checkout */}
        {activeSubView === "terminate" && (
          <form onSubmit={handleTerminateSubmit} className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-200">
              <p className="font-bold">Final Handover & Security Deposit Settlement</p>
              <p className="text-[11px] mt-0.5">
                Keys return, utility submeter readings verification, repairs deductions, and tenant
                refund reconciliation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="term-date" className="text-xs font-semibold text-foreground">
                  Actual Move-Out Date *
                </Label>
                <Input
                  id="term-date"
                  type="date"
                  value={terminationDate}
                  onChange={(e) => setTerminationDate(e.target.value)}
                  className="h-11 text-xs bg-surface border-border"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="term-next-status" className="text-xs font-semibold text-foreground">
                  Next Flat Status *
                </Label>
                <select
                  id="term-next-status"
                  value={nextFlatStatus}
                  onChange={(e) => setNextFlatStatus(e.target.value as any)}
                  className="w-full px-3 h-11 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="vacant">Available / Vacant (Ready to Lease)</option>
                  <option value="under_maintenance">
                    Under Maintenance (Repainting / Repairs)
                  </option>
                </select>
              </div>
            </div>

            {/* Deductions and Refund Ledger */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-muted">Advance Deposit Held:</span>
                <span className="font-bold text-foreground tabular-nums">
                  ৳{balanceNum.toLocaleString()}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="term-deductions" className="text-xs font-semibold text-foreground">
                  Deductions (Repairs, Paint, Unpaid WASA/DPDC) (BDT ৳)
                </Label>
                <Input
                  id="term-deductions"
                  type="number"
                  min={0}
                  step={500}
                  value={deductions}
                  onChange={(e) => setDeductions(Math.max(0, Number(e.target.value)))}
                  className="h-11 text-xs bg-card border-border tabular-nums font-bold"
                />
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                <span className="font-bold text-foreground">Calculated Refund to Tenant:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ৳{refundAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="term-reason" className="text-xs font-semibold text-foreground">
                Termination Reason *
              </Label>
              <Input
                id="term-reason"
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                className="h-11 text-xs bg-surface border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="term-notes" className="text-xs font-semibold text-foreground">
                Inspection & Handover Notes
              </Label>
              <textarea
                id="term-notes"
                rows={2}
                placeholder="e.g. Keys returned (2 sets). Meter readings verified: DPDC 4820 kWh, WASA 320."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                className="w-full p-3 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveSubView("details")}
                className="h-11 text-xs"
              >
                Back to Details
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={terminateMutation.isPending}
                className="h-11 text-xs gap-1.5 min-h-[44px]"
              >
                {terminateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Confirm Final Handover
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
