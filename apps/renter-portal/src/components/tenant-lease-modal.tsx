"use client";

import { Badge, Button } from "@omniheaven/ui";
import { FileText, Printer, ShieldCheck, X } from "lucide-react";

interface TenantLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: {
    id: string;
    startDate: string;
    endDate?: string | null;
    monthlyRent: string;
    serviceCharge: string;
    advanceDepositAmount?: string | null;
    remainingDepositBalance?: string | null;
    noticePeriodDays: number;
    renter: {
      fullName: string;
      phone: string;
      nidNumber?: string | null;
      occupation?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
      emergencyContactNumber?: string | null;
    };
  };
  flatNumber: string;
  floor: number;
  buildingName: string;
  buildingAddress: string;
}

export function TenantLeaseModal({
  isOpen,
  onClose,
  contract,
  flatNumber,
  floor,
  buildingName,
  buildingAddress,
}: TenantLeaseModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const rent = parseFloat(contract.monthlyRent || "0");
  const service = parseFloat(contract.serviceCharge || "0");
  const advance = parseFloat(
    contract.advanceDepositAmount || contract.remainingDepositBalance || "0",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[95vh] overflow-y-auto">
        {/* Modal Controls Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="size-4 text-indigo-600" />
              Registered Tenancy Agreement (বাড়ি ভাড়া চুক্তিপত্র)
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-500/20 font-bold"
            >
              Smart NID Verified
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs flex items-center gap-1.5 h-8"
            >
              <Printer className="size-3.5" /> Print / Save PDF
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Printable Agreement Document */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-slate-900 space-y-5 shadow-xs font-serif leading-relaxed">
          {/* Agreement Title */}
          <div className="text-center border-b pb-4 border-slate-200 space-y-1">
            <h2 className="text-base font-black tracking-wide uppercase text-slate-900 font-sans">
              RESIDENTIAL TENANCY AGREEMENT (বাড়ি ভাড়া চুক্তিপত্র)
            </h2>
            <p className="text-xs text-slate-600 font-sans">
              Executed under the Premises Rent Control Act & Applicable Laws of Bangladesh
            </p>
            <p className="text-[11px] font-mono font-semibold text-indigo-700 font-sans">
              Contract Registration Code: {contract.id}
            </p>
          </div>

          {/* Parties Involved */}
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-sans space-y-1">
              <span className="font-bold text-slate-900 block uppercase text-[11px]">
                1st Party (Landlord / Asset Authority):
              </span>
              <p className="text-slate-700 font-medium">
                {buildingName} Authority & Landlord Management, {buildingAddress}.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-sans space-y-1">
              <span className="font-bold text-slate-900 block uppercase text-[11px]">
                2nd Party (Tenant / Renter):
              </span>
              <p className="text-slate-900 font-bold text-sm">{contract.renter.fullName}</p>
              <p className="text-slate-700">
                National ID (Smart NID):{" "}
                <span className="font-mono font-bold">
                  {contract.renter.nidNumber || "19922612345678901"}
                </span>{" "}
                | Mobile: {contract.renter.phone}
              </p>
              {contract.renter.occupation && (
                <p className="text-slate-600">
                  Occupation / Profession: {contract.renter.occupation}
                </p>
              )}
            </div>
          </div>

          {/* Leased Premises & Terms */}
          <div className="space-y-3 text-xs text-slate-800">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 font-sans text-xs border-b pb-1">
              Terms & Stipulations of Tenancy:
            </h4>

            <ol className="list-decimal pl-5 space-y-2">
              <li>
                <strong>Demised Premises:</strong> The 1st Party hereby leases to the 2nd Party{" "}
                <strong>Flat {flatNumber}</strong> situated on <strong>Floor {floor}</strong> of{" "}
                {buildingName}, {buildingAddress}, strictly for peaceful residential family
                dwelling.
              </li>
              <li>
                <strong>Monthly Rent & Service Charges:</strong> The monthly rent is fixed at{" "}
                <strong>৳{rent.toLocaleString("en-BD")}.00</strong> (Taka{" "}
                {rent.toLocaleString("en-BD")}) and building service charge at{" "}
                <strong>৳{service.toLocaleString("en-BD")}.00</strong>, payable strictly on or
                before the <strong>10th day</strong> of each calendar month.
              </li>
              <li>
                <strong>Security Deposit & Escrow:</strong> The 2nd Party has deposited an advance
                security holding of <strong>৳{advance.toLocaleString("en-BD")}.00</strong>{" "}
                (equivalent to advance rent) held in digital escrow, refundable upon legal
                termination subject to utility clearances and premises inspection.
              </li>
              <li>
                <strong>Tenancy Duration:</strong> The lease takes effect from{" "}
                <strong>{contract.startDate}</strong>{" "}
                {contract.endDate
                  ? `until ${contract.endDate}`
                  : "and continues on a month-to-month contractual renewal"}
                .
              </li>
              <li>
                <strong>Notice of Termination:</strong> Either party may terminate this agreement by
                providing at least <strong>{contract.noticePeriodDays} days</strong> prior written
                notice through the OmniHeaven portal or registered communication.
              </li>
              <li>
                <strong>Submeter & Utility Billing:</strong> Individual electric submeter readings,
                gas supplies, water, and building sanitation charges shall be billed based on
                monthly actual meter consumption.
              </li>
            </ol>
          </div>

          {/* Legal Certification Seals */}
          <div className="pt-8 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 font-sans">
            <div className="text-center">
              <div className="w-36 border-b border-slate-400 pb-1 mb-1 font-mono font-bold text-slate-900 text-[11px]">
                {contract.renter.fullName}
              </div>
              <span className="text-[10px]">Signature of Tenant</span>
            </div>

            <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <ShieldCheck className="size-6 text-emerald-600 mx-auto" />
              <span className="text-[9px] font-bold block mt-0.5">Digitally Authenticated</span>
            </div>

            <div className="text-center">
              <div className="w-36 border-b border-slate-400 pb-1 mb-1 text-indigo-700 font-bold text-[11px]">
                OmniHeaven Admin
              </div>
              <span className="text-[10px]">Authorized Signature for Landlord</span>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex justify-end pt-2 print:hidden">
          <Button type="button" onClick={onClose} className="bg-slate-900 text-white text-xs px-4">
            Close Agreement
          </Button>
        </div>
      </div>
    </div>
  );
}
