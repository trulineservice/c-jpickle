"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Loader2,
  ArrowRight,
  Plus,
  Minus,
  Clock,
  Calendar,
  CheckCircle2,
  Flame,
} from "lucide-react";
import type { Court, AvailabilitySlot } from "@/types/database";
import { AnimatedNumber } from "@/components/ui/animated-number";
import {
  playHapticSound,
  fireCourtBookingCelebration,
  formatPHPhone,
  validatePHPhone,
} from "@/lib/motion-feedback";

interface BookingSummaryCardProps {
  selectedCourt: Court;
  selectedDateStr: string;
  selectedSlot: AvailabilitySlot | null;
  selectedSlots?: AvailabilitySlot[];
  durationHours: number;
  paddleCount?: number;
  onPaddleCountChange?: (count: number) => void;
  paddleRental?: boolean;
  onTogglePaddleRental?: (checked: boolean) => void;
  ballThrowerRental: boolean;
  onToggleBallThrowerRental: (checked: boolean) => void;
  grandTotal: number;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  guestName: string;
  onGuestNameChange: (val: string) => void;
  guestEmail: string;
  onGuestEmailChange: (val: string) => void;
  guestPhone: string;
  onGuestPhoneChange: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}

function formatHourDisplay(hour: number): string {
  const normalizedHour = hour % 24;
  const period = normalizedHour >= 12 ? "PM" : "AM";
  const displayHour = normalizedHour % 12 === 0 ? 12 : normalizedHour % 12;
  return `${displayHour.toString().padStart(2, "0")}:00 ${period}`;
}

