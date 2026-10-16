"use client";

import { Badge, Card, CurrencyDisplay, StatusBadge } from "@omniheaven/ui";
import { Activity, CreditCard, ExternalLink, Server, Sparkles, Users } from "lucide-react";
import { useState } from "react";

const initialTenants = [
  {
    id: "org-1",
    name: "Grand Haven Luxury Resort",
    slug: "grand-haven",
    productType: "hotel",
    customDomain: "grandhaven.com",
    plan: "trial_6_month",
    daysLeft: 172,
    ownersName: "Tanvir Ahmed",
    status: "active",
  },
  {
    id: "org-2",
    name: "Lakeview Residence Tower",
    slug: "lakeview-tower",
    productType: "building",
    customDomain: null,
    plan: "trial_6_month",
    daysLeft: 164,
    ownersName: "Shakil Atik",
    status: "active",
  },
  {
    id: "org-3",
    name: "Sajek Valley Eco Resort",
    slug: "sajek-valley",
    productType: "resort",
    customDomain: "sajekresort.com.bd",
    plan: "pro_monthly",
    daysLeft: 0,
    ownersName: "Zubair Hossain",
    status: "active",
  },
  {
    id: "org-4",
    name: "Gulshan Skyline Suites",
    slug: "skyline-suites",
    productType: "flat",
    customDomain: null,
    plan: "trial_6_month",
    daysLeft: 148,
    ownersName: "Mahmud Hasan",
    status: "active",
  },
];

export default function SuperAdminHQPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTenants = initialTenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="size-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-purple-900/40">
            Ω
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">Omni Heaven HQ</h1>
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] font-bold">
                Platform SuperAdmin
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Global control center · Multi-tenant operations & subscription health
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs bg-slate-900 border-slate-800 text-slate-300">
            <Server className="size-3 mr-1 text-emerald-400" /> Docker Stack: All 9 Services Healthy
          </Badge>
        </div>
      </div>

      {/* Platform Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Registered Tenants</span>
            <Users className="size-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white">48</p>
          <p className="text-[11px] text-slate-400">28 Hotels/Resorts · 20 Buildings</p>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">6-Month Free Trials</span>
            <Sparkles className="size-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">42 Active</p>
          <p className="text-[11px] text-slate-400">0 friction onboarding strategy</p>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Monthly SaaS Revenue</span>
            <CreditCard className="size-4 text-amber-400" />
          </div>
          <CurrencyDisplay amount={145000} large className="text-white" />
          <p className="text-[11px] text-slate-400">Converted Pro subscriptions</p>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">API Response P95</span>
            <Activity className="size-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-white">4.2 ms</p>
          <p className="text-[11px] text-slate-400">Bun + Hono + Cloudflare edge</p>
        </Card>
      </div>

      {/* Tenants Management Table */}
      <Card className="p-5 bg-slate-900 border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Platform Tenant Properties</h2>
            <p className="text-xs text-slate-400">
              Manage hotel, resort, and residential owner subscriptions.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search property or slug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-3">Property Name</th>
                <th className="px-3 py-3">Product Type</th>
                <th className="px-3 py-3">Subdomain & Domain</th>
                <th className="px-3 py-3">Subscription Plan</th>
                <th className="px-3 py-3">Trial Days Remaining</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-3.5">
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-slate-400 font-normal">Owner: {t.ownersName}</p>
                  </td>
                  <td className="px-3 py-3.5 capitalize">
                    <Badge
                      variant="outline"
                      className="text-[11px] border-slate-700 bg-slate-800/60 text-slate-300"
                    >
                      {t.productType}
                    </Badge>
                  </td>
                  <td className="px-3 py-3.5">
                    <a
                      href={`https://${t.slug}.omniheaven.com`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      {t.slug}.omniheaven.com
                      <ExternalLink className="size-3" />
                    </a>
                    {t.customDomain && (
                      <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                        ↳ {t.customDomain}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {t.plan === "trial_6_month" ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Sparkles className="size-3" /> 6-Month Trial
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold">Pro Monthly</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    {t.daysLeft > 0 ? (
                      <span className="font-semibold text-white">{t.daysLeft} days left</span>
                    ) : (
                      <span className="text-slate-400">Converted</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusBadge status="active" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
