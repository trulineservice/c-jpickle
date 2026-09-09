"use client";

import React from "react";
import { ChevronDown } from "lucide-react";

export interface DurationOption {
  hours: number;
  label: string;
  description: string;
}

interface DurationSelectorProps {
  durationHours: number;
  durationOptions: DurationOption[];
  onSelectDuration: (hours: number) => void;
}

export function DurationSelector({
  durationHours,
  durationOptions,
  onSelectDuration,
}: DurationSelectorProps) {
  const selectedOption = durationOptions.find((o) => o.hours === durationHours) || durationOptions[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-[#111111]">
          2. Playing Duration
        </label>
        <span className="text-xs text-[#707072] font-semibold">
          {selectedOption.description}
        </span>
      </div>

      {/* Quick Pills for 1, 2, 3, 4 hours */}
      <div className="grid grid-cols-4 gap-2">
        {durationOptions.slice(0, 4).map((opt) => {
          const isSelected = durationHours === opt.hours;
          return (
            <button
              key={opt.hours}
              type="button"
              onClick={() => onSelectDuration(opt.hours)}
              className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                isSelected
                  ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                  : "bg-white text-[#111111] border-[#e5e5e5] hover:border-[#111111]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Extended Dropdown for Longer Tournament/Squad Blocks (5 - 12 hours) */}
      <div className="relative">
        <select
          value={durationHours}
          onChange={(e) => onSelectDuration(parseInt(e.target.value, 10))}
          aria-label="Select custom playing duration"
          className="w-full h-10 px-3 pr-8 rounded-lg border border-[#e5e5e5] bg-white text-xs font-medium text-[#111111] appearance-none focus:outline-none focus:border-[#111111]"
        >
          {durationOptions.map((opt) => (
            <option key={opt.hours} value={opt.hours}>
              {opt.label} — {opt.description}
            </option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-[#707072] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
