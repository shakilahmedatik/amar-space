"use client";

import {
  Badge,
  Button,
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
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Printer, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";

interface RecordPaymentModalProps {
  billId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RecordPaymentModal({
  billId,
  open,
  onOpenChange,
  onSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0] as string,
  );
  const [paymentMethod, setPaymentMethod] = useState<
    "bkash" | "nagad" | "rocket" | "bank_transfer" | "cash" | "sslcommerz"
  >("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [issuedReceipt, setIssuedReceipt] = useState<{
    receiptNumber: string;
    amount: string;
    paymentMethod: string;
    transactionId: string | null;
    paymentDate: string;
  } | null>(null);

  const { data: bill } = trpc.billing.getBillById.useQuery(
    { billId: billId ?? "" },
    { enabled: !!billId && open },
  );

  const balanceDue = parseFloat(bill?.balanceDue || "0");

  useEffect(() => {
    if (balanceDue > 0) {
      setAmount(balanceDue);
    }
  }, [balanceDue]);

  const utils = trpc.useUtils();
  const recordPaymentMutation = trpc.billing.recordPayment.useMutation({
    onSuccess: (data) => {
      if (data?.payment) {
        setIssuedReceipt(data.payment);
      }
      utils.billing.listBills.invalidate();
      onSuccess?.();
    },
  });

  if (!billId) return null;

  const isElectronic = ["bkash", "nagad", "rocket", "bank_transfer", "sslcommerz"].includes(
    paymentMethod,
  );
  const isTrxMissing = isElectronic && (!transactionId || transactionId.trim().length === 0);
  const isExcessiveAmount = amount > balanceDue;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTrxMissing || isExcessiveAmount || amount <= 0) return;

    recordPaymentMutation.mutate({
      billId,
      amount,
      paymentDate,
      paymentMethod,
      transactionId: transactionId.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  const handleClose = () => {
    setIssuedReceipt(null);
    setTransactionId("");
    setNote("");
    recordPaymentMutation.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border border-border-gold/50 shadow-2xl text-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-border-gold/40">
              <CreditCard className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-display text-foreground">
                Record Rent Payment
              </DialogTitle>
              <DialogDescription className="text-xs text-foreground-muted">
                Collect and reconcile rent payments via bKash, Nagad, Bank, or Cash.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {issuedReceipt ? (
          /* Instant Money Receipt Modal */
          <div className="space-y-4 py-3">
            <div className="p-5 rounded-2xl bg-surface border border-emerald-500/30 shadow-sm space-y-4 text-center">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="size-7" />
              </div>

              <div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Payment Successfully Recorded
                </p>
                <CurrencyDisplay
                  amount={parseFloat(issuedReceipt.amount)}
                  className="text-2xl font-black text-foreground mt-1"
                />
                <p className="text-xs text-foreground-muted mt-0.5 font-mono font-semibold">
                  {issuedReceipt.receiptNumber}
                </p>
              </div>

              <div className="pt-3 border-t border-border/80 text-xs text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Invoice:</span>
                  <span className="font-semibold text-foreground">{bill?.billNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Tenant:</span>
                  <span className="font-semibold text-foreground">
                    {bill?.contract.renter.fullName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Flat:</span>
                  <span className="font-semibold text-foreground">
                    Flat {bill?.contract.flat.flatNumber} ({bill?.contract.flat.building.name})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Method:</span>
                  <span className="font-semibold uppercase text-foreground">
                    {issuedReceipt.paymentMethod}
                  </span>
                </div>
                {issuedReceipt.transactionId && (
                  <div className="flex justify-between">
                    <span className="text-foreground-muted">Transaction ID:</span>
                    <span className="font-mono text-foreground font-semibold">
                      {issuedReceipt.transactionId}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Payment Date:</span>
                  <span className="text-foreground">{issuedReceipt.paymentDate}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="w-full sm:w-auto min-h-[44px] flex items-center gap-1.5 text-xs"
              >
                <Printer className="size-3.5" />
                Print Receipt
              </Button>
              <Button onClick={handleClose} className="w-full sm:w-auto min-h-[44px] text-xs">
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {recordPaymentMutation.error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{recordPaymentMutation.error.message}</span>
              </div>
            )}

            {/* Invoice & Tenant Info */}
            <div className="p-3 rounded-xl bg-surface-muted border border-border text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground">{bill?.billNumber}</span>
                <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400">
                  Due: ৳{balanceDue.toLocaleString()}
                </Badge>
              </div>
              <p className="text-foreground-muted text-[11px]">
                Tenant: {bill?.contract.renter.fullName} · Flat {bill?.contract.flat.flatNumber}
              </p>
            </div>

            {/* Payment Amount */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <Label htmlFor="payAmount" className="font-semibold">
                  Payment Amount (BDT)
                </Label>
                <button
                  type="button"
                  onClick={() => setAmount(balanceDue)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Pay Full Balance (৳{balanceDue.toLocaleString()})
                </button>
              </div>
              <Input
                id="payAmount"
                type="number"
                min="1"
                max={balanceDue}
                step="0.01"
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
                className="h-10 text-xs font-semibold"
              />
              {isExcessiveAmount && (
                <p className="text-[11px] text-destructive">
                  Payment amount cannot exceed invoice balance due (৳{balanceDue.toLocaleString()})
                </p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "bkash", label: "bKash" },
                  { id: "nagad", label: "Nagad" },
                  { id: "rocket", label: "Rocket" },
                  { id: "bank_transfer", label: "Bank Transfer" },
                  { id: "cash", label: "Cash" },
                  { id: "sslcommerz", label: "SSLCommerz" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold transition-all min-h-[40px] text-center ${
                      paymentMethod === m.id
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-surface hover:bg-surface-muted text-foreground-muted"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction ID / Bank Reference */}
            {isElectronic && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="trxId" className="text-xs font-semibold">
                    Transaction ID / Reference Number
                  </Label>
                  <span className="text-[10px] text-destructive font-semibold">*Required</span>
                </div>
                <Input
                  id="trxId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required={isElectronic}
                  placeholder="e.g. BK9A7X32LM or CBL-TRX-10928"
                  className="h-10 text-xs font-mono"
                />
              </div>
            )}

            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="payDate" className="text-xs font-semibold">
                Payment Received Date
              </Label>
              <Input
                id="payDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="h-10 text-xs"
              />
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <Label htmlFor="payNote" className="text-xs font-semibold">
                Receipt Note (Optional)
              </Label>
              <Input
                id="payNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Received via personal merchant number"
                className="h-10 text-xs"
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
                disabled={
                  recordPaymentMutation.isPending ||
                  isTrxMissing ||
                  isExcessiveAmount ||
                  amount <= 0
                }
                className="w-full sm:w-auto min-h-[44px] flex items-center gap-1.5 font-bold shadow-xs"
              >
                {recordPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <Receipt className="size-4" />
                    Confirm & Issue Receipt
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
