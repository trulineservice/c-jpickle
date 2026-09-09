"use client";

import React, { useState } from "react";
import { Info, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PickleballCourtVisualizerProps {
  interactive?: boolean;
  selectedCourtName?: string;
}

export function PickleballCourtVisualizer({ 
  interactive = true, 
  selectedCourtName = "Court 1 - Indoor (Pro Cushion)" 
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
      label: "Championship Net",
      title: "Tournament Center Net",
      dims: "36\" Posts • 34\" Center Strap",
      desc: "Official USAP tensioned steel mesh net with heavy-duty PVC white headband and adjustable center tension strap.",
      rules: "A ball hitting the net cord and landing in the correct service box is in play (no lets in pickleball).",
      tactics: "Clear the net by only 2 to 4 inches on non-attackable dinks to eliminate counter-attack angles."
    },
    baseline: {
      label: "Baseline & Cushion",
      title: "Baseline & 8mm Cushioned Floor",
      dims: "22' from Net • Multi-Layer Cushion",
      desc: "Rear boundary of play equipped with tournament-spec 8mm polyurethane shock absorption to preserve knees during rapid baseline sprints.",
      rules: "Balls landing on the outer edge of any perimeter line are considered 100% IN.",
      tactics: "Deploy the 'Third Shot Drop' from here — a gentle arc landing softly into the opponent's kitchen."
    }
  };

  const current = zones[activeZone] || zones.kitchen;

  return (
    <div className="w-full bg-[#f5f5f5] dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] rounded-none p-6 sm:p-10 space-y-8 font-sans text-[#111111] dark:text-foreground">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-[#cacacb] dark:border-[#27272a] pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93] block mb-1">
            Technical Blueprint
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-foreground">
            Official 20&apos; × 44&apos; USAP Court Architecture
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 bg-white dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] rounded-full text-[#111111] dark:text-foreground">
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
              className={`h-9 px-4 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111]"
                  : "bg-white dark:bg-[#18181c] text-[#111111] dark:text-foreground border border-[#cacacb] dark:border-[#27272a] hover:border-[#111111] dark:hover:border-white"
              }`}
            >
              {zone.label}
            </button>
          );
        })}
      </div>

      {/* Technical Blueprint SVG */}
      <div className="relative w-full max-w-3xl mx-auto bg-white dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] p-4 sm:p-8">
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
            className="fill-[#f5f5f5] dark:fill-[#121215] stroke-[#cacacb] dark:stroke-[#27272a]"
            strokeWidth="1"
          />

          {/* Main 20' x 44' Perimeter */}
          <rect
            x="40"
            y="30"
            width="520"
            height="240"
            className="fill-white dark:fill-[#1a1a20] stroke-[#111111] dark:stroke-white"
            strokeWidth="2.5"
          />

          {/* Left Service Courts */}
          {/* Left Odd (top) */}
          <rect
            x="40"
            y="30"
            width="175"
            height="120"
            fill={activeZone === "service_left" ? "#111111" : "#ffffff"}
            fillOpacity={activeZone === "service_left" ? 0.25 : 0.05}
            className="stroke-[#111111] dark:stroke-white/80 cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_left")}
          />
          {/* Left Even (bottom) */}
          <rect
            x="40"
            y="150"
            width="175"
            height="120"
            fill={activeZone === "service_right" ? "#111111" : "#ffffff"}
            fillOpacity={activeZone === "service_right" ? 0.25 : 0.05}
            className="stroke-[#111111] dark:stroke-white/80 cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_right")}
          />

          {/* Left Kitchen NVZ (7ft) */}
          <rect
            x="215"
            y="30"
            width="85"
            height="240"
            fill={activeZone === "kitchen" ? "#111111" : "#007d48"}
            fillOpacity={activeZone === "kitchen" ? 0.35 : 0.12}
            className="stroke-[#111111] dark:stroke-white/80 cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("kitchen")}
          />

          {/* Right Kitchen NVZ (7ft) */}
          <rect
            x="300"
            y="30"
            width="85"
            height="240"
            fill={activeZone === "kitchen" ? "#111111" : "#007d48"}
            fillOpacity={activeZone === "kitchen" ? 0.35 : 0.12}
            className="stroke-[#111111] dark:stroke-white/80 cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("kitchen")}
          />

          {/* Right Service Courts */}
          {/* Right Even (top) */}
          <rect
            x="385"
            y="30"
            width="175"
            height="120"
            fill={activeZone === "service_right" ? "#111111" : "#ffffff"}
            fillOpacity={activeZone === "service_right" ? 0.25 : 0.05}
            className="stroke-[#111111] dark:stroke-white/80 cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_right")}
          />
          {/* Right Odd (bottom) */}
          <rect
            x="385"
            y="150"
            width="175"
            height="120"
            fill={activeZone === "service_left" ? "#111111" : "#ffffff"}
            fillOpacity={activeZone === "service_left" ? 0.25 : 0.05}
            className="stroke-[#111111] dark:stroke-white/80 cursor-pointer transition-colors"
            strokeWidth="1.5"
            onClick={() => setActiveZone("service_left")}
          />

          {/* Center Net (300) */}
          <line
            x1="300"
            y1="22"
            x2="300"
            y2="278"
            stroke={activeZone === "net" ? "#d30005" : "currentColor"}
            strokeWidth={activeZone === "net" ? 4 : 2.5}
            strokeDasharray="4 2"
            className="text-[#111111] dark:text-white cursor-pointer"
            onClick={() => setActiveZone("net")}
          />
          {/* Net Posts */}
          <circle cx="300" cy="22" r="4" className="fill-[#111111] dark:fill-white" />
          <circle cx="300" cy="278" r="4" className="fill-[#111111] dark:fill-white" />

          {/* Architectural Dimension Callouts */}
          <text x="300" y="150" textAnchor="middle" fill="#707072" fontSize="10" fontWeight="600">
            NET (34&quot; CENTER)
          </text>
          <text x="257" y="150" textAnchor="middle" className="fill-[#111111] dark:fill-white font-bold" fontSize="10">
            7&apos; NVZ
          </text>
          <text x="342" y="150" textAnchor="middle" className="fill-[#111111] dark:fill-white font-bold" fontSize="10">
            7&apos; NVZ
          </text>
          <text x="127" y="90" textAnchor="middle" fill="#707072" fontSize="10" fontWeight="500">
            LEFT (ODD) 10&apos; × 15&apos;
          </text>
          <text x="127" y="210" textAnchor="middle" fill="#707072" fontSize="10" fontWeight="500">
            RIGHT (EVEN) 10&apos; × 15&apos;
          </text>
          <text x="472" y="90" textAnchor="middle" fill="#707072" fontSize="10" fontWeight="500">
            RIGHT (EVEN) 10&apos; × 15&apos;
          </text>
          <text x="472" y="210" textAnchor="middle" fill="#707072" fontSize="10" fontWeight="500">
            LEFT (ODD) 10&apos; × 15&apos;
          </text>

          {/* Outer Dimension Lines */}
          <line x1="40" y1="288" x2="560" y2="288" className="stroke-[#cacacb] dark:stroke-[#27272a]" strokeWidth="1" />
          <text x="300" y="297" textAnchor="middle" fill="#707072" fontSize="9" fontWeight="600">
            44 FEET OVERALL
          </text>
        </svg>
      </div>

      {/* Zone Detail Panel */}
      <div className="bg-white dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] dark:border-[#27272a] pb-4">
          <div>
            <h4 className="text-xl font-bold tracking-tight text-[#111111] dark:text-foreground">
              {current.title}
            </h4>
            <span className="text-xs text-[#707072] dark:text-[#8a8a93] font-semibold tracking-wide">
              {current.dims}
            </span>
          </div>
          <Link href="/book">
            <Button size="sm" className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-[#ededed] cursor-pointer">
              Book Court (₱300/hr)
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-sm">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground block mb-1">
              Function
            </span>
            <p className="text-[#707072] dark:text-[#8a8a93] leading-relaxed">
              {current.desc}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground block mb-1">
              USAP Rule
            </span>
            <p className="text-[#707072] dark:text-[#8a8a93] leading-relaxed">
              {current.rules}
            </p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground block mb-1">
              Pro Tactic
            </span>
            <p className="text-[#707072] dark:text-[#8a8a93] leading-relaxed">
              {current.tactics}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
