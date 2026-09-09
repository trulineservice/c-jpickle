"use client";

import React from "react";
import type { AvailabilitySlot } from "@/types/database";
import { Loader2, Clock, AlertCircle } from "lucide-react";

interface TimeSlotGridProps {
  slots: AvailabilitySlot[];
  selectedSlot: AvailabilitySlot | null;
  onSelectSlot: (slot: AvailabilitySlot) => void;
  isLoading: boolean;
  errorMessage: string | null;
  timeFilter: "all" | "morning" | "afternoon" | "night";
  onFilterChange: (filter: "all" | "morning" | "afternoon" | "night") => void;
  durationHours: number;
}

export function TimeSlotGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading,
  errorMessage,
  timeFilter,
  onFilterChange,
  durationHours,
}: TimeSlotGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#111111]" />
          3. Available Time Slots
        </label>

        {/* Time Segment Filter */}
        <div className="inline-flex rounded-lg border border-[#e5e5e5] p-0.5 bg-[#f5f5f5] text-xs font-semibold">
          {(["all", "morning", "afternoon", "night"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                timeFilter === filter
                  ? "bg-white text-[#111111] shadow-xs font-bold"
                  : "text-[#707072] hover:text-[#111111]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-44 border border-[#e5e5e5] rounded-xl flex flex-col items-center justify-center gap-2 bg-[#fcfcfc] text-[#707072]">
          <Loader2 className="w-6 h-6 animate-spin text-[#111111]" />
          <p className="text-xs font-medium">Checking live arena court availability...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 border border-[#d30005]/20 bg-[#d30005]/5 rounded-xl text-xs text-[#d30005] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="h-40 border border-dashed border-[#e5e5e5] rounded-xl flex items-center justify-center text-xs text-[#707072]">
          No time slots found for the selected filter and duration.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {slots.map((slot) => {
            const isSelected = selectedSlot?.hour24 === slot.hour24;
            const isAvailable = slot.available;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={!isAvailable}
                onClick={() => isAvailable && onSelectSlot(slot)}
                className={`py-3 px-3 rounded-xl border text-center transition-all relative flex flex-col items-center justify-center ${
                  !isAvailable
                    ? "border-[#f0f0f0] bg-[#fafafa] text-[#b0b0b2] cursor-not-allowed line-through"
                    : isSelected
                    ? "border-[#111111] bg-[#111111] text-white shadow-md"
                    : "border-[#e5e5e5] bg-white text-[#111111] hover:border-[#111111]"
                }`}
              >
                <span className="font-bold text-xs sm:text-sm">{slot.time}</span>
                <span
                  className={`text-[10px] mt-0.5 font-medium ${
                    !isAvailable
                      ? "text-[#b0b0b2]"
                      : isSelected
                      ? "text-white/80"
                      : "text-[#007d48]"
                  }`}
                >
                  {isAvailable ? "Open Slot" : "Occupied"}
                </span>

                {durationHours > 1 && isAvailable && isSelected && (
                  <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded mt-1">
                    {durationHours}h Block
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
