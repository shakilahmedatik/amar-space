"use client";

import { Badge, Button, Input } from "@omniheaven/ui";
import {
  Clock,
  CreditCard,
  FileCheck2,
  HeartPulse,
  Plus,
  Search,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useOrganization } from "../lib/organization-context";
import { trpc } from "../lib/trpc";
import { ContractDetailModal, type ContractRecord } from "./contract-detail-modal";
import { CreateContractModal } from "./create-contract-modal";
import { RegisterRenterModal } from "./register-renter-modal";

const BLOOD_GROUPS = ["ALL", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Fallback demo fixtures for Dhanmondi Lakeview Residency
const DEMO_RENTERS: any[] = [
  {
    id: "renter-farhana-1a",
    fullName: "Farhana Yasmin",
    phone: "01719876543",
    nidNumber: "19922612345678901",
    bloodGroup: "B+",
    occupation: "Senior Software Engineer, Grameenphone",
    totalFamilyMembers: 3,
    flat: {
      id: "flat-dhanmondi-1a",
      flatNumber: "1A",
      floor: 1,
      building: { id: "bld-dhanmondi-lakeview", name: "Dhanmondi Lakeview Residency" },
    },
    contracts: [
      {
        id: "contract-farhana-1a",
        monthlyRent: 28000,
        serviceCharge: 5000,
        securityDepositAmount: 56000,
        remainingDepositBalance: 56000,
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        noticePeriodDays: 60,
        status: "active",
      },
    ],
  },
  {
    id: "renter-naimul-1b",
    fullName: "Kazi Naimul Haque",
    phone: "01811223344",
    nidNumber: "5508123456",
    bloodGroup: "O+",
    occupation: "Branch Manager, Dhaka Bank Ltd.",
    totalFamilyMembers: 4,
    flat: {
      id: "flat-dhanmondi-1b",
      flatNumber: "1B",
      floor: 1,
      building: { id: "bld-dhanmondi-lakeview", name: "Dhanmondi Lakeview Residency" },
    },
    contracts: [
      {
        id: "contract-naimul-1b",
        monthlyRent: 28000,
        serviceCharge: 5000,
        securityDepositAmount: 56000,
        remainingDepositBalance: 56000,
        startDate: "2025-03-01",
        endDate: "2026-02-28",
        noticePeriodDays: 30,
        status: "active",
      },
    ],
  },
  {
    id: "renter-sharmin-2a",
    fullName: "Dr. Sharmin Akter",
    phone: "01919887766",
    nidNumber: "7890123456",
    bloodGroup: "A+",
    occupation: "Cardiology Fellow, Square Hospital",
    totalFamilyMembers: 2,
    flat: {
      id: "flat-dhanmondi-2a",
      flatNumber: "2A",
      floor: 2,
      building: { id: "bld-dhanmondi-lakeview", name: "Dhanmondi Lakeview Residency" },
    },
    contracts: [
      {
        id: "contract-sharmin-2a",
        monthlyRent: 29000,
        serviceCharge: 5000,
        securityDepositAmount: 58000,
        remainingDepositBalance: 58000,
        startDate: "2024-06-01",
        endDate: "2025-05-31",
        noticePeriodDays: 30,
        status: "notice_period",
        terminationDate: "2026-11-30",
        terminationReason: "Relocating to Chittagong for hospital posting",
      },
    ],
  },
];

export function RenterDirectoryView() {
  const { activeOrg } = useOrganization();

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [isContractOpen, setContractOpen] = useState(false);
  const [selectedContractForModal, setSelectedContractForModal] = useState<ContractRecord | null>(
    null,
  );

  // Fetch Renters from tRPC
  const { data: serverRenters } = trpc.renter.listRenters.useQuery(undefined, {
    retry: false,
  });

  const renters = serverRenters && serverRenters.length > 0 ? serverRenters : DEMO_RENTERS;

  // Filtered Renters
  const filteredRenters = useMemo(() => {
    return renters.filter((r) => {
      // Blood Group filter
      if (selectedBloodGroup !== "ALL" && r.bloodGroup !== selectedBloodGroup) {
        return false;
      }

      // Status filter
      const activeContract = r.contracts?.[0];
      const currentStatus = activeContract?.status || "unassigned";
      if (statusFilter !== "all" && currentStatus !== statusFilter) {
        return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = r.fullName?.toLowerCase().includes(q);
        const matchPhone = r.phone?.includes(q);
        const matchNid = r.nidNumber?.includes(q);
        const matchOcc = r.occupation?.toLowerCase().includes(q);
        const matchFlat = r.flat?.flatNumber?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNid && !matchOcc && !matchFlat) {
          return false;
        }
      }

      return true;
    });
  }, [renters, selectedBloodGroup, statusFilter, search]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalDeposit = 0;
    let activeLeases = 0;
    let noticePeriodCount = 0;

    for (const r of renters) {
      const contract = r.contracts?.[0];
      if (contract) {
        totalDeposit += Number(
          contract.remainingDepositBalance || contract.securityDepositAmount || 0,
        );
        if (contract.status === "active") activeLeases += 1;
        if (contract.status === "notice_period") noticePeriodCount += 1;
      }
    }

    return {
      totalRenters: renters.length,
      activeLeases,
      noticePeriodCount,
      totalDeposit,
    };
  }, [renters]);

  const handleOpenContractDetails = (r: any) => {
    const contract = r.contracts?.[0];
    if (contract) {
      setSelectedContractForModal({
        ...contract,
        renter: {
          id: r.id,
          fullName: r.fullName,
          phone: r.phone,
          nidNumber: r.nidNumber,
          bloodGroup: r.bloodGroup,
          occupation: r.occupation,
        },
        flat: r.flat,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-gold/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
              Renter Lifecycle & Tenancy Leases
            </h1>
            <Badge
              variant="outline"
              className="text-xs font-semibold border-border-gold/30 bg-primary/5"
            >
              KYC & Ledger
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-foreground-muted">
            Manage tenant onboarding, Bangladeshi Smart NID verification, active contracts, and
            advance deposit holding balances for {activeOrg.name}.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setContractOpen(true)}
            className="text-xs gap-1.5 h-10 min-h-[44px] border-border-gold/40 hover:bg-primary/10"
          >
            <FileCheck2 className="size-4 text-primary" />
            <span>Draft Lease</span>
          </Button>

          <Button
            variant="luxury"
            size="sm"
            onClick={() => setRegisterOpen(true)}
            className="text-xs gap-1.5 h-10 min-h-[44px]"
          >
            <Plus className="size-4" />
            <span>Register New Renter</span>
          </Button>
        </div>
      </div>

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Total Tenants */}
        <div className="p-4 rounded-2xl bg-card border border-border-gold/30 space-y-1 shadow-xs hover:border-border-gold/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Registered Tenants
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 border border-border-gold/30">
              <Users className="size-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-serif font-black text-foreground tabular-nums">
            {metrics.totalRenters}
          </p>
          <p className="text-[11px] text-foreground-muted">Verified KYC records</p>
        </div>

        {/* KPI 2: Active Leases */}
        <div className="p-4 rounded-2xl bg-card border border-border-gold/30 space-y-1 shadow-xs hover:border-border-gold/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Active Tenancies
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-serif font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {metrics.activeLeases}
          </p>
          <p className="text-[11px] text-foreground-muted">Occupied residential units</p>
        </div>

        {/* KPI 3: Notice Period */}
        <div className="p-4 rounded-2xl bg-card border border-border-gold/30 space-y-1 shadow-xs hover:border-border-gold/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Notice Period
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Clock className="size-4 text-amber-700 dark:text-amber-300" />
            </div>
          </div>
          <p className="text-2xl font-serif font-black text-amber-700 dark:text-amber-300 tabular-nums">
            {metrics.noticePeriodCount}
          </p>
          <p className="text-[11px] text-foreground-muted">Expected departures pending</p>
        </div>

        {/* KPI 4: Security Deposit Ledger */}
        <div className="p-4 rounded-2xl bg-card border border-border-gold/30 space-y-1 shadow-xs hover:border-border-gold/60 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
              Advance Deposit Ledger
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 border border-border-gold/30">
              <CreditCard className="size-4 text-primary" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-serif font-black text-foreground tabular-nums">
            ৳{metrics.totalDeposit.toLocaleString()}
          </p>
          <p className="text-[11px] text-foreground-muted">Total escrow holding balance</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3.5 size-4 text-foreground-muted" />
            <Input
              placeholder="Search by tenant name, phone, NID, or occupation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 text-xs bg-surface border-border-gold/30 text-foreground placeholder:text-foreground-muted focus:border-primary"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border-gold/30 text-xs shrink-0 overflow-x-auto">
            {["all", "active", "notice_period", "draft", "terminated"].map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Blood Group Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted mr-1 flex items-center gap-1">
            <HeartPulse className="size-3 text-rose-500" />
            Blood Group:
          </span>
          {BLOOD_GROUPS.map((bg) => (
            <button
              type="button"
              key={bg}
              onClick={() => setSelectedBloodGroup(bg)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                selectedBloodGroup === bg
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-surface border-border-gold/30 text-foreground hover:border-border-gold/60"
              }`}
            >
              {bg}
            </button>
          ))}
        </div>
      </div>

      {/* Renter Directory: Table & Responsive Card Grid */}
      <div className="rounded-2xl border border-border-gold/30 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-gold/30 bg-surface text-[10px] font-bold uppercase tracking-wider text-foreground-muted">
                <th className="py-3 px-4">Tenant & Contact</th>
                <th className="py-3 px-4">Allocated Flat</th>
                <th className="py-3 px-4">National ID (NID)</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Lease Status</th>
                <th className="py-3 px-4">Deposit Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-gold/20 text-xs">
              {filteredRenters.map((renter) => {
                const contract = renter.contracts?.[0];
                const rentAmount = contract ? Number(contract.monthlyRent || 0) : null;
                const depositBalance = contract
                  ? Number(contract.remainingDepositBalance || contract.securityDepositAmount || 0)
                  : 0;

                return (
                  <tr
                    key={renter.id}
                    className="hover:bg-primary/[0.03] transition-colors group cursor-pointer"
                    onClick={() => handleOpenContractDetails(renter)}
                  >
                    {/* Tenant & Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span className="size-9 rounded-xl bg-primary/10 text-primary border border-border-gold/40 flex items-center justify-center font-bold font-serif text-xs shrink-0 shadow-xs">
                          {renter.fullName
                            ?.split(" ")
                            .map((s: string) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                            {renter.fullName}
                          </p>
                          <p className="text-[11px] text-foreground-muted mt-0.5">
                            {renter.phone} · {renter.occupation || "Tenant"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Allocated Flat */}
                    <td className="py-3.5 px-4">
                      {renter.flat ? (
                        <div className="flex items-center gap-2">
                          <span className="size-7 rounded-lg bg-surface border border-border-gold/30 font-bold text-xs flex items-center justify-center text-foreground tabular-nums shrink-0">
                            {renter.flat.flatNumber}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground text-xs leading-tight">
                              Flat {renter.flat.flatNumber}
                            </p>
                            <p className="text-[10px] text-foreground-muted truncate max-w-[150px]">
                              {renter.flat.building?.name || "Building"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-foreground-muted text-[10px] border-border-gold/30"
                        >
                          Unassigned
                        </Badge>
                      )}
                    </td>

                    {/* NID */}
                    <td className="py-3.5 px-4 tabular-nums">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground">
                        <Shield className="size-3 text-primary shrink-0" />
                        <span>{renter.nidNumber}</span>
                      </div>
                      <span className="text-[10px] text-foreground-muted">
                        {renter.nidNumber.length === 10 ? "Smart NID" : "17-Digit Legacy"}
                      </span>
                    </td>

                    {/* Blood Group */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 font-bold text-[11px]"
                      >
                        <HeartPulse className="size-3 mr-1" />
                        {renter.bloodGroup}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {contract ? (
                        <div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold capitalize ${
                              contract.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : contract.status === "notice_period"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  : "bg-primary/10 text-primary border-primary/30"
                            }`}
                          >
                            {contract.status === "active"
                              ? "Active"
                              : contract.status === "notice_period"
                                ? "In Notice"
                                : contract.status}
                          </Badge>
                          {rentAmount !== null && (
                            <p className="text-[10px] text-foreground-muted mt-0.5 tabular-nums">
                              ৳{rentAmount.toLocaleString()}/mo
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-foreground-muted">No active lease</span>
                      )}
                    </td>

                    {/* Deposit Balance */}
                    <td className="py-3.5 px-4 tabular-nums font-bold text-foreground">
                      {contract ? (
                        <div>
                          <p className="text-emerald-600 dark:text-emerald-400">
                            ৳{depositBalance.toLocaleString()}
                          </p>
                          <span className="text-[10px] text-foreground-muted font-normal">
                            Deposit held
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {contract ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenContractDetails(renter);
                          }}
                          className="text-xs h-8 text-primary hover:bg-primary/10"
                        >
                          View Lease
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContractOpen(true);
                          }}
                          className="text-xs h-8"
                        >
                          Draft Lease
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRenters.length === 0 && (
          <div className="p-12 text-center space-y-3">
            <Users className="size-10 text-foreground-muted mx-auto" />
            <p className="text-sm font-bold text-foreground">No tenants match the filter</p>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Try adjusting your search criteria or register a new tenant into the organization
              directory.
            </p>
            <Button
              variant="luxury"
              size="sm"
              onClick={() => setRegisterOpen(true)}
              className="text-xs"
            >
              Register New Renter
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <RegisterRenterModal open={isRegisterOpen} onOpenChange={setRegisterOpen} />

      <CreateContractModal open={isContractOpen} onOpenChange={setContractOpen} />

      <ContractDetailModal
        open={!!selectedContractForModal}
        onOpenChange={(open) => {
          if (!open) setSelectedContractForModal(null);
        }}
        contract={selectedContractForModal}
      />
    </div>
  );
}
