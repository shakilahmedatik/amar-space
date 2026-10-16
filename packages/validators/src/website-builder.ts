import { z } from "zod";

export const themeSectionEnum = z.enum([
  "hero",
  "rooms",
  "amenities",
  "gallery",
  "about",
  "reviews",
  "location",
  "contact",
]);

export const brandIdentitySchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color")
    .default("#0f172a"),
  accentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color")
    .default("#f59e0b"),
  fontFamily: z.enum(["Inter", "Playfair Display", "Outfit", "Plus Jakarta Sans"]).default("Inter"),
});

export const heroContentSchema = z.object({
  headline: z.string().min(1).max(200).default("Experience Luxury & Comfort"),
  tagline: z.string().max(500).optional().nullable(),
  backgroundImageUrl: z.string().url().optional().nullable(),
  ctaText: z.string().max(50).default("Book Your Stay"),
  ctaLink: z.string().max(200).default("#rooms"),
});

export const updateWebsiteBuilderConfigSchema = z.object({
  themeSlug: z
    .enum(["classic-luxury", "modern-minimal", "coastal-resort", "boutique-haven"])
    .default("classic-luxury"),
  brand: brandIdentitySchema,
  hero: heroContentSchema,
  enabledSections: z
    .array(themeSectionEnum)
    .default(["hero", "rooms", "amenities", "gallery", "about", "reviews", "contact"]),
  sectionOrder: z
    .array(themeSectionEnum)
    .default(["hero", "rooms", "amenities", "gallery", "about", "reviews", "contact"]),
  customCss: z.string().max(5000).optional().nullable(),
  seoTitle: z.string().max(100).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
});

export type BrandIdentity = z.infer<typeof brandIdentitySchema>;
export type HeroContent = z.infer<typeof heroContentSchema>;
export type WebsiteBuilderConfig = z.infer<typeof updateWebsiteBuilderConfigSchema>;
