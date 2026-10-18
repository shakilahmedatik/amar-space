"use client";

import {
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
import { createContractSchema } from "@omniheaven/validators";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, CreditCard, FileCheck2, Home, Loader2, User } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "../lib/trpc";

interface CreateContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedRenterId?: string | null;
  preselectedFlatId?: string | null;
  onSuccess?: (contractId: string) => void;
}

export function CreateContractModal({
  open,
  onOpenChange,
  preselectedRenterId,
  preselectedFlatId,
  onSuccess,
}: CreateContractModalProps) {
  const queryClient = useQueryClient();

  const [renterId, setRenterId] = useState(preselectedRenterId || "");
  const [flatId, setFlatId] = useState(preselectedFlatId || "");
  const [monthlyRent, setMonthlyRent] = useState<number>(28000);
  const [serviceCharge, setServiceCharge] = useState<number>(5000);
  const [securityDepositAmount, setSecurityDepositAmount] = useState<number>(56000);
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2027-10-31");
  const [noticePeriodDays, setNoticePeriodDays] = useState<number>(30);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch renters for selector
  const { data: rentersList } = trpc.renter.listRenters.useQuery(undefined, {
    enabled: open,
  });

  // Fetch buildings and flats for selector
  const { data: buildingsList } = trpc.property.listBuildings.useQuery(undefined, {
    enabled: open,
  });

  // Collect vacant flats across all buildings
  const availableFlats = useMemo(() => {
    if (!buildingsList) return [];
    const flats: { id: string; label: string; rent: number; service: number }[] = [];
    for (const b of buildingsList) {
      for (const f of b.flats) {
        if (f.status === "vacant" || f.id === preselectedFlatId) {
          flats.push({
            id: f.id,
            label: `${b.name} · Flat ${f.flatNumber} (Floor ${f.floor})`,
            rent: f.defaultRentAmount || 28000,
            service: f.defaultServiceCharge || 5000,
          });
        }
      }
    }
    return flats;
  }, [buildingsList, preselectedFlatId]);

  // Synchronize defaults when flat changes
  useEffect(() => {
    if (flatId) {
      const selected = availableFlats.find((f) => f.id === flatId);
      if (selected) {
        setMonthlyRent(selected.rent);
        setServiceCharge(selected.service);
        setSecurityDepositAmount(selected.rent * 2); // Default to 2 months advance in BD
      }
    }
  }, [flatId, availableFlats]);

  useEffect(() => {
    if (preselectedRenterId) setRenterId(preselectedRenterId);
    if (preselectedFlatId) setFlatId(preselectedFlatId);
  }, [preselectedRenterId, preselectedFlatId]);

  const createMutation = trpc.renter.createContract.useMutation();

  const handleQuickDeposit = (multiplier: number) => {
    setSecurityDepositAmount(monthlyRent * multiplier);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!renterId) {
      setErrorMsg("Please select a registered tenant.");
      return;
    }
    if (!flatId) {
      setErrorMsg("Please select an available flat/unit.");
      return;
    }

    const validation = createContractSchema.safeParse({
      renterId,
      flatId,
      monthlyRent,
      serviceCharge,
      securityDepositAmount,
      startDate,
      endDate: endDate || null,
      noticePeriodDays,
    });

    if (!validation.success) {
      setErrorMsg(validation.error.issues[0]?.message || "Invalid contract terms.");
      return;
    }

    try {
      const created = await createMutation.mutateAsync(validation.data);
      await queryClient.invalidateQueries();
      onOpenChange(false);
      if (created?.id) {
        onSuccess?.(created.id);
      }
    } catch (err: any) {
      if (err.message === "FLAT_ALREADY_OCCUPIED") {
        setErrorMsg(
          "This flat already has an active tenancy agreement. Terminate previous lease first.",
        );
      } else {
        setErrorMsg(err.message || "Failed to draft tenancy agreement.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileCheck2 className="size-4" />
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-display font-bold text-foreground">
              Draft Tenancy Agreement
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-foreground-muted">
            Establish legal lease terms, advance security deposit ledger, and notice requirements.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tenant Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="contract-renter" className="text-xs font-semibold text-foreground">
              Select Registered Tenant *
            </Label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 size-4 text-foreground-muted pointer-events-none" />
              <select
                id="contract-renter"
                value={renterId}
                onChange={(e) => setRenterId(e.target.value)}
                className="w-full pl-10 pr-4 h-11 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">-- Choose Tenant from KYC Directory --</option>
                {rentersList?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.phone} · NID: {r.nidNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Flat Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="contract-flat" className="text-xs font-semibold text-foreground">
              Select Available Flat / Unit *
            </Label>
            <div className="relative">
              <Home className="absolute left-3.5 top-3.5 size-4 text-foreground-muted pointer-events-none" />
              <select
                id="contract-flat"
                value={flatId}
                onChange={(e) => setFlatId(e.target.value)}
                className="w-full pl-10 pr-4 h-11 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">-- Choose Flat --</option>
                {availableFlats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} — ৳{f.rent.toLocaleString()}/mo
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rent and Service Charge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contract-rent" className="text-xs font-semibold text-foreground">
                Monthly Net Rent (BDT ৳) *
              </Label>
              <Input
                id="contract-rent"
                type="number"
                min={1}
                step={500}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="h-11 text-xs bg-surface border-border tabular-nums font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-service" className="text-xs font-semibold text-foreground">
                Monthly Service Charge (BDT ৳)
              </Label>
              <Input
                id="contract-service"
                type="number"
                min={0}
                step={100}
                value={serviceCharge}
                onChange={(e) => setServiceCharge(Number(e.target.value))}
                className="h-11 text-xs bg-surface border-border tabular-nums"
              />
            </div>
          </div>

          {/* Advance Security Deposit Calculator */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                <Label htmlFor="contract-deposit" className="text-xs font-bold text-foreground">
                  Security Deposit Holding (Advance) *
                </Label>
              </div>

              {/* Quick multipliers */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDeposit(1)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:border-primary/50 text-foreground transition-all"
                >
                  1 Mo (৳{(monthlyRent * 1).toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDeposit(2)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:border-primary/50 text-foreground transition-all"
                >
                  2 Mo (৳{(monthlyRent * 2).toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDeposit(3)}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-card border border-border hover:border-primary/50 text-foreground transition-all"
                >
                  3 Mo (৳{(monthlyRent * 3).toLocaleString()})
                </button>
              </div>
            </div>

            <Input
              id="contract-deposit"
              type="number"
              min={0}
              step={1000}
              value={securityDepositAmount}
              onChange={(e) => setSecurityDepositAmount(Number(e.target.value))}
              className="h-11 text-xs bg-card border-border tabular-nums font-bold text-primary text-sm"
            />
            <p className="text-[11px] text-foreground-muted">
              Advance security deposit remains held in the organization ledger until tenancy
              handover.
            </p>
          </div>

          {/* Dates & Notice Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contract-start" className="text-xs font-semibold text-foreground">
                Tenancy Start Date *
              </Label>
              <Input
                id="contract-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 text-xs bg-surface border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-end" className="text-xs font-semibold text-foreground">
                Tenancy End Date
              </Label>
              <Input
                id="contract-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 text-xs bg-surface border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contract-notice" className="text-xs font-semibold text-foreground">
                Notice Period
              </Label>
              <select
                id="contract-notice"
                value={noticePeriodDays}
                onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
                className="w-full px-3 h-11 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value={15}>15 Days</option>
                <option value={30}>30 Days (Standard BD)</option>
                <option value={60}>60 Days (2 Months)</option>
                <option value={90}>90 Days (Quarterly)</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="luxury"
              disabled={createMutation.isPending}
              className="h-11 text-xs gap-2 min-h-[44px]"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Drafting Lease...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Save Draft Agreement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
