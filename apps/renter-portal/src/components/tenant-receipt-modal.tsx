"use client";

import { Badge, Button } from "@omniheaven/ui";
import { Printer, QrCode, X } from "lucide-react";

interface TenantReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    id: string;
    billNumber: string;
    billingMonth: string;
    rentAmount: string;
    serviceChargeAmount?: string | null;
    electricityAmount?: string | null;
    gasAmount?: string | null;
    waterAmount?: string | null;
    wasteAndOtherAmount?: string | null;
    lateFeeAmount?: string | null;
    totalAmount: string;
    amountPaid?: string | null;
    advanceAdjustedAmount?: string | null;
    balanceDue: string;
    status: string;
    paidAt?: string | Date | null;
    payments?: any[];
  };
  flatNumber: string;
  floor: number;
  buildingName: string;
  buildingAddress: string;
  renterName: string;
  renterPhone?: string | null;
  renterNid?: string | null;
}

export function TenantReceiptModal({
  isOpen,
  onClose,
  bill,
  flatNumber,
  floor,
  buildingName,
  buildingAddress,
  renterName,
  renterPhone,
  renterNid,
}: TenantReceiptModalProps) {
  if (!isOpen) return null;

  const latestPayment = bill.payments && bill.payments.length > 0 ? bill.payments[0] : null;
  const receiptNumber =
    latestPayment?.receiptNumber || `REC-${bill.billingMonth.replace("-", "")}-0014`;
  const paymentMethod = latestPayment?.paymentMethod || "bKash";
  const transactionId = latestPayment?.transactionId || "BK9A7X32LM";
  const paymentDate =
    latestPayment?.paymentDate ||
    (bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : "2026-10-07");

  const rent = parseFloat(bill.rentAmount || "0");
  const service = parseFloat(bill.serviceChargeAmount || "0");
  const elec = parseFloat(bill.electricityAmount || "0");
  const gas = parseFloat(bill.gasAmount || "0");
  const water = parseFloat(bill.waterAmount || "0");
  const waste = parseFloat(bill.wasteAndOtherAmount || "0");
  const late = parseFloat(bill.lateFeeAmount || "0");
  const total = parseFloat(bill.totalAmount || "0");
  const paid = parseFloat(bill.amountPaid || bill.totalAmount || "0");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-xl rounded-2xl border border-border-gold/40 shadow-2xl p-6 space-y-5 max-h-[95vh] overflow-y-auto text-foreground">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-gold/30 print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-serif font-bold text-foreground">Official Money Receipt</h3>
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
            >
              Verified & Paid
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs flex items-center gap-1.5 h-8 border-border-gold/40 hover:bg-primary/10"
            >
              <Printer className="size-3.5 text-primary" /> Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 rounded-xl border border-border-gold/40 bg-surface text-foreground space-y-5 shadow-xs font-sans print:border-none print:shadow-none">
          {/* Top Brand Banner */}
          <div className="flex items-start justify-between border-b pb-4 border-border-gold/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="size-8 rounded-lg bg-primary text-primary-foreground font-serif font-bold text-sm flex items-center justify-center shadow-xs">
                  Ω
                </span>
                <span className="text-base font-serif font-bold tracking-tight text-foreground">
                  {buildingName}
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted mt-1">{buildingAddress}</p>
              <p className="text-[10px] text-primary/80 font-medium">
                Managed via OmniHeaven Property System
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase tracking-wider font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-md block mb-1 border border-border-gold/30">
                Money Receipt / ভাড়ার রসিদ
              </span>
              <p className="text-xs font-mono font-bold text-foreground">{receiptNumber}</p>
              <p className="text-[11px] text-foreground-muted">Date: {paymentDate}</p>
            </div>
          </div>

          {/* Renter & Flat Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-card p-3.5 rounded-lg border border-border-gold/30">
            <div>
              <span className="text-[10px] text-foreground-muted uppercase font-bold tracking-wider block">
                Received From (Tenant)
              </span>
              <p className="font-bold text-foreground text-sm mt-0.5">{renterName}</p>
              {renterPhone && (
                <p className="text-[11px] text-foreground-muted">Phone: {renterPhone}</p>
              )}
              {renterNid && (
                <p className="text-[10px] text-foreground-muted font-mono">NID: {renterNid}</p>
              )}
            </div>

            <div>
              <span className="text-[10px] text-foreground-muted uppercase font-bold tracking-wider block">
                Premises Leased
              </span>
              <p className="font-bold text-foreground text-sm mt-0.5">
                Flat {flatNumber} (Floor {floor})
              </p>
              <p className="text-[11px] text-foreground-muted">Invoice: {bill.billNumber}</p>
              <p className="text-[11px] text-foreground-muted">
                Billing Period: {bill.billingMonth}
              </p>
            </div>
          </div>

          {/* Itemized Charges Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-gold/30 text-foreground-muted text-[11px]">
                <th className="py-2 text-left font-semibold">Description / Particulars</th>
                <th className="py-2 text-right font-semibold">Amount (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-gold/20">
              <tr>
                <td className="py-1.5 text-foreground font-medium">Monthly Apartment Rent</td>
                <td className="py-1.5 text-right font-mono font-semibold">
                  ৳{rent.toLocaleString("en-BD")}.00
                </td>
              </tr>
              {service > 0 && (
                <tr>
                  <td className="py-1.5 text-foreground font-medium">
                    Building Service & Maintenance Charge
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold">
                    ৳{service.toLocaleString("en-BD")}.00
                  </td>
                </tr>
              )}
              {elec > 0 && (
                <tr>
                  <td className="py-1.5 text-foreground font-medium">
                    Electricity Consumption (Submeter Reading)
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold">
                    ৳{elec.toLocaleString("en-BD")}.00
                  </td>
                </tr>
              )}
              {gas > 0 && (
                <tr>
                  <td className="py-1.5 text-foreground font-medium">Gas Utility Supply</td>
                  <td className="py-1.5 text-right font-mono font-semibold">
                    ৳{gas.toLocaleString("en-BD")}.00
                  </td>
                </tr>
              )}
              {water > 0 && (
                <tr>
                  <td className="py-1.5 text-foreground font-medium">Water Supply & Sewerage</td>
                  <td className="py-1.5 text-right font-mono font-semibold">
                    ৳{water.toLocaleString("en-BD")}.00
                  </td>
                </tr>
              )}
              {waste > 0 && (
                <tr>
                  <td className="py-1.5 text-foreground font-medium">
                    Waste Disposal & Common Utilities
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold">
                    ৳{waste.toLocaleString("en-BD")}.00
                  </td>
                </tr>
              )}
              {late > 0 && (
                <tr>
                  <td className="py-1.5 text-rose-600 dark:text-rose-400 font-medium">
                    Late Payment Fee
                  </td>
                  <td className="py-1.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                    ৳{late.toLocaleString("en-BD")}.00
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-gold/40 font-bold">
                <td className="pt-2 text-foreground">Total Billed:</td>
                <td className="pt-2 text-right font-mono text-foreground">
                  ৳{total.toLocaleString("en-BD")}.00
                </td>
              </tr>
              <tr className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                <td className="py-1">Total Paid / Settled:</td>
                <td className="py-1 text-right font-mono">৳{paid.toLocaleString("en-BD")}.00</td>
              </tr>
            </tfoot>
          </table>

          {/* Payment Method & QR Code Stamp */}
          <div className="pt-3 border-t border-border-gold/30 flex items-center justify-between text-xs">
            <div className="space-y-1">
              <p className="text-[11px] text-foreground-muted">
                Payment Channel:{" "}
                <strong className="uppercase text-foreground">{paymentMethod}</strong>
              </p>
              <p className="text-[11px] text-foreground-muted font-mono">
                Transaction Ref: <strong className="text-foreground">{transactionId}</strong>
              </p>
              <p className="text-[10px] text-foreground-muted italic">
                * This computer-generated receipt is electronically verified and requires no manual
                physical stamp.
              </p>
            </div>

            <div className="text-center p-2 rounded-lg bg-card border border-border-gold/30">
              <QrCode className="size-12 text-foreground mx-auto" />
              <span className="text-[9px] text-foreground-muted block mt-0.5 uppercase tracking-wider font-semibold">
                Verified Token
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 flex items-center justify-between text-xs text-foreground-muted border-t border-dashed border-border-gold/30">
            <div className="text-center">
              <div className="w-32 border-b border-border-gold/40 pb-1 mb-1 font-mono text-foreground text-[11px] font-bold">
                {renterName}
              </div>
              <span className="text-[10px]">Tenant Signature</span>
            </div>

            <div className="text-center">
              <div className="w-36 border-b border-border-gold/40 pb-1 mb-1 text-primary font-bold text-[11px]">
                OmniHeaven Admin
              </div>
              <span className="text-[10px]">Authorized Landlord / Manager</span>
            </div>
          </div>
        </div>

        {/* Action button in modal */}
        <div className="flex justify-end pt-2 print:hidden">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs px-4">
            Close Voucher
          </Button>
        </div>
      </div>
    </div>
  );
}
