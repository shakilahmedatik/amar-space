import type { HotelWebsiteData } from "../types/hotel-website";

export const DEFAULT_HOTEL_DATA: HotelWebsiteData = {
  id: "hotel-grand-haven",
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
      id: "rt-presidential-villa",
      name: "Presidential Ocean Villa with Private Pool",
      description:
        "Perched above the turquoise waters, featuring a 40ft private infinity pool, dedicated 24/7 personal butler service, handcrafted teak furnishings, marble soaking tub, and uninterrupted panoramic sunset vistas.",
      basePrice: 42000,
      capacityAdults: 4,
      capacityChildren: 2,
      bedType: "king",
      bedCount: 2,
      sizeSqFt: 1850,
      amenities: [
        "Private Infinity Plunge Pool",
        "24/7 Butler Service",
        "Direct Beach Access",
        "Marble Spa Bathroom",
        "Espresso Bar & Wine Cellar",
        "High-Speed Fiber Wi-Fi",
      ],
      photos: [
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
      ],
      tag: "Signature Villa",
    },
    {
      id: "rt-royal-beachfront-suite",
      name: "Royal Beachfront Suite",
      description:
        "Generous ocean-facing terrace with outdoor daybed, floor-to-ceiling glass doors, acoustic sound insulation, walk-in rain shower, and curated contemporary Bengali artwork.",
      basePrice: 28500,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: "king",
      bedCount: 1,
      sizeSqFt: 980,
      amenities: [
        "Private Oceanfront Balcony",
        "Freestanding Soaking Tub",
        "Smart Room Climate Controls",
        "Bose Bluetooth Audio",
        "Organic Luxury Toiletries",
      ],
      photos: [
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
      ],
      tag: "Most Popular",
    },
    {
      id: "rt-deluxe-garden-haven",
      name: "Deluxe Garden Sanctuary Room",
      description:
        "Surrounded by lush tropical palm gardens and calming koi reflection ponds. Includes an open-air private courtyard, plush king bed, and artisanal stone basin vanity.",
      basePrice: 16500,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: "queen",
      bedCount: 1,
      sizeSqFt: 620,
      amenities: [
        "Private Tropical Courtyard",
        "Rainforest Shower",
        "Complimentary Breakfast Buffet",
        "Workstation & Fast Wi-Fi",
      ],
      photos: [
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80",
      ],
      tag: "Best Value",
    },
    {
      id: "rt-executive-twin-suite",
      name: "Executive Oceanview Twin Suite",
      description:
        "Specially designed for discerning friends or family traveling together, offering two ultra-comfortable queen beds, dual marble vanities, and sunset sea views.",
      basePrice: 19500,
      capacityAdults: 2,
      capacityChildren: 2,
      bedType: "twin",
      bedCount: 2,
      sizeSqFt: 750,
      amenities: [
        "Two Queen Beds",
        "Balcony Seating Area",
        "Double Vanity Bath",
        "Nespresso Coffee Machine",
      ],
      photos: [
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
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
  // If slug is provided and matches or demo mode, return enhanced data
  // In production, this can also query the database:
  // const tenant = await db.query.organizations.findFirst(...)
  // const websiteConfig = await db.query.websiteConfigs.findFirst(...)
  // For resilience, always fallback to full styled mock data
  const data = structuredClone(DEFAULT_HOTEL_DATA);

  // If a specific slug is requested (e.g. "coastal-breeze", "boutique-stay")
  if (slugOrDomain.includes("coastal")) {
    data.name = "Coastal Breeze Tropical Resort";
    data.slug = "coastal-breeze";
    data.builderConfig.themeSlug = "coastal-resort";
    data.builderConfig.brand.primaryColor = "#0284c7";
    data.builderConfig.brand.accentColor = "#f97316";
    data.builderConfig.brand.fontFamily = "Outfit";
  } else if (slugOrDomain.includes("minimal") || slugOrDomain.includes("modern")) {
    data.name = "The Urban Minimal Boutique Hotel";
    data.slug = "urban-minimal";
    data.builderConfig.themeSlug = "modern-minimal";
    data.builderConfig.brand.primaryColor = "#18181b";
    data.builderConfig.brand.accentColor = "#10b981";
    data.builderConfig.brand.fontFamily = "Plus Jakarta Sans";
  } else if (slugOrDomain.includes("boutique") || slugOrDomain.includes("haven")) {
    data.name = "Boutique Heritage Haven";
    data.slug = "boutique-haven";
    data.builderConfig.themeSlug = "boutique-haven";
    data.builderConfig.brand.primaryColor = "#78350f";
    data.builderConfig.brand.accentColor = "#c2410c";
    data.builderConfig.brand.fontFamily = "Playfair Display";
  }

  return data;
}
