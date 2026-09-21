"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  X,
  Phone,
  Calendar,
  Users,
  Sparkles,
  CheckCircle2,
  Wind,
  Volume2,
  Layers,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
export type CateringTierId = "none" | "corkage" | "bronze" | "silver" | "gold";

export function computeEventEstimate(params: {
  guestCount: number;
  durationHours: number;
  includeAc?: boolean;
  includeAvLighting?: boolean;
  includeStageTruss?: boolean;
  cateringTier: CateringTierId;
}): {
  hallBaseCost: number;
  acCost: number;
  avLightingCost: number;
  stageTrussCost: number;
  cateringCost: number;
  grandTotal: number;
  depositRequired: number;
  costPerGuest: number;
} {
  const safeHours = Math.max(4, params.durationHours);
  const hallBaseCost = 30000 + (safeHours > 4 ? (safeHours - 4) * 5000 : 0);
  const acCost = 0;
  const avLightingCost = params.includeAvLighting ? 4500 : 0;
  const stageTrussCost = params.includeStageTruss ? 2500 : 0;

  let cateringCost = 0;
  if (params.cateringTier === "corkage") cateringCost = 3500;
  else if (params.cateringTier === "bronze") cateringCost = params.guestCount * 450;
  else if (params.cateringTier === "silver") cateringCost = params.guestCount * 650;
  else if (params.cateringTier === "gold") cateringCost = params.guestCount * 850;

  const grandTotal = hallBaseCost + acCost + avLightingCost + stageTrussCost + cateringCost;
  const depositRequired = Math.round(grandTotal * 0.5);
  const costPerGuest = Math.round(grandTotal / Math.max(1, params.guestCount));

  return {
    hallBaseCost,
    acCost,
    avLightingCost,
    stageTrussCost,
    cateringCost,
    grandTotal,
    depositRequired,
    costPerGuest,
  };
}
import { AnimatedNumber } from "@/components/ui/animated-number";
import { playHapticSound, formatPHPhone, validatePHPhone } from "@/lib/motion-feedback";

interface EventInquiryModalProps {
  triggerClassName?: string;
  triggerVariant?: "yellow" | "navy" | "navy-outline" | "default" | "outline" | "red";
  buttonText?: string;
}

