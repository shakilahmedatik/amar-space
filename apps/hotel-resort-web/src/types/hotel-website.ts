import type { WebsiteBuilderConfig } from "@omniheaven/validators";

export interface HotelRoomTypeView {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  capacityAdults: number;
  capacityChildren: number;
  bedType: "single" | "double" | "queen" | "king" | "twin";
  bedCount: number;
  sizeSqFt?: number | null;
  amenities: string[];
  photos: string[];
  tag?: string;
  availableRoomCount?: number;
}

export interface HotelAmenityItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface HotelReviewItem {
  id: string;
  guestName: string;
  location: string;
  rating: number;
  date: string;
  comment: string;
  roomName: string;
}

export interface HotelGalleryItem {
  id: string;
  url: string;
  caption: string;
  category: "all" | "rooms" | "dining" | "wellness" | "grounds";
}

export interface HotelLandmarkItem {
  name: string;
  distance: string;
  type: "airport" | "beach" | "shopping" | "heritage" | "nature";
}

export interface HotelWebsiteData {
  id: string;
  name: string;
  slug: string;
  productType: "hotel" | "resort";
  tagline: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  country: string;
  rating: number;
  reviewCount: number;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  builderConfig: WebsiteBuilderConfig;
  roomTypes: HotelRoomTypeView[];
  amenities: HotelAmenityItem[];
  reviews: HotelReviewItem[];
  gallery: HotelGalleryItem[];
  landmarks: HotelLandmarkItem[];
  story: {
    badge: string;
    headline: string;
    paragraphs: string[];
    stats: { label: string; value: string }[];
  };
}
