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
import type { HotelRoomTypeView } from "../types/hotel-website";

interface BookingCheckoutModalProps {
  room: HotelRoomTypeView | null;
  hotelName: string;
  hotelAddress: string;
  accentColor: string;
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
  >("paystation");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingRef, setBookingRef] = useState("");

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

  const handleConfirmBooking = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const randomCode = `OHB-${Math.floor(100000 + Math.random() * 900000)}`;
      setBookingRef(randomCode);
      setStep(4);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 block">
              Direct Hotel Booking
            </span>
            <h3 className="text-base sm:text-lg font-bold font-heading">{hotelName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        {step < 4 && (
          <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-semibold">
            <span className={step >= 1 ? "text-slate-900" : "text-slate-400"}>1. Stay Dates</span>
            <span className="text-slate-300">→</span>
            <span className={step >= 2 ? "text-slate-900" : "text-slate-400"}>2. Guest Info</span>
            <span className="text-slate-300">→</span>
            <span className={step >= 3 ? "text-slate-900" : "text-slate-400"}>3. Payment</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Dates & Room Summary */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                <div
                  className="size-20 rounded-lg bg-cover bg-center shrink-0"
                  style={{
                    backgroundImage: `url(${room.photos[0] || "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80"})`,
                  }}
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base font-heading">
                    {room.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {room.bedCount} {room.bedType.toUpperCase()} Bed • Max {room.capacityAdults}{" "}
                    Adults
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    ৳{room.basePrice.toLocaleString()} / night
                  </p>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-checkin"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                  >
                    <Calendar className="size-3.5 text-slate-400" />
                    Check-in Date
                  </label>
                  <input
                    id="checkout-checkin"
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-lg p-2.5 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-checkout"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                  >
                    <Calendar className="size-3.5 text-slate-400" />
                    Check-out Date
                  </label>
                  <input
                    id="checkout-checkout"
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-lg p-2.5 bg-white"
                  />
                </div>
              </div>

              {/* Guests Count */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="checkout-adults"
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                  >
                    <Users className="size-3.5 text-slate-400" />
                    Adults
                  </label>
                  <select
                    id="checkout-adults"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-white"
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
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700"
                  >
                    <Users className="size-3.5 text-slate-400" />
                    Children
                  </label>
                  <select
                    id="checkout-children"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-slate-200 rounded-lg p-2.5 bg-white"
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
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>
                    ৳{room.basePrice.toLocaleString()} × {nights} Night{nights > 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold text-slate-900">৳{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Govt VAT & Service Charge (15%)</span>
                  <span className="font-semibold text-slate-900">
                    ৳{taxAndService.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Payable</span>
                  <span className="text-base" style={{ color: accentColor }}>
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
                <label htmlFor="checkout-name" className="text-xs font-bold text-slate-700">
                  Full Name (as on NID/Passport) *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  placeholder="e.g. Shakil Ahmed Atik"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-lg p-2.5"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="checkout-phone" className="text-xs font-bold text-slate-700">
                    Phone Number (BD Mobile) *
                  </label>
                  <input
                    id="checkout-phone"
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-lg p-2.5"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="checkout-email" className="text-xs font-bold text-slate-700">
                    Email Address (for voucher) *
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    placeholder="guest@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-lg p-2.5"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="checkout-requests" className="text-xs font-bold text-slate-700">
                  Special Requests / Airport Chauffeur Timing
                </label>
                <textarea
                  id="checkout-requests"
                  rows={3}
                  placeholder="Arriving via CXB Flight 104 at 2:30 PM. Requesting quiet top floor villa..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full text-xs sm:text-sm font-medium border border-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Payment Method */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Payment Option
              </h4>

              <div className="space-y-2.5">
                {/* Paystation */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === "paystation"
                      ? "border-slate-900 bg-slate-50/80 shadow-2xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "paystation"}
                    onChange={() => setPaymentMethod("paystation")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Paystation (Cards, Mobile Banking, Net Banking)
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Recommended BD Gateway
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Secure payment via Visa, Mastercard, bKash, Nagad, Rocket, and Internet
                      Banking.
                    </p>
                  </div>
                </label>

                {/* Direct bKash / Nagad */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === "bkash"
                      ? "border-slate-900 bg-slate-50/80 shadow-2xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "bkash"}
                    onChange={() => setPaymentMethod("bkash")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900">
                      bKash / Nagad Direct Checkout
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pay instantly with your bKash or Nagad mobile wallet.
                    </p>
                  </div>
                </label>

                {/* International Card */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === "card"
                      ? "border-slate-900 bg-slate-50/80 shadow-2xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-slate-500" />
                      International Credit Card (Stripe)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Pay with Visa, Mastercard, American Express in BDT or USD.
                    </p>
                  </div>
                </label>

                {/* Pay at Hotel */}
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    paymentMethod === "pay_at_hotel"
                      ? "border-slate-900 bg-slate-50/80 shadow-2xs"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_opt"
                    checked={paymentMethod === "pay_at_hotel"}
                    onChange={() => setPaymentMethod("pay_at_hotel")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Building className="size-3.5 text-slate-500" />
                      Pay at Resort Front Desk
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hold room without prepayment. Payment collected upon check-in.
                    </p>
                  </div>
                </label>
              </div>

              {/* Security Note */}
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-800">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>SSL 256-bit Encrypted Transaction • Zero Booking Surcharge</span>
              </div>
            </div>
          )}

          {/* STEP 4: Confirmation Voucher */}
          {step === 4 && (
            <div className="space-y-6 text-center py-4">
              <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="size-9" />
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-bold text-slate-900 font-heading">
                  Reservation Confirmed!
                </h4>
                <p className="text-xs text-slate-500">
                  Confirmation and check-in instructions sent to <b>{guestEmail || "your email"}</b>
                  .
                </p>
              </div>

              {/* Voucher Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-4 max-w-lg mx-auto">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Booking Reference
                    </span>
                    <span className="text-lg font-mono font-bold text-slate-900">{bookingRef}</span>
                    <p className="text-[11px] font-semibold text-slate-700 mt-1">{hotelName}</p>
                    <p className="text-[10px] text-slate-500">{hotelAddress}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    Confirmed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Guest Name</span>
                    <span className="font-semibold text-slate-900">
                      {guestName || "Valued Guest"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Contact</span>
                    <span className="font-semibold text-slate-900">{guestPhone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Check-In</span>
                    <span className="font-semibold text-slate-900">{checkIn} (from 14:00)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Check-Out</span>
                    <span className="font-semibold text-slate-900">{checkOut} (until 12:00)</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px]">Room Type</span>
                    <span className="font-semibold text-slate-900">{room.name}</span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-900">Total Paid</span>
                    <span className="font-bold text-base text-slate-900">
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
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Printer className="size-3.5" />
                  <span>Print Voucher</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step < 4 ? (
            <>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
                >
                  <ArrowLeft className="size-3.5" /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              )}

              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
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
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  Next: Payment <ArrowRight className="size-3.5" />
                </button>
              )}

              {step === 3 && (
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 disabled:opacity-50"
                  style={{ backgroundColor: accentColor }}
                >
                  {isProcessing ? (
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
              className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-900 bg-slate-200 hover:bg-slate-300 transition-colors"
            >
              Done & Return to Resort Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
