"use client";

import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omniheaven/ui";
import { AlertCircle, Calendar, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

interface GenerateMonthlyBillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GenerateMonthlyBillsModal({
  open,
  onOpenChange,
  onSuccess,
}: GenerateMonthlyBillsModalProps) {
  // Default to November 2026 and 10th of the month
  const [billingMonth, setBillingMonth] = useState("2026-11");
  const [dueDate, setDueDate] = useState("2026-11-10");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [notes, setNotes] = useState("Automated monthly rent roll batch");
  const [resultSummary, setResultSummary] = useState<{
    createdCount: number;
    skippedCount: number;
  } | null>(null);

  // Fetch buildings
  const { data: buildingsData, isLoading: buildingsLoading } =
    trpc.property.listBuildings.useQuery();
  const buildings = buildingsData || [];

  // Default select first building
  const activeBuildingId = selectedBuildingId || (buildings[0]?.id ?? "");

  const utils = trpc.useUtils();
  const generateBillsMutation = trpc.billing.generateMonthlyBills.useMutation({
    onSuccess: (data) => {
      setResultSummary({
        createdCount: data.createdCount,
        skippedCount: data.skippedCount,
      });
      utils.billing.listBills.invalidate();
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBuildingId) return;

    generateBillsMutation.mutate({
      buildingId: activeBuildingId,
      billingMonth,
      dueDate,
      notes,
    });
  };

  const handleClose = () => {
    setResultSummary(null);
    generateBillsMutation.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border border-border-gold/50 shadow-2xl text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-champagne/15 border border-primary/25 text-primary shadow-xs">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-serif font-display font-medium tracking-tight text-foreground">
                Generate Monthly Invoices
              </DialogTitle>
              <DialogDescription className="text-xs text-foreground-muted">
                Batch generate monthly rent and service charges for active tenancy agreements.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {resultSummary ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-start gap-3">
              <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-serif font-display font-medium">
                  Billing Batch Successfully Processed
                </p>
                <p className="text-xs mt-1 text-foreground-muted">
                  Generated{" "}
                  <span className="font-bold text-foreground">{resultSummary.createdCount}</span>{" "}
                  new invoices.
                  {resultSummary.skippedCount > 0 && (
                    <span>
                      {" "}
                      ({resultSummary.skippedCount} existing invoices skipped for idempotency).
                    </span>
                  )}
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="luxury" onClick={handleClose} className="w-full min-h-[44px]">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {generateBillsMutation.error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{generateBillsMutation.error.message}</span>
              </div>
            )}

            {/* Building Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Building / Property</Label>
              {buildingsLoading ? (
                <div className="h-10 rounded-lg bg-surface-muted animate-pulse" />
              ) : (
                <select
                  value={activeBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.city})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Billing Month & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Billing Month</Label>
                <div className="relative">
                  <Input
                    type="month"
                    value={billingMonth}
                    onChange={(e) => {
                      setBillingMonth(e.target.value);
                      if (e.target.value) {
                        setDueDate(`${e.target.value}-10`);
                      }
                    }}
                    required
                    className="h-10 text-xs bg-background"
                  />
                  <Calendar className="size-3.5 absolute right-3 top-3 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="h-10 text-xs bg-background"
                />
              </div>
            </div>

            {/* Batch Info Card */}
            <Card
              variant="goldAccent"
              className="p-3.5 bg-champagne/5 border-primary/20 text-xs space-y-1"
            >
              <div className="flex items-center gap-1.5 text-primary font-semibold text-[11px] uppercase tracking-wider">
                <Sparkles className="size-3 text-primary" />
                <span>Automated Rent Roll Invariant</span>
              </div>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Invoices inherit Monthly Rent and Service Charge directly from signed lease
                contracts. Submeter electricity, gas, and water meter differentials can be entered
                after invoice generation.
              </p>
            </Card>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Invoice Notes / Instructions</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Please clear bill by the 10th to avoid late fees"
                className="h-10 text-xs bg-background"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="luxury"
                disabled={generateBillsMutation.isPending || !activeBuildingId}
                className="w-full sm:w-auto min-h-[44px] flex items-center gap-2"
              >
                {generateBillsMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating Invoices...
                  </>
                ) : (
                  <>
                    <FileText className="size-4" />
                    Generate Monthly Bills
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
