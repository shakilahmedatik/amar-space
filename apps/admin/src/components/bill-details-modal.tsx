"use client";

import {
  Badge,
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
  StatusBadge,
} from "@omniheaven/ui";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Droplets,
  Flame,
  History,
  Loader2,
  Receipt,
  Save,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { EntityAuditTimeline } from "./entity-audit-timeline";

interface BillDetailsModalProps {
  billId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPayment?: (billId: string) => void;
  onOpenAdvanceAdjustment?: (contractId: string, billId: string) => void;
}

export function BillDetailsModal({
  billId,
  open,
  onOpenChange,
  onOpenPayment,
  onOpenAdvanceAdjustment,
}: BillDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"breakdown" | "history">("breakdown");

  // Utility charges state
  const [gasAmount, setGasAmount] = useState<number>(0);
  const [waterAmount, setWaterAmount] = useState<number>(0);
  const [electricityAmount, setElectricityAmount] = useState<number>(0);
  const [wasteAmount, setWasteAmount] = useState<number>(0);
  const [lateFeeAmount, setLateFeeAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    data: bill,
    isLoading,
    refetch,
  } = trpc.billing.getBillById.useQuery(
    { billId: billId ?? "" },
    {
      enabled: !!billId && open,
    },
  );

  // Sync state when bill loads
  useEffect(() => {
    if (bill) {
      setGasAmount(parseFloat(bill.gasAmount || "0"));
      setWaterAmount(parseFloat(bill.waterAmount || "0"));
      setElectricityAmount(parseFloat(bill.electricityAmount || "0"));
      setWasteAmount(parseFloat(bill.wasteAndOtherAmount || "0"));
      setLateFeeAmount(parseFloat(bill.lateFeeAmount || "0"));
      setNotes(bill.notes || "");
      setSaveSuccess(false);
    }
  }, [bill]);

  const utils = trpc.useUtils();
  const updateUtilitiesMutation = trpc.billing.updateBillUtilities.useMutation({
    onSuccess: () => {
      setSaveSuccess(true);
      utils.billing.listBills.invalidate();
      refetch();
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  if (!billId) return null;

  const rentAmount = parseFloat(bill?.rentAmount || "0");
  const serviceCharge = parseFloat(bill?.serviceChargeAmount || "0");
  const advanceAdjusted = parseFloat(bill?.advanceAdjustedAmount || "0");
  const amountPaid = parseFloat(bill?.amountPaid || "0");

  // Live recalculated totals
  const liveTotalAmount =
    rentAmount +
    serviceCharge +
    gasAmount +
    waterAmount +
    electricityAmount +
    wasteAmount +
    lateFeeAmount;

  const liveBalanceDue = Math.max(
    0,
    Math.round((liveTotalAmount - advanceAdjusted - amountPaid) * 100) / 100,
  );

  const handleSaveUtilities = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billId) return;

    updateUtilitiesMutation.mutate({
      billId,
      gasAmount,
      waterAmount,
      electricityAmount,
      wasteAndOtherAmount: wasteAmount,
      lateFeeAmount,
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border-gold/50 shadow-2xl text-foreground p-0">
        <DialogHeader className="p-6 border-b border-border sticky top-0 bg-card/95 backdrop-blur-md z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-champagne/15 border border-primary/25 text-primary shadow-xs">
                <Receipt className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-serif font-display font-medium tracking-tight text-foreground">
                    {bill?.billNumber || "Invoice"}
                  </DialogTitle>
                  {bill && <StatusBadge status={bill.status as any} />}
                </div>
                <DialogDescription className="text-xs text-foreground-muted mt-0.5">
                  Billing Month: {bill?.billingMonth} · Due: {bill?.dueDate}
                </DialogDescription>
              </div>
            </div>

            {/* Quick Balance Due Badge */}
            <div className="text-right">
              <p className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider">
                Balance Due
              </p>
              <CurrencyDisplay
                amount={liveBalanceDue}
                className="text-xl font-black text-rose-600 dark:text-rose-400"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={() => setActiveTab("breakdown")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                activeTab === "breakdown"
                  ? "bg-primary text-primary-foreground shadow-xs font-medium"
                  : "bg-secondary/60 hover:bg-secondary text-foreground-muted"
              }`}
            >
              Utility & Item Breakdown
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[36px] ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground shadow-xs font-medium"
                  : "bg-secondary/60 hover:bg-secondary text-foreground-muted"
              }`}
            >
              <History className="size-3.5" />
              <span>Payments & Adjustments</span>
              {bill && (bill.payments.length > 0 || bill.advanceAdjustments.length > 0) && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30">
                  {bill.payments.length + bill.advanceAdjustments.length}
                </Badge>
              )}
            </button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !bill ? (
          <div className="p-8 text-center text-foreground-muted text-sm">Invoice not found</div>
        ) : activeTab === "breakdown" ? (
          <form onSubmit={handleSaveUtilities} className="p-6 space-y-6">
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Utilities saved and bill balance recalculated successfully.</span>
              </div>
            )}

            {updateUtilitiesMutation.error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{updateUtilitiesMutation.error.message}</span>
              </div>
            )}

            {/* Tenant & Flat Meta Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border text-xs">
              <div>
                <p className="text-foreground-muted text-[11px]">Tenant Name</p>
                <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1">
                  <User className="size-3 text-foreground-muted" />
                  {bill.contract.renter.fullName}
                </p>
              </div>
              <div>
                <p className="text-foreground-muted text-[11px]">Allocated Flat</p>
                <p className="font-semibold text-foreground mt-0.5">
                  Flat {bill.contract.flat.flatNumber} ({bill.contract.flat.building.name})
                </p>
              </div>
              <div>
                <p className="text-foreground-muted text-[11px]">Security Deposit</p>
                <CurrencyDisplay
                  amount={parseFloat(bill.contract.securityDepositAmount || "0")}
                  className="font-bold text-foreground mt-0.5"
                />
              </div>
              <div>
                <p className="text-foreground-muted text-[11px]">Remaining Advance</p>
                <CurrencyDisplay
                  amount={parseFloat(bill.contract.remainingDepositBalance || "0")}
                  className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5"
                />
              </div>
            </div>

            {/* Fixed Contract Items (Rent & Service Charge) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                1. Fixed Tenancy Contract Charges
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card
                  variant="goldAccent"
                  className="p-3.5 bg-card border-border-gold/30 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">Monthly Rent</p>
                    <p className="text-[11px] text-foreground-muted">As specified in lease</p>
                  </div>
                  <CurrencyDisplay
                    amount={rentAmount}
                    className="text-base font-bold text-foreground"
                  />
                </Card>

                <Card
                  variant="default"
                  className="p-3.5 bg-card border-border flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">Service Charge</p>
                    <p className="text-[11px] text-foreground-muted">Lift, security, generator</p>
                  </div>
                  <CurrencyDisplay
                    amount={serviceCharge}
                    className="text-base font-bold text-foreground"
                  />
                </Card>
              </div>
            </div>

            {/* Editable Utilities & Meters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  2. Variable Utilities & Submeter Readings (BDT)
                </h4>
                <span className="text-[11px] text-primary font-semibold">Editable</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Electricity */}
                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Zap className="size-3.5 text-amber-500" />
                    <Label htmlFor="electric">Electricity (Submeter)</Label>
                  </div>
                  <Input
                    id="electric"
                    type="number"
                    min="0"
                    step="0.01"
                    value={electricityAmount || ""}
                    onChange={(e) => setElectricityAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-9 text-xs font-semibold bg-background"
                  />
                </div>

                {/* Gas */}
                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Flame className="size-3.5 text-orange-500" />
                    <Label htmlFor="gas">Gas Bill</Label>
                  </div>
                  <Input
                    id="gas"
                    type="number"
                    min="0"
                    step="0.01"
                    value={gasAmount || ""}
                    onChange={(e) => setGasAmount(parseFloat(e.target.value) || 0)}
                    placeholder="1080.00"
                    className="h-9 text-xs font-semibold bg-background"
                  />
                </div>

                {/* Water */}
                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Droplets className="size-3.5 text-sky-500" />
                    <Label htmlFor="water">Water Bill</Label>
                  </div>
                  <Input
                    id="water"
                    type="number"
                    min="0"
                    step="0.01"
                    value={waterAmount || ""}
                    onChange={(e) => setWaterAmount(parseFloat(e.target.value) || 0)}
                    placeholder="650.00"
                    className="h-9 text-xs font-semibold bg-background"
                  />
                </div>

                {/* Waste */}
                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Trash2 className="size-3.5 text-emerald-500" />
                    <Label htmlFor="waste">Waste & Sanitation</Label>
                  </div>
                  <Input
                    id="waste"
                    type="number"
                    min="0"
                    step="0.01"
                    value={wasteAmount || ""}
                    onChange={(e) => setWasteAmount(parseFloat(e.target.value) || 0)}
                    placeholder="300.00"
                    className="h-9 text-xs font-semibold bg-background"
                  />
                </div>

                {/* Late Fee */}
                <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Clock className="size-3.5 text-rose-500" />
                    <Label htmlFor="lateFee">Late Fee</Label>
                  </div>
                  <Input
                    id="lateFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={lateFeeAmount || ""}
                    onChange={(e) => setLateFeeAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="h-9 text-xs font-semibold bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Financial Reconciliation Summary Card */}
            <Card
              variant="goldAccent"
              className="p-4 bg-champagne/5 border-primary/25 text-xs space-y-2"
            >
              <div className="flex justify-between items-center text-foreground font-semibold">
                <span>Total Calculated Billed Amount</span>
                <CurrencyDisplay amount={liveTotalAmount} className="text-base font-bold" />
              </div>
              <div className="flex justify-between items-center text-foreground-muted">
                <span>Advance Deposit Adjusted</span>
                <CurrencyDisplay
                  amount={advanceAdjusted}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold"
                />
              </div>
              <div className="flex justify-between items-center text-foreground-muted">
                <span>Paid via bKash / Bank / Cash</span>
                <CurrencyDisplay amount={amountPaid} className="text-primary font-semibold" />
              </div>
              <div className="pt-2 border-t border-border-gold/30 flex justify-between items-center font-bold">
                <span className="text-sm font-serif font-display text-foreground">
                  Net Balance Due
                </span>
                <CurrencyDisplay
                  amount={liveBalanceDue}
                  className="text-lg text-rose-600 dark:text-rose-400 font-extrabold"
                />
              </div>
            </Card>

            {/* Financial State Audit Timeline */}
            <div className="pt-4 border-t border-border">
              <EntityAuditTimeline entityType="bill" entityId={bill.id} />
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2 justify-between items-center">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {liveBalanceDue > 0 && onOpenPayment && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      onOpenPayment(bill.id);
                    }}
                    className="text-xs min-h-[44px] flex items-center gap-1.5"
                  >
                    <CreditCard className="size-3.5 text-primary" />
                    Record Payment
                  </Button>
                )}

                {liveBalanceDue > 0 &&
                  parseFloat(bill.contract.remainingDepositBalance || "0") > 0 &&
                  onOpenAdvanceAdjustment && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenAdvanceAdjustment(bill.contractId, bill.id);
                      }}
                      className="text-xs min-h-[44px] flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    >
                      Adjust Advance
                    </Button>
                  )}
              </div>

              <Button
                type="submit"
                variant="luxury"
                disabled={updateUtilitiesMutation.isPending}
                className="w-full sm:w-auto min-h-[44px] flex items-center gap-1.5"
              >
                {updateUtilitiesMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating Utilities...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save & Recalculate
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* History Tab */
          <div className="p-6 space-y-6">
            {/* Payments List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-primary" />
                Payments Received ({bill.payments.length})
              </h4>

              {bill.payments.length === 0 ? (
                <p className="text-xs text-foreground-muted italic py-2">
                  No payments recorded for this invoice yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {bill.payments.map((p) => (
                    <Card
                      key={p.id}
                      variant="goldAccent"
                      className="p-3 bg-card border-border-gold/30 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {p.paymentMethod}
                          </Badge>
                          <span className="font-semibold text-foreground">{p.receiptNumber}</span>
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-1">
                          Trx: {p.transactionId || "N/A"} · Date: {p.paymentDate}
                          {p.receivedByUser && ` · Received by: ${p.receivedByUser.name}`}
                        </p>
                      </div>
                      <CurrencyDisplay
                        amount={parseFloat(p.amount)}
                        className="text-sm font-bold text-emerald-600 dark:text-emerald-400"
                      />
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Advance Adjustments List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-muted flex items-center gap-1.5">
                <History className="size-3.5 text-primary" />
                Advance Deposit Adjustments ({bill.advanceAdjustments.length})
              </h4>

              {bill.advanceAdjustments.length === 0 ? (
                <p className="text-xs text-foreground-muted italic py-2">
                  No advance deposit adjustments applied to this invoice.
                </p>
              ) : (
                <div className="space-y-2">
                  {bill.advanceAdjustments.map((adj) => (
                    <Card
                      key={adj.id}
                      variant="default"
                      className="p-3 bg-card border-border text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 border-emerald-500/20"
                          >
                            {adj.adjustmentType}
                          </Badge>
                          <span className="text-foreground-muted text-[11px]">{adj.note}</span>
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-1">
                          Deposit Balance: ৳{adj.balanceBefore} → ৳{adj.balanceAfter}
                          {adj.adjustedByUser && ` · Adjusted by: ${adj.adjustedByUser.name}`}
                        </p>
                      </div>
                      <CurrencyDisplay
                        amount={parseFloat(adj.amount)}
                        className="text-sm font-bold text-emerald-600 dark:text-emerald-400"
                      />
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
