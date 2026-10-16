import type { Metadata } from "next";
import { headers } from "next/headers";
import { HotelJsonLd } from "../components/hotel-json-ld";
import { HotelPageView } from "../components/hotel-page-view";
import { getHotelWebsiteData } from "../lib/hotel-data";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug") || "grand-haven";
  const data = await getHotelWebsiteData(slug);

  const heroImage =
    data.builderConfig.hero.backgroundImageUrl ||
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80";

  return {
    title: data.builderConfig.seoTitle || `${data.name} | Official Website & Direct Booking`,
    description: data.builderConfig.seoDescription || data.tagline,
    keywords: [
      data.name,
      "luxury resort",
      "beachfront villas",
      "Cox's Bazar hotels",
      "direct hotel booking",
      "best rate guarantee",
    ],
    authors: [{ name: data.name }],
    openGraph: {
      title: data.name,
      description: data.tagline,
      images: [
        {
          url: heroImage,
          width: 1200,
          height: 630,
          alt: data.name,
        },
      ],
      type: "website",
      siteName: data.name,
    },
    twitter: {
      card: "summary_large_image",
      title: data.name,
      description: data.tagline,
      images: [heroImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function Page() {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug") || "grand-haven";
  const data = await getHotelWebsiteData(slug);

  return (
    <>
      <HotelJsonLd hotel={data} />
      <HotelPageView initialHotelData={data} />
    </>
  );
}
