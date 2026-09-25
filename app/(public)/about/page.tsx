import Image from "next/image";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Utensils,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  Star,
  Users,
  CheckCircle2,
  ArrowRight,
  Flame,
  Sparkles,
  Building,
  Car,
  Wind,
  Volume2,
  Layers,
  HeartHandshake,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReserveCourtModal } from "@/components/reserve-court-modal";
import { EventInquiryModal } from "@/components/event-inquiry-modal";
import { ViewDeckMenuModal } from "@/components/viewdeck-menu-modal";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "About Us | C&J's Events Place & Court Rental",
  description:
    "Discover C&J's Events Place & Court Rental in Taytay, Rizal. Built around Good Food, Great Events, and Active Lifestyle with indoor cushioned courts, a 180-pax banquet hall, and 5th-floor view deck.",
};

export default async function AboutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const milestones = [
    {
      year: "Pillar 1",
      title: "Active Sports Lifestyle",
      desc: "Two indoor courts featuring cushioned flooring, sports lighting, and a fixed ₱350/hr flat rate.",
      icon: <Trophy className="w-5 h-5 text-[#FFD21C]" />,
      badge: "Ground Sports Level",
    },
    {
      year: "Pillar 2",
      title: "Memorable Celebrations",
      desc: "A 500-sqm fully air-conditioned banquet hall on the 3rd floor accommodating up to 180 guests with basic lights & sound, elevator access, and 15 indoor parking slots.",
      icon: <Calendar className="w-5 h-5 text-[#bf050b]" />,
      badge: "3rd Floor Level",
    },
    {
      year: "Pillar 3",
      title: "Elevated Dining & City Lights",
      desc: "A 150-sqm 5th-floor private lounge overlooking Metro Manila city lights and the courts, featuring a full cafe menu, drinks, and a 100% consumable rental rate.",
      icon: <Utensils className="w-5 h-5 text-[#FFD21C]" />,
      badge: "5th Floor Level",
    },
  ];

  const venuePillars = [
    {
      floor: "Ground Floor & Mezzanine",
      name: "Pickleball & Multi-Sport Arena",
      tagline: "Quality courts, zero surge fees",
      rate: "₱350 / hour",
      rateSub: "Fixed Flat Rate",
      specs: [
        "Court 1: Indoor Cushioned Court (20' × 44')",
        "Court 2: Multi-Sport Court (Pickleball & Basketball Half-Court)",
        "Cushioned shock-absorbing sports flooring",
        "Paddle rentals (₱150) & practice ball machine (₱150)",
        "Open daily from 6:00 AM to 12:00 AM",
        "2-day refundable cancellation & flexible reschedule policy",
      ],
      hotline: "0917-318-8720",
      hotlineLabel: "Court Inquiries",
      image: "/service-court.jpg",
      badgeColor: "bg-[#0B2A67]",
    },
    {
      floor: "3rd Floor Level",
      name: "C&J's Events Place & Banquet Hall",
      tagline: "Grand celebrations, weddings & corporate galas",
      rate: "₱30,000",
      rateSub: "4-Hour Venue Rental (+₱5,000/addtl hr)",
      specs: [
        "500-sqm spacious hall with 180 pax guest capacity",
        "Centralized air-conditioning for complete comfort",
        "Basic lights & sound system included in base rate",
        "Free access to Dressing Rooms and Wash Area",
        "Dedicated 3rd-floor elevator access for all guests",
        "Indoor car parking for 15 vehicles with 24/7 security",
      ],
      hotline: "0917-123-0382",
      hotlineLabel: "Events Hotline",
      image: "/service-events.jpg",
      badgeColor: "bg-[#bf050b]",
    },
    {
      floor: "5th Floor Level",
      name: "View Deck Food, Cafe & Private Lounge",
      tagline: "Panoramic city views and cafe lounge",
      rate: "₱4,000",
      rateSub: "2 Hours (100% Consumable, +₱2,500/hr)",
      specs: [
        "150-sqm private venue with 25 pax guest capacity",
        "Dedicated elevator access overlooking Metro Manila city lights",
        "100% consumable on food and beverage items",
        "Fully air-conditioned with basic sound system included",
        "Indoor car parking for 15 vehicles with 24/7 security",
        "Additional tables and chairs available for rent",
      ],
      hotline: "0976-662-3453",
      hotlineLabel: "View Deck & Cafe Hotline",
      image: "/service-viewdeck.jpg",
      badgeColor: "bg-[#007d48]",
    },
  ];

  const values = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#007d48]" />,
      title: "Player Comfort & Safety",
      desc: "We feature cushioned sports flooring rather than bare concrete, reducing impact on knees and ankles for players of all ages.",
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-[#FFD21C]" />,
      title: "Transparent, Upfront Pricing",
      desc: "Zero surge pricing, zero hidden service fees. Flat ₱350/hr courts and 100% consumable rates on our 5th-floor lounge so your budget goes straight to great food and match play.",
    },
    {
      icon: <HeartHandshake className="w-6 h-6 text-[#bf050b]" />,
      title: "Fair Cancellation & Reschedule",
      desc: "We respect your schedule. Any court cancellation made at least 2 days prior to match time receives a 100% full refund. Within 2 days, you can easily reschedule to another session.",
    },
    {
      icon: <Users className="w-6 h-6 text-[#0B2A67]" />,
      title: "Family & Community-First",
      desc: "From youth clinics and competitive squad tournaments to milestone 180-pax birthdays, C&J is designed as a welcoming home for Rizal’s active community.",
    },
  ];

  return (
    <div className="flex-1 flex flex-col font-sans bg-[#F5F7FA] text-[#102A56]">
      {/* ========================================================
          1. HERO HEADER SECTION — Deep Navy Atmospheric Banner
          ======================================================== */}
      <section className="relative w-full bg-[#0B2A67] text-white py-16 sm:py-24 overflow-hidden border-b border-[#071E4B]">
        {/* Ambient backdrop glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#bf050b]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-[#FFD21C]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10">
          <div className="max-w-3xl space-y-6">
            {/* Brand Eyebrow */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-1 bg-[#bf050b] rounded-full" />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#FFD21C]">
                Our Story &amp; Facility Profile
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#bf050b] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <Flame className="w-3 h-3 fill-current" />
                Taytay, Rizal
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold uppercase tracking-tight text-white leading-[1.05]">
              Good Food. <br />
              Great Events. <br />
              <span className="text-[#FFD21C]">Active Lifestyle.</span>
            </h1>

            <p className="text-base sm:text-lg text-white/80 leading-relaxed font-normal">
              C&amp;J&apos;s Events Place &amp; Court Rental is Taytay&apos;s premier multi-level sports and celebrations destination. Located at <strong>25 Bologna St., Muzon, Taytay, Rizal</strong>, we unite indoor cushioned courts, an expansive 180-pax air-conditioned banquet hall, and an elevated 5th-floor view deck dining lounge.
            </p>

            {/* Verified Quick Badges */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold text-white/90">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
                <MapPin className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>25 Bologna Muzon, Taytay, Rizal</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
                <Clock className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>Open Daily 6:00 AM – 12:00 AM</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
                <Car className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>15 Indoor Parking Slots (24/7 Security)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. THE THREE PILLARS OF C&J
          ======================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="w-12 h-1 bg-[#FFD21C] rounded-full mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
            The C&amp;J Experience
          </h2>
          <p className="text-sm sm:text-base text-[#64748B]">
            Three specialized levels designed for athletes, families, and party organizers under one roof.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {milestones.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-8 shadow-sm hover:shadow-xl hover:border-[#0B2A67]/30 transition-all duration-300 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <span className="text-xs font-black uppercase tracking-widest text-[#bf050b]">
                    {item.year}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#EDF4FC] text-[#0B2A67]">
                    {item.badge}
                  </span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-[#0B2A67] flex items-center justify-center shadow-md">
                  {item.icon}
                </div>

                <h3 className="text-xl font-extrabold text-[#0B2A67]">
                  {item.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          3. COMPLETE FACILITY SPECIFICATIONS — THE 3 LEVELS
          ======================================================== */}
      <section className="w-full bg-[#EDF4FC] py-16 sm:py-20 border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-[#E2E8F0] gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-1">
                <Building className="w-3.5 h-3.5 text-[#bf050b]" />
                <span>Multi-Level Facility Architecture</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
                Explore Our 3 Specialized Levels
              </h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                Official specifications, capacities, and direct reservation lines.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0B2A67] text-white hover:bg-[#123A82] text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <span>View Full Pricing Matrix</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FFD21C]" />
            </Link>
          </div>

          <div className="space-y-10">
            {venuePillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-lg transition-all grid grid-cols-1 lg:grid-cols-12 items-stretch"
              >
                {/* Photo Column */}
                <div className="relative lg:col-span-5 min-h-[260px] lg:min-h-full bg-[#F5F7FA]">
                  <Image
                    src={pillar.image}
                    alt={pillar.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 500px"
                    className="object-cover"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/95 text-[#0B2A67] text-xs font-extrabold shadow-sm">
                      {pillar.floor}
                    </span>
                  </div>
                </div>

                {/* Content Column */}
                <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#E2E8F0] pb-4">
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-[#0B2A67]">
                          {pillar.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
                          {pillar.tagline}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-2xl sm:text-3xl font-black text-[#0B2A67]">
                          {pillar.rate}
                        </span>
                        <span className="text-[11px] text-[#64748B] block font-medium">
                          {pillar.rateSub}
                        </span>
                      </div>
                    </div>

                    {/* Features checklist */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs text-[#102A56]">
                      {pillar.specs.map((spec, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#007d48] shrink-0 mt-0.5" />
                          <span>{spec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[#64748B]">{pillar.hotlineLabel}:</span>
                      <a
                        href={`tel:${pillar.hotline.replace(/-/g, "")}`}
                        className="font-mono font-extrabold text-[#0B2A67] hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#bf050b]" />
                        <span>{pillar.hotline}</span>
                      </a>
                    </div>

                    <div className="w-full sm:w-auto">
                      {idx === 0 ? (
                        <Link href="/book">
                          <Button variant="yellow" size="sm" className="w-full sm:w-auto px-6 font-bold cursor-pointer active:scale-[0.98]">
                            <span>Book Court Slot</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      ) : idx === 1 ? (
                        <EventInquiryModal
                          buttonText="Inquire for Events →"
                          triggerVariant="yellow"
                          triggerClassName="w-full sm:w-auto px-6 h-9 text-xs font-bold"
                        />
                      ) : (
                        <ViewDeckMenuModal
                          buttonText="Explore Menu &amp; Venue →"
                          triggerClassName="w-full sm:w-auto px-6 h-9 text-xs font-bold"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          4. OUR CORE VALUES & ATHLETE COMMITMENT
          ======================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="w-12 h-1 bg-[#bf050b] rounded-full mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
            Our Core Principles
          </h2>
          <p className="text-sm sm:text-base text-[#64748B]">
            Why athletes and event hosts choose C&amp;J as their preferred venue in Rizal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {values.map((val, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm hover:shadow-md transition-all flex items-start gap-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5F7FA] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                {val.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-[#0B2A67]">
                  {val.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  {val.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          5. VENUE LOCATION, PARKING & ACCESSIBILITY
          ======================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 pb-16">
        <div className="rounded-3xl bg-[#071E4B] text-white p-8 sm:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFD21C]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-[#FFD21C] flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Visit C&amp;J in Taytay, Rizal
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
                Convenient Location with 24/7 Secured Indoor Parking
              </h2>
              <p className="text-sm text-white/80 leading-relaxed max-w-2xl">
                We are situated at <strong>25 Bologna St., Muzon, Taytay, Rizal</strong>, accessible via major eastern corridors. Enjoy 15 dedicated indoor car parking slots with round-the-clock security personnel and full elevator access servicing all 5 floors.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1">
                  <span className="font-bold text-[#FFD21C] block">Address</span>
                  <span className="text-white/80">25 Bologna, Muzon, Taytay, Rizal</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1">
                  <span className="font-bold text-[#FFD21C] block">Operating Hours</span>
                  <span className="text-white/80">Daily 6:00 AM – 12:00 AM</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-1">
                  <span className="font-bold text-[#FFD21C] block">Building Access</span>
                  <span className="text-white/80">Elevator to 3rd &amp; 5th Floors</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3">
              <Link href="/book">
                <Button
                  variant="yellow"
                  size="lg"
                  className="w-full h-12 font-bold text-sm shadow-lg active:scale-[0.98] cursor-pointer"
                >
                  <span>Book a Court Online</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <a
                href="https://maps.google.com/?q=25+Bologna+Muzon+Taytay+Rizal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-full border border-white/20 hover:bg-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#FFD21C]" />
                <span>Open in Google Maps</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
