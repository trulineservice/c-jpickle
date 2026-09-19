"use client";

import React, { useState } from "react";
import { Info, ArrowRight, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PickleballCourtVisualizerProps {
  interactive?: boolean;
  selectedCourtName?: string;
}

export function PickleballCourtVisualizer({ 
  interactive = true, 
  selectedCourtName = "Court 1 — Indoor (Pro Cushion)" 
}: PickleballCourtVisualizerProps) {
  const [activeZone, setActiveZone] = useState<string>("kitchen");

  const zones: Record<string, {
    label: string;
    title: string;
    dims: string;
    desc: string;
    rules: string;
    tactics: string;
  }> = {
    kitchen: {
      label: "The Kitchen (NVZ)",
      title: "Non-Volley Zone (The Kitchen)",
      dims: "7' × 20' (Both sides of Net)",
      desc: "The defining tactical zone of pickleball. Players may not hit a ball out of the air while standing in or touching the kitchen line.",
      rules: "A volley is any ball hit before bouncing. Even momentum stepping on the kitchen line after completing a volley is a fault.",
      tactics: "Neutralize power hitters by dropping soft dinks low into the kitchen. Force them to lift the ball for your overhead put-away."
    },
    service_right: {
      label: "Right Service Court",
      title: "Right Service Court (Even / Server 1)",
      dims: "10' × 15' Playing Box",
      desc: "Starting station for every new match at 0-0-2. Used when the serving team's score is an even number (0, 2, 4, 6, 8, 10).",
      rules: "Serves must clear the 7-foot kitchen line and land diagonally into this court before being returned.",
      tactics: "Drive a deep slice serve into the opponent's backhand corner to pin them deep, giving you time to advance."
    },
    service_left: {
      label: "Left Service Court",
      title: "Left Service Court (Odd)",
      dims: "10' × 15' Playing Box",
      desc: "Active service box when the serving team's score is an odd number (1, 3, 5, 7, 9).",
      rules: "Receivers must let the serve bounce once, and servers must let the return bounce once (Two-Bounce Rule).",
      tactics: "Aim sharp crosscourt angles that pull the receiver off their court boundary."
    },
    net: {
      label: "Regulation Net",
      title: "Regulation Center Net",
      dims: "36\" Posts • 34\" Center Strap",
      desc: "Standard regulation tensioned net with durable white headband and adjustable center strap.",
      rules: "A ball hitting the net cord and landing in the correct service box is in play (no lets in pickleball).",
      tactics: "Clear the net by only 2 to 4 inches on non-attackable dinks to eliminate counter-attack angles."
    },
    baseline: {
      label: "Baseline & Cushion",
      title: "Baseline & Cushioned Floor",
      dims: "22' from Net • Cushioned Surface",
      desc: "Rear boundary of play equipped with shock-absorbing sports flooring to reduce joint impact during baseline rallies.",
      rules: "Balls landing on the outer edge of any perimeter line are considered 100% IN.",
      tactics: "Deploy the 'Third Shot Drop' from here — a gentle arc landing softly into the opponent's kitchen."
    }
  };

  const current = zones[activeZone] || zones.kitchen;

  return (
    <div className="w-full bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm text-[#102A56]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#E2E8F0] pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#FFD21C]" />
            <span>Court Dimensions</span>
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B2A67]">
            Standard 20&apos; × 44&apos; Court Layout
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 bg-[#EDF4FC] text-[#0B2A67] rounded-full border border-[#E2E8F0]">
            {selectedCourtName}
          </span>
        </div>
      </div>

      {/* Zone Switcher Chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(zones).map(([key, zone]) => {
          const isActive = activeZone === key;
          return (
            <button
              key={key}
              onClick={() => setActiveZone(key)}
              className={`h-8 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#0B2A67] text-white shadow-xs"
                  : "bg-[#EDF4FC] text-[#0B2A67] border border-[#E2E8F0] hover:bg-white"
              }`}
            >
              {zone.label}
            </button>
          );
        })}
      </div>

      {/* Technical Blueprint SVG */}
      <div className="relative w-full max-w-2xl mx-auto bg-[#F5F7FA] rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 shadow-inner">
        <svg
          viewBox="0 0 600 300"
          className="w-full h-auto select-none overflow-visible"
        >
          {/* Out-of-bounds safety apron */}
          <rect
            x="10"
            y="10"
            width="580"
            height="280"
            rx="8"
            className="fill-[#EDF4FC] stroke-[#E2E8F0]"
            strokeWidth="1"
          />

          {/* Main 20' x 44' Perimeter */}
          <rect
            x="40"
            y="30"
            width="520"
            height="240"
            className="fill-white stroke-[#0B2A67]"
            strokeWidth="2.5"
          />

          {/* Left Service Courts */}
          <rect
            x="40"
            y="30"
            width="175"
            height="120"
            fill={activeZone === "service_left" ? "#FFD21C" : "#123A82"}
            fillOpacity={activeZone === "service_left" ? 0.4 : 0.1}
            className="stroke-[#0B2A67] cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_left")}
          />
          <rect
            x="40"
            y="150"
            width="175"
            height="120"
            fill={activeZone === "service_right" ? "#FFD21C" : "#123A82"}
            fillOpacity={activeZone === "service_right" ? 0.4 : 0.1}
            className="stroke-[#0B2A67] cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_right")}
          />

          {/* Left Kitchen NVZ (7ft) */}
          <rect
            x="215"
            y="30"
            width="85"
            height="240"
            fill={activeZone === "kitchen" ? "#FFD21C" : "#007d48"}
            fillOpacity={activeZone === "kitchen" ? 0.45 : 0.18}
            className="stroke-[#0B2A67] cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("kitchen")}
          />

          {/* Right Kitchen NVZ (7ft) */}
          <rect
            x="300"
            y="30"
            width="85"
            height="240"
            fill={activeZone === "kitchen" ? "#FFD21C" : "#007d48"}
            fillOpacity={activeZone === "kitchen" ? 0.45 : 0.18}
            className="stroke-[#0B2A67] cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("kitchen")}
          />

          {/* Right Service Courts */}
          <rect
            x="385"
            y="30"
            width="175"
            height="120"
            fill={activeZone === "service_right" ? "#FFD21C" : "#123A82"}
            fillOpacity={activeZone === "service_right" ? 0.4 : 0.1}
            className="stroke-[#0B2A67] cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_right")}
          />
          <rect
            x="385"
            y="150"
            width="175"
            height="120"
            fill={activeZone === "service_left" ? "#FFD21C" : "#123A82"}
            fillOpacity={activeZone === "service_left" ? 0.4 : 0.1}
            className="stroke-[#0B2A67] cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_left")}
          />

          {/* Center Net (34" Center / 36" Posts) */}
          <line
            x1="300"
            y1="22"
            x2="300"
            y2="278"
            className="stroke-[#0B2A67]"
            strokeWidth="4"
          />
          <circle cx="300" cy="22" r="5" className="fill-[#0B2A67]" />
          <circle cx="300" cy="278" r="5" className="fill-[#0B2A67]" />

          {/* Labels */}
          <text x="257" y="155" textAnchor="middle" className="text-[10px] font-bold fill-[#0B2A67]">
            KITCHEN
          </text>
          <text x="343" y="155" textAnchor="middle" className="text-[10px] font-bold fill-[#0B2A67]">
            NVZ (7&apos;)
          </text>
        </svg>
      </div>

      {/* Tactical Breakdown Box */}
      <div className="p-4 rounded-xl bg-[#EDF4FC] border border-[#E2E8F0] space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-[#0B2A67]">
            {current.title}
          </h4>
          <span className="text-[11px] font-bold text-[#64748B] bg-white px-2.5 py-0.5 rounded-full border border-[#E2E8F0]">
            {current.dims}
          </span>
        </div>
        <p className="text-xs text-[#64748B] leading-relaxed">
          {current.desc}
        </p>
        <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="font-bold text-[#0B2A67] block">Pickleball Rule:</span>
            <span className="text-[#64748B]">{current.rules}</span>
          </div>
          <div>
            <span className="font-bold text-[#0B2A67] block">Coach Tactic:</span>
            <span className="text-[#64748B]">{current.tactics}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
