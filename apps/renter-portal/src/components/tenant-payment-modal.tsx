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
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="size-5 text-indigo-600" />
              Pay Rent & Utilities Online
            </h3>
            <p className="text-xs text-slate-400">
              {bill.billNumber} · Flat {flatNumber}, {buildingName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Success Screen */}
        {successPayment ? (
          <div className="py-6 text-center space-y-4">
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
              <CheckCircle2 className="size-10" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                Payment Successfully Settled!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Your payment of{" "}
                <span className="font-bold text-emerald-600">
                  ৳{amountToPay.toLocaleString("en-BD")}
                </span>{" "}
                has been recorded and verified.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt Voucher:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {successPayment.receiptNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {successPayment.transactionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Method:</span>
                <span className="font-semibold uppercase text-slate-700 dark:text-slate-200">
                  {successPayment.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-500/30"
                >
                  Completed & Verified
                </Badge>
              </div>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
            >
              Done & View Bill History
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-indigo-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Payable Amount
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  ৳{amountToPay.toLocaleString("en-BD")}.00
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-bold text-indigo-600 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 shadow-xs"
              >
                {bill.billingMonth} Due
              </Badge>
            </div>

            {/* Error Banner */}
            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Channel Tabs */}
            <div>
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Select Payment Channel
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bkash")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "bkash"
                      ? "border-pink-500 bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-bold shadow-xs ring-1 ring-pink-500"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Smartphone className="size-4 text-pink-600" />
                  <span className="text-[11px]">bKash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("nagad")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "nagad"
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold shadow-xs ring-1 ring-orange-500"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Smartphone className="size-4 text-orange-600" />
                  <span className="text-[11px]">Nagad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("rocket")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "rocket"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold shadow-xs ring-1 ring-purple-500"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Smartphone className="size-4 text-purple-600" />
                  <span className="text-[11px]">Rocket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "card"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs ring-1 ring-blue-500"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <CreditCard className="size-4 text-blue-600" />
                  <span className="text-[11px]">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs ring-1 ring-emerald-500"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <Building className="size-4 text-emerald-600" />
                  <span className="text-[11px]">Bank</span>
                </button>
              </div>
            </div>

            {/* Merchant Account Details Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium capitalize">
                  {paymentMethod} Official Merchant / Account:
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono font-bold text-slate-900 dark:text-white text-sm bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span>{merchantNumbers[paymentMethod]}</span>
                <span className="text-[10px] text-slate-400 font-normal">Escrow Protected</span>
              </p>

              {/* Instructions bullet */}
              <div className="text-[11px] text-slate-500 space-y-1 pt-1">
                <p>1. Open your {paymentMethod.toUpperCase()} App or dial USSD (*247# / *167#).</p>
                <p>
                  2. Make Payment of <strong>৳{amountToPay.toLocaleString("en-BD")}</strong> to the
                  merchant number above.
                </p>
                <p>
                  3. Enter Reference: <strong>FLAT-{flatNumber}</strong>
                </p>
                <p>4. Enter the TrxID / Transaction Reference received in the SMS below.</p>
              </div>
            </div>

            {/* TrxID Input */}
            <div>
              <label
                htmlFor="txn-id-input"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
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
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                You will find this 8-10 character code in the confirmation SMS.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                disabled={payMutation.isPending || !transactionId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                {payMutation.isPending
                  ? "Verifying Payment..."
                  : `Confirm ৳${amountToPay.toLocaleString("en-BD")} Payment`}
              </Button>
            </div>

            <div className="pt-1 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="size-3 text-emerald-500" />
                Protected by OmniHeaven 256-Bit Escrow Verification
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
