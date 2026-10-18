"use client";

import { Badge, Button, Card } from "@omniheaven/ui";
import {
  Activity,
  AlertOctagon,
  Building2,
  CheckCircle2,
  CreditCard,
  Filter,
  Globe,
  Layers,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Unlock,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";

type Locale = "en" | "bn";

const DICTIONARY = {
  en: {
    title: "omniHeaven HQ",
    subtitle: "Global Platform Command Center · Multi-Tenant SaaS Operations & Governance",
    badgeSuperadmin: "Platform SuperAdmin",
    systemHealthy: "Docker Stack: 9 Services Healthy",
    dbConnected: "Database Connected",
    refresh: "Refresh Data",
    overviewTab: "Overview & KPIs",
    orgsTab: "Organizations Directory",
    plansTab: "SaaS Subscription Plans",
    mrrTitle: "Estimated MRR",
    mrrSubtitle: "Active recurring subscriptions",
    totalOrgsTitle: "Customer Organizations",
    activeOrgs: "Active",
    trialingOrgs: "Trialing",
    suspendedOrgs: "Suspended",
    managedUnitsTitle: "Managed Physical Units",
    totalFlats: "Flats",
    totalRooms: "Hotel Rooms",
    totalBuildings: "Buildings",
    subsHealthTitle: "Active Subscriptions",
    subsHealthSubtitle: "Paid customer accounts",
    searchPlaceholder: "Search organization by name, slug, or email...",
    filterStatus: "Filter Status",
    allStatuses: "All Statuses",
    filterProduct: "Filter Product",
    allProducts: "All Products",
    colOrg: "Organization",
    colType: "Type",
    colQuota: "Unit Quota (Used / Max)",
    colPlan: "SaaS Plan",
    colStatus: "Status",
    colActions: "Actions",
    btnSuspend: "Suspend",
    btnReinstate: "Reinstate",
    btnChangePlan: "Change Plan",
    btnDetails: "Details",
    suspendModalTitle: "Suspend Customer Organization",
    suspendWarning:
      "Warning: Suspending this organization locks out all tenant members from creating units, bills, or reservations. API requests will be rejected with ORG_SUSPENDED.",
    suspendReasonLabel: "Mandatory Suspension Reason (min 5 characters)",
    suspendReasonPlaceholder: "E.g. Repeated non-payment after grace period, compliance breach...",
    btnConfirmSuspend: "Confirm Suspension",
    reinstateModalTitle: "Reinstate Organization",
    reinstateNotesLabel: "Reinstatement Audit Notes (Optional)",
    reinstateNotesPlaceholder: "E.g. Payment verified via bKash, agreement resigned...",
    btnConfirmReinstate: "Confirm Reinstatement",
    changePlanModalTitle: "Update SaaS Subscription Plan",
    selectPlanLabel: "Select Target Plan",
    billingCycleLabel: "Billing Cycle",
    monthly: "Monthly",
    yearly: "Yearly",
    extendDaysLabel: "Extend Period (Days)",
    quotaExceededWarning:
      "Quota Alert: The organization has more active units than the target plan allows. Archiving units is required before downgrading.",
    btnConfirmPlanUpdate: "Save Plan Changes",
    plansSubtitle: "Configure multi-tenant SaaS tiers, pricing, and resource allocations",
    btnEditPlan: "Edit Plan Settings",
    unitsCap: "Units Cap",
    features: "Features",
    cancel: "Cancel",
    loading: "Loading platform telemetry...",
    noOrgsFound: "No organizations match the specified criteria.",
  },
  bn: {
    title: "ওমনিহেভেন হেডকোয়ার্টার্স",
    subtitle: "গ্লোবাল প্ল্যাটফর্ম কমান্ড সেন্টার · মাল্টি-টেন্যান্ট পরিচালনা ও পর্যবেক্ষণ",
    badgeSuperadmin: "প্ল্যাটফর্ম সুপারএডমিন",
    systemHealthy: "ডকার স্ট্যাক: ৯টি সার্ভিস সক্রিয়",
    dbConnected: "ডাটাবেজ সংযুক্ত",
    refresh: "রিফ্রেশ করুন",
    overviewTab: "একনজরে ও কেপিআই",
    orgsTab: "প্রতিষ্ঠান তালিকা",
    plansTab: "সাবস্ক্রিপশন প্ল্যানসমূহ",
    mrrTitle: "আনুমানিক এমআরআর (MRR)",
    mrrSubtitle: "সক্রিয় পুনরাবৃত্তিমূলক আয়",
    totalOrgsTitle: "গ্রাহক প্রতিষ্ঠানসমূহ",
    activeOrgs: "সক্রিয়",
    trialingOrgs: "ট্রায়ালে আছে",
    suspendedOrgs: "স্থগিত",
    managedUnitsTitle: "মোট পরিচালিত ইউনিট",
    totalFlats: "ফ্ল্যাট",
    totalRooms: "হোটেল রুম",
    totalBuildings: "ভবন",
    subsHealthTitle: "সক্রিয় সাবস্ক্রিপশন",
    subsHealthSubtitle: "পেইড গ্রাহক অ্যাকাউন্ট",
    searchPlaceholder: "নাম, স্লাগ বা ইমেইল দিয়ে প্রতিষ্ঠান খুঁজুন...",
    filterStatus: "স্ট্যাটাস ফিল্টার",
    allStatuses: "সকল স্ট্যাটাস",
    filterProduct: "প্রোডাক্ট ফিল্টার",
    allProducts: "সকল প্রোডাক্ট",
    colOrg: "প্রতিষ্ঠান",
    colType: "ধরন",
    colQuota: "ইউনিট কোটা (ব্যবহৃত / সর্বোচ্চ)",
    colPlan: "প্ল্যান",
    colStatus: "অবস্থা",
    colActions: "অ্যাকশন",
    btnSuspend: "স্থগিত করুন",
    btnReinstate: "পুনর্বহাল করুন",
    btnChangePlan: "প্ল্যান পরিবর্তন",
    btnDetails: "বিস্তারিত",
    suspendModalTitle: "গ্রাহক প্রতিষ্ঠান স্থগিত করুন",
    suspendWarning:
      "সতর্কতা: এই প্রতিষ্ঠান স্থগিত করলে সকল সদস্যের অ্যাক্সেস বন্ধ হয়ে যাবে এবং নতুন ইউনিট, বিল বা বুকিং করা যাবে না।",
    suspendReasonLabel: "স্থগিত করার কারণ (বাধ্যতামূলক, ন্যূনতম ৫ অক্ষর)",
    suspendReasonPlaceholder: "যেমন: বকেয়া পরিশোধ না করা, নিয়ম ভঙ্গ...",
    btnConfirmSuspend: "স্থগিত নিশ্চিত করুন",
    reinstateModalTitle: "প্রতিষ্ঠান পুনর্বহাল করুন",
    reinstateNotesLabel: "পুনর্বহালের অডিট নোট (ঐচ্ছিক)",
    reinstateNotesPlaceholder: "যেমন: বিকাশ পেমেন্ট যাচাই সম্পন্ন...",
    btnConfirmReinstate: "পুনর্বহাল নিশ্চিত করুন",
    changePlanModalTitle: "সাবস্ক্রিপশন প্ল্যান পরিবর্তন করুন",
    selectPlanLabel: "প্ল্যান নির্বাচন করুন",
    billingCycleLabel: "বিলিং চক্র",
    monthly: "মাসিক",
    yearly: "বার্ষিক",
    extendDaysLabel: "মেয়াদ বাড়ান (দিন)",
    quotaExceededWarning: "কোটা সতর্কতা: প্রতিষ্ঠানের সক্রিয় ইউনিটের সংখ্যা নির্বাচিত প্ল্যানের সীমার চেয়ে বেশি।",
    btnConfirmPlanUpdate: "প্ল্যান সংরক্ষণ করুন",
    plansSubtitle: "মাল্টি-টেন্যান্ট প্রাইসিং, ইউনিট সীমা ও ফিচার পরিচালনা করুন",
    btnEditPlan: "প্ল্যান সম্পাদনা",
    unitsCap: "সর্বোচ্চ ইউনিট",
    features: "ফিচারসমূহ",
    cancel: "বাতিল",
    loading: "প্ল্যাটফর্ম ডেটা লোড হচ্ছে...",
    noOrgsFound: "কোনো প্রতিষ্ঠান পাওয়া যায়নি।",
  },
};

export default function SuperAdminHQPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeTab, setActiveTab] = useState<"overview" | "organizations" | "plans">("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  // Modal States
  const [suspendModalOrg, setSuspendModalOrg] = useState<{ id: string; name: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [reinstateModalOrg, setReinstateModalOrg] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [reinstateNotes, setReinstateNotes] = useState("");
  const [changePlanOrg, setChangePlanOrg] = useState<{
    id: string;
    name: string;
    currentPlanId: string;
    currentUnits: number;
  } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("pro");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [extendDays, setExtendDays] = useState(30);
  const [selectedOrgDetailsId, setSelectedOrgDetailsId] = useState<string | null>(null);

  const t = DICTIONARY[locale];

  // tRPC Queries
  const statsQuery = trpc.superadmin.getPlatformStats.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const orgsQuery = trpc.superadmin.listAllOrganizations.useQuery(
    {
      search: searchTerm.length >= 2 ? searchTerm : undefined,
      status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      productType: productFilter !== "all" ? (productFilter as any) : undefined,
      limit: 100,
    },
    {
      refetchInterval: 30000,
    },
  );

  const plansQuery = trpc.superadmin.listPlans.useQuery();

  const orgDetailsQuery = trpc.superadmin.getOrganizationDetails.useQuery(
    { organizationId: selectedOrgDetailsId || "" },
    { enabled: Boolean(selectedOrgDetailsId) },
  );

  // tRPC Mutations
  const suspendMutation = trpc.superadmin.suspendOrganization.useMutation({
    onSuccess: () => {
      setSuspendModalOrg(null);
      setSuspendReason("");
      orgsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const reinstateMutation = trpc.superadmin.reinstateOrganization.useMutation({
    onSuccess: () => {
      setReinstateModalOrg(null);
      setReinstateNotes("");
      orgsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const updatePlanMutation = trpc.superadmin.updateOrganizationPlan.useMutation({
    onSuccess: () => {
      setChangePlanOrg(null);
      orgsQuery.refetch();
      statsQuery.refetch();
    },
  });

  const stats = statsQuery.data;
  const orgs = orgsQuery.data ?? [];
  const plans = plansQuery.data ?? [];

  // Quota validation for Plan Update Modal
  const isDowngradeBlocked = useMemo(() => {
    if (!changePlanOrg) return false;
    const target = plans.find((p) => p.id === selectedPlanId);
    if (!target) return false;
    return target.maxUnits < changePlanOrg.currentUnits;
  }, [changePlanOrg, selectedPlanId, plans]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-8 font-sans selection:bg-purple-500/20 selection:text-white">
      {/* Top Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-purple-900/40 border border-purple-400/30">
            Ω
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-white">{t.title}</h1>
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[11px] font-bold px-2.5 py-0.5">
                {t.badgeSuperadmin}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Server className="size-3.5 text-emerald-400" />
            <span className="font-medium">{t.systemHealthy}</span>
          </div>

          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-amber-300 font-semibold transition cursor-pointer min-h-[44px]"
          >
            <Globe className="size-3.5" />
            <span>{locale === "en" ? "বাংলা" : "English"}</span>
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              statsQuery.refetch();
              orgsQuery.refetch();
              plansQuery.refetch();
            }}
            className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs gap-1.5 min-h-[44px]"
          >
            <RefreshCw
              className={`size-3.5 ${statsQuery.isFetching ? "animate-spin text-purple-400" : ""}`}
            />
            <span>{t.refresh}</span>
          </Button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav
        aria-label="HQ Navigation"
        className="flex items-center gap-2 border-b border-slate-800/80 pb-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer min-h-[48px] ${
            activeTab === "overview"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Activity className="size-4" />
          <span>{t.overviewTab}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("organizations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer min-h-[48px] ${
            activeTab === "organizations"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Building2 className="size-4" />
          <span>{t.orgsTab}</span>
          {stats && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-purple-300 ml-1">
              {stats.organizations.total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer min-h-[48px] ${
            activeTab === "plans"
              ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <CreditCard className="size-4" />
          <span>{t.plansTab}</span>
        </button>
      </nav>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <Card className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.mrrTitle}
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              ৳
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            ৳{stats ? stats.revenue.estimatedMrrBdt.toLocaleString("en-US") : "—"}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400 font-medium">
            <TrendingUp className="size-3.5" />
            <span>{t.mrrSubtitle}</span>
          </div>
        </Card>

        {/* Organizations Breakdown Card */}
        <Card className="p-5 bg-slate-900 border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.totalOrgsTitle}
            </span>
            <div className="size-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Building2 className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {stats ? stats.organizations.total : "—"}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">
              {stats?.organizations.active ?? 0} {t.activeOrgs}
            </span>
            <span>·</span>
            <span className="text-blue-400 font-semibold">
              {stats?.organizations.trialing ?? 0} {t.trialingOrgs}
            </span>
            <span>·</span>
            <span className="text-rose-400 font-semibold">
              {stats?.organizations.suspended ?? 0} {t.suspendedOrgs}
            </span>
          </div>
        </Card>

        {/* Physical Units Managed Card */}
        <Card className="p-5 bg-slate-900 border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.managedUnitsTitle}
            </span>
            <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {stats ? stats.assets.totalUnits : "—"}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span>
              {stats?.assets.totalFlats ?? 0} {t.totalFlats}
            </span>
            <span>·</span>
            <span>
              {stats?.assets.totalRooms ?? 0} {t.totalRooms}
            </span>
            <span>·</span>
            <span>
              {stats?.assets.totalBuildings ?? 0} {t.totalBuildings}
            </span>
          </div>
        </Card>

        {/* Active Subscriptions Card */}
        <Card className="p-5 bg-slate-900 border-slate-800 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.subsHealthTitle}
            </span>
            <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">
            {stats ? stats.revenue.activeSubscriptionsCount : "—"}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-400 font-medium">
            <CheckCircle2 className="size-3.5" />
            <span>{t.subsHealthSubtitle}</span>
          </div>
        </Card>
      </div>

      {/* Main Content Sections Based on Active Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="size-4 text-purple-400" />
              <span>Platform Tenant Operations</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab("organizations")}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
            >
              View Full Directory &rarr;
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">{t.colOrg}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colType}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colQuota}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colPlan}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colStatus}</th>
                  <th className="px-5 py-3.5 font-bold text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orgs.slice(0, 5).map((org) => {
                  const quota = org.units;
                  const isNearCap = quota.quotaPercentage >= 80;
                  const isOverCap = quota.quotaPercentage >= 100;

                  return (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{org.name}</div>
                        <div className="text-xs text-slate-400 font-mono">/{org.slug}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                          {org.productType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span
                            className={
                              isOverCap
                                ? "text-rose-400"
                                : isNearCap
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }
                          >
                            {quota.currentUnits} / {quota.maxUnits} units
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {quota.quotaPercentage}%
                          </span>
                        </div>
                        <div className="w-36 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isOverCap
                                ? "bg-rose-500"
                                : isNearCap
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, quota.quotaPercentage)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-200">
                          {org.subscription?.plan?.name || "Trial 6-Month"}
                        </div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {org.subscription?.billingCycle || "monthly"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            org.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : org.status === "suspended"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {org.status === "suspended" ? (
                            <button
                              type="button"
                              onClick={() => setReinstateModalOrg({ id: org.id, name: org.name })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                            >
                              {t.btnReinstate}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSuspendModalOrg({ id: org.id, name: org.name })}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                            >
                              {t.btnSuspend}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setChangePlanOrg({
                                id: org.id,
                                name: org.name,
                                currentPlanId: org.subscription?.plan?.id || "starter",
                                currentUnits: quota.currentUnits,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                          >
                            {t.btnChangePlan}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrgDetailsId(org.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                          >
                            {t.btnDetails}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Organizations Directory Tab */}
      {activeTab === "organizations" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                id="search-orgs-input"
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 min-h-[48px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-slate-400" />
                <select
                  id="status-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 min-h-[48px] cursor-pointer"
                >
                  <option value="all">{t.allStatuses}</option>
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <select
                id="product-filter-select"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 min-h-[48px] cursor-pointer"
              >
                <option value="all">{t.allProducts}</option>
                <option value="building">Residential Building</option>
                <option value="hotel">Hotel</option>
                <option value="resort">Resort</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>

          {/* Full Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">{t.colOrg}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colType}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colQuota}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colPlan}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colStatus}</th>
                  <th className="px-5 py-3.5 font-bold text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">
                      {t.noOrgsFound}
                    </td>
                  </tr>
                ) : (
                  orgs.map((org) => {
                    const quota = org.units;
                    const isNearCap = quota.quotaPercentage >= 80;
                    const isOverCap = quota.quotaPercentage >= 100;

                    return (
                      <tr key={org.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-base">{org.name}</div>
                          <div className="text-xs text-slate-400 font-mono">/{org.slug}</div>
                          {org.owner && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Owner: {org.owner.name} ({org.owner.email})
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                            {org.productType}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-between text-xs font-semibold mb-1">
                            <span
                              className={
                                isOverCap
                                  ? "text-rose-400"
                                  : isNearCap
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                              }
                            >
                              {quota.currentUnits} / {quota.maxUnits} units
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              {quota.quotaPercentage}%
                            </span>
                          </div>
                          <div className="w-40 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${
                                isOverCap
                                  ? "bg-rose-500"
                                  : isNearCap
                                    ? "bg-amber-400"
                                    : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, quota.quotaPercentage)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {quota.flatsCount} flats · {quota.roomsCount} rooms ·{" "}
                            {quota.remainingUnits} free
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-200">
                            {org.subscription?.plan?.name || "Trial 6-Month"}
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize">
                            {org.subscription?.billingCycle || "monthly"} · ৳
                            {org.subscription?.plan?.priceMonthlyBdt || 0}/mo
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              org.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : org.status === "suspended"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {org.status === "suspended" ? (
                              <button
                                type="button"
                                onClick={() => setReinstateModalOrg({ id: org.id, name: org.name })}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                              >
                                {t.btnReinstate}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSuspendModalOrg({ id: org.id, name: org.name })}
                                className="px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                              >
                                {t.btnSuspend}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setChangePlanOrg({
                                  id: org.id,
                                  name: org.name,
                                  currentPlanId: org.subscription?.plan?.id || "starter",
                                  currentUnits: quota.currentUnits,
                                })
                              }
                              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                            >
                              {t.btnChangePlan}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrgDetailsId(org.id)}
                              className="px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-semibold transition cursor-pointer min-h-[44px]"
                            >
                              {t.btnDetails}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SaaS Subscription Plans Tab */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">{t.plansTab}</h2>
            <p className="text-xs text-slate-400 mt-1">{t.plansSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const features: string[] =
                typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features;

              return (
                <Card
                  key={plan.id}
                  className="p-6 bg-slate-900 border-slate-800 flex flex-col justify-between shadow-xl relative overflow-hidden"
                >
                  {plan.id === "pro" && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-indigo-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-extrabold text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                    </div>

                    <div className="py-2 border-y border-slate-800 space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">
                          ৳{Number(plan.priceMonthlyBdt).toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        ৳{Number(plan.priceYearlyBdt).toLocaleString()} billed yearly
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                        {t.unitsCap}:{" "}
                        {plan.maxUnits >= 999999 ? "Unlimited" : `${plan.maxUnits} units`}
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-bold text-slate-300">{t.features}:</div>
                        {features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                            <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-800">
                    <Badge
                      variant="outline"
                      className="text-xs w-full justify-center bg-slate-950 border-slate-800 text-slate-300 py-1.5"
                    >
                      System Tier ID: {plan.id}
                    </Badge>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Suspend Customer Organization */}
      {suspendModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertOctagon className="size-5" />
                <h3 className="text-lg font-bold text-white">{t.suspendModalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSuspendModalOrg(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 flex items-start gap-3">
              <ShieldAlert className="size-5 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-bold text-sm text-white mb-1">{suspendModalOrg.name}</p>
                <p>{t.suspendWarning}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="suspend-reason-textarea"
                className="text-xs font-semibold text-slate-300"
              >
                {t.suspendReasonLabel}
              </label>
              <textarea
                id="suspend-reason-textarea"
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={t.suspendReasonPlaceholder}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setSuspendModalOrg(null)}
                className="border-slate-800 text-slate-300 min-h-[48px]"
              >
                {t.cancel}
              </Button>
              <Button
                disabled={suspendReason.trim().length < 5 || suspendMutation.isPending}
                onClick={() =>
                  suspendMutation.mutate({
                    organizationId: suspendModalOrg.id,
                    reason: suspendReason.trim(),
                  })
                }
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold min-h-[48px]"
              >
                {suspendMutation.isPending ? "Suspending..." : t.btnConfirmSuspend}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reinstate Customer Organization */}
      {reinstateModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <Unlock className="size-5" />
                <h3 className="text-lg font-bold text-white">{t.reinstateModalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReinstateModalOrg(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-300">
              <p className="font-bold text-sm text-white mb-1">{reinstateModalOrg.name}</p>
              <p>Reinstating this organization restores full access for all tenant members.</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reinstate-notes-textarea"
                className="text-xs font-semibold text-slate-300"
              >
                {t.reinstateNotesLabel}
              </label>
              <textarea
                id="reinstate-notes-textarea"
                rows={3}
                value={reinstateNotes}
                onChange={(e) => setReinstateNotes(e.target.value)}
                placeholder={t.reinstateNotesPlaceholder}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setReinstateModalOrg(null)}
                className="border-slate-800 text-slate-300 min-h-[48px]"
              >
                {t.cancel}
              </Button>
              <Button
                disabled={reinstateMutation.isPending}
                onClick={() =>
                  reinstateMutation.mutate({
                    organizationId: reinstateModalOrg.id,
                    notes: reinstateNotes.trim() || undefined,
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold min-h-[48px]"
              >
                {reinstateMutation.isPending ? "Reinstating..." : t.btnConfirmReinstate}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Update SaaS Plan & Quotas */}
      {changePlanOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-purple-400">
                <CreditCard className="size-5" />
                <h3 className="text-lg font-bold text-white">{t.changePlanModalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setChangePlanOrg(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-1">
              <div className="text-sm font-bold text-white">{changePlanOrg.name}</div>
              <div className="text-xs text-slate-400">
                Currently using{" "}
                <span className="text-purple-300 font-semibold">
                  {changePlanOrg.currentUnits} active units
                </span>
                .
              </div>
            </div>

            {isDowngradeBlocked && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>{t.quotaExceededWarning}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="plan-select-dropdown"
                  className="text-xs font-semibold text-slate-300"
                >
                  {t.selectPlanLabel}
                </label>
                <select
                  id="plan-select-dropdown"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500 min-h-[48px] cursor-pointer"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Max {p.maxUnits >= 999999 ? "Unlimited" : `${p.maxUnits}`} units) —
                      ৳{Number(p.priceMonthlyBdt).toLocaleString()}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="billing-cycle-select"
                    className="text-xs font-semibold text-slate-300"
                  >
                    {t.billingCycleLabel}
                  </label>
                  <select
                    id="billing-cycle-select"
                    value={selectedBillingCycle}
                    onChange={(e) => setSelectedBillingCycle(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500 min-h-[48px] cursor-pointer"
                  >
                    <option value="monthly">{t.monthly}</option>
                    <option value="yearly">{t.yearly}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="extend-days-input"
                    className="text-xs font-semibold text-slate-300"
                  >
                    {t.extendDaysLabel}
                  </label>
                  <input
                    id="extend-days-input"
                    type="number"
                    min={1}
                    max={3650}
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:border-purple-500 min-h-[48px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => setChangePlanOrg(null)}
                className="border-slate-800 text-slate-300 min-h-[48px]"
              >
                {t.cancel}
              </Button>
              <Button
                disabled={isDowngradeBlocked || updatePlanMutation.isPending}
                onClick={() =>
                  updatePlanMutation.mutate({
                    organizationId: changePlanOrg.id,
                    planId: selectedPlanId,
                    billingCycle: selectedBillingCycle,
                    extendDays,
                  })
                }
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold min-h-[48px]"
              >
                {updatePlanMutation.isPending ? "Updating Plan..." : t.btnConfirmPlanUpdate}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Organization Deep Dive Details */}
      {selectedOrgDetailsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {orgDetailsQuery.data?.name || "Organization Overview"}
                </h3>
                <p className="text-xs text-slate-400 font-mono">/{orgDetailsQuery.data?.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrgDetailsId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            {orgDetailsQuery.isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">{t.loading}</div>
            ) : orgDetailsQuery.data ? (
              <div className="space-y-6 text-sm">
                {/* Stats Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Total Units</span>
                    <p className="text-xl font-bold text-white mt-1">
                      {orgDetailsQuery.data.stats.currentUnits} /{" "}
                      {orgDetailsQuery.data.stats.maxUnits}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Buildings</span>
                    <p className="text-xl font-bold text-white mt-1">
                      {orgDetailsQuery.data.stats.totalBuildings}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Room Types</span>
                    <p className="text-xl font-bold text-white mt-1">
                      {orgDetailsQuery.data.stats.totalRoomTypes}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Quota Usage</span>
                    <p className="text-xl font-bold text-purple-400 mt-1">
                      {orgDetailsQuery.data.stats.quotaPercentage}%
                    </p>
                  </div>
                </div>

                {/* Buildings & Flats Summary */}
                {orgDetailsQuery.data.buildings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-400">
                      Buildings & Flats
                    </h4>
                    <div className="space-y-2">
                      {orgDetailsQuery.data.buildings.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-white">{b.name}</span>
                            <span className="text-xs text-slate-400 block">{b.address}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-slate-800 bg-slate-900 text-slate-300"
                          >
                            {b.flats.length} Flats
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hotel Room Types */}
                {orgDetailsQuery.data.roomTypes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-400">
                      Hotel Room Inventory
                    </h4>
                    <div className="space-y-2">
                      {orgDetailsQuery.data.roomTypes.map((rt) => (
                        <div
                          key={rt.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-white">{rt.name}</span>
                            <span className="text-xs text-slate-400 block">
                              Base Price: ৳{Number(rt.basePrice).toLocaleString()}/night
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-slate-800 bg-slate-900 text-slate-300"
                          >
                            {rt.rooms.length} Rooms
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Members */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400">
                    Authorized Team Members
                  </h4>
                  <div className="space-y-1.5">
                    {orgDetailsQuery.data.members.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-lg bg-slate-950 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-white">{m.user?.name}</span>
                          <span className="text-slate-400 ml-2 font-mono">{m.user?.email}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-300 text-[10px]">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Audit Trail */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400">Recent Audit Trail</h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {orgDetailsQuery.data.auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded bg-slate-950/80 text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-purple-400">{log.action}</span>
                          <span className="text-slate-400 ml-2">by {log.actorEmail}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[10px]">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