export function EventInquiryModal({
  triggerClassName = "w-full",
  triggerVariant = "yellow",
  buttonText = "Book an Event →",
}: EventInquiryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Estimator State (Official Rate: ₱30,000 for 4-Hour Venue Rental)
  const [guestCount, setGuestCount] = useState<number>(120);
  const [durationHours, setDurationHours] = useState<number>(4);
  const [includeAc, setIncludeAc] = useState<boolean>(true);
  const [includeAvLighting, setIncludeAvLighting] = useState<boolean>(false);
  const [includeStageTruss, setIncludeStageTruss] = useState<boolean>(false);
  const [cateringTier, setCateringTier] = useState<CateringTierId>("silver");

  // Contact Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [eventType, setEventType] = useState("Birthday Party");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "";
      setSubmitted(false);
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const estimate = computeEventEstimate({
    guestCount,
    durationHours,
    includeAc,
    includeAvLighting,
    includeStageTruss,
    cateringTier,
  });

  const handlePhoneChange = (val: string) => {
    setPhone(formatPHPhone(val));
    if (formError) setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Please provide your name.");
      return;
    }
    if (!validatePHPhone(phone)) {
      setFormError("Please enter a valid 11-digit Philippine mobile number (09XXXXXXXXX).");
      return;
    }
    playHapticSound("success");
    setSubmitted(true);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    playHapticSound("tap");
    setIsOpen(true);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#071E4B]/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E2E8F0] p-5 sm:p-8 z-10 text-[#102A56] max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-[#64748B] hover:text-[#0B2A67] hover:bg-[#F5F7FA] transition-colors cursor-pointer"
          aria-label="Close event booking modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pb-5 border-b border-[#E2E8F0]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-[#bf050b]" />
            <span>C&amp;J&apos;s Events Place &amp; Court Rental</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B2A67] tracking-tight">
            Celebrate Life&apos;s Special Milestones
          </h3>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-xl mx-auto">
            Official Rate: <strong>₱30,000 for 4-Hour Venue Rental</strong>. 500-sqm fully air-conditioned venue for up to 180 guests in Taytay, Rizal with 3rd floor elevator access and 15 indoor parking slots.
          </p>
        </div>

        {/* High-res Venue Photo Banner */}
        <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden my-4 border border-[#E2E8F0] shadow-sm">
          <Image
            src="/service-events.jpg"
            alt="C&J Events Place Banquet Hall"
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071E4B]/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white text-xs">
            <span className="font-bold drop-shadow-md">
              500 sqm • 180 Pax Max • 3rd Flr Elevator • 15 Indoor Parking
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#bf050b] font-bold text-[10px] uppercase">
              Taytay, Rizal Venue
            </span>
          </div>
        </div>

        {submitted ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 bg-[#EDF4FC] text-[#0B2A67] rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-[#007d48]" />
            </div>
            <h4 className="text-2xl font-black text-[#0B2A67]">Inquiry &amp; Estimate Received!</h4>
            <p className="text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
              Thank you, <strong>{name}</strong>! Our event coordinator has received your package configuration for <strong>{guestCount} guests</strong> (Est. ₱{estimate.grandTotal.toLocaleString()}). We will contact you at <strong>{phone}</strong> within 24 hours to schedule a venue ocular.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="tel:09171230382"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0B2A67] text-white font-bold text-xs hover:bg-[#123A82] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#FFD21C]" />
                <span>Call Coordinator: 0917-123-0382</span>
              </a>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="text-xs rounded-full px-5 cursor-pointer"
              >
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* 2-Column Interactive Estimator + Form */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Package Configuration Options (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Guest Count Selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-extrabold text-[#0B2A67] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#bf050b]" />
                      <span>Guest Count</span>
                    </label>
                    <span className="font-black text-[#0B2A67] text-sm">{guestCount} Guests (Max 180)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 80, 120, 180].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          playHapticSound("tap");
                          setGuestCount(count);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          guestCount === count
                            ? "bg-[#0B2A67] text-white shadow-xs"
                            : "bg-[#F5F7FA] text-[#64748B] hover:bg-[#EDF4FC]"
                        }`}
                      >
                        {count} pax
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Hours */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-extrabold text-[#0B2A67] uppercase tracking-wider">
                      Duration (Hours)
                    </label>
                    <span className="font-bold text-[#64748B]">
                      {durationHours} Hours (₱{estimate.hallBaseCost.toLocaleString()})
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[4, 5, 6, 8].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => {
                          playHapticSound("tap");
                          setDurationHours(hrs);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          durationHours === hrs
                            ? "bg-[#0B2A67] text-white shadow-xs"
                            : "bg-[#F5F7FA] text-[#64748B] hover:bg-[#EDF4FC]"
                        }`}
                      >
                        {hrs} hrs {hrs === 4 ? "(₱30K Base)" : `(+₱${((hrs - 4) * 5000).toLocaleString()})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Facilities & Technical Add-ons */}
                <div className="space-y-2.5">
                  <label className="font-extrabold text-xs text-[#0B2A67] uppercase tracking-wider block">
                    Venue Amenities &amp; Technical Add-ons
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-[#007d48]/30 bg-[#007d48]/5 text-xs">
                      <div>
                        <span className="font-bold text-[#0B2A67] block">
                          Full A/C, Dressing Rooms, Elevator &amp; 15 Parking Slots
                        </span>
                        <span className="text-[11px] text-[#64748B]">
                          500-sqm venue with basic lights &amp; sound, 3rd floor elevator access &amp; 24/7 parking
                        </span>
                      </div>
                      <span className="font-bold text-[#007d48] shrink-0">Included (₱0)</span>
                    </div>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] cursor-pointer hover:bg-white transition-all text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeAvLighting}
                          onChange={(e) => setIncludeAvLighting(e.target.checked)}
                          className="rounded border-[#E2E8F0] text-[#0B2A67] focus:ring-[#FFD21C]"
                        />
                        <div>
                          <span className="font-bold text-[#0B2A67]">Pro Moving Head Beam Lights &amp; Fog Machine</span>
                          <span className="text-[11px] text-[#64748B]">Intelligent stage effects (Basic lights &amp; sound already included)</span>
                        </div>
                      </div>
                      <span className="font-bold text-[#0B2A67]">₱4,500</span>
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] cursor-pointer hover:bg-white transition-all text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={includeStageTruss}
                          onChange={(e) => setIncludeStageTruss(e.target.checked)}
                          className="rounded border-[#E2E8F0] text-[#0B2A67] focus:ring-[#FFD21C]"
                        />
                        <div>
                          <span className="font-bold text-[#0B2A67]">Elevated Stage Truss &amp; Backdrop Rig</span>
                          <span className="text-[11px] text-[#64748B]">Heavy-duty aluminum truss for tarpaulins &amp; banners</span>
                        </div>
                      </div>
                      <span className="font-bold text-[#0B2A67]">₱2,500</span>
                    </label>
                  </div>
                </div>

                {/* Catering Tier Selector */}
                <div className="space-y-2">
                  <label className="font-extrabold text-xs text-[#0B2A67] uppercase tracking-wider block">
                    Catering &amp; Buffet Package
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "none", label: "No Catering", sub: "Bring Own / ₱0" },
                      { id: "corkage", label: "Corkage Only", sub: "Flat ₱3,500" },
                      { id: "bronze", label: "Bronze Buffet", sub: "₱450 / pax" },
                      { id: "silver", label: "Silver Deluxe", sub: "₱650 / pax" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          playHapticSound("tap");
                          setCateringTier(c.id as CateringTierId);
                        }}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                          cateringTier === c.id
                            ? "border-[#0B2A67] bg-[#EDF4FC] text-[#0B2A67] shadow-xs"
                            : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#0B2A67]/30"
                        }`}
                      >
                        <span className="font-bold text-xs block text-[#0B2A67]">{c.label}</span>
                        <span className="text-[10px] text-[#64748B]">{c.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Budget Summary & Contact Form (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Live Budget Breakdown Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#0B2A67] text-white space-y-3 shadow-md">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#FFD21C]">
                      Estimated Budget
                    </span>
                    <span className="text-[11px] text-white/80">
                      ₱{Math.round(estimate.costPerGuest)} / pax
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-white/80">
                    <div className="flex justify-between">
                      <span>Venue Rental ({durationHours} hrs):</span>
                      <span className="font-mono text-white">₱{estimate.hallBaseCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#FFD21C]/90">
                      <span>Central A/C &amp; Elevator:</span>
                      <span className="font-mono">Included</span>
                    </div>
                    <div className="flex justify-between text-[#FFD21C]/90">
                      <span>Basic Audio &amp; 15 Parking Slots:</span>
                      <span className="font-mono">Included</span>
                    </div>
                    {includeAvLighting && (
                      <div className="flex justify-between">
                        <span>Pro Beam Lights &amp; Fog:</span>
                        <span className="font-mono text-white">₱{estimate.avLightingCost.toLocaleString()}</span>
                      </div>
                    )}
                    {includeStageTruss && (
                      <div className="flex justify-between">
                        <span>Stage &amp; Backdrop Truss:</span>
                        <span className="font-mono text-white">₱{estimate.stageTrussCost.toLocaleString()}</span>
                      </div>
                    )}
                    {estimate.cateringCost > 0 && (
                      <div className="flex justify-between">
                        <span>Catering ({cateringTier}):</span>
                        <span className="font-mono text-[#FFD21C]">₱{estimate.cateringCost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/15 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-white uppercase">Grand Total</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#FFD21C] flex items-center justify-end">
                        <AnimatedNumber value={estimate.grandTotal} />
                      </div>
                      <span className="text-[10px] text-white/70 block">
                        Est. 50% Date Lock Deposit: ₱{Math.round(estimate.depositRequired).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Form */}
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  {formError && (
                    <div className="p-2.5 rounded-lg bg-[#bf050b]/10 border border-[#bf050b]/30 text-[#bf050b] text-[11px] font-bold">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-[#0B2A67] mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maria Santos"
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] text-[#102A56] focus:border-[#0B2A67] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#0B2A67] mb-1">Philippine Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="0917-XXX-XXXX"
                      className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] text-[#102A56] focus:border-[#0B2A67] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-[#0B2A67] mb-1">Preferred Date</label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] text-[#102A56] focus:border-[#0B2A67] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#0B2A67] mb-1">Event Type</label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] text-[#102A56] focus:border-[#0B2A67] focus:bg-white focus:outline-none"
                      >
                        <option value="Birthday Party">Birthday Party</option>
                        <option value="Wedding / Reception">Wedding / Reception</option>
                        <option value="Reunion">Family Reunion</option>
                        <option value="Corporate Event">Corporate Event</option>
                        <option value="Sports Tournament">Sports Tournament</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="yellow"
                    className="w-full h-11 text-xs font-black shadow-md rounded-full mt-2 cursor-pointer active:scale-[0.98]"
                  >
                    Submit Inquiry &amp; Lock Estimate
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Button
        variant={triggerVariant}
        onClick={handleOpen}
        className={triggerClassName}
      >
        <span>{buttonText}</span>
      </Button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
