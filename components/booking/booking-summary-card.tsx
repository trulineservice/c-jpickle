"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, UserCheck, Lock, Loader2, ArrowRight, Plus, Minus } from "lucide-react";
import type { Court, AvailabilitySlot } from "@/types/database";

interface BookingSummaryCardProps {
  selectedCourt: Court;
  selectedDateStr: string;
  selectedSlot: AvailabilitySlot | null;
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

export function BookingSummaryCard({
  selectedCourt,
  selectedDateStr,
  selectedSlot,
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

  return (
    <div className="border border-[#e5e5e5] rounded-2xl p-6 bg-white shadow-sm space-y-6">
      <div className="border-b border-[#f0f0f0] pb-4">
        <h3 className="font-black text-lg text-[#111111] uppercase tracking-tight">
          Reservation Summary
        </h3>
        <p className="text-xs text-[#707072] mt-0.5">
          Review court details and optional pro-shop equipment rentals.
        </p>
      </div>

      {/* Selected Session Details */}
      <div className="space-y-2.5 text-xs text-[#111111]">
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5]">
          <span className="text-[#707072]">Facility & Court</span>
          <span className="font-bold text-right">{selectedCourt.name}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5]">
          <span className="text-[#707072]">Date</span>
          <span className="font-bold">{selectedDateStr || "Choose a date"}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5]">
          <span className="text-[#707072]">Time Slot</span>
          <span className="font-bold text-[#007d48]">
            {selectedSlot ? `${selectedSlot.time} (${durationHours} hr${durationHours > 1 ? "s" : ""})` : "Select an open time"}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-[#f5f5f5]">
          <span className="text-[#707072]">Court Rate</span>
          <span className="font-bold">₱{hourlyRate} × {durationHours} hr = ₱{courtSubtotal.toFixed(2)}</span>
        </div>
        {effectivePaddleCount > 0 && (
          <div className="flex justify-between py-1.5 border-b border-[#f5f5f5]">
            <span className="text-[#707072]">Paddle Rentals</span>
            <span className="font-bold text-[#007d48]">
              {effectivePaddleCount} × ₱150 = ₱{paddleFee.toFixed(2)}
            </span>
          </div>
        )}
        {ballThrowerRental && (
          <div className="flex justify-between py-1.5 border-b border-[#f5f5f5]">
            <span className="text-[#707072]">Ball Thrower Machine</span>
            <span className="font-bold text-[#007d48]">
              {durationHours} hr = ₱{ballThrowerFee.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Equipment & Add-On Additions */}
      <div className="space-y-3 pt-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[#111111] block">
          Arena Equipment Add-ons
        </label>

        {/* Paddle Multi-Rental (Compact Row) */}
        <div
          className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
            effectivePaddleCount > 0
              ? 'border-[#111111] bg-white'
              : 'border-[#e5e5e5] bg-[#fcfcfc]'
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#111111]">
                Pro Carbon Paddle
              </span>
              <span className="text-xs font-bold text-[#007d48]">
                +₱150/ea
              </span>
            </div>
            <p className="text-[11px] text-[#707072] mt-0.5">
              {effectivePaddleCount === 0
                ? 'Rent 1 to 4 paddles (USAP spec)'
                : `${effectivePaddleCount} paddle${effectivePaddleCount > 1 ? 's' : ''} (+₱${paddleFee}) • Max 4`}
            </p>
          </div>

          {/* Inline Stepper Capsule */}
          <div className="flex items-center gap-1.5 shrink-0 bg-[#f5f5f5] p-1 rounded-lg border border-[#e5e5e5]">
            <button
              type="button"
              disabled={effectivePaddleCount <= 0}
              onClick={() => handleUpdatePaddleCount(effectivePaddleCount - 1)}
              className="w-7 h-7 flex items-center justify-center rounded bg-white text-[#111111] hover:bg-[#eaeaea] active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
              aria-label="Decrease paddle count"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="w-6 text-center text-xs font-black text-[#111111]">
              {effectivePaddleCount}
            </span>

            <button
              type="button"
              disabled={effectivePaddleCount >= 4}
              onClick={() => handleUpdatePaddleCount(effectivePaddleCount + 1)}
              className="w-7 h-7 flex items-center justify-center rounded bg-white text-[#111111] hover:bg-[#eaeaea] active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
              aria-label="Increase paddle count"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Smart Ball Thrower Option */}
        <label className="flex items-start gap-3 p-3 rounded-xl border border-[#e5e5e5] hover:border-[#111111] cursor-pointer transition-colors bg-[#fcfcfc]">
          <input
            type="checkbox"
            checked={ballThrowerRental}
            onChange={(e) => onToggleBallThrowerRental(e.target.checked)}
            className="mt-0.5 rounded border-[#cacacb] text-[#111111] focus:ring-black"
          />
          <div className="flex-1 text-xs">
            <div className="flex justify-between items-center font-bold text-[#111111]">
              <span>Smart Ball Thrower Machine</span>
              <span className="text-[#007d48]">+₱150/hr</span>
            </div>
            <p className="text-[11px] text-[#707072] mt-0.5">
              High-capacity robotic ball launcher with custom topspin/dink drills ({durationHours} hr = ₱{ballThrowerFee}).
            </p>
          </div>
        </label>
      </div>

      {/* Authenticated Player Profile or Guest Registration Prompt */}
      {isAuthLoading ? (
        <div className="h-14 flex items-center justify-center text-xs text-[#707072]">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Verifying account status...
        </div>
      ) : !isAuthenticated ? (
        <div className="p-4 bg-[#fffbeb] border border-[#fef3c7] rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#b45309]">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Account Required to Reserve</span>
          </div>
          <p className="text-xs text-[#92400e] leading-relaxed">
            Please log in or register a free player account to secure tournament court bookings with PayMongo.
          </p>
          <div className="flex gap-2">
            <Link href="/login" className="flex-1">
              <Button variant="outline" className="w-full text-xs h-9 font-bold">
                Log In
              </Button>
            </Link>
            <Link href="/signup" className="flex-1">
              <Button className="w-full text-xs h-9 font-bold bg-[#111111] text-white hover:bg-[#222222]">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 text-xs font-bold text-[#007d48]">
            <UserCheck className="w-4 h-4" />
            <span>Booking As Authenticated Member</span>
          </div>

          <div className="space-y-2">
            <div>
              <Label htmlFor="guestName" className="text-[11px] font-bold uppercase text-[#707072]">
                Player Name
              </Label>
              <Input
                id="guestName"
                value={guestName}
                onChange={(e) => onGuestNameChange(e.target.value)}
                placeholder="Full Name"
                className="h-10 text-xs rounded-lg mt-1"
              />
            </div>
            <div>
              <Label htmlFor="guestEmail" className="text-[11px] font-bold uppercase text-[#707072]">
                Confirmation Email
              </Label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => onGuestEmailChange(e.target.value)}
                placeholder="player@example.com"
                className="h-10 text-xs rounded-lg mt-1"
              />
            </div>
            <div>
              <Label htmlFor="guestPhone" className="text-[11px] font-bold uppercase text-[#707072]">
                Mobile Number (GCash/SMS Updates)
              </Label>
              <Input
                id="guestPhone"
                value={guestPhone}
                onChange={(e) => onGuestPhoneChange(e.target.value)}
                placeholder="0917-XXX-XXXX"
                className="h-10 text-xs rounded-lg mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Financial Total & PayMongo CTA */}
      <div className="pt-4 border-t border-[#f0f0f0] space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-bold uppercase tracking-wider text-[#707072]">
            Total Payable (PHP)
          </span>
          <span className="text-2xl font-black text-[#111111] tracking-tight">
            ₱{grandTotal.toFixed(2)}
          </span>
        </div>

        <Button
          type="button"
          disabled={!selectedSlot || !isAuthenticated || isSubmitting}
          onClick={onSubmit}
          className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] font-bold text-sm rounded-full shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting to PayMongo...
            </>
          ) : (
            <>
              Confirm & Pay with PayMongo
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-[11px] text-[#707072]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#007d48]" />
          <span>Strict 24-Hour Cancellation Policy Applies</span>
        </div>
      </div>
    </div>
  );
}
