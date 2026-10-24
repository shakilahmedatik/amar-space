"use client";

import { useLanguage } from "@omniheaven/ui";
import { CreditCard, Database, FolderArchive, Globe2, ShieldCheck } from "lucide-react";

export function InfrastructureGrid() {
  const { t } = useLanguage();

  const infraCards = [
    {
      id: "c1",
      icon: Database,
      tag: t("infra.c1Tag", "Core Data Sovereignty"),
      title: t("infra.c1Title", "Self-Hosted PostgreSQL"),
      description: t(
        "infra.c1Desc",
        "Dedicated schemas and tenant encryption keys. Your resident folios and guest profiles are strictly isolated and never co-mingled in shared multi-tenant black boxes.",
      ),
      meta: t("infra.c1Meta", "Point-in-Time Recovery Active"),
    },
    {
      id: "c2",
      icon: FolderArchive,
      tag: t("infra.c2Tag", "Asset Sovereignty"),
      title: t("infra.c2Title", "SeaweedFS S3 Storage"),
      description: t(
        "infra.c2Desc",
        "High-performance distributed blob store for high-resolution villa galleries, signed tenant lease deeds, and utility receipts without external cloud egress surcharges.",
      ),
      meta: t("infra.c2Meta", "S3 API & Local NVMe Disks"),
    },
    {
      id: "c3",
      icon: Globe2,
      tag: t("infra.c3Tag", "Edge DNS & Routing"),
      title: t("infra.c3Title", "Cloudflare Wildcard Routing"),
      description: t(
        "infra.c3Desc",
        "Sub-second SSL certificate resolution for dynamic custom subdomains (*.omniheaven.com) or custom estate domains with enterprise DDoS protection.",
      ),
      meta: t("infra.c3Meta", "Sub-50ms Global Edge Latency"),
    },
    {
      id: "c4",
      icon: CreditCard,
      tag: t("infra.c4Tag", "Financial Settlement"),
      title: t("infra.c4Title", "Multi-Gateway Settlement"),
      description: t(
        "infra.c4Desc",
        "Direct tokenized reconciliation with bKash Merchant, Nagad, Paystation, and Stripe for international foreign credit cards with automated TrxID mapping.",
      ),
      meta: t("infra.c4Meta", "Auto TrxID Reconciliation"),
    },
  ];

  return (
    <section id="sovereignty" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--primary))] flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5 text-[hsl(var(--primary))]" />
          <span>{t("infra.tag", "Zero Cloud Vendor Lock-In")}</span>
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl text-[hsl(var(--foreground))] font-bold mt-2 mb-4 tracking-tight">
          {t("infra.title", "Sovereign Enterprise Infrastructure")}
        </h2>
        <p className="text-sm sm:text-base text-[hsl(var(--foreground-muted))] leading-relaxed">
          {t(
            "infra.subtitle",
            "High-net-worth guests and premier real estate assets demand complete digital sovereignty. omniHeaven isolates your property's databases, images, and keys under your sovereign jurisdiction.",
          )}
        </p>
      </div>

      {/* 4-Card Architectural Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {infraCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-[hsl(var(--surface-elevated))] rounded-3xl p-6 sm:p-7 border border-[hsl(var(--border))] shadow-xs hover:border-[hsl(var(--border-gold))] hover:shadow-luxury transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="size-12 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--primary))] mb-4 group-hover:scale-105 transition-transform">
                  <Icon className="size-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))] block mb-1">
                  {card.tag}
                </span>
                <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))] mb-2">
                  {card.title}
                </h4>
                <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] text-[11px] font-mono text-[hsl(var(--foreground-secondary))] flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{card.meta}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
