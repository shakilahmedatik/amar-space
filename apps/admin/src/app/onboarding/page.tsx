"use client";

import { useSession } from "@omniheaven/auth/client";
import { Badge, Button, Card, Input } from "@omniheaven/ui";
import type { OrgProductType } from "@omniheaven/validators";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Hotel,
  Loader2,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { trpc } from "../../lib/trpc";

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const [productType, setProductType] = useState<OrgProductType>("hotel");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.organization.create.useMutation();

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate clean slug
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40);
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please specify your property or organization name.");
      return;
    }
    if (slug.length < 3) {
      setError("Slug must be at least 3 characters (e.g., grand-haven).");
      return;
    }

    setError(null);

    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        productType,
        contactPhone: contactPhone.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (created?.id && typeof window !== "undefined") {
        localStorage.setItem("omniheaven_active_org_id", created.id);
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initialize organization workspace.");
    }
  };

  if (sessionPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--canvas))]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const managerName = session?.user?.name || "Manager";

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[hsl(var(--canvas))] text-foreground relative overflow-hidden">
        {/* Background ambient accents */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#C5A880]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[#C5A880]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-2xl space-y-6 relative z-10 py-8">
          <div className="text-center space-y-2">
            <div className="inline-flex size-14 rounded-2xl bg-gradient-to-br from-primary to-[#8C6D3F] text-primary-foreground items-center justify-center font-display font-black text-2xl shadow-xl shadow-primary/20 border border-[#C5A880]/40 mb-1">
              Ω
            </div>
            <div>
              <Badge
                variant="gold"
                className="text-[10px] tracking-widest uppercase font-bold px-3 py-1"
              >
                Step 1 of 1 · Workspace Setup
              </Badge>
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
              Welcome, {managerName}
            </h1>
            <p className="text-sm text-foreground-muted max-w-md mx-auto leading-relaxed">
              Configure your initial property portfolio to activate your 6-month commercial free
              trial.
            </p>
          </div>

          <Card className="p-6 sm:p-8 border border-border/80 shadow-2xl bg-card rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Step 1: Select Operation Type */}
              <div className="space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Select Your Primary Operation Model
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProductType("hotel")}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      productType === "hotel"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                        : "border-border bg-surface hover:bg-surface-elevated"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="size-10 rounded-lg bg-[#FAF6F0] dark:bg-[#251E1A] border border-[#C5A880]/50 flex items-center justify-center text-primary">
                        <Hotel className="size-5" />
                      </div>
                      {productType === "hotel" && <CheckCircle2 className="size-5 text-primary" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">Hotel & Resort</h3>
                      <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                        Tape charts, dynamic guest reservations, room inventory, and walk-in folios.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductType("building")}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      productType === "building"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                        : "border-border bg-surface hover:bg-surface-elevated"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="size-10 rounded-lg bg-[#FAF6F0] dark:bg-[#251E1A] border border-[#C5A880]/50 flex items-center justify-center text-primary">
                        <Building className="size-5" />
                      </div>
                      {productType === "building" && (
                        <CheckCircle2 className="size-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">
                        Residential & Commercial
                      </h3>
                      <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                        Flats, tenant leases, automated bKash utility billing, and maintenance
                        tickets.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Property Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="property-name"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Property / Organization Name
                  </label>
                  <Input
                    id="property-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={
                      productType === "hotel"
                        ? "Grand Palace Hotel & Resort"
                        : "Green Valley Residence Tower"
                    }
                    className="text-xs h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="property-slug"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Unique Workspace Slug
                  </label>
                  <div className="relative">
                    <Input
                      id="property-slug"
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
                      placeholder="green-valley"
                      className="text-xs h-10 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-foreground-muted">
                    Used for guest portal:{" "}
                    <span className="font-mono text-primary">{slug || "slug"}.omniheaven.com</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Contact Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                    <Input
                      id="contact-phone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="01711223344"
                      className="pl-9 text-xs h-10 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="address"
                    className="block text-xs font-bold uppercase tracking-wider text-foreground"
                  >
                    Address (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                    <Input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Road 11, Banani, Dhaka-1213"
                      className="pl-9 text-xs h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                variant="luxury"
                disabled={createMutation.isPending}
                className="w-full h-11 text-xs uppercase tracking-wider font-bold shadow-md"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Initializing Workspace...
                  </>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    Launch Property Dashboard
                  </span>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
