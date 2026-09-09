"use client";

import React, { useMemo } from "react";
import type { AvailabilitySlot } from "@/types/database";
import { Loader2, Clock, AlertCircle, Check, X } from "lucide-react";

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
    if (!slot.available) return;

    if (onSelectSlots) {
      const nextSelection = computeManualToggleSelection(slot, effectiveSelected);
      onSelectSlots(nextSelection);
    } else if (onSelectSlot) {
      onSelectSlot(slot);
    }
  };

  const handleClear = () => {
    if (onClearSelection) {
      onClearSelection();
    } else if (onSelectSlots) {
      onSelectSlots([]);
    }
  };

  // Time range summary
  const rangeDisplay = useMemo(() => {
    if (effectiveSelected.length === 0) return null;
    if (!isConsecutive) {
      return `${effectiveSelected.length} separate hours selected`;
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
          <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-foreground" />
            3. Select Playing Time
          </label>
          <p className="text-[11px] text-[#707072] dark:text-[#a1a1aa] mt-0.5">
            Click each time slot to select or unselect. Multiple consecutive slots extend your playing duration.
          </p>
        </div>

        {/* Time Segment Filter */}
        <div className="inline-flex rounded-lg border border-[#e5e5e5] dark:border-[#27272a] p-0.5 bg-[#f5f5f5] dark:bg-[#18181c] text-xs font-semibold self-start sm:self-auto">
          {(["all", "morning", "afternoon", "night"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                timeFilter === filter
                  ? "bg-white dark:bg-[#27272a] text-foreground shadow-xs font-bold"
                  : "text-[#707072] dark:text-[#a1a1aa] hover:text-foreground"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Live Selection Multi-Hour Banner */}
      {effectiveSelected.length > 0 && rangeDisplay && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border border-[#111111] dark:border-white bg-[#f5f5f5] dark:bg-[#18181c] text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs bg-[#111111] dark:bg-white text-white dark:text-[#111111]">
              {effectiveSelected.length}
            </span>
            <div>
              <span className="font-bold text-foreground text-sm block">
                {rangeDisplay}
              </span>
              <span className="text-[11px] text-[#707072] dark:text-[#a1a1aa]">
                {effectiveSelected.length} hour{effectiveSelected.length > 1 ? "s" : ""} selected • ₱{(effectiveSelected.length * hourlyRate).toFixed(2)} Court Subtotal
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#707072] dark:text-[#a1a1aa] hover:text-[#d30005] dark:hover:text-[#ef4444] transition-colors px-2.5 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="w-3.5 h-3.5" /> Clear All
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="h-44 border border-[#e5e5e5] dark:border-[#27272a] flex flex-col items-center justify-center gap-2 bg-[#fcfcfc] dark:bg-[#121215] text-[#707072] dark:text-[#a1a1aa]">
          <Loader2 className="w-6 h-6 animate-spin text-foreground" />
          <p className="text-xs font-medium">Checking live arena court availability...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 border border-[#d30005]/20 bg-[#d30005]/5 text-xs text-[#d30005] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="h-40 border border-dashed border-[#e5e5e5] dark:border-[#27272a] flex items-center justify-center text-xs text-[#707072] dark:text-[#a1a1aa]">
          No time slots found for the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
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
                className={`py-3 px-3 border text-center transition-all relative flex flex-col items-center justify-center cursor-pointer ${
                  !isAvailable
                    ? "border-[#f0f0f0] dark:border-[#222226] bg-[#fafafa] dark:bg-[#18181c] text-[#b0b0b2] dark:text-[#52525b] cursor-not-allowed line-through"
                    : isSelected
                    ? "border-[#111111] dark:border-white bg-[#111111] dark:bg-white text-white dark:text-[#111111] shadow-sm ring-1 ring-[#111111] dark:ring-white"
                    : "border-[#e5e5e5] dark:border-[#27272a] bg-white dark:bg-[#121215] text-foreground hover:border-[#111111] dark:hover:border-white"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm">{slot.time}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </div>

                <span
                  className={`text-[10px] mt-0.5 font-medium ${
                    !isAvailable
                      ? "text-[#b0b0b2] dark:text-[#52525b]"
                      : isSelected
                      ? "text-white/80 dark:text-[#111111]/80"
                      : "text-[#007d48] dark:text-[#10b981]"
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
      )}
    </div>
  );
}
