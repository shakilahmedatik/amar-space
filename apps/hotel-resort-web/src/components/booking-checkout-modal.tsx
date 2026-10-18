"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  CreditCard,
  Printer,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "../lib/trpc";
import type { HotelRoomTypeView } from "../types/hotel-website";

interface BookingCheckoutModalProps {
  room: HotelRoomTypeView | null;
  hotelName: string;
  hotelAddress: string;
  accentColor: string;
  organizationId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  initialChildren?: number;
  onClose: () => void;
}

export function BookingCheckoutModal({
  room,
  hotelName,
  hotelAddress,
  accentColor,
  organizationId = "org-grand-haven",
  initialCheckIn,
  initialCheckOut,
  initialAdults = 2,
  initialChildren = 0,
  onClose,
}: BookingCheckoutModalProps) {
  const today = new Date().toISOString().split("T")[0] || "";
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0] || "";

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [checkIn, setCheckIn] = useState(initialCheckIn || today);
  const [checkOut, setCheckOut] = useState(initialCheckOut || tomorrow);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);

  // Guest Info
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<
    "paystation" | "bkash" | "card" | "pay_at_hotel"
  >("pay_at_hotel");
  const [bookingRef, setBookingRef] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const createBookingMutation = trpc.hotel.publicCreateBooking.useMutation();

  if (!room) return null;

  // Calculate nights
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const nights = Math.max(
    1,
    Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 3600 * 24)),
  );
  const subtotal = room.basePrice * nights;
  const taxAndService = Math.round(subtotal * 0.15); // 15% VAT & Service
  const grandTotal = subtotal + taxAndService;

  const handleConfirmBooking = async () => {
    setErrorMessage("");
    try {
      const result = await createBookingMutation.mutateAsync({
        organizationId,
        roomTypeId: room.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        guestPhone: guestPhone.trim(),
        adultsCount: adults,
        childrenCount: children,
        specialRequests: specialRequests.trim() || undefined,
        paymentMethod,
      });

      setBookingRef(result.bookingReference);
      setStep(4);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Failed to confirm reservation. Please review your details and try again.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border-gold/30 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col text-foreground">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#1a1412] text-white flex items-center justify-between border-b border-border-gold/20">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-primary block">
              Direct Hotel Booking
            </span>
            <h3 className="text-base sm:text-lg font-serif font-bold tracking-tight text-white">
              {hotelName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        {step < 4 && (
          <div className="bg-surface/80 px-6 py-3 border-b border-border-gold/20 flex items-center justify-between text-xs font-medium">
            <span
              className={
                step >= 1
                  ? "text-primary font-bold flex items-center gap-1.5"
                  : "text-foreground-muted/60"
              }
            >
              <span className="size-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px]">
                1
              </span>
              Stay Dates
            </span>
            <span className="text-border-gold/40">→</span>
            <span
              className={
                step >= 2
                  ? "text-primary font-bold flex items-center gap-1.5"
                  : "text-foreground-muted/60"
              }
            >
              <span className="size-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px]">
                2
              </span>
              Guest Info
            </span>
            <span className="text-border-gold/40">→</span>
            <span
              className={
                step >= 3
                  ? "text-primary font-bold flex items-center gap-1.5"
                  : "text-foreground-muted/60"
              }
            >
              <span className="size-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-[10px]">
                3
              </span>
              Payment
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Dates & Room Summary */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-surface/60 border border-border-gold/30 flex items-center gap-4">
                <div
                  className="size-20 rounded-xl bg-cover bg-center shrink-0 border border-border-gold/20"
                  style={{
                    backgroundImage: `url(${room.photos[0] || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80"})`,
                  }}
                />
                <div>
                  <h4 className="font-serif font-bold text-foreground text-sm sm:text-base">
                    {room.name}
                  </h4>
                  <p className="text-xs text-foreground-muted mt-0.5">
                    {room.bedCount} {room.bedType.toUpperCase()} Bed • Max {room.capacityAdults}{" "}
                    Adults
                  </p>
                  <p className="text-xs font-bold text-primary mt-1">
                    ৳{room.basePrice.toLocaleString()} / night
                  </p>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-checkin"
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground"
                  >
                    <Calendar className="size-3.5 text-primary" />
                    Check-in Date
                  </label>
                  <input
                    id="checkout-checkin"
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-checkout"
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground"
                  >
                    <Calendar className="size-3.5 text-primary" />
                    Check-out Date
                  </label>
                  <input
                    id="checkout-checkout"
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                  />
                </div>
              </div>

              {/* Guests Count */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-adults"
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground"
                  >
                    <Users className="size-3.5 text-primary" />
                    Adults
                  </label>
                  <select
                    id="checkout-adults"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                  >
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} Adult{n > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-children"
                    className="flex items-center gap-1.5 text-xs font-bold text-foreground"
                  >
                    <Users className="size-3.5 text-primary" />
                    Children
                  </label>
                  <select
                    id="checkout-children"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                  >
                    {[0, 1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {n} Child{n > 1 ? "ren" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Calculation Card */}
              <div className="p-4 rounded-2xl bg-surface/60 border border-border-gold/30 space-y-2 text-xs">
                <div className="flex justify-between text-foreground-muted">
                  <span>
                    ৳{room.basePrice.toLocaleString()} × {nights} Night{nights > 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold text-foreground">
                    ৳{subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-foreground-muted">
                  <span>Govt VAT & Service Charge (15%)</span>
                  <span className="font-semibold text-foreground">
                    ৳{taxAndService.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-border-gold/20 flex justify-between text-sm font-bold text-foreground">
                  <span className="font-serif">Total Payable</span>
                  <span className="text-base font-bold text-primary">
                    ৳{grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Guest Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="checkout-name" className="text-xs font-bold text-foreground">
                  Full Name (as on NID/Passport) *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  placeholder="e.g. Shakil Ahmed Atik"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground placeholder:text-foreground-muted/50 focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="checkout-phone" className="text-xs font-bold text-foreground">
                    Phone Number (BD Mobile) *
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground placeholder:text-foreground-muted/50 focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="checkout-email" className="text-xs font-bold text-foreground">
                    Email Address (for voucher) *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    placeholder="guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground placeholder:text-foreground-muted/50 focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="checkout-requests" className="text-xs font-bold text-foreground">
                  Special Requests / Airport Chauffeur Timing
                </label>
                <textarea
                  id="checkout-requests"
                  rows={3}
                  placeholder="Arriving via CXB Flight 104 at 2:30 PM. Requesting quiet top floor villa..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-border-gold/30 rounded-xl p-2.5 bg-background text-foreground placeholder:text-foreground-muted/50 focus:ring-1 focus:ring-primary focus:border-primary outline-hidden"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                Select Payment Option
              </h4>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2.5">
                {/* Paystation */}
                <label
                  htmlFor="pm-paystation"
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "paystation"
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                      : "border-border-gold/30 bg-card hover:bg-surface/80"
                  }`}
                >
                  <input
                    id="pm-paystation"
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "paystation"}
                    onChange={() => setPaymentMethod("paystation")}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        Paystation (Cards, Mobile Banking, Net Banking)
                      </span>
                      <span className="text-[10px] font-semibold text-primary bg-primary/15 border border-primary/20 px-2 py-0.5 rounded-md">
                        Recommended BD Gateway
                      </span>
                    </div>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      Secure payment via Visa, Mastercard, bKash, Nagad, Rocket, and Internet
                      Banking.
                    </p>
                  </div>
                </label>

                {/* Direct bKash / Nagad */}
                <label
                  htmlFor="pm-bkash"
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "bkash"
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                      : "border-border-gold/30 bg-card hover:bg-surface/80"
                  }`}
                >
                  <input
                    id="pm-bkash"
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "bkash"}
                    onChange={() => setPaymentMethod("bkash")}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-foreground">
                      bKash / Nagad Direct Checkout
                    </span>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      Pay instantly with your bKash or Nagad mobile wallet.
                    </p>
                  </div>
                </label>

                {/* International Card */}
                <label
                  htmlFor="pm-card"
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                      : "border-border-gold/30 bg-card hover:bg-surface/80"
                  }`}
                >
                  <input
                    id="pm-card"
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-primary" />
                      International Credit Card (Stripe)
                    </span>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      Pay with Visa, Mastercard, American Express in BDT or USD.
                    </p>
                  </div>
                </label>

                {/* Pay at Hotel */}
                <label
                  htmlFor="pm-pay-at-hotel"
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "pay_at_hotel"
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                      : "border-border-gold/30 bg-card hover:bg-surface/80"
                  }`}
                >
                  <input
                    id="pm-pay-at-hotel"
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "pay_at_hotel"}
                    onChange={() => setPaymentMethod("pay_at_hotel")}
                    className="mt-1 accent-primary"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Building className="size-3.5 text-primary" />
                      Pay at Resort Front Desk
                    </span>
                    <p className="text-[11px] text-foreground-muted mt-0.5">
                      Hold room without prepayment. Payment collected upon check-in.
                    </p>
                  </div>
                </label>
              </div>

              {/* Security Note */}
              <div className="p-3 rounded-xl bg-surface/80 border border-border-gold/20 flex items-center gap-2 text-[11px] text-foreground-muted">
                <CheckCircle2 className="size-4 text-primary shrink-0" />
                <span>SSL 256-bit Encrypted Transaction • Zero Booking Surcharge</span>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation Voucher */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="size-9" />
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-serif font-bold text-foreground tracking-tight">
                  Reservation Confirmed!
                </h4>
                <p className="text-xs text-foreground-muted">
                  Confirmation and check-in instructions sent to{" "}
                  <b className="text-foreground">{guestEmail || "your email"}</b>.
                </p>
              </div>

              {/* Voucher Card */}
              <div className="p-5 rounded-2xl bg-surface/70 border border-border-gold/30 text-left space-y-4 max-w-lg mx-auto shadow-xs">
                <div className="flex items-center justify-between border-b border-border-gold/20 pb-3">
                  <div>
                    <span className="text-[10px] text-foreground-muted uppercase tracking-wider block font-mono">
                      Booking Reference
                    </span>
                    <span className="text-lg font-mono font-bold text-primary">{bookingRef}</span>
                    <p className="text-[11px] font-semibold text-foreground mt-1 font-serif">
                      {hotelName}
                    </p>
                    <p className="text-[10px] text-foreground-muted">{hotelAddress}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Confirmed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-foreground-muted block text-[10px]">Guest Name</span>
                    <span className="font-semibold text-foreground">
                      {guestName || "Valued Guest"}
                    </span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block text-[10px]">Contact</span>
                    <span className="font-semibold text-foreground">{guestPhone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block text-[10px]">Check-In</span>
                    <span className="font-semibold text-foreground">{checkIn} (from 14:00)</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted block text-[10px]">Check-Out</span>
                    <span className="font-semibold text-foreground">{checkOut} (until 12:00)</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-foreground-muted block text-[10px]">Room Type</span>
                    <span className="font-semibold text-foreground">{room.name}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-border-gold/20 flex justify-between items-center text-sm font-serif font-bold text-foreground">
                    <span>Total Paid</span>
                    <span className="font-sans font-bold text-base text-primary">
                      ৳{grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Print Voucher Action */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-foreground bg-surface border border-border-gold/30 hover:border-primary transition-colors flex items-center gap-1.5"
                >
                  <Printer className="size-3.5 text-primary" />
                  <span>Print Voucher</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-surface/60 border-t border-border-gold/20 flex items-center justify-between">
          {step < 4 ? (
            <>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface border border-transparent hover:border-border-gold/20 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
              )}

              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:opacity-95 shadow-md flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: accentColor || undefined }}
                >
                  Next: Guest Info <ArrowRight className="size-3.5" />
                </button>
              )}

              {step === 2 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!guestName || !guestEmail || !guestPhone) {
                      alert("Please fill in your name, email, and phone number.");
                      return;
                    }
                    setStep(3);
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:opacity-95 shadow-md flex items-center gap-1.5 transition-all"
                  style={{ backgroundColor: accentColor || undefined }}
                >
                  Next: Payment <ArrowRight className="size-3.5" />
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={createBookingMutation.isPending}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:opacity-95 shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  style={{ backgroundColor: accentColor || undefined }}
                >
                  {createBookingMutation.isPending ? (
                    "Confirming Booking..."
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> Complete Reservation (৳
                      {grandTotal.toLocaleString()})
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-foreground bg-surface border border-border-gold/30 hover:bg-surface/80 transition-colors"
            >
              Done & Return to Resort Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
