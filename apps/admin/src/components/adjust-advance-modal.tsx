"use client";

import {
  Button,
  Card,
  CurrencyDisplay,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omniheaven/ui";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";

interface AdjustAdvanceModalProps {
  contractId: string | null;
  billId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdjustAdvanceModal({
  contractId,
  billId,
  open,
  onOpenChange,
  onSuccess,
}: AdjustAdvanceModalProps) {
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<
    "rent_adjustment" | "utility_adjustment" | "damage_deduction" | "refund_upon_termination"
  >("rent_adjustment");
  const [note, setNote] = useState("Adjusted against advance security deposit");
  const [isDone, setIsDone] = useState(false);

  // Fetch bill
  const { data: bill } = trpc.billing.getBillById.useQuery(
    { billId: billId ?? "" },
    { enabled: !!billId && open },
  );

  // Remaining security deposit balance on the lease contract
  const remainingDepositBalance = parseFloat(bill?.contract.remainingDepositBalance || "0");
  const balanceDue = parseFloat(bill?.balanceDue || "0");

  useEffect(() => {
    if (balanceDue > 0 && remainingDepositBalance > 0) {
      // Pre-fill with lesser of balanceDue and remainingDepositBalance
      const prefill = Math.min(balanceDue, remainingDepositBalance);
      setAdjustmentAmount(prefill);
    }
  }, [balanceDue, remainingDepositBalance]);

  const utils = trpc.useUtils();
  const applyAdjustmentMutation = trpc.billing.applyAdvanceAdjustment.useMutation({
    onSuccess: () => {
      setIsDone(true);
      utils.billing.listBills.invalidate();
      onSuccess?.();
    },
  });

  if (!billId || !contractId) return null;

  const isExcessiveDeposit = adjustmentAmount > remainingDepositBalance;
  const isExcessiveBill = adjustmentAmount > balanceDue;
  const projectedRemainingDeposit = Math.max(0, remainingDepositBalance - adjustmentAmount);
  const projectedRemainingBill = Math.max(0, balanceDue - adjustmentAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExcessiveDeposit || isExcessiveBill || adjustmentAmount <= 0) return;

    applyAdjustmentMutation.mutate({
      contractId,
      billId,
      amount: adjustmentAmount,
      adjustmentType,
      note,
    });
  };

  const handleClose = () => {
    setIsDone(false);
    applyAdjustmentMutation.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border border-border-gold/50 shadow-2xl text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-border-gold/40">
              <Coins className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-display text-foreground">
                Adjust Against Security Deposit
              </DialogTitle>
              <DialogDescription className="text-xs text-foreground-muted">
                Deduct from the tenant's advance security deposit balance to settle invoice due.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isDone ? (
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-start gap-3">
              <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Advance Deposit Adjustment Complete</p>
                <p className="text-xs mt-1 text-foreground-muted">
                  Deducted ৳{adjustmentAmount.toLocaleString()} from advance deposit balance.
                  Invoice balance updated.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={handleClose} className="w-full min-h-[44px]">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {applyAdjustmentMutation.error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{applyAdjustmentMutation.error.message}</span>
              </div>
            )}

            {/* Balances Card */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-muted border border-border text-xs">
              <div>
                <p className="text-[11px] text-foreground-muted">Available Deposit</p>
                <CurrencyDisplay
                  amount={remainingDepositBalance}
                  className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5"
                />
              </div>
              <div>
                <p className="text-[11px] text-foreground-muted">Current Invoice Due</p>
                <CurrencyDisplay
                  amount={balanceDue}
                  className="font-bold text-rose-600 dark:text-rose-400 text-sm mt-0.5"
                />
              </div>
            </div>

            {/* Adjustment Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="adjAmount" className="font-semibold">
                  Adjustment Amount (BDT)
                </Label>
                <button
                  type="button"
                  onClick={() => setAdjustmentAmount(Math.min(balanceDue, remainingDepositBalance))}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Set Maximum Match (৳
                  {Math.min(balanceDue, remainingDepositBalance).toLocaleString()})
                </button>
              </div>

              <Input
                id="adjAmount"
                type="number"
                min="1"
                max={Math.min(balanceDue, remainingDepositBalance)}
                step="0.01"
                value={adjustmentAmount || ""}
                onChange={(e) => setAdjustmentAmount(parseFloat(e.target.value) || 0)}
                required
                className="h-10 text-xs font-semibold"
              />

              {isExcessiveDeposit && (
                <p className="text-[11px] text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="size-3" />
                  Cannot exceed available deposit balance (৳
                  {remainingDepositBalance.toLocaleString()})
                </p>
              )}
            </div>

            {/* Adjustment Type Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Adjustment Type</Label>
              <select
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="rent_adjustment">
                  Monthly Rent Adjustment (Notice Period / Last Month)
                </option>
                <option value="utility_adjustment">Utility Charges Adjustment</option>
                <option value="damage_deduction">Checkout Damage Deduction</option>
                <option value="refund_upon_termination">Security Refund upon Move-out</option>
              </select>
            </div>

            {/* Note / Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Audit Ledger Note / Reason</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                placeholder="e.g. Settling November rent from 2-month advance deposit during departure notice"
                className="h-10 text-xs"
              />
            </div>

            {/* Projected Ledger Impact Card */}
            <Card className="p-3 bg-surface-muted/50 border-border text-xs space-y-1.5">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                Projected Ledger State
              </p>
              <div className="flex justify-between items-center text-foreground-muted text-[11px]">
                <span>Remaining Security Deposit:</span>
                <span className="font-bold text-foreground">
                  ৳{projectedRemainingDeposit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-foreground-muted text-[11px]">
                <span>Remaining Invoice Due:</span>
                <span className="font-bold text-foreground">
                  ৳{projectedRemainingBill.toLocaleString()}
                </span>
              </div>
            </Card>

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
                disabled={
                  applyAdjustmentMutation.isPending ||
                  isExcessiveDeposit ||
                  isExcessiveBill ||
                  adjustmentAmount <= 0
                }
                className="w-full sm:w-auto min-h-[44px] flex items-center gap-1.5 font-bold shadow-xs"
              >
                {applyAdjustmentMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Recording Adjustment...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="size-4" />
                    Confirm Advance Adjustment
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
