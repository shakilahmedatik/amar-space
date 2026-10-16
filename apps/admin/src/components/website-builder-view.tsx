"use client";

import { Badge, Button, Card, Input } from "@omniheaven/ui";
import type { WebsiteBuilderConfig } from "@omniheaven/validators";
import {
  Check,
  ExternalLink,
  Eye,
  Layers,
  Monitor,
  Paintbrush,
  Palette,
  Save,
  Smartphone,
  Sparkles,
  Type,
} from "lucide-react";
import { useState } from "react";

const availableThemes = [
  {
    slug: "classic-luxury",
    name: "Classic Luxury",
    tagline: "Opulent & Timeless for 5-Star Hotels",
    accent: "#d97706",
    primary: "#0f172a",
    font: "Playfair Display",
  },
  {
    slug: "modern-minimal",
    name: "Modern Minimal",
    tagline: "Clean, High-Tech Boutique Aesthetic",
    accent: "#3b82f6",
    primary: "#18181b",
    font: "Inter",
  },
  {
    slug: "coastal-resort",
    name: "Coastal Resort",
    tagline: "Vibrant Tropical Breezes for Beach Resorts",
    accent: "#06b6d4",
    primary: "#164e63",
    font: "Outfit",
  },
  {
    slug: "boutique-haven",
    name: "Boutique Haven",
    tagline: "Warm, Intimate & Artisanal Atmosphere",
    accent: "#e11d48",
    primary: "#27272a",
    font: "Plus Jakarta Sans",
  },
];

