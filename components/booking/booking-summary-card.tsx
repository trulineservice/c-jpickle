"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserCheck, Lock, Loader2, ArrowRight, Plus, Minus, Clock } from "lucide-react";
import type { Court, AvailabilitySlot } from "@/types/database";

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
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
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
  const effectivePaddleCount = paddleCount !== undefined 
    ? paddleCount 
    : (paddleRental ? 1 : 0);

  const handleUpdatePaddleCount = (newCount: number) => {
    const clamped = Math.min(4, Math.max(0, newCount));
    if (onPaddleCountChange) {
      onPaddleCountChange(clamped);
    }
    if (onTogglePaddleRental) {
      onTogglePaddleRental(clamped > 0);
    }
  };

  const hourlyRate = selectedCourt.hourly_rate;
  const courtSubtotal = hourlyRate * durationHours;
  const paddleFee = effectivePaddleCount * 150;
  const ballThrowerFee = ballThrowerRental ? 150 * durationHours : 0;

  // Format time range display
  const timeSlotDisplay = useMemo(() => {
    if (selectedSlots && selectedSlots.length > 0) {
      const sorted = [...selectedSlots].sort((a, b) => a.hour24 - b.hour24);
      const isConsecutiveCheck = sorted.every((s, i) => i === 0 || s.hour24 === sorted[i - 1].hour24 + 1);

      if (isConsecutiveCheck) {
        const startH = sorted[0].hour24;
        const endH = sorted[sorted.length - 1].hour24 + 1;
        return `${formatHourDisplay(startH)} - ${formatHourDisplay(endH)} (${durationHours} hr${durationHours > 1 ? "s" : ""})`;
      } else {
        return `${sorted.map((s) => s.time).join(", ")} (${durationHours} hr${durationHours > 1 ? "s" : ""})`;
      }
    }
    if (selectedSlot) {
      const startH = selectedSlot.hour24;
      const endH = selectedSlot.hour24 + durationHours;
      return `${formatHourDisplay(startH)} - ${formatHourDisplay(endH)} (${durationHours} hr${durationHours > 1 ? "s" : ""})`;
    }
    return null;
  }, [selectedSlots, selectedSlot, durationHours]);

  const hasSelectedTime = Boolean(selectedSlot || (selectedSlots && selectedSlots.length > 0));

  return (
    <div className="border border-[#e5e5e5] dark:border-[#27272a] rounded-2xl p-6 bg-white dark:bg-[#121215] shadow-sm space-y-6">
      <div className="border-b border-[#f0f0f0] dark:border-[#27272a] pb-4">
        <h3 className="font-black text-lg text-foreground uppercase tracking-tight">
          Reservation Summary
        </h3>
        <p className="text-xs text-[#707072] dark:text-[#a1a1aa] mt-0.5">
          Review court schedule and pro-shop equipment rentals.
        </p>
      </div>

      {/* Selected Session Details */}
      <div className="space-y-2.5 text-xs text-foreground">
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5] dark:border-[#1e1e24]">
          <span className="text-[#707072] dark:text-[#a1a1aa]">Facility & Court</span>
          <span className="font-bold text-right">{selectedCourt.name}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5] dark:border-[#1e1e24]">
          <span className="text-[#707072] dark:text-[#a1a1aa]">Date</span>
          <span className="font-bold">{selectedDateStr || "Choose a date"}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5] dark:border-[#1e1e24]">
          <span className="text-[#707072] dark:text-[#a1a1aa]">Playing Time</span>
          <span className={`font-bold ${timeSlotDisplay ? "text-[#007d48] dark:text-[#10b981]" : "text-[#707072] dark:text-[#a1a1aa]"}`}>
            {timeSlotDisplay || "Select open time slot(s)"}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5] dark:border-[#1e1e24]">
          <span className="text-[#707072] dark:text-[#a1a1aa]">Court Rate</span>
          <span className="font-bold">₱{hourlyRate} × {durationHours} hr = ₱{courtSubtotal.toFixed(2)}</span>
        </div>
        {effectivePaddleCount > 0 && (
          <div className="flex justify-between py-1.5 border-b border-[#f5f5f5] dark:border-[#1e1e24]">
            <span className="text-[#707072] dark:text-[#a1a1aa]">Paddle Rentals</span>
            <span className="font-bold text-[#007d48] dark:text-[#10b981]">
              {effectivePaddleCount} × ₱150 = ₱{paddleFee.toFixed(2)}
            </span>
          </div>
        )}
        {ballThrowerRental && (
          <div className="flex justify-between py-1.5 border-b border-[#f5f5f5] dark:border-[#1e1e24]">
            <span className="text-[#707072] dark:text-[#a1a1aa]">Ball Thrower Machine</span>
            <span className="font-bold text-[#007d48] dark:text-[#10b981]">
              {durationHours} hr = ₱{ballThrowerFee.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Equipment & Add-On Additions */}
      <div className="space-y-3 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
          Arena Equipment Add-ons
        </label>

        {/* Paddle Multi-Rental (Compact Row) */}
        <div
          className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
            effectivePaddleCount > 0
              ? 'border-[#111111] dark:border-white bg-white dark:bg-[#18181c]'
              : 'border-[#e5e5e5] dark:border-[#27272a] bg-[#fcfcfc] dark:bg-[#151518]'
          }`}
        >
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-foreground block">
              Carbon Fiber Paddles (₱150 / paddle)
            </span>
            <span className="text-[11px] text-[#707072] dark:text-[#a1a1aa] block">
              Official USAP approved 16mm graphite honeycomb paddles
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-[#f5f5f5] dark:bg-[#222228] p-1 rounded-lg border border-[#e5e5e5] dark:border-[#27272a]">
            <button
              type="button"
              disabled={effectivePaddleCount <= 0}
              onClick={() => handleUpdatePaddleCount(effectivePaddleCount - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-[#18181c] text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
              aria-label="Decrease paddle count"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-black text-xs min-w-[20px] text-center text-foreground">
              {effectivePaddleCount}
            </span>
            <button
              type="button"
              disabled={effectivePaddleCount >= 4}
              onClick={() => handleUpdatePaddleCount(effectivePaddleCount + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-[#18181c] text-foreground hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs"
              aria-label="Increase paddle count"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ball Thrower Machine Rental */}
        <label
          className={`p-3 rounded-xl border transition-colors flex items-start gap-3 cursor-pointer ${
            ballThrowerRental
              ? 'border-[#111111] dark:border-white bg-white dark:bg-[#18181c]'
              : 'border-[#e5e5e5] dark:border-[#27272a] bg-[#fcfcfc] dark:bg-[#151518]'
          }`}
        >
          <input
            type="checkbox"
            checked={ballThrowerRental}
            onChange={(e) => onToggleBallThrowerRental(e.target.checked)}
            className="mt-0.5 rounded border-[#cacacb] dark:border-[#52525b] text-[#111111] focus:ring-0"
          />
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-foreground block">
              Robotic Ball Thrower Machine (+₱150 / hr)
            </span>
            <span className="text-[11px] text-[#707072] dark:text-[#a1a1aa] block leading-relaxed">
              High-capacity robotic ball launcher with custom topspin/dink drills ({durationHours} hr = ₱{ballThrowerFee.toFixed(2)}).
            </span>
          </div>
        </label>
      </div>

      {/* Auth Gate / Player Details Form */}
      {isAuthLoading ? (
        <div className="p-4 border border-[#e5e5e5] dark:border-[#27272a] rounded-xl flex items-center justify-center gap-2 text-xs text-[#707072] dark:text-[#a1a1aa]">
          <Loader2 className="w-4 h-4 animate-spin text-foreground" />
          <span>Verifying authentication status...</span>
        </div>
      ) : !isAuthenticated ? (
        <div className="p-4 rounded-xl border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Lock className="w-4 h-4" />
            <span>Sign In Required</span>
          </div>
          <p className="text-xs text-[#707072] dark:text-[#a1a1aa] leading-relaxed">
            Please log in or create an account to secure your court reservation and receive digital receipt passes.
          </p>
          <div className="flex gap-2 pt-1">
            <Link href="/login?next=/book" className="flex-1">
              <Button size="sm" className="w-full bg-[#111111] hover:bg-[#222222] text-white dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] text-xs font-bold h-9">
                Sign In
              </Button>
            </Link>
            <Link href="/signup?next=/book" className="flex-1">
              <Button size="sm" variant="outline" className="w-full text-xs font-bold h-9 border-[#cacacb] dark:border-[#27272a] text-foreground hover:bg-[#e5e5e5] dark:hover:bg-[#27272a]">
                Register
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-2 border-t border-[#f0f0f0] dark:border-[#27272a]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#007d48] dark:text-[#10b981]" />
              Account Details
            </label>
            <span className="text-[10px] text-[#007d48] dark:text-[#10b981] font-semibold uppercase tracking-wider bg-[#007d48]/10 px-2 py-0.5 rounded-full">
              Authenticated
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <Label htmlFor="guestName" className="text-[11px] font-bold uppercase text-[#707072] dark:text-[#a1a1aa]">
                Player Full Name
              </Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => onGuestNameChange(e.target.value)}
                placeholder="Juan Dela Cruz"
                className="h-10 text-xs rounded-lg mt-1 bg-white dark:bg-black border-[#cacacb] dark:border-[#3f3f46] text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:border-[#111111] dark:focus-visible:border-white"
              />
            </div>
            <div>
              <Label htmlFor="guestEmail" className="text-[11px] font-bold uppercase text-[#707072] dark:text-[#a1a1aa]">
                Confirmation Email
              </Label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => onGuestEmailChange(e.target.value)}
                placeholder="player@example.com"
                className="h-10 text-xs rounded-lg mt-1 bg-white dark:bg-black border-[#cacacb] dark:border-[#3f3f46] text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:border-[#111111] dark:focus-visible:border-white"
              />
            </div>
            <div>
              <Label htmlFor="guestPhone" className="text-[11px] font-bold uppercase text-[#707072] dark:text-[#a1a1aa]">
                Mobile Number (GCash/SMS Updates)
              </Label>
              <Input
                id="guestPhone"
                value={guestPhone}
                onChange={(e) => onGuestPhoneChange(e.target.value)}
                placeholder="0917-XXX-XXXX"
                className="h-10 text-xs rounded-lg mt-1 bg-white dark:bg-black border-[#cacacb] dark:border-[#3f3f46] text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:border-[#111111] dark:focus-visible:border-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Total & PayMongo CTA */}
      <div className="pt-4 border-t border-[#f0f0f0] dark:border-[#27272a] space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-bold uppercase tracking-wider text-[#707072] dark:text-[#a1a1aa]">
            Total Payable (PHP)
          </span>
          <span className="text-2xl font-black text-foreground tracking-tight">
            ₱{grandTotal.toFixed(2)}
          </span>
        </div>

        <Button
          type="button"
          disabled={!hasSelectedTime || !isAuthenticated || isSubmitting}
          onClick={onSubmit}
          className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-bold text-sm rounded-full shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting to PayMongo...
            </>
          ) : !hasSelectedTime ? (
            <>
              <Clock className="w-4 h-4" />
              Pick Time Slot(s) to Continue
            </>
          ) : (
            <>
              Confirm & Pay with PayMongo
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#707072] dark:text-[#a1a1aa]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#007d48] dark:text-[#10b981]" />
          <span>Strict 24-Hour Cancellation Policy Applies</span>
        </div>
      </div>
    </div>
  );
}
