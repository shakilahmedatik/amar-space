"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@omniheaven/ui";
import {
  createOrganizationSchema,
  ORG_SLUG_REGEX,
  type OrgProductType,
} from "@omniheaven/validators";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Hotel,
  Loader2,
  Palmtree,
  Plus,
  Store,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useOrganization } from "../lib/organization-context";
import { trpc } from "../lib/trpc";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PRODUCT_TYPES: {
  id: OrgProductType;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "hotel",
    title: "Hotel & Resort",
    desc: "Suites, bookings, concierge & guest portals",
    icon: Hotel,
  },
  {
    id: "building",
    title: "Residential Building",
    desc: "Flats, long-term tenants, meters & service charges",
    icon: Building2,
  },
  {
    id: "resort",
    title: "Vacation Resort",
    desc: "Villas, seasonal rates & recreation amenities",
    icon: Palmtree,
  },
  {
    id: "commercial",
    title: "Commercial Complex",
    desc: "Retail spaces, offices, leases & floor plans",
    icon: Store,
  },
];

export function CreateOrganizationModal() {
  const { isCreateModalOpen, setCreateModalOpen, switchOrganization } = useOrganization();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [debouncedSlug, setDebouncedSlug] = useState("");
  const [productType, setProductType] = useState<OrgProductType>("hotel");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-slugify when name changes if not manually modified
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  // Debounce slug input for availability query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSlug(slug.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [slug]);

  const isSlugFormatValid = ORG_SLUG_REGEX.test(debouncedSlug) && debouncedSlug.length >= 3;

  // Real-time slug availability check
  const { data: slugCheck, isFetching: isCheckingSlug } =
    trpc.organization.checkSlugAvailability.useQuery(
      { slug: debouncedSlug },
      {
        enabled: isSlugFormatValid && isCreateModalOpen,
        staleTime: 10_000,
      },
    );

  const createMutation = trpc.organization.create.useMutation();

  const handleReset = () => {
    setName("");
    setSlug("");
    setSlugManuallyEdited(false);
    setDebouncedSlug("");
    setProductType("hotel");
    setPhone("");
    setEmail("");
    setAddress("");
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate using Zod schema
    const result = createOrganizationSchema.safeParse({
      name,
      slug,
      productType,
      contactPhone: phone.trim() ? phone.trim() : null,
      contactEmail: email.trim() ? email.trim() : null,
      address: address.trim() ? address.trim() : null,
    });

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message || "Invalid input details");
      return;
    }

    if (slugCheck && !slugCheck.available) {
      setValidationError("This organization URL slug is already taken. Please pick another.");
      return;
    }

    try {
      const createdOrg = await createMutation.mutateAsync(result.data);
      if (createdOrg?.id) {
        await switchOrganization(createdOrg.id);
      }
      handleReset();
      setCreateModalOpen(false);
    } catch (err: any) {
      setValidationError(err.message || "Failed to create organization");
    }
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogContent className="max-w-2xl bg-card border-border-gold/30 shadow-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl sm:text-2xl font-serif font-bold text-foreground tracking-tight">
            Create New Property Workspace
          </DialogTitle>
          <DialogDescription className="text-foreground-muted text-xs sm:text-sm">
            Launch an isolated multi-tenant management environment for your hotel, resort, or
            residential building.
          </DialogDescription>
        </DialogHeader>

        {validationError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Organization Name */}
          <div className="space-y-1.5">
            <Label htmlFor="org-name" className="text-xs font-semibold text-foreground">
              Organization / Property Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="org-name"
              placeholder="e.g. Radisson Blu Resort or Rosewood Tower"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-11 text-sm bg-background border-border"
              required
            />
          </div>

          {/* URL Slug with Real-time Availability Check */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="org-slug" className="text-xs font-semibold text-foreground">
                Workspace URL Identifier (Slug) <span className="text-rose-500">*</span>
              </Label>
              {debouncedSlug.length >= 3 && (
                <div className="text-[11px] font-medium">
                  {isCheckingSlug ? (
                    <span className="flex items-center gap-1 text-foreground-muted">
                      <Loader2 className="size-3 animate-spin" /> Checking availability...
                    </span>
                  ) : !isSlugFormatValid ? (
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertCircle className="size-3" /> Lowercase letters, numbers & hyphens only
                    </span>
                  ) : slugCheck?.available ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle2 className="size-3" /> {slugCheck.slug}.omniheaven.com is
                      available
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-500 font-semibold">
                      <AlertCircle className="size-3" /> Slug is already taken
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary overflow-hidden">
              <span className="px-3 py-2.5 text-xs text-foreground-muted bg-surface/60 border-r border-border shrink-0 select-none">
                omniheaven.com/
              </span>
              <input
                id="org-slug"
                type="text"
                placeholder="rosewood-tower"
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value);
                }}
                className="w-full px-3 py-2 text-sm bg-transparent outline-none text-foreground placeholder:text-foreground-muted"
                required
              />
            </div>
            <p className="text-[11px] text-foreground-muted">
              Used for your dedicated tenant login, subdomains, and staff portal routing.
            </p>
          </div>

          {/* Product Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Property Management Mode <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRODUCT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = productType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setProductType(type.id)}
                    className={`min-h-[52px] p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                        : "border-border bg-card/60 hover:bg-surface hover:border-border/80"
                    }`}
                  >
                    <span
                      className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-surface text-foreground-muted border border-border"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">
                        {type.title}
                      </p>
                      <p className="text-[11px] text-foreground-muted mt-0.5 leading-snug">
                        {type.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone" className="text-xs font-semibold text-foreground">
                Phone Number (Optional)
              </Label>
              <Input
                id="contact-phone"
                placeholder="+8801712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 text-xs bg-background border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-email" className="text-xs font-semibold text-foreground">
                Official Email (Optional)
              </Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contact@property.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs bg-background border-border"
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold text-foreground">
              Physical Location / City (Optional)
            </Label>
            <Input
              id="address"
              placeholder="e.g. Road 11, Banani, Dhaka or Marine Drive, Cox's Bazar"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-10 text-xs bg-background border-border"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              className="h-11 min-h-[48px] px-5 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="luxury"
              disabled={createMutation.isPending || (slugCheck && !slugCheck.available)}
              className="h-11 min-h-[48px] px-6 text-xs font-bold"
            >
              {createMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Provisioning...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Plus className="size-4" /> Create Workspace
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
