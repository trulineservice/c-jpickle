"use client";

import React from "react";
import type { Court } from "@/types/database";
import { Check, Trophy, Flame } from "lucide-react";
import { playHapticSound } from "@/lib/motion-feedback";

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
  const displayCourts = courts.filter((c) => {
    const nameLower = (c.name || '').toLowerCase();
    return (
      !nameLower.includes('events place') &&
      !nameLower.includes('view deck') &&
      !nameLower.includes('banquet') &&
      !nameLower.includes('lounge') &&
      !nameLower.includes('3rd flr') &&
      !nameLower.includes('5th flr')
    );
  });

  const handleSelect = (court: Court) => {
    playHapticSound("tap");
    onSelectCourt(court);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5 text-[#FFD21C]" />
          <span>1. Select Court &amp; Surface Specification</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {displayCourts.map((court) => {
          const isSelected = selectedCourt.id === court.id;
          const isC1 = court.name.includes("1");
          return (
            <button
              key={court.id}
              type="button"
              onClick={() => handleSelect(court)}
              className={`p-5 rounded-2xl sm:rounded-3xl border text-left transition-all duration-200 relative flex flex-col justify-between cursor-pointer active:scale-[0.98] ${
                isSelected
                  ? "border-[#bf050b] bg-[#0B2A67] text-white shadow-xl ring-2 ring-[#bf050b] -translate-y-0.5"
                  : "border-[#E2E8F0] bg-white text-[#102A56] hover:border-[#bf050b]/40 hover:bg-[#F5F7FA] shadow-xs"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[#EDF4FC] text-[#0B2A67]"
                      }`}
                    >
                      {court.type}
                    </span>
                    {isC1 ? (
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isSelected
                            ? "bg-[#FFD21C] text-[#0B2A67]"
                            : "bg-[#007d48]/15 text-[#007d48]"
                        }`}
                      >
                        Cushioned Surface
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-[#FFD21C] text-[#0B2A67]"
                            : "bg-amber-500/15 text-amber-700"
                        }`}
                      >
                        Dual-Sport
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-base sm:text-lg mt-2.5 tracking-tight">
                    {court.name}
                  </h4>
                  <p
                    className={`text-xs mt-0.5 ${
                      isSelected ? "text-white/80" : "text-[#64748B]"
                    }`}
                  >
                    {isC1
                      ? "Indoor cushioned court with sports lighting"
                      : "Indoor pickleball court with basketball half-court"}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[#bf050b] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>

              <div
                className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-semibold ${
                  isSelected
                    ? "border-white/15 text-white/80"
                    : "border-[#E2E8F0] text-[#64748B]"
                }`}
              >
                <span>Standard Rate</span>
                <span
                  className={`font-black text-sm ${
                    isSelected ? "text-[#FFD21C]" : "text-[#0B2A67]"
                  }`}
                >
                  ₱{court.hourly_rate} / hr
                </span>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
}