export function WebsiteBuilderView({
  organizationSlug,
  organizationName,
}: {
  organizationSlug: string;
  organizationName: string;
}) {
  const [activeTab, setActiveTab] = useState<"theme" | "branding" | "hero" | "sections">("theme");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Builder configuration state
  const [config, setConfig] = useState<WebsiteBuilderConfig>({
    themeSlug: "classic-luxury",
    brand: {
      logoUrl: null,
      faviconUrl: null,
      primaryColor: "#0f172a",
      accentColor: "#d97706",
      fontFamily: "Playfair Display",
    },
    hero: {
      headline: `Welcome to ${organizationName}`,
      tagline: "Escape into unmatched hospitality and extraordinary experiences.",
      backgroundImageUrl:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
      ctaText: "Explore Suites & Villas",
      ctaLink: "#rooms",
    },
    enabledSections: ["hero", "rooms", "amenities", "gallery", "about", "contact"],
    sectionOrder: ["hero", "rooms", "amenities", "gallery", "about", "contact"],
    customCss: null,
    seoTitle: `${organizationName} | Official Luxury Booking`,
    seoDescription: `Book your dream stay directly at ${organizationName} for best rate guarantee.`,
  });

  const handleSelectTheme = (theme: (typeof availableThemes)[0]) => {
    setConfig((prev) => ({
      ...prev,
      themeSlug: theme.slug as any,
      brand: {
        ...prev.brand,
        primaryColor: theme.primary,
        accentColor: theme.accent,
        fontFamily: theme.font as any,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    // Simulate save mutation
    await new Promise((r) => setTimeout(r, 600));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header with live subdomain link and save button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Website Builder & Theme Studio
            </h1>
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-semibold"
            >
              <Sparkles className="size-3 mr-1" /> Live Engine
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Customer-facing site URL:{" "}
            <a
              href={`https://${organizationSlug}.omniheaven.com`}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-1"
            >
              {organizationSlug}.omniheaven.com
              <ExternalLink className="size-3" />
            </a>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(previewMode === "desktop" ? "mobile" : "desktop")}
            className="flex items-center gap-1.5"
          >
            {previewMode === "desktop" ? (
              <Smartphone className="size-4" />
            ) : (
              <Monitor className="size-4" />
            )}
            {previewMode === "desktop" ? "Mobile View" : "Desktop View"}
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {saveSuccess ? (
              <>
                <Check className="size-4" /> Published!
              </>
            ) : isSaving ? (
              "Publishing..."
            ) : (
              <>
                <Save className="size-4" /> Publish Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Builder Grid: Left editor panels, Right live preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Controls */}
        <div className="lg:col-span-5 space-y-4">
          {/* Tab Navigation */}
          <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg p-1 bg-slate-50 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab("theme")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "theme"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Paintbrush className="size-3.5" /> Themes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("branding")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "branding"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Palette className="size-3.5" /> Branding
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("hero")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "hero"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Type className="size-3.5" /> Hero Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sections")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === "sections"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Layers className="size-3.5" /> Sections
            </button>
          </div>

          {/* Tab 1: Themes */}
          {activeTab === "theme" && (
            <div className="space-y-3">
              {availableThemes.map((theme) => {
                const isSelected = config.themeSlug === theme.slug;
                return (
                  <Card
                    key={theme.slug}
                    onClick={() => handleSelectTheme(theme)}
                    className={`p-4 cursor-pointer transition-all border-2 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                            {theme.name}
                          </h3>
                          {isSelected && (
                            <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{theme.tagline}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="size-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: theme.primary }}
                          title="Primary"
                        />
                        <span
                          className="size-4 rounded-full border border-black/10 shadow-xs"
                          style={{ backgroundColor: theme.accent }}
                          title="Accent"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                      <span>
                        Typography:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">{theme.font}</strong>
                      </span>
                      <span className="text-indigo-600 font-medium">Click to apply</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Tab 2: Branding */}
          {activeTab === "branding" && (
            <Card className="p-4 space-y-4">
              <div>
                <label
                  htmlFor="primary-color-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="primary-color-picker"
                    type="color"
                    value={config.brand.primaryColor}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, primaryColor: e.target.value },
                      }))
                    }
                    className="size-9 rounded-md border cursor-pointer border-slate-200 dark:border-slate-800 p-0.5"
                  />
                  <Input
                    id="primary-color-input"
                    value={config.brand.primaryColor}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, primaryColor: e.target.value },
                      }))
                    }
                    className="text-xs uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="accent-color-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="accent-color-picker"
                    type="color"
                    value={config.brand.accentColor}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, accentColor: e.target.value },
                      }))
                    }
                    className="size-9 rounded-md border cursor-pointer border-slate-200 dark:border-slate-800 p-0.5"
                  />
                  <Input
                    id="accent-color-input"
                    value={config.brand.accentColor}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        brand: { ...prev.brand, accentColor: e.target.value },
                      }))
                    }
                    className="text-xs uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="font-family-select"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Font Pairing
                </label>
                <select
                  id="font-family-select"
                  value={config.brand.fontFamily}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      brand: { ...prev.brand, fontFamily: e.target.value as any },
                    }))
                  }
                  className="w-full text-xs h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1 font-medium"
                >
                  <option value="Playfair Display">Playfair Display (Serif / Luxury)</option>
                  <option value="Inter">Inter (Clean / Modern)</option>
                  <option value="Outfit">Outfit (Geometric / Resort)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Friendly Boutique)</option>
                </select>
              </div>
            </Card>
          )}

          {/* Tab 3: Hero Content */}
          {activeTab === "hero" && (
            <Card className="p-4 space-y-4">
              <div>
                <label
                  htmlFor="hero-headline-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Main Headline
                </label>
                <Input
                  id="hero-headline-input"
                  value={config.hero.headline}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, headline: e.target.value },
                    }))
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-tagline-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Sub-headline / Tagline
                </label>
                <Input
                  id="hero-tagline-input"
                  value={config.hero.tagline || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, tagline: e.target.value },
                    }))
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-bg-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Hero Background Image URL
                </label>
                <Input
                  id="hero-bg-input"
                  value={config.hero.backgroundImageUrl || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, backgroundImageUrl: e.target.value },
                    }))
                  }
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-cta-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                >
                  Call to Action (CTA) Button
                </label>
                <Input
                  id="hero-cta-input"
                  value={config.hero.ctaText}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, ctaText: e.target.value },
                    }))
                  }
                  className="text-xs"
                />
              </div>
            </Card>
          )}

          {/* Tab 4: Sections */}
          {activeTab === "sections" && (
            <Card className="p-4 space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Toggle and arrange sections that appear on your property website.
              </p>
              {config.sectionOrder.map((sectionId) => {
                const isEnabled = config.enabledSections.includes(sectionId);
                return (
                  <div
                    key={sectionId}
                    className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-medium"
                  >
                    <span className="capitalize">{sectionId} Section</span>
                    <Button
                      variant={isEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          enabledSections: isEnabled
                            ? prev.enabledSections.filter((s) => s !== sectionId)
                            : [...prev.enabledSections, sectionId],
                        }));
                      }}
                      className="h-6 px-2 text-[11px]"
                    >
                      {isEnabled ? "Visible" : "Hidden"}
                    </Button>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* Right Live Preview Canvas */}
        <div className="lg:col-span-7 sticky top-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <Eye className="size-3.5" /> Interactive Live Preview
            </span>
            <span className="font-mono text-[11px] text-slate-400">Theme: {config.themeSlug}</span>
          </div>

          <div
            className={`mx-auto border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-xl transition-all duration-300 ${
              previewMode === "mobile" ? "max-w-[375px]" : "w-full"
            }`}
            style={{
              backgroundColor: config.brand.primaryColor,
              fontFamily: config.brand.fontFamily,
            }}
          >
            {/* Preview Browser Mockup Bar */}
            <div className="bg-slate-900 px-3 py-2 flex items-center gap-2 border-b border-white/10">
              <div className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-500" />
                <span className="size-2.5 rounded-full bg-amber-500" />
                <span className="size-2.5 rounded-full bg-emerald-500" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-3 py-0.5 rounded-full">
                  https://{organizationSlug}.omniheaven.com
                </span>
              </div>
            </div>

            {/* Preview Content */}
            <div className="relative text-white min-h-[500px] flex flex-col justify-between overflow-hidden">
              {/* Background with overlay */}
              {config.hero.backgroundImageUrl && (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                  style={{
                    backgroundImage: `url(${config.hero.backgroundImageUrl})`,
                  }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to bottom, ${config.brand.primaryColor}CC, ${config.brand.primaryColor}F2)`,
                    }}
                  />
                </div>
              )}

              {/* Header */}
              <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: config.brand.accentColor }}
                  />
                  <span className="font-bold tracking-tight text-sm text-white">
                    {organizationName}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/80">
                  <span>Rooms</span>
                  <span>Amenities</span>
                  <span>Contact</span>
                </div>
              </header>

              {/* Hero Banner */}
              <div className="relative z-10 px-6 py-16 text-center max-w-lg mx-auto space-y-4">
                <Badge
                  variant="outline"
                  className="border-white/20 text-white/90 text-xs px-3 py-0.5"
                  style={{ borderColor: config.brand.accentColor }}
                >
                  Best Rate Direct Booking
                </Badge>

                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {config.hero.headline}
                </h2>

                <p className="text-sm text-white/80 leading-relaxed font-sans">
                  {config.hero.tagline}
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: config.brand.accentColor,
                      color: "#ffffff",
                    }}
                  >
                    {config.hero.ctaText}
                  </button>
                </div>
              </div>

              {/* Sample Room Cards Preview */}
              <div className="relative z-10 bg-white/5 backdrop-blur-md px-6 py-6 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-white/80">
                  <span className="font-semibold uppercase tracking-wider text-[11px]">
                    Featured Room Types
                  </span>
                  <span className="text-[11px]" style={{ color: config.brand.accentColor }}>
                    View All (12 Available)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-sans">
                  <div className="bg-black/30 p-3 rounded-lg border border-white/10">
                    <p className="text-xs font-semibold text-white">Deluxe Ocean Suite</p>
                    <p className="text-[11px] text-white/60">King Bed · 2 Guests</p>
                    <p
                      className="text-xs font-bold mt-2"
                      style={{ color: config.brand.accentColor }}
                    >
                      ৳8,500 <span className="text-[10px] text-white/60 font-normal">/ night</span>
                    </p>
                  </div>
                  <div className="bg-black/30 p-3 rounded-lg border border-white/10">
                    <p className="text-xs font-semibold text-white">Presidential Villa</p>
                    <p className="text-[11px] text-white/60">2 Bedrooms · Private Pool</p>
                    <p
                      className="text-xs font-bold mt-2"
                      style={{ color: config.brand.accentColor }}
                    >
                      ৳24,000 <span className="text-[10px] text-white/60 font-normal">/ night</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
