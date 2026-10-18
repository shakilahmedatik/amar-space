"use client";

import { Badge, Button } from "@omniheaven/ui";
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { trpc } from "../lib/trpc";

interface TenantPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    id: string;
    billNumber: string;
    billingMonth: string;
    totalAmount: string;
    balanceDue: string;
    rentAmount: string;
    serviceChargeAmount?: string | null;
    electricityAmount?: string | null;
    gasAmount?: string | null;
    waterAmount?: string | null;
    wasteAndOtherAmount?: string | null;
  };
  flatNumber: string;
  buildingName: string;
  onSuccess: (payment: any) => void;
}

export function TenantPaymentModal({
  isOpen,
  onClose,
  bill,
  flatNumber,
  buildingName,
  onSuccess,
}: TenantPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<
    "bkash" | "nagad" | "rocket" | "card" | "bank_transfer"
  >("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<any | null>(null);

  const amountToPay = parseFloat(bill.balanceDue || bill.totalAmount || "0");

  const payMutation = trpc.billing.payPortalBill.useMutation({
    onSuccess: (data) => {
      setSuccessPayment(data.payment);
      onSuccess(data.payment);
    },
    onError: (err) => {
      setActionError(
        err.message || "Failed to process payment. Please verify your Transaction ID.",
      );
    },
  });

  if (!isOpen) return null;

  const merchantNumbers = {
    bkash: "01700-112233",
    nagad: "01700-112233",
    rocket: "01700-112233-8",
    bank_transfer: "OmniHeaven Holdings Ltd · City Bank 110-2394821",
    card: "OmniHeaven Secure Gateway (SSLCOMMERZ)",
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(merchantNumbers[paymentMethod]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!transactionId.trim() || transactionId.trim().length < 4) {
      setActionError("Please enter a valid Transaction ID or reference number.");
      return;
    }

    payMutation.mutate({
      billId: bill.id,
      amount: amountToPay,
      paymentMethod,
      transactionId: transactionId.trim(),
      note: `Online ${paymentMethod.toUpperCase()} payment for Flat ${flatNumber} (${bill.billingMonth})`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border-gold/40 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto text-foreground">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-gold/30">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 border border-border-gold/40 flex items-center justify-center text-primary shadow-xs">
              <CreditCard className="size-4.5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-foreground tracking-tight">
                Pay Rent & Utilities Online
              </h3>
              <p className="text-xs text-foreground-muted">
                {bill.billNumber} · Flat {flatNumber}, {buildingName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Success Screen */}
        {successPayment ? (
          <div className="py-6 text-center space-y-4">
            <div className="size-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
              <CheckCircle2 className="size-10" />
            </div>
            <div>
              <h4 className="text-lg font-serif font-bold text-foreground">
                Payment Successfully Settled!
              </h4>
              <p className="text-xs text-foreground-muted mt-1">
                Your payment of{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ৳{amountToPay.toLocaleString("en-BD")}
                </span>{" "}
                has been recorded and verified.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-border-gold/30 text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Receipt Voucher:</span>
                <span className="font-mono font-bold text-primary">
                  {successPayment.receiptNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Transaction ID:</span>
                <span className="font-mono font-bold text-foreground">
                  {successPayment.transactionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Method:</span>
                <span className="font-semibold uppercase text-foreground">
                  {successPayment.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Status:</span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                >
                  Completed & Verified
                </Badge>
              </div>
            </div>

            <Button
              type="button"
              variant="luxury"
              onClick={onClose}
              className="w-full text-xs font-semibold py-2.5"
            >
              Done & View Bill History
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Summary Card */}
            <div className="p-4 rounded-xl bg-surface border border-border-gold/40 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider block">
                  Total Payable Amount
                </span>
                <span className="text-2xl font-serif font-black text-foreground">
                  ৳{amountToPay.toLocaleString("en-BD")}.00
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-bold text-primary bg-primary/10 border-border-gold/50 shadow-xs"
              >
                {bill.billingMonth} Due
              </Badge>
            </div>

            {/* Error Banner */}
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Channel Tabs */}
            <div>
              <span className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Select Payment Channel
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bkash")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "bkash"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                      : "border-border hover:border-border-gold/50 bg-surface/60 text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Smartphone className="size-4 text-[#e2136e]" />
                  <span className="text-[11px]">bKash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("nagad")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "nagad"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                      : "border-border hover:border-border-gold/50 bg-surface/60 text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Smartphone className="size-4 text-[#f7941d]" />
                  <span className="text-[11px]">Nagad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("rocket")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "rocket"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                      : "border-border hover:border-border-gold/50 bg-surface/60 text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Smartphone className="size-4 text-[#8c3494]" />
                  <span className="text-[11px]">Rocket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                      : "border-border hover:border-border-gold/50 bg-surface/60 text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <CreditCard className="size-4 text-primary" />
                  <span className="text-[11px]">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                      : "border-border hover:border-border-gold/50 bg-surface/60 text-foreground-muted hover:text-foreground"
                  }`}
                >
                  <Building className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px]">Bank</span>
                </button>
              </div>
            </div>

            {/* Merchant Account Details Box */}
            <div className="p-3.5 rounded-xl bg-surface border border-border-gold/30 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-foreground-muted font-medium capitalize">
                  {paymentMethod} Official Merchant / Account:
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-primary hover:text-primary-hover hover:underline flex items-center gap-1 font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono font-bold text-foreground text-sm bg-card px-3 py-1.5 rounded-lg border border-border-gold/30 flex items-center justify-between">
                <span>{merchantNumbers[paymentMethod]}</span>
                <span className="text-[10px] text-foreground-muted font-normal">
                  Escrow Protected
                </span>
              </p>

              {/* Instructions bullet */}
              <div className="text-[11px] text-foreground-muted space-y-1 pt-1">
                <p>1. Open your {paymentMethod.toUpperCase()} App or dial USSD (*247# / *167#).</p>
                <p>
                  2. Make Payment of{" "}
                  <strong className="text-foreground">
                    ৳{amountToPay.toLocaleString("en-BD")}
                  </strong>{" "}
                  to the merchant number above.
                </p>
                <p>
                  3. Enter Reference: <strong className="text-foreground">FLAT-{flatNumber}</strong>
                </p>
                <p>4. Enter the TrxID / Transaction Reference received in the SMS below.</p>
              </div>
            </div>

            {/* TrxID Input */}
            <div>
              <label
                htmlFor="txn-id-input"
                className="block text-xs font-bold text-foreground mb-1 uppercase tracking-wider"
              >
                {paymentMethod.toUpperCase()} Transaction ID (TrxID) *
              </label>
              <input
                id="txn-id-input"
                type="text"
                required
                placeholder="e.g. BK9A7X32LM or 99120384"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border-gold/40 text-xs font-mono font-semibold text-foreground placeholder:text-foreground-muted focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <p className="text-[10px] text-foreground-muted mt-1">
                You will find this 8-10 character code in the confirmation SMS.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-gold/30">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs"
                disabled={payMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="luxury"
                disabled={payMutation.isPending || !transactionId}
                className="text-xs font-semibold flex items-center gap-1.5"
              >
                {payMutation.isPending
                  ? "Verifying Payment..."
                  : `Confirm ৳${amountToPay.toLocaleString("en-BD")} Payment`}
              </Button>
            </div>

            <div className="pt-1 text-center">
              <span className="text-[10px] text-foreground-muted flex items-center justify-center gap-1">
                <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Protected by OmniHeaven 256-Bit Escrow Verification
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
