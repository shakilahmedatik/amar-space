import { db, eq, schema } from "@omniheaven/db";
import type { HotelRoomTypeView, HotelWebsiteData } from "../types/hotel-website";

export const DEFAULT_HOTEL_DATA: HotelWebsiteData = {
  id: "org-grand-haven",
  name: "The Grand Haven Luxury Resort & Spa",
  slug: "grand-haven",
  productType: "resort",
  tagline:
    "An untouched sanctuary of coastal elegance, world-class culinary art, and bespoke hospitality.",
  contactPhone: "+880 1711-987654",
  contactEmail: "concierge@grandhavenresort.com",
  address: "Marine Drive, Inani Beach, Cox's Bazar 4700",
  city: "Cox's Bazar",
  country: "Bangladesh",
  rating: 4.9,
  reviewCount: 348,
  checkInTime: "14:00",
  checkOutTime: "12:00",
  cancellationPolicy:
    "Free cancellation up to 48 hours before check-in date. Full refund guaranteed.",
  builderConfig: {
    themeSlug: "classic-luxury",
    brand: {
      logoUrl: null,
      faviconUrl: null,
      primaryColor: "#0f172a",
      accentColor: "#c5a880",
      fontFamily: "Playfair Display",
    },
    hero: {
      headline: "Where Serenity Meets Coastal Majesty",
      tagline:
        "Escape to private infinity ocean villas, rejuvenating Ayurvedic spas, and handcrafted culinary experiences on the pristine shores of the Bay of Bengal.",
      backgroundImageUrl:
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=2000&q=80",
      ctaText: "Explore Suites & Villas",
      ctaLink: "#rooms",
    },
    enabledSections: [
      "hero",
      "rooms",
      "amenities",
      "gallery",
      "about",
      "reviews",
      "location",
      "contact",
    ],
    sectionOrder: [
      "hero",
      "rooms",
      "amenities",
      "gallery",
      "about",
      "reviews",
      "location",
      "contact",
    ],
    seoTitle: "The Grand Haven Resort & Spa | Official Direct Booking",
    seoDescription:
      "Book direct for guaranteed best rates, complimentary airport transfer, and private beach cabana access at The Grand Haven Resort.",
  },
  roomTypes: [
    {
      id: "rt-ocean-suite",
      name: "Grand Ocean View Suite",
      description:
        "Panoramic Bay of Bengal vista, private oceanfront balcony, freestanding soaking tub, king bed, and complimentary morning breakfast.",
      basePrice: 14500,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: "king",
      bedCount: 1,
      sizeSqFt: 750,
      amenities: [
        "Panoramic Ocean View",
        "Private Balcony",
        "Jacuzzi / Soaking Tub",
        "Plush King Bed",
        "Complimentary Buffet Breakfast",
        "High-Speed Fiber Wi-Fi",
      ],
      photos: [
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
      ],
      tag: "Most Popular",
    },
    {
      id: "rt-deluxe-sea",
      name: "Executive Sea View Deluxe",
      description:
        "Elegant modern aesthetic with direct sea view, executive work desk, luxury rainforest shower, and artisanal tea & espresso bar.",
      basePrice: 9800,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: "queen",
      bedCount: 1,
      sizeSqFt: 480,
      amenities: [
        "Direct Sea View",
        "Executive Workstation",
        "Rainforest Shower",
        "Smart Climate Controls",
        "Nespresso Coffee Machine",
      ],
      photos: [
        "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
      ],
      tag: "Best Value",
    },
    {
      id: "rt-palm-family",
      name: "Palm Garden Family Suite",
      description:
        "Spacious dual queen bed sanctuary overlooking tropical resort palm gardens and koi ponds, tailored for families.",
      basePrice: 12500,
      capacityAdults: 4,
      capacityChildren: 2,
      bedType: "queen",
      bedCount: 2,
      sizeSqFt: 650,
      amenities: [
        "Lush Garden View",
        "Dual Queen Beds",
        "Kitchenette & Dining",
        "Private Sunlit Patio",
        "Complimentary Kid Activities",
      ],
      photos: [
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
      ],
      tag: "Family Choice",
    },
    {
      id: "rt-hill-breeze",
      name: "Standard Hill Breeze Room",
      description:
        "Cozy retreat facing the green hills of Himchari with tranquil natural ambiance and crisp mountain air.",
      basePrice: 5500,
      capacityAdults: 2,
      capacityChildren: 0,
      bedType: "double",
      bedCount: 1,
      sizeSqFt: 320,
      amenities: [
        "Tranquil Hill View",
        "Double Bed",
        "High-Speed Wi-Fi",
        "Air Conditioning",
        "Electric Kettle & Tea Bar",
      ],
      photos: [
        "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      ],
    },
  ],
  amenities: [
    {
      id: "am-infinity-pool",
      icon: "Waves",
      title: "Three-Tier Oceanfront Infinity Pool",
      description:
        "Heated saltwater infinity pools that blend seamlessly into the horizon, accompanied by submerged loungers and poolside mixology bar.",
    },
    {
      id: "am-spa",
      icon: "Sparkles",
      title: "Ananda Holistic Ayurvedic Spa",
      description:
        "Signature treatments utilizing wild Himalayan herbs, organic coconut oils, and certified therapists for full mind-body renewal.",
    },
    {
      id: "am-dining",
      icon: "UtensilsCrossed",
      title: "Fine Dining & Beachfront Seafood",
      description:
        "Award-winning chefs crafting fresh catch-of-the-day seafood, authentic Bengali feasts, and refined Mediterranean delicacies.",
    },
    {
      id: "am-butler",
      icon: "BellRing",
      title: "24/7 Personalized Concierge & Butler",
      description:
        "Every wish anticipated — from private beachside candlelit dinners to deep-sea fishing expeditions and helicopter charters.",
    },
    {
      id: "am-transport",
      icon: "Car",
      title: "Complimentary Airport Chauffeur",
      description:
        "Luxury VIP airport pick-up and drop-off in our climate-controlled private fleet with chilled refreshments on arrival.",
    },
    {
      id: "am-wifi",
      icon: "Wifi",
      title: "Blazing 1Gbps Fiber Wi-Fi",
      description:
        "Seamless high-bandwidth connectivity throughout villas, private cabanas, and beach gazebos for remote work or streaming.",
    },
  ],
  reviews: [
    {
      id: "rev-1",
      guestName: "Tanvir Rahman",
      location: "Dhaka, Bangladesh",
      rating: 5,
      date: "October 2026",
      comment:
        "Without doubt the finest resort experience in Bangladesh. The Presidential Villa took our breath away. Having our own butler arrange a private sunset barbecue on the sand was unforgettable.",
      roomName: "Presidential Ocean Villa",
    },
    {
      id: "rev-2",
      guestName: "Sarah Jenkins",
      location: "London, UK",
      rating: 5,
      date: "September 2026",
      comment:
        "A hidden gem along Cox's Bazar. Serene, impeccably clean, and the hospitality felt genuine from the moment we arrived. The Ayurvedic massage at the Ananda Spa is a must-try.",
      roomName: "Royal Beachfront Suite",
    },
    {
      id: "rev-3",
      guestName: "Mahfuzur Chowdhury",
      location: "Chittagong, Bangladesh",
      rating: 5,
      date: "August 2026",
      comment:
        "The direct booking website was effortless, and everything promised online exceeded our expectations. The food quality at the seafood grill was 10/10.",
      roomName: "Deluxe Garden Sanctuary Room",
    },
  ],
  gallery: [
    {
      id: "g-1",
      url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
      caption: "Aerial view of Grand Haven coastal villas and infinity pool",
      category: "grounds",
    },
    {
      id: "g-2",
      url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      caption: "Presidential Villa master suite with panoramic sea views",
      category: "rooms",
    },
    {
      id: "g-3",
      url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
      caption: "Ananda Spa serene relaxation pavilion",
      category: "wellness",
    },
    {
      id: "g-4",
      url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      caption: "The Saffron Table signature fine-dining terrace",
      category: "dining",
    },
    {
      id: "g-5",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      caption: "Private golden beach cabanas at golden hour",
      category: "grounds",
    },
    {
      id: "g-6",
      url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
      caption: "Royal Suite living room with private balcony",
      category: "rooms",
    },
  ],
  landmarks: [
    {
      name: "Inani Coral Beach",
      distance: "Direct Access (0 km)",
      type: "beach",
    },
    {
      name: "Cox's Bazar Domestic Airport (CXB)",
      distance: "25 minutes by resort chauffeur",
      type: "airport",
    },
    {
      name: "Himchari National Park & Waterfalls",
      distance: "12 km (15 mins drive)",
      type: "nature",
    },
    {
      name: "Marine Drive Scenic Coastal Route",
      distance: "Direct Access",
      type: "nature",
    },
  ],
  story: {
    badge: "Our Heritage & Philosophy",
    headline: "Crafted for Discerning Travelers Seeking Timeless Tranquility",
    paragraphs: [
      "Nestled along the quietest stretch of Inani Beach, The Grand Haven was conceived as an ode to maritime architecture, sustainable coastal luxury, and the warm traditions of Bengali hospitality.",
      "Every villa was hand-constructed using sustainably harvested teak, indigenous coral stone, and energy-efficient climate design that invites cool sea breezes indoors. We partner with local fishermen and organic organic farmers to curate cuisine that honors the soil and sea.",
    ],
    stats: [
      { label: "Guest Satisfaction", value: "99.4%" },
      { label: "Acres of Pristine Beachfront", value: "18" },
      { label: "Signature Suites & Villas", value: "42" },
      { label: "National Tourism Awards", value: "7" },
    ],
  },
};

export async function getHotelWebsiteData(slugOrDomain: string): Promise<HotelWebsiteData> {
  const cleanSlug = slugOrDomain.replace(/^www\./, "").split(".")[0] || "grand-haven";

  try {
    const org = await db.query.organizations.findFirst({
      where: eq(schema.organizations.slug, cleanSlug),
    });

    if (org) {
      const config = await db.query.websiteConfigs.findFirst({
        where: eq(schema.websiteConfigs.organizationId, org.id),
      });

      const dbRoomTypes = await db.query.roomTypes.findMany({
        where: eq(schema.roomTypes.organizationId, org.id),
      });

      // Map dynamic room types from database
      const roomTypesData: HotelRoomTypeView[] =
        dbRoomTypes.length > 0
          ? dbRoomTypes.map((rt) => ({
              id: rt.id,
              name: rt.name,
              description: rt.description || "",
              basePrice: Number(rt.basePrice || "7500"),
              capacityAdults: rt.capacityAdults ?? 2,
              capacityChildren: rt.capacityChildren ?? 1,
              bedType: (rt.bedType as "single" | "double" | "queen" | "king" | "twin") || "king",
              bedCount: rt.bedCount ?? 1,
              sizeSqFt: rt.sizeSqFt ? Number(rt.sizeSqFt) : 550,
              amenities: Array.isArray(rt.amenities)
                ? (rt.amenities as string[])
                : ["WiFi", "Air Conditioning", "Ensuite Bathroom"],
              photos:
                Array.isArray(rt.photos) && rt.photos.length > 0
                  ? (rt.photos as string[])
                  : [
                      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
                    ],
              tag: Number(rt.basePrice || 0) > 10000 ? "Exclusive Suite" : "Popular Choice",
              availableRoomCount: 3,
            }))
          : DEFAULT_HOTEL_DATA.roomTypes;

      const dynamicData: HotelWebsiteData = {
        ...DEFAULT_HOTEL_DATA,
        id: org.id,
        name: org.name,
        slug: org.slug,
        productType: (org.productType as "hotel" | "resort") || "hotel",
        contactPhone: org.contactPhone || DEFAULT_HOTEL_DATA.contactPhone,
        contactEmail: org.contactEmail || DEFAULT_HOTEL_DATA.contactEmail,
        address: org.address || DEFAULT_HOTEL_DATA.address,
        roomTypes: roomTypesData,
        builderConfig: config
          ? {
              themeSlug: (config.themeSlug as any) || "classic-luxury",
              brand: {
                ...DEFAULT_HOTEL_DATA.builderConfig.brand,
                ...(config.brand as any),
              },
              hero: {
                ...DEFAULT_HOTEL_DATA.builderConfig.hero,
                ...(config.hero as any),
              },
              enabledSections:
                (config.enabledSections as any) || DEFAULT_HOTEL_DATA.builderConfig.enabledSections,
              sectionOrder:
                (config.sectionOrder as any) || DEFAULT_HOTEL_DATA.builderConfig.sectionOrder,
            }
          : DEFAULT_HOTEL_DATA.builderConfig,
      };

      return dynamicData;
    }
  } catch (err) {
    console.warn("Failed to query live hotel data from database, falling back to default:", err);
  }

  // Fallback if not found in DB
  const data = structuredClone(DEFAULT_HOTEL_DATA);
  if (slugOrDomain.includes("coastal")) {
    data.name = "Coastal Breeze Tropical Resort";
    data.slug = "coastal-breeze";
    data.builderConfig.themeSlug = "coastal-resort";
  } else if (slugOrDomain.includes("minimal") || slugOrDomain.includes("modern")) {
    data.name = "The Urban Minimal Boutique Hotel";
    data.slug = "urban-minimal";
    data.builderConfig.themeSlug = "modern-minimal";
  }

  return data;
}
