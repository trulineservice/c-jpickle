"use client";

import React from "react";
import type { Court } from "@/types/database";
import { Check } from "lucide-react";

interface CourtSelectorProps {
  courts: Court[];
  selectedCourt: Court;
  onSelectCourt: (court: Court) => void;
}

export function CourtSelector({
  courts,
  selectedCourt,
  onSelectCourt,
}: CourtSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-foreground">
          1. Select Court
        </label>
        <span className="text-xs font-semibold text-[#707072] dark:text-[#a1a1aa]">
          ₱{selectedCourt.hourly_rate}/hr
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {courts.map((court) => {
          const isSelected = selectedCourt.id === court.id;
          return (
            <button
              key={court.id}
              type="button"
              onClick={() => onSelectCourt(court)}
              className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? "border-[#111111] bg-[#111111] text-white dark:bg-white dark:text-[#111111] dark:border-white shadow-md"
                  : "border-[#e5e5e5] dark:border-[#27272a] bg-white dark:bg-[#121215] text-[#111111] dark:text-white hover:border-[#111111] dark:hover:border-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white dark:bg-[#111111]/10 dark:text-[#111111]"
                          : "bg-[#f5f5f5] dark:bg-[#222228] text-[#707072] dark:text-[#a1a1aa]"
                      }`}
                    >
                      {court.type}
                    </span>
                    {court.name.includes("1") && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-[#007d48]/20 text-[#007d48] dark:bg-[#007d48]/20 dark:text-[#007d48]"
                          : "bg-[#007d48]/15 text-[#007d48] dark:bg-[#10b981]/20 dark:text-[#10b981]"
                      }`}>
                        Pro Cushion
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm sm:text-base mt-2">
                    {court.name}
                  </h4>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-white text-[#111111] dark:bg-[#111111] dark:text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-current/15 flex items-center justify-between text-xs font-semibold">
                <span className={isSelected ? "text-white/80 dark:text-[#707072]" : "text-[#707072] dark:text-[#a1a1aa]"}>
                  Standard Hourly Rate
                </span>
                <span className="font-bold">₱{court.hourly_rate}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
