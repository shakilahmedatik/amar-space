"use client";

import { signOut, useSession } from "@omniheaven/auth/client";
import { Badge, Button, Card, UserProfileMenu } from "@omniheaven/ui";
import {
  Activity,
  AlertOctagon,
  Building2,
  CheckCircle2,
  CreditCard,
  Filter,
  Globe,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Unlock,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

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

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace("/login");
    }
  }, [sessionLoading, session, router]);

  // Loading state or Unauthenticated redirecting
  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--canvas))] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-foreground-muted font-medium">
            Verifying Platform HQ Credentials...
          </p>
        </div>
      </div>
    );
  }

  // 403 Forbidden RBAC Guard
  const userGlobalRole = (session?.user as { globalRole?: string | null } | undefined)?.globalRole;
  if (session?.user && userGlobalRole !== "superadmin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[hsl(var(--canvas))] text-foreground">
        <Card className="max-w-md w-full p-8 border border-rose-500/30 bg-card rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="size-14 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="size-7" />
          </div>
          <div>
            <Badge
              variant="destructive"
              className="text-[10px] tracking-wider uppercase font-bold px-2.5 py-0.5"
            >
              403 Forbidden
            </Badge>
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">
            Platform SuperAdmin Access Required
          </h1>
          <p className="text-xs text-foreground-muted leading-relaxed">
            Your account (<strong className="text-foreground">{session.user.email}</strong>) does
            not have root administrative permissions for omniHeaven Platform HQ.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button variant="luxury" onClick={handleSignOut} className="w-full text-xs">
              Sign Out & Switch Account
            </Button>
            <Button asChild variant="outline" className="w-full text-xs">
              <a href="http://localhost:3000">Go to Property Manager Portal</a>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--canvas))] text-foreground p-4 sm:p-8 space-y-8 font-sans selection:bg-primary/20 selection:text-foreground">
      {/* Top Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border-gold/20">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary via-amber-600 to-[#2A201C] flex items-center justify-center text-white font-serif font-black text-xl shadow-lg border border-border-gold/50">
            Ω
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-foreground">
                {t.title}
              </h1>
              <Badge className="bg-primary/10 text-primary border-border-gold/40 text-[11px] font-semibold px-2.5 py-0.5">
                {t.badgeSuperadmin}
              </Badge>
            </div>
            <p className="text-xs text-foreground-muted mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border-gold/30 text-xs text-foreground-muted shadow-xs">
            <Server className="size-3.5 text-emerald-500" />
            <span className="font-medium">{t.systemHealthy}</span>
          </div>

          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-card hover:bg-surface-elevated border border-border-gold/30 text-xs text-foreground font-semibold transition cursor-pointer min-h-[44px] shadow-xs"
          >
            <Globe className="size-3.5 text-primary" />
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
            className="border-border-gold/30 bg-card hover:bg-surface-elevated text-foreground text-xs gap-1.5 min-h-[44px] rounded-xl shadow-xs"
          >
            <RefreshCw
              className={`size-3.5 ${statsQuery.isFetching ? "animate-spin text-primary" : ""}`}
            />
            <span>{t.refresh}</span>
          </Button>

          {/* User Profile Menu */}
          <div className="pl-2 border-l border-border-gold/20">
            <UserProfileMenu
              user={{
                name: session?.user?.name || "Root SuperAdmin",
                email: session?.user?.email || "admin@omniheaven.com",
                image: session?.user?.image,
                globalRole: userGlobalRole || "superadmin",
              }}
              roleLabel="SuperAdmin"
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav
        aria-label="HQ Navigation"
        className="flex items-center gap-2 border-b border-border-gold/20 pb-2"
      >
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition cursor-pointer min-h-[48px] ${
            activeTab === "overview"
              ? "bg-primary/10 text-primary border border-border-gold/40 shadow-xs font-serif font-bold"
              : "text-foreground-muted hover:text-foreground hover:bg-surface-elevated font-medium"
          }`}
        >
          <Activity className="size-4" />
          <span>{t.overviewTab}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("organizations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition cursor-pointer min-h-[48px] ${
            activeTab === "organizations"
              ? "bg-primary/10 text-primary border border-border-gold/40 shadow-xs font-serif font-bold"
              : "text-foreground-muted hover:text-foreground hover:bg-surface-elevated font-medium"
          }`}
        >
          <Building2 className="size-4" />
          <span>{t.orgsTab}</span>
          {stats && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-border-gold/30 ml-1">
              {stats.organizations.total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition cursor-pointer min-h-[48px] ${
            activeTab === "plans"
              ? "bg-primary/10 text-primary border border-border-gold/40 shadow-xs font-serif font-bold"
              : "text-foreground-muted hover:text-foreground hover:bg-surface-elevated font-medium"
          }`}
        >
          <CreditCard className="size-4" />
          <span>{t.plansTab}</span>
        </button>
      </nav>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <Card className="p-5 bg-card border border-border-gold/30 shadow-xs hover:border-border-gold/60 transition-all rounded-2xl">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              {t.mrrTitle}
            </span>
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              ৳
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-foreground tracking-tight">
            ৳{stats ? stats.revenue.estimatedMrrBdt.toLocaleString("en-US") : "—"}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <TrendingUp className="size-3.5" />
            <span>{t.mrrSubtitle}</span>
          </div>
        </Card>

        {/* Organizations Breakdown Card */}
        <Card className="p-5 bg-card border border-border-gold/30 shadow-xs hover:border-border-gold/60 transition-all rounded-2xl">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              {t.totalOrgsTitle}
            </span>
            <div className="size-8 rounded-lg bg-primary/10 border border-border-gold/30 flex items-center justify-center text-primary">
              <Building2 className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-foreground tracking-tight">
            {stats ? stats.organizations.total : "—"}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-foreground-muted">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {stats?.organizations.active ?? 0} {t.activeOrgs}
            </span>
            <span>·</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              {stats?.organizations.trialing ?? 0} {t.trialingOrgs}
            </span>
            <span>·</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              {stats?.organizations.suspended ?? 0} {t.suspendedOrgs}
            </span>
          </div>
        </Card>

        {/* Physical Units Managed Card */}
        <Card className="p-5 bg-card border border-border-gold/30 shadow-xs hover:border-border-gold/60 transition-all rounded-2xl">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              {t.managedUnitsTitle}
            </span>
            <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Layers className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-foreground tracking-tight">
            {stats ? stats.assets.totalUnits : "—"}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-foreground-muted">
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
        <Card className="p-5 bg-card border border-border-gold/30 shadow-xs hover:border-border-gold/60 transition-all rounded-2xl">
          <div className="flex items-center justify-between text-foreground-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              {t.subsHealthTitle}
            </span>
            <div className="size-8 rounded-lg bg-primary/10 border border-border-gold/30 flex items-center justify-center text-primary">
              <CreditCard className="size-4" />
            </div>
          </div>
          <p className="text-3xl font-serif font-bold text-foreground tracking-tight">
            {stats ? stats.revenue.activeSubscriptionsCount : "—"}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
            <CheckCircle2 className="size-3.5" />
            <span>{t.subsHealthSubtitle}</span>
          </div>
        </Card>
      </div>

      {/* Main Content Sections Based on Active Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span>Platform Tenant Operations</span>
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab("organizations")}
              className="text-xs text-primary hover:underline font-semibold cursor-pointer"
            >
              View Full Directory &rarr;
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-gold/30 bg-card shadow-xs">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-surface/80 text-xs uppercase tracking-wider text-foreground-muted border-b border-border-gold/20">
                <tr>
                  <th className="px-5 py-3.5 font-bold">{t.colOrg}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colType}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colQuota}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colPlan}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colStatus}</th>
                  <th className="px-5 py-3.5 font-bold text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-gold/15">
                {orgs.slice(0, 5).map((org) => {
                  const quota = org.units;
                  const isNearCap = quota.quotaPercentage >= 80;
                  const isOverCap = quota.quotaPercentage >= 100;

                  return (
                    <tr key={org.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-serif font-bold text-foreground">{org.name}</div>
                        <div className="text-xs text-foreground-muted font-mono">/{org.slug}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface text-foreground border border-border-gold/20 capitalize">
                          {org.productType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span
                            className={
                              isOverCap
                                ? "text-rose-600 dark:text-rose-400"
                                : isNearCap
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {quota.currentUnits} / {quota.maxUnits} units
                          </span>
                          <span className="text-foreground-muted text-[11px]">
                            {quota.quotaPercentage}%
                          </span>
                        </div>
                        <div className="w-36 h-2 rounded-full bg-surface-elevated border border-border-gold/20 overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isOverCap
                                ? "bg-rose-500"
                                : isNearCap
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, quota.quotaPercentage)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">
                          {org.subscription?.plan?.name || "Trial 6-Month"}
                        </div>
                        <div className="text-[11px] text-foreground-muted capitalize">
                          {org.subscription?.billingCycle || "monthly"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            org.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : org.status === "suspended"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                : "bg-primary/10 text-primary border border-border-gold/30"
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
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold transition cursor-pointer min-h-[40px]"
                            >
                              {t.btnReinstate}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSuspendModalOrg({ id: org.id, name: org.name })}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold transition cursor-pointer min-h-[40px]"
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
                            className="px-2.5 py-1.5 rounded-xl bg-surface border border-border-gold/30 text-foreground hover:bg-surface-elevated text-xs font-semibold transition cursor-pointer min-h-[40px]"
                          >
                            {t.btnChangePlan}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedOrgDetailsId(org.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary border border-border-gold/30 hover:bg-primary/20 text-xs font-semibold transition cursor-pointer min-h-[40px]"
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border-gold/30 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-foreground-muted" />
              <input
                id="search-orgs-input"
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border-gold/30 rounded-xl text-sm text-foreground placeholder:text-foreground-muted focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-foreground-muted" />
                <select
                  id="status-filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-background border border-border-gold/30 text-foreground text-xs rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px] cursor-pointer"
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
                className="bg-background border border-border-gold/30 text-foreground text-xs rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px] cursor-pointer"
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
          <div className="overflow-x-auto rounded-2xl border border-border-gold/30 bg-card shadow-xs">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="bg-surface/80 text-xs uppercase tracking-wider text-foreground-muted border-b border-border-gold/20">
                <tr>
                  <th className="px-5 py-3.5 font-bold">{t.colOrg}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colType}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colQuota}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colPlan}</th>
                  <th className="px-5 py-3.5 font-bold">{t.colStatus}</th>
                  <th className="px-5 py-3.5 font-bold text-right">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-gold/15">
                {orgs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-foreground-muted text-sm"
                    >
                      {t.noOrgsFound}
                    </td>
                  </tr>
                ) : (
                  orgs.map((org) => {
                    const quota = org.units;
                    const isNearCap = quota.quotaPercentage >= 80;
                    const isOverCap = quota.quotaPercentage >= 100;

                    return (
                      <tr key={org.id} className="hover:bg-primary/5 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-serif font-bold text-foreground text-base">
                            {org.name}
                          </div>
                          <div className="text-xs text-foreground-muted font-mono">/{org.slug}</div>
                          {org.owner && (
                            <div className="text-[11px] text-foreground-muted mt-0.5">
                              Owner: {org.owner.name} ({org.owner.email})
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-surface text-foreground border border-border-gold/20 capitalize">
                            {org.productType}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-between text-xs font-semibold mb-1">
                            <span
                              className={
                                isOverCap
                                  ? "text-rose-600 dark:text-rose-400"
                                  : isNearCap
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                              }
                            >
                              {quota.currentUnits} / {quota.maxUnits} units
                            </span>
                            <span className="text-foreground-muted text-[11px]">
                              {quota.quotaPercentage}%
                            </span>
                          </div>
                          <div className="w-40 h-2 rounded-full bg-surface-elevated border border-border-gold/20 overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${
                                isOverCap
                                  ? "bg-rose-500"
                                  : isNearCap
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, quota.quotaPercentage)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-foreground-muted mt-1">
                            {quota.flatsCount} flats · {quota.roomsCount} rooms ·{" "}
                            {quota.remainingUnits} free
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-foreground">
                            {org.subscription?.plan?.name || "Trial 6-Month"}
                          </div>
                          <div className="text-[11px] text-foreground-muted capitalize">
                            {org.subscription?.billingCycle || "monthly"} · ৳
                            {org.subscription?.plan?.priceMonthlyBdt || 0}/mo
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              org.status === "active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : org.status === "suspended"
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  : "bg-primary/10 text-primary border border-border-gold/30"
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
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-xs font-semibold transition cursor-pointer min-h-[40px]"
                              >
                                {t.btnReinstate}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSuspendModalOrg({ id: org.id, name: org.name })}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold transition cursor-pointer min-h-[40px]"
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
                              className="px-3 py-1.5 rounded-xl bg-surface border border-border-gold/30 text-foreground hover:bg-surface-elevated text-xs font-semibold transition cursor-pointer min-h-[40px]"
                            >
                              {t.btnChangePlan}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrgDetailsId(org.id)}
                              className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-border-gold/30 hover:bg-primary/20 text-xs font-semibold transition cursor-pointer min-h-[40px]"
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
            <h2 className="text-xl font-serif font-bold text-foreground">{t.plansTab}</h2>
            <p className="text-xs text-foreground-muted mt-1">{t.plansSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const features: string[] =
                typeof plan.features === "string" ? JSON.parse(plan.features) : plan.features;

              return (
                <Card
                  key={plan.id}
                  className="p-6 bg-card border border-border-gold/30 shadow-xs hover:border-border-gold/60 flex flex-col justify-between rounded-2xl relative overflow-hidden transition-all"
                >
                  {plan.id === "pro" && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-serif font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-foreground-muted mt-1">{plan.description}</p>
                    </div>

                    <div className="py-2 border-y border-border-gold/20 space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-serif font-bold text-foreground">
                          ৳{Number(plan.priceMonthlyBdt).toLocaleString()}
                        </span>
                        <span className="text-xs text-foreground-muted">/ month</span>
                      </div>
                      <div className="text-xs text-foreground-muted">
                        ৳{Number(plan.priceYearlyBdt).toLocaleString()} billed yearly
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {t.unitsCap}:{" "}
                        {plan.maxUnits >= 999999 ? "Unlimited" : `${plan.maxUnits} units`}
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-bold text-foreground">{t.features}:</div>
                        {features.map((feat, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs text-foreground-muted"
                          >
                            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-border-gold/20">
                    <Badge
                      variant="outline"
                      className="text-xs w-full justify-center bg-surface border-border-gold/30 text-foreground py-1.5 font-mono"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border-gold/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-gold/20">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <AlertOctagon className="size-5" />
                <h3 className="text-lg font-serif font-bold text-foreground">
                  {t.suspendModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSuspendModalOrg(null)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-600 dark:text-rose-300 flex items-start gap-3">
              <ShieldAlert className="size-5 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-bold text-sm text-foreground mb-1">{suspendModalOrg.name}</p>
                <p>{t.suspendWarning}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="suspend-reason-textarea"
                className="text-xs font-semibold text-foreground"
              >
                {t.suspendReasonLabel}
              </label>
              <textarea
                id="suspend-reason-textarea"
                rows={3}
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={t.suspendReasonPlaceholder}
                className="w-full rounded-xl bg-background border border-border-gold/30 p-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-gold/20">
              <Button
                variant="outline"
                onClick={() => setSuspendModalOrg(null)}
                className="border-border-gold/30 text-foreground min-h-[44px]"
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
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold min-h-[44px]"
              >
                {suspendMutation.isPending ? "Suspending..." : t.btnConfirmSuspend}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reinstate Customer Organization */}
      {reinstateModalOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border-gold/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-gold/20">
              <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                <Unlock className="size-5" />
                <h3 className="text-lg font-serif font-bold text-foreground">
                  {t.reinstateModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReinstateModalOrg(null)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-600 dark:text-emerald-300">
              <p className="font-bold text-sm text-foreground mb-1">{reinstateModalOrg.name}</p>
              <p>Reinstating this organization restores full access for all tenant members.</p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reinstate-notes-textarea"
                className="text-xs font-semibold text-foreground"
              >
                {t.reinstateNotesLabel}
              </label>
              <textarea
                id="reinstate-notes-textarea"
                rows={3}
                value={reinstateNotes}
                onChange={(e) => setReinstateNotes(e.target.value)}
                placeholder={t.reinstateNotesPlaceholder}
                className="w-full rounded-xl bg-background border border-border-gold/30 p-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-gold/20">
              <Button
                variant="outline"
                onClick={() => setReinstateModalOrg(null)}
                className="border-border-gold/30 text-foreground min-h-[44px]"
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold min-h-[44px]"
              >
                {reinstateMutation.isPending ? "Reinstating..." : t.btnConfirmReinstate}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Update SaaS Plan & Quotas */}
      {changePlanOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border-gold/40 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-gold/20">
              <div className="flex items-center gap-2.5 text-primary">
                <CreditCard className="size-5" />
                <h3 className="text-lg font-serif font-bold text-foreground">
                  {t.changePlanModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChangePlanOrg(null)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-xl bg-surface p-4 border border-border-gold/20 space-y-1">
              <div className="text-sm font-serif font-bold text-foreground">
                {changePlanOrg.name}
              </div>
              <div className="text-xs text-foreground-muted">
                Currently using{" "}
                <span className="text-primary font-semibold">
                  {changePlanOrg.currentUnits} active units
                </span>
                .
              </div>
            </div>

            {isDowngradeBlocked && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-600 dark:text-amber-300 flex items-start gap-2.5">
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>{t.quotaExceededWarning}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="plan-select-dropdown"
                  className="text-xs font-semibold text-foreground"
                >
                  {t.selectPlanLabel}
                </label>
                <select
                  id="plan-select-dropdown"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full rounded-xl bg-background border border-border-gold/30 p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px] cursor-pointer"
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
                    className="text-xs font-semibold text-foreground"
                  >
                    {t.billingCycleLabel}
                  </label>
                  <select
                    id="billing-cycle-select"
                    value={selectedBillingCycle}
                    onChange={(e) => setSelectedBillingCycle(e.target.value as any)}
                    className="w-full rounded-xl bg-background border border-border-gold/30 p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px] cursor-pointer"
                  >
                    <option value="monthly">{t.monthly}</option>
                    <option value="yearly">{t.yearly}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="extend-days-input"
                    className="text-xs font-semibold text-foreground"
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
                    className="w-full rounded-xl bg-background border border-border-gold/30 p-3 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-gold/20">
              <Button
                variant="outline"
                onClick={() => setChangePlanOrg(null)}
                className="border-border-gold/30 text-foreground min-h-[44px]"
              >
                {t.cancel}
              </Button>
              <Button
                variant="luxury"
                disabled={isDowngradeBlocked || updatePlanMutation.isPending}
                onClick={() =>
                  updatePlanMutation.mutate({
                    organizationId: changePlanOrg.id,
                    planId: selectedPlanId,
                    billingCycle: selectedBillingCycle,
                    extendDays,
                  })
                }
                className="font-bold min-h-[44px]"
              >
                {updatePlanMutation.isPending ? "Updating Plan..." : t.btnConfirmPlanUpdate}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Organization Deep Dive Details */}
      {selectedOrgDetailsId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-card border border-border-gold/40 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-gold/20">
              <div>
                <h3 className="text-lg font-serif font-bold text-foreground">
                  {orgDetailsQuery.data?.name || "Organization Overview"}
                </h3>
                <p className="text-xs text-foreground-muted font-mono">
                  /{orgDetailsQuery.data?.slug}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrgDetailsId(null)}
                className="text-foreground-muted hover:text-foreground p-1 rounded-lg cursor-pointer min-h-[44px]"
              >
                <X className="size-5" />
              </button>
            </div>

            {orgDetailsQuery.isLoading ? (
              <div className="py-12 text-center text-foreground-muted text-sm">{t.loading}</div>
            ) : orgDetailsQuery.data ? (
              <div className="space-y-6 text-sm">
                {/* Stats Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-surface border border-border-gold/20">
                    <span className="text-[11px] text-foreground-muted">Total Units</span>
                    <p className="text-xl font-serif font-bold text-foreground mt-1">
                      {orgDetailsQuery.data.stats.currentUnits} /{" "}
                      {orgDetailsQuery.data.stats.maxUnits}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border-gold/20">
                    <span className="text-[11px] text-foreground-muted">Buildings</span>
                    <p className="text-xl font-serif font-bold text-foreground mt-1">
                      {orgDetailsQuery.data.stats.totalBuildings}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border-gold/20">
                    <span className="text-[11px] text-foreground-muted">Room Types</span>
                    <p className="text-xl font-serif font-bold text-foreground mt-1">
                      {orgDetailsQuery.data.stats.totalRoomTypes}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border-gold/20">
                    <span className="text-[11px] text-foreground-muted">Quota Usage</span>
                    <p className="text-xl font-serif font-bold text-primary mt-1">
                      {orgDetailsQuery.data.stats.quotaPercentage}%
                    </p>
                  </div>
                </div>

                {/* Buildings & Flats Summary */}
                {orgDetailsQuery.data.buildings.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-foreground-muted">
                      Buildings & Flats
                    </h4>
                    <div className="space-y-2">
                      {orgDetailsQuery.data.buildings.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-surface border border-border-gold/20 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{b.name}</span>
                            <span className="text-xs text-foreground-muted block">{b.address}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-border-gold/30 bg-card text-foreground"
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
                    <h4 className="text-xs font-bold uppercase text-foreground-muted">
                      Hotel Room Inventory
                    </h4>
                    <div className="space-y-2">
                      {orgDetailsQuery.data.roomTypes.map((rt) => (
                        <div
                          key={rt.id}
                          className="p-3 rounded-xl bg-surface border border-border-gold/20 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-semibold text-foreground">{rt.name}</span>
                            <span className="text-xs text-foreground-muted block">
                              Base Price: ৳{Number(rt.basePrice).toLocaleString()}/night
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-border-gold/30 bg-card text-foreground"
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
                  <h4 className="text-xs font-bold uppercase text-foreground-muted">
                    Authorized Team Members
                  </h4>
                  <div className="space-y-1.5">
                    {orgDetailsQuery.data.members.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl bg-surface border border-border-gold/15 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{m.user?.name}</span>
                          <span className="text-foreground-muted ml-2 font-mono">
                            {m.user?.email}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold uppercase bg-primary/10 text-primary border border-border-gold/30 text-[10px]">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Audit Trail */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase text-foreground-muted">
                    Recent Audit Trail
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {orgDetailsQuery.data.auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-surface border border-border-gold/15 text-[11px] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-primary">{log.action}</span>
                          <span className="text-foreground-muted ml-2">by {log.actorEmail}</span>
                        </div>
                        <span className="text-foreground-muted font-mono text-[10px]">
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
