import type { HotelWebsiteData } from "../types/hotel-website";

interface HotelJsonLdProps {
  hotel: HotelWebsiteData;
}

export function HotelJsonLd({ hotel }: HotelJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": hotel.productType === "resort" ? "Resort" : "Hotel",
    name: hotel.name,
    description: hotel.tagline,
    url: `https://${hotel.slug}.omniheaven.com`,
    telephone: hotel.contactPhone,
    email: hotel.contactEmail,
    priceRange: "৳৳৳",
    starRating: {
      "@type": "Rating",
      ratingValue: "5",
      bestRating: "5",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: hotel.rating,
      reviewCount: hotel.reviewCount,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: hotel.address,
      addressLocality: hotel.city,
      addressCountry: hotel.country,
    },
    amenityFeature: hotel.amenities.map((am) => ({
      "@type": "LocationFeatureSpecification",
      name: am.title,
      value: true,
    })),
    containsPlace: hotel.roomTypes.map((rt) => ({
      "@type": "HotelRoom",
      name: rt.name,
      description: rt.description,
      bed: {
        "@type": "BedDetails",
        numberOfBeds: rt.bedCount,
        typeOfBed: rt.bedType,
      },
      occupancy: {
        "@type": "QuantitativeValue",
        maxValue: rt.capacityAdults,
      },
      offers: {
        "@type": "Offer",
        price: rt.basePrice,
        priceCurrency: "BDT",
        availability: "https://schema.org/InStock",
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Standard Schema.org JSON-LD structured data injection
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
