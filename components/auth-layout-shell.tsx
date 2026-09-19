"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Flame,
  Calendar,
  Coffee,
  ArrowLeft,
} from "lucide-react";

interface AuthLayoutShellProps {
  children: React.ReactNode;
  heroTagline?: string;
  heroHeadline?: string;
  heroDescription?: string;
}

export function AuthLayoutShell({
  children,
  heroTagline = "C&J Member Club & Arena Access",
  heroHeadline = "Your Court. Your Game. Your Pass.",
  heroDescription = "Sign in to access live court reservations, instant QR check-in passes, player history, and member discounts at the View Deck Cafe.",
}: AuthLayoutShellProps) {
  const memberPerks = [
    {
      icon: <Zap className="w-4 h-4 text-[#FFD21C]" />,
      title: "Instant Digital QR Pass",
      desc: "One-tap hardware check-in at the cashier or courtside turnstile.",
    },
    {
      icon: <Calendar className="w-4 h-4 text-[#FFD21C]" />,
      title: "Priority 2D Court Rebooking",
      desc: "Instant live slot reservation across Courts 1 & 2 with zero lag.",
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-[#00e676]" />,
      title: "24-Hour Refundable Guarantee",
      desc: "Full automated refund directly to your GCash, Maya, or Card.",
    },
    {
      icon: <Coffee className="w-4 h-4 text-[#FFD21C]" />,
      title: "View Deck Member Perks",
      desc: "Exclusive discounts on Italian espresso, meals, and gear rentals.",
    },
  ];

  return (
    <div className="flex-1 min-h-[calc(100vh-4.5rem)] flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-gradient-to-br from-[#071E4B] via-[#0B2A67] to-[#041230] relative overflow-hidden text-white font-sans">
      {/* Ambient Athletic Glow Orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#bf050b]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#FFD21C]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#123A82]/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container Card: Split 2-Column on Desktop */}
      <div className="relative z-10 w-full max-w-5xl rounded-3xl sm:rounded-[2rem] bg-white/95 backdrop-blur-xl shadow-2xl border border-white/20 overflow-hidden grid grid-cols-1 lg:grid-cols-12 text-[#102A56] my-4 sm:my-8 animate-in fade-in duration-300">
        
        {/* LEFT COLUMN: Athletic Arena Showcase (5 cols on lg) */}
        <div className="lg:col-span-5 relative bg-[#071E4B] text-white p-6 sm:p-10 flex flex-col justify-between overflow-hidden min-h-[380px] lg:min-h-[640px]">
          {/* Background Court Photo with Vignette */}
          <Image
            src="/service-court.jpg"
            alt="C&J Pickleball Arena Court"
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover object-center opacity-30 mix-blend-overlay pointer-events-none"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071E4B] via-[#071E4B]/85 to-transparent pointer-events-none" />

          {/* Top Header & Eyebrow */}
          <div className="relative z-10 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-[#FFD21C] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Arena Home</span>
            </Link>

            <div className="space-y-2 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#bf050b] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                <Flame className="w-3 h-3 fill-white text-white" />
                <span>{heroTagline}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                {heroHeadline}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
                {heroDescription}
              </p>
            </div>
          </div>

          {/* Center: Member Perks Strip */}
          <div className="relative z-10 py-6 space-y-3.5 border-y border-white/10 my-4">
            {memberPerks.map((perk, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  {perk.icon}
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block leading-snug">
                    {perk.title}
                  </span>
                  <span className="text-[11px] text-white/70 block leading-tight">
                    {perk.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom: Facility Status */}
          <div className="relative z-10 pt-2 flex items-center justify-end text-xs text-white/80">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00e676]/15 border border-[#00e676]/30 text-[10px] font-bold text-[#00e676]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
              <span>Courts Open</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Form Content (7 cols on lg) */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto">
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