export function BookingSummaryCard({
  selectedCourt,
  selectedDateStr,
  selectedSlot,
  selectedSlots,
  durationHours,
  paddleCount,
  onPaddleCountChange,
  paddleRental,
  onTogglePaddleRental,
  ballThrowerRental,
  onToggleBallThrowerRental,
  grandTotal,
  isAuthenticated,
  isAuthLoading,
  guestName,
  onGuestNameChange,
  guestEmail,
  onGuestEmailChange,
  guestPhone,
  onGuestPhoneChange,
  isSubmitting,
  onSubmit,
}: BookingSummaryCardProps) {
  // Resolve effective paddle count (0 to 4 max)
  const effectivePaddleCount =
    paddleCount !== undefined ? paddleCount : paddleRental ? 1 : 0;

  const handleUpdatePaddleCount = (newCount: number) => {
    const clamped = Math.min(4, Math.max(0, newCount));
    playHapticSound("tap");
    if (onPaddleCountChange) {
      onPaddleCountChange(clamped);
    }
    if (onTogglePaddleRental) {
      onTogglePaddleRental(clamped > 0);
    }
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPHPhone(e.target.value);
    onGuestPhoneChange(formatted);
  };

  const hourlyRate = selectedCourt.hourly_rate;
  const courtSubtotal = hourlyRate * durationHours;
  const paddleFee = effectivePaddleCount * 150;
  const ballThrowerFee = ballThrowerRental ? 150 * durationHours : 0;

  // Format time range display
  const timeSlotDisplay = useMemo(() => {
    if (selectedSlots && selectedSlots.length > 0) {
      const sorted = [...selectedSlots].sort((a, b) => a.hour24 - b.hour24);
      const isConsecutiveCheck = sorted.every(
        (s, i) => i === 0 || s.hour24 === sorted[i - 1].hour24 + 1
      );

      if (isConsecutiveCheck) {
        const startH = sorted[0].hour24;
        const endH = sorted[sorted.length - 1].hour24 + 1;
        return `${formatHourDisplay(startH)} - ${formatHourDisplay(endH)} (${durationHours} hr${
          durationHours > 1 ? "s" : ""
        })`;
      } else {
        return `${sorted.map((s) => s.time).join(", ")} (${durationHours} hr${
          durationHours > 1 ? "s" : ""
        })`;
      }
    }
    if (selectedSlot) {
      return `${selectedSlot.time} (1 hr)`;
    }
    return null;
  }, [selectedSlots, selectedSlot, durationHours]);

  const handleSubmitWithFeedback = () => {
    playHapticSound("scan");
    fireCourtBookingCelebration();
    onSubmit();
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 shadow-md text-[#102A56]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0B2A67] block">
            Booking Summary
          </span>
          <h3 className="text-xl font-extrabold text-[#0B2A67] tracking-tight">
            Order Breakdown
          </h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-xs font-black uppercase flex items-center gap-1">
          <Flame className="w-3 h-3 text-[#bf050b]" />
          <span>{selectedCourt.name.includes("1") ? "Court 1" : "Court 2"}</span>
        </span>
      </div>

      {/* Selected Session Details */}
      <div className="space-y-3 text-xs">
        <div className="flex justify-between py-1.5 border-b border-[#F5F7FA]">
          <span className="text-[#64748B]">Facility &amp; Court</span>
          <span className="font-bold text-[#0B2A67] text-right">{selectedCourt.name}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#F5F7FA]">
          <span className="text-[#64748B]">Date</span>
          <span className="font-bold text-[#0B2A67]">{selectedDateStr || "Choose a date"}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#F5F7FA]">
          <span className="text-[#64748B]">Playing Time</span>
          <span className={`font-bold ${timeSlotDisplay ? "text-[#007d48]" : "text-[#64748B]"}`}>
            {timeSlotDisplay || "Select open time slot(s)"}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#F5F7FA]">
          <span className="text-[#64748B]">Court Rate</span>
          <span className="font-bold text-[#0B2A67]">
            ₱{hourlyRate} × {durationHours} hr = ₱{courtSubtotal.toFixed(2)}
          </span>
        </div>
        {effectivePaddleCount > 0 && (
          <div className="flex justify-between py-1.5 border-b border-[#F5F7FA]">
            <span className="text-[#64748B]">Paddle Rentals</span>
            <span className="font-bold text-[#007d48]">
              {effectivePaddleCount} × ₱150 = ₱{paddleFee.toFixed(2)}
            </span>
          </div>
        )}
        {ballThrowerRental && (
          <div className="flex justify-between py-1.5 border-b border-[#F5F7FA]">
            <span className="text-[#64748B]">Ball Thrower Machine</span>
            <span className="font-bold text-[#007d48]">
              {durationHours} hr = ₱{ballThrowerFee.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Equipment & Add-On Additions */}
      <div className="space-y-3 pt-2">
        <label className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] block">
          Equipment &amp; Add-ons
        </label>

        {/* Paddle Multi-Rental */}
        <div
          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
            effectivePaddleCount > 0
              ? "border-[#0B2A67] bg-[#EDF4FC]"
              : "border-[#E2E8F0] bg-[#F5F7FA]"
          }`}
        >
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-[#0B2A67] block">
              Paddle Rental (₱150 / paddle)
            </span>
            <span className="text-[11px] text-[#64748B] block">
              Quality rental paddles for your match
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-white p-1 rounded-lg border border-[#E2E8F0]">
            <button
              type="button"
              disabled={effectivePaddleCount <= 0}
              onClick={() => handleUpdatePaddleCount(effectivePaddleCount - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[#F5F7FA] text-[#0B2A67] hover:bg-[#EDF4FC] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              aria-label="Decrease paddle count"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-extrabold text-xs min-w-[20px] text-center text-[#0B2A67]">
              {effectivePaddleCount}
            </span>
            <button
              type="button"
              disabled={effectivePaddleCount >= 4}
              onClick={() => handleUpdatePaddleCount(effectivePaddleCount + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[#F5F7FA] text-[#0B2A67] hover:bg-[#EDF4FC] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              aria-label="Increase paddle count"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ball Thrower Machine Rental */}
        <label
          className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
            ballThrowerRental
              ? "border-[#0B2A67] bg-[#EDF4FC]"
              : "border-[#E2E8F0] bg-[#F5F7FA]"
          }`}
        >
          <input
            type="checkbox"
            checked={ballThrowerRental}
            onChange={(e) => {
              playHapticSound("tap");
              onToggleBallThrowerRental(e.target.checked);
            }}
            className="mt-0.5 rounded border-[#E2E8F0] text-[#0B2A67] focus:ring-[#FFD21C]"
          />
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-[#0B2A67] block">
              Robotic Ball Thrower (+₱150 / hr)
            </span>
            <span className="text-[11px] text-[#64748B] block leading-relaxed">
              Automated multi-ball launcher with custom topspin/dink drills ({durationHours} hr = ₱
              {ballThrowerFee.toFixed(2)}).
            </span>
          </div>
        </label>
      </div>

      {/* Auth Gate / Player Details Form */}
      {isAuthLoading ? (
        <div className="p-4 border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-2 text-xs text-[#64748B]">
          <Loader2 className="w-4 h-4 animate-spin text-[#0B2A67]" />
          <span>Checking player credentials...</span>
        </div>
      ) : !isAuthenticated ? (
        <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#EDF4FC] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B2A67]">
            <Lock className="w-4 h-4 text-[#0B2A67]" />
            <span>Sign In Required</span>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Please log in or create an account to secure your court reservation and receive digital QR check-in passes.
          </p>
          <div className="flex gap-2 pt-1">
            <Link href="/login?next=/book" className="flex-1">
              <Button size="sm" variant="yellow" className="w-full text-xs font-bold h-9">
                Sign In
              </Button>
            </Link>
            <Link href="/signup?next=/book" className="flex-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs font-bold h-9 bg-white border-[#E2E8F0] text-[#0B2A67]"
              >
                Register
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#0B2A67] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#007d48]" />
              <span>Player Information</span>
            </Label>
            <span className="text-[10px] font-bold text-[#007d48] bg-[#007d48]/10 px-2 py-0.5 rounded-full">
              Verified Athlete
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] block">Full Name</span>
              <Input
                type="text"
                value={guestName}
                onChange={(e) => onGuestNameChange(e.target.value)}
                placeholder="Enter your full name"
                className="h-9 text-xs mt-1 border-[#E2E8F0] rounded-lg focus:border-[#0B2A67]"
                required
              />
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#64748B] block">Email Address (For QR Pass)</span>
              <Input
                type="email"
                value={guestEmail}
                onChange={(e) => onGuestEmailChange(e.target.value)}
                placeholder="you@example.com"
                className="h-9 text-xs mt-1 border-[#E2E8F0] rounded-lg focus:border-[#0B2A67]"
                required
              />
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#64748B] block">
                Philippine Mobile (09XX-XXX-XXXX)
              </span>
              <Input
                type="tel"
                value={guestPhone}
                onChange={handlePhoneInputChange}
                placeholder="0917-XXX-XXXX"
                className="h-9 text-xs mt-1 border-[#E2E8F0] rounded-lg focus:border-[#0B2A67]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Grand Total Bar with 60fps Number Ticker */}
      <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-[#64748B]">Total Amount</span>
          <div className="text-right">
            <div className="text-3xl font-black text-[#0B2A67] flex items-center justify-end">
              <AnimatedNumber value={grandTotal} />
            </div>
            <span className="text-[11px] text-[#64748B] block">All taxes &amp; fees included</span>
          </div>
        </div>

        {/* Primary PayMongo Checkout Button */}
        <Button
          onClick={handleSubmitWithFeedback}
          disabled={isSubmitting || !timeSlotDisplay}
          variant="yellow"
          size="lg"
          className="w-full h-13 text-sm sm:text-base font-extrabold shadow-lg rounded-full mt-2 cursor-pointer active:scale-[0.98]"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting PayMongo...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              <span>
                Lock &amp; Pay &mdash; ₱{grandTotal.toFixed(2)}
              </span>
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </div>

      {/* 24-Hour Guarantee Badge */}
      <div className="p-3.5 rounded-xl bg-[#EDF4FC] border border-[#E2E8F0] flex items-center gap-2.5 text-[11px] text-[#0B2A67] font-semibold">
        <ShieldCheck className="w-5 h-5 text-[#007d48] shrink-0" />
        <span>Strict 24-Hour Refundable Cancellation Policy with Instant QR Pass generation.</span>
      </div>
    </div>
  );
}
