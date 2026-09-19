"use client";

import React, { useMemo } from "react";
import type { AvailabilitySlot } from "@/types/database";
import { Loader2, Clock, AlertCircle, Check, X, Sparkles } from "lucide-react";
import { playHapticSound } from "@/lib/motion-feedback";

interface TimeSlotGridProps {
  slots: AvailabilitySlot[];
  selectedSlots?: AvailabilitySlot[];
  selectedSlot?: AvailabilitySlot | null;
  onSelectSlots?: (slots: AvailabilitySlot[]) => void;
  onSelectSlot?: (slot: AvailabilitySlot) => void;
  isLoading: boolean;
  errorMessage: string | null;
  timeFilter: "all" | "morning" | "afternoon" | "night";
  onFilterChange: (filter: "all" | "morning" | "afternoon" | "night") => void;
  durationHours?: number;
  hourlyRate?: number;
  onClearSelection?: () => void;
}

function formatHourDisplay(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour.toString().padStart(2, "0")}:00 ${period}`;
}

// Strictly toggle only the clicked slot - NO automatic selection of other slots
function computeManualToggleSelection(
  clickedSlot: AvailabilitySlot,
  currentSelected: AvailabilitySlot[]
): AvailabilitySlot[] {
  if (!clickedSlot.available) return currentSelected;

  const exists = currentSelected.some((s) => s.hour24 === clickedSlot.hour24);

  if (exists) {
    // Unselect this specific slot
    return currentSelected.filter((s) => s.hour24 !== clickedSlot.hour24);
  } else {
    // Select this specific slot only
    return [...currentSelected, clickedSlot].sort((a, b) => a.hour24 - b.hour24);
  }
}

export function TimeSlotGrid({
  slots,
  selectedSlots = [],
  selectedSlot = null,
  onSelectSlots,
  onSelectSlot,
  isLoading,
  errorMessage,
  timeFilter,
  onFilterChange,
  durationHours = 1,
  hourlyRate = 300,
  onClearSelection,
}: TimeSlotGridProps) {
  // Normalize effective selected slots sorted chronologically
  const effectiveSelected: AvailabilitySlot[] = useMemo(() => {
    if (selectedSlots && selectedSlots.length > 0) {
      return [...selectedSlots].sort((a, b) => a.hour24 - b.hour24);
    }
    if (selectedSlot) {
      return [selectedSlot];
    }
    return [];
  }, [selectedSlots, selectedSlot]);

  const selectedHours = useMemo(
    () => new Set(effectiveSelected.map((s) => s.hour24)),
    [effectiveSelected]
  );

  // Check if selected slots are consecutive
  const isConsecutive = useMemo(() => {
    if (effectiveSelected.length <= 1) return true;
    for (let i = 1; i < effectiveSelected.length; i++) {
      if (effectiveSelected[i].hour24 !== effectiveSelected[i - 1].hour24 + 1) {
        return false;
      }
    }
    return true;
  }, [effectiveSelected]);

  const minHour = effectiveSelected.length > 0 ? effectiveSelected[0].hour24 : null;
  const maxHour =
    effectiveSelected.length > 0
      ? effectiveSelected[effectiveSelected.length - 1].hour24
      : null;

  const handleSlotClick = (slot: AvailabilitySlot) => {
    if (!slot.available) {
      playHapticSound("error");
      return;
    }

    playHapticSound("tap");
    if (onSelectSlots) {
      const nextSelection = computeManualToggleSelection(slot, effectiveSelected);
      onSelectSlots(nextSelection);
    } else if (onSelectSlot) {
      onSelectSlot(slot);
    }
  };

  const handleClear = () => {
    playHapticSound("tap");
    if (onClearSelection) {
      onClearSelection();
    } else if (onSelectSlots) {
      onSelectSlots([]);
    }
  };

  const rangeDisplay = useMemo(() => {
    if (effectiveSelected.length === 0) return null;
    if (effectiveSelected.length === 1) {
      const h = effectiveSelected[0].hour24;
      return `${formatHourDisplay(h)} - ${formatHourDisplay(h + 1)}`;
    }
    if (!isConsecutive) {
      return `${effectiveSelected.length} separate slots selected`;
    }
    const startH = effectiveSelected[0].hour24;
    const endH = effectiveSelected[effectiveSelected.length - 1].hour24 + 1;
    return `${formatHourDisplay(startH)} - ${formatHourDisplay(endH)}`;
  }, [effectiveSelected, isConsecutive]);

  return (
    <div className="space-y-4">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#FFD21C]" />
            <span>3. Select Playing Time</span>
          </label>
          <p className="text-xs text-[#64748B] mt-0.5">
            Click each time slot to select or unselect. Multiple contiguous slots extend your duration.
          </p>
        </div>

        {/* Time Segment Filter */}
        <div className="inline-flex rounded-full border border-[#E2E8F0] p-1 bg-[#EDF4FC] text-xs font-bold self-start sm:self-auto">
          {(["all", "morning", "afternoon", "night"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-1 rounded-full capitalize transition-all duration-150 ${
                timeFilter === filter
                  ? "bg-[#0B2A67] text-white shadow-xs font-extrabold"
                  : "text-[#64748B] hover:text-[#0B2A67]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Live Selection Multi-Hour Banner */}
      {effectiveSelected.length > 0 && rangeDisplay && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[#0B2A67]/20 bg-[#EDF4FC] text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-extrabold text-xs bg-[#FFD21C] text-[#0B2A67] shadow-xs">
              {effectiveSelected.length}
            </span>
            <div>
              <span className="font-extrabold text-[#0B2A67] text-sm block">
                {rangeDisplay}
              </span>
              <span className="text-[11px] text-[#64748B] font-medium">
                {effectiveSelected.length} hour{effectiveSelected.length > 1 ? "s" : ""} selected • ₱{(effectiveSelected.length * hourlyRate).toFixed(2)} Court Subtotal
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#64748B] hover:text-[#d30005] transition-colors px-3 py-1.5 rounded-full hover:bg-white/80"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="h-44 border border-[#E2E8F0] rounded-2xl flex flex-col items-center justify-center gap-2 bg-[#F5F7FA] text-[#64748B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0B2A67]" />
          <p className="text-xs font-bold">Checking live court availability...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 border border-[#d30005]/20 rounded-xl bg-[#d30005]/5 text-xs text-[#d30005] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="h-40 border border-dashed border-[#E2E8F0] rounded-2xl flex items-center justify-center text-xs text-[#64748B]">
          No time slots found for the selected filter.
        </div>
      ) : (
        <div className="space-y-4">
          {!slots.some((s) => s.available) && (
            <div className="p-4 rounded-2xl bg-[#bf050b]/8 border border-[#bf050b]/25 text-[#bf050b] flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-[#bf050b]" />
              <div>
                <span className="font-black text-sm block uppercase tracking-tight">
                  All Hours Fully Scheduled on This Date
                </span>
                <span className="text-[#64748B]">
                  Every operational court hour on this date is currently reserved. Please choose another date on the calendar above.
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {slots.map((slot) => {
            const isSelected = selectedHours.has(slot.hour24);
            const isAvailable = slot.available;
            const isFirst = minHour !== null && slot.hour24 === minHour;
            const isLast = maxHour !== null && slot.hour24 === maxHour;

            return (
              <button
                key={slot.time}
                type="button"
                disabled={!isAvailable}
                onClick={() => handleSlotClick(slot)}
                className={`py-3.5 px-3 rounded-xl border text-center transition-all duration-200 relative flex flex-col items-center justify-center cursor-pointer ${
                  !isAvailable
                    ? "border-[#E2E8F0] bg-[#F5F7FA] text-[#94A3B8] cursor-not-allowed line-through"
                    : isSelected
                    ? "border-[#0B2A67] bg-[#0B2A67] text-white shadow-md ring-2 ring-[#FFD21C] -translate-y-0.5"
                    : "border-[#E2E8F0] bg-white text-[#102A56] hover:border-[#0B2A67]/50 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs sm:text-sm">{slot.time}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-[#FFD21C]" />}
                </div>

                <span
                  className={`text-[10px] mt-0.5 font-bold ${
                    !isAvailable
                      ? "text-[#94A3B8]"
                      : isSelected
                      ? "text-[#FFD21C]"
                      : "text-[#007d48]"
                  }`}
                >
                  {!isAvailable
                    ? "Occupied"
                    : isSelected
                    ? effectiveSelected.length === 1
                      ? "Selected (1h)"
                      : isConsecutive
                      ? isFirst
                        ? "Start Time"
                        : isLast
                        ? `End • ${formatHourDisplay(slot.hour24 + 1)}`
                        : "Selected (+1h)"
                      : "Selected"
                    : "Open Slot"}
                </span>
              </button>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
