"use client";

import { useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import type { HotelRoomTypeView, HotelWebsiteData } from "../types/hotel-website";
import { AmenitiesSection } from "./amenities-section";
import { BookingCheckoutModal } from "./booking-checkout-modal";
import { Footer } from "./footer";
import { GallerySection } from "./gallery-section";
import { Header } from "./header";
import { HeroSection } from "./hero-section";
import { LocationSection } from "./location-section";
import { ReviewsSection } from "./reviews-section";
import { RoomsSection } from "./rooms-section";
import { StorySection } from "./story-section";
import { ThemeWrapper } from "./theme-wrapper";

interface HotelPageViewProps {
  initialHotelData: HotelWebsiteData;
}

export function HotelPageView({ initialHotelData }: HotelPageViewProps) {
  const [hotel, setHotel] = useState<HotelWebsiteData>(initialHotelData);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<HotelRoomTypeView | null>(
    null,
  );
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Search criteria state
  const [searchCriteria, setSearchCriteria] = useState<{
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }>({
    checkIn: new Date().toISOString().split("T")[0] || "",
    checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0] || "",
    adults: 2,
    children: 0,
  });

  // Live Availability Query from tRPC Hotel Router
  const availabilityQuery = trpc.hotel.publicSearchAvailability.useQuery(
    {
      organizationId: hotel.id,
      checkInDate: searchCriteria.checkIn,
      checkOutDate: searchCriteria.checkOut,
      adultsCount: searchCriteria.adults,
      childrenCount: searchCriteria.children,
    },
    {
      enabled: Boolean(
        hotel.id &&
          searchCriteria.checkIn &&
          searchCriteria.checkOut &&
          searchCriteria.checkOut > searchCriteria.checkIn,
      ),
    },
  );

  // Merge live availability count into roomTypes
  const enrichedRoomTypes = useMemo(() => {
    return hotel.roomTypes.map((room) => {
      const liveMatch = availabilityQuery.data?.find(
        (avail: { id: string; availableRoomsCount: number }) => avail.id === room.id,
      );
      if (!liveMatch) return room;
      return {
        ...room,
        availableRoomCount: liveMatch.availableRoomsCount,
      };
    });
  }, [hotel.roomTypes, availabilityQuery.data]);

  const hotelWithEnrichedRooms = useMemo(() => {
    return {
      ...hotel,
      roomTypes: enrichedRoomTypes,
    };
  }, [hotel, enrichedRoomTypes]);

  // Handle theme switching preview
  const handleThemeChange = (
    themeSlug: "classic-luxury" | "modern-minimal" | "coastal-resort" | "boutique-haven",
  ) => {
    const updated = structuredClone(hotel);
    updated.builderConfig.themeSlug = themeSlug;

    if (themeSlug === "classic-luxury") {
      updated.builderConfig.brand.primaryColor = "#0f172a";
      updated.builderConfig.brand.accentColor = "#c5a880";
      updated.builderConfig.brand.fontFamily = "Playfair Display";
    } else if (themeSlug === "modern-minimal") {
      updated.builderConfig.brand.primaryColor = "#18181b";
      updated.builderConfig.brand.accentColor = "#10b981";
      updated.builderConfig.brand.fontFamily = "Plus Jakarta Sans";
    } else if (themeSlug === "coastal-resort") {
      updated.builderConfig.brand.primaryColor = "#0284c7";
      updated.builderConfig.brand.accentColor = "#f97316";
      updated.builderConfig.brand.fontFamily = "Outfit";
    } else if (themeSlug === "boutique-haven") {
      updated.builderConfig.brand.primaryColor = "#78350f";
      updated.builderConfig.brand.accentColor = "#c2410c";
      updated.builderConfig.brand.fontFamily = "Playfair Display";
    }

    setHotel(updated);
  };

  const handleSearch = (criteria: {
    checkIn: string;
    checkOut: string;
    roomTypeId?: string;
    adults: number;
    children: number;
  }) => {
    setSearchCriteria({
      checkIn: criteria.checkIn,
      checkOut: criteria.checkOut,
      adults: criteria.adults,
      children: criteria.children,
    });

    if (criteria.roomTypeId) {
      const match = enrichedRoomTypes.find((r) => r.id === criteria.roomTypeId);
      if (match) {
        setSelectedRoomForBooking(match);
        setBookingModalOpen(true);
        return;
      }
    }

    // Scroll to rooms section
    const el = document.getElementById("rooms");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleBookRoom = (room: HotelRoomTypeView) => {
    setSelectedRoomForBooking(room);
    setBookingModalOpen(true);
  };

  const handleOpenGeneralBooking = () => {
    setSelectedRoomForBooking(enrichedRoomTypes[0] || null);
    setBookingModalOpen(true);
  };

  return (
    <ThemeWrapper config={hotel.builderConfig}>
      <Header
        hotel={hotelWithEnrichedRooms}
        activeTheme={hotel.builderConfig.themeSlug}
        onThemeChange={handleThemeChange}
        onOpenBooking={handleOpenGeneralBooking}
      />

      <main>
        <HeroSection
          hotel={hotelWithEnrichedRooms}
          onSearch={handleSearch}
          onExploreSuites={() => {
            document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <RoomsSection
          roomTypes={enrichedRoomTypes}
          accentColor={hotel.builderConfig.brand.accentColor}
          onBookRoom={handleBookRoom}
        />

        <AmenitiesSection
          amenities={hotel.amenities}
          accentColor={hotel.builderConfig.brand.accentColor}
        />

        <GallerySection
          gallery={hotel.gallery}
          accentColor={hotel.builderConfig.brand.accentColor}
        />

        <StorySection story={hotel.story} accentColor={hotel.builderConfig.brand.accentColor} />

        <ReviewsSection
          reviews={hotel.reviews}
          rating={hotel.rating}
          reviewCount={hotel.reviewCount}
          accentColor={hotel.builderConfig.brand.accentColor}
        />

        <LocationSection hotel={hotel} accentColor={hotel.builderConfig.brand.accentColor} />
      </main>

      <Footer hotel={hotel} />

      {/* Booking Checkout Modal */}
      {bookingModalOpen && (
        <BookingCheckoutModal
          room={selectedRoomForBooking}
          organizationId={hotel.id}
          hotelName={hotel.name}
          hotelAddress={hotel.address}
          accentColor={hotel.builderConfig.brand.accentColor}
          initialCheckIn={searchCriteria.checkIn}
          initialCheckOut={searchCriteria.checkOut}
          initialAdults={searchCriteria.adults}
          initialChildren={searchCriteria.children}
          onClose={() => setBookingModalOpen(false)}
        />
      )}
    </ThemeWrapper>
  );
}
