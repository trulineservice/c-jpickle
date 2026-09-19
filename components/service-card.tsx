"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const ViewDeckMenuModal = dynamic(
  () => import("@/components/viewdeck-menu-modal").then((mod) => mod.ViewDeckMenuModal),
  { ssr: false }
);
const EventInquiryModal = dynamic(
  () => import("@/components/event-inquiry-modal").then((mod) => mod.EventInquiryModal),
  { ssr: false }
);
const ReserveCourtModal = dynamic(
  () => import("@/components/reserve-court-modal").then((mod) => mod.ReserveCourtModal),
  { ssr: false }
);

export interface ServiceCardProps {
  id: "viewdeck" | "events" | "court";
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  ctaText: string;
  isLoggedIn?: boolean;
}

export function ServiceCard({
  id,
  title,
  description,
  image,
  icon,
  ctaText,
  isLoggedIn = false,
}: ServiceCardProps) {
  return (
    <div className="group relative flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] shadow-sm hover:shadow-xl hover:border-[#0B2A67]/30 transition-all duration-300 overflow-hidden">
      {/* Top Image Container with aspect ratio */}
      <div className="relative w-full aspect-[16/10] bg-[#F5F7FA] overflow-hidden">
        <Image
          src={image}
          alt={`${title} at C&J's Events Place Rentals`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
          className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        {/* Subtle gradient vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
      </div>

      {/* Floating Circular Yellow Icon Badge overlapping boundary */}
      <div className="relative px-6 -mt-7 z-10">
        <div className="w-14 h-14 rounded-full bg-[#FFD21C] text-[#0B2A67] shadow-md border-4 border-white flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6 pt-3 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-[#0B2A67] tracking-tight group-hover:text-[#123A82] transition-colors">
            {title}
          </h3>
          <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
            {description}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {id === "viewdeck" ? (
            <ViewDeckMenuModal
              triggerClassName="w-full h-11 text-sm font-bold shadow-sm"
              buttonText={ctaText}
            />
          ) : id === "events" ? (
            <EventInquiryModal
              triggerClassName="w-full h-11 text-sm font-bold shadow-sm"
              triggerVariant="yellow"
              buttonText={ctaText}
            />
          ) : (
            <ReserveCourtModal
              isLoggedIn={isLoggedIn}
              buttonText="Book Now"
              triggerSize="default"
              triggerVariant="yellow"
              triggerClassName="w-full h-11 text-sm font-bold shadow-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
