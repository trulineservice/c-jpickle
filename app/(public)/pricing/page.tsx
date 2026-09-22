import Link from "next/link";
import {
  Check,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Phone,
  Building,
  Users,
  Wind,
  Volume2,
  Car,
  Layers,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { ReserveCourtModal } from "@/components/reserve-court-modal";

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tiers = [
    {
      name: "Hourly Court Reservation",
      badge: "Fixed Flat Rate",
      price: "₱300",
      period: "/ hour",
      description: "Standard hourly slot on Court 1 (Pickleball) or Court 2 (Pickleball / Basketball). Zero surge fees.",
      features: [
        "Indoor cushioned playing court",
        "Court 1 (Pickleball) or Court 2 (Dual-Sport)",
        "Sports overhead lighting",
        "Secure PayMongo checkout (GCash, Maya, Cards)",
        "2-day refundable cancellation & reschedule policy"
      ],
      cta: "Book Court — ₱300/hr",
      href: "/book",
      highlighted: true,
    },
    {
      name: "Paddle Rental Add-On",
      badge: "Equipment Rental",
      price: "₱150",
      period: "/ session",
      description: "Paddle rental available for your match session.",
      features: [
        "Pickleball paddle rental per session",
        "Selectable during online booking flow",
        "Pickup directly at the front counter",
        "Balls available upon request"
      ],
      cta: "Add at Booking",
      href: "/book",
      highlighted: false,
    },
    {
      name: "Multi-Hour Group Booking",
      badge: "Extended Play",
      price: "₱300",
      period: "/ hr / court",
      description: "Contiguous multi-hour reservations for groups, squad games, and practice sessions.",
      features: [
        "Book continuous hours without interruption",
        "Reserve Court 1 and Court 2 side-by-side",
        "Instant digital confirmation and QR pass"
      ],
      cta: "Reserve Slots",
      href: "/book",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: "What is your cancellation and refund policy?",
      a: "Reservations cancelled at least 2 days (48 hours) prior to the scheduled start time receive a 100% full refund back to your original payment method. Within 2 days of play, refunds are not available, but players can easily reschedule their booking to any open slot."
    },
    {
      q: "What footwear is required on court?",
      a: "Clean, non-marking athletic or court shoes are required to protect the cushioned indoor surface."
    },
    {
      q: "Do I need to bring my own paddles and balls?",
      a: "You may bring your own equipment or rent paddles for ₱150 during online booking or at the front counter."
    },
    {
      q: "Can I book contiguous multi-hour slots?",
      a: "Yes. Our real-time calendar allows booking contiguous hours based on open availability."
    },
    {
      q: "What are the private venue rental rates for View Deck and Events Place?",
      a: "C&J offers two private event spaces: (1) 5th-Floor View Deck Private Lounge: ₱4,000 for 2 hours (100% consumable on cafe food and drinks, +₱2,500/hr extension), 150 sqm with 25 pax capacity, full A/C, basic sound system, elevator access overlooking Metro Manila city lights, and 15 indoor parking slots. Call 0976-662-3453. (2) 3rd-Floor C&J Events Place & Banquet Hall: ₱30,000 for 4 hours (+₱5,000/hr extension), 500 sqm with 180 pax capacity, full A/C, basic lights & sound, elevator access, dressing rooms, and 15 indoor parking slots. Call 0917-123-0382.",
    }
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-12 font-sans bg-[#F5F7FA] text-[#102A56]">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-8 mb-12">
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-2">
          <Sparkles className="w-4 h-4 text-[#FFD21C]" />
          <span>Rates &amp; Equipment Specifications</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0B2A67] uppercase leading-tight">
          Transparent Value. <br />
          Quality Courts.
        </h1>
        <p className="text-sm sm:text-base text-[#64748B] max-w-2xl mt-4 leading-relaxed font-normal">
          Zero surge pricing. Zero hidden fees. Enjoy Taytay, Rizal&apos;s premier indoor cushioned courts for a fixed flat rate of ₱300 per hour.
        </p>
      </div>

      {/* 3-Up Pricing Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl p-8 bg-white transition-all duration-300 shadow-sm hover:shadow-xl ${
              tier.highlighted ? "border-2 border-[#0B2A67] ring-4 ring-[#0B2A67]/5" : "border border-[#E2E8F0]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[#64748B]">
                  {tier.badge}
                </span>
                {tier.highlighted && (
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-[#FFD21C] text-[#0B2A67]">
                    Popular Choice
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B2A67] mb-2">
                {tier.name}
              </h3>

              <div className="flex items-baseline gap-1.5 pt-2 pb-4">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0B2A67]">
                  {tier.price}
                </span>
                <span className="text-sm text-[#64748B]">
                  {tier.period}
                </span>
              </div>

              <p className="text-sm text-[#64748B] pb-6 border-b border-[#E2E8F0] leading-relaxed">
                {tier.description}
              </p>

              {/* Features List */}
              <ul className="space-y-3.5 pt-6 text-sm text-[#102A56]">
                {tier.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                    <span className="text-[#102A56] text-xs sm:text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8 mt-8 border-t border-[#E2E8F0]">
              {tier.highlighted ? (
                <ReserveCourtModal
                  isLoggedIn={!!user}
                  buttonText={tier.cta}
                  triggerSize="lg"
                  triggerVariant="yellow"
                  triggerClassName="w-full font-bold h-12 shadow-sm text-sm"
                />
              ) : (
                <Link href={tier.href} className="w-full block">
                  <Button
                    size="lg"
                    variant="navy-outline"
                    className="w-full bg-[#EDF4FC] text-[#0B2A67] hover:bg-[#0B2A67] hover:text-white border-[#E2E8F0] text-sm font-semibold h-12"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* C&J Private Venues & Event Halls Section */}
      <div className="border-t border-[#E2E8F0] pt-12 mb-16">
        <div className="border-b border-[#E2E8F0] pb-4 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-1">
              <Building className="w-3.5 h-3.5 text-[#bf050b]" />
              <span>Private Gatherings &amp; Banquets</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
              C&amp;J Private Venue Rentals
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">
              Official rates for our 5th-floor city lights lounge and 3rd-floor grand banquet hall.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Venue 1: View Deck Private Lounge */}
          <div className="rounded-3xl border-2 border-[#0B2A67] p-8 bg-white shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2A67]">
                  5th Floor Level &bull; City Lights View
                </span>
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#bf050b] text-white">
                  100% Consumable
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#0B2A67]">
                  View Deck Private Lounge
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  150-sqm venue with elevator access overlooking Metro Manila city lights.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-4xl font-black text-[#0B2A67]">₱4,000</span>
                <span className="text-sm text-[#64748B] font-semibold">/ 2 Hours (Consumable)</span>
              </div>
              <span className="text-xs font-bold text-[#bf050b] bg-[#bf050b]/8 px-2.5 py-1 rounded-full inline-block">
                +₱2,500 per additional 1-hour extension
              </span>

              <ul className="space-y-2.5 pt-2 text-xs text-[#102A56]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>150-sqm venue</strong> &amp; <strong>25 pax capacity</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>Basic Sound System</strong> included in base rate</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>Fully Air-Conditioned</strong> climate comfort</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>5th Floor Level</strong> with elevator access overlooking Metro Manila city lights</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>Indoor car parking for 15 vehicles</strong> with 24/7 security</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>100% Consumable</strong> towards our 28-item cafe food and drink menu</span>
                </li>
                <li className="flex items-start gap-2.5 text-amber-900">
                  <span className="text-sm leading-none mt-0.5">💝</span>
                  <span><strong>Additional tables &amp; chairs</strong> available for rent upon request</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <a
                href="tel:09766623453"
                className="w-full h-12 rounded-xl bg-[#0B2A67] hover:bg-[#123A82] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Phone className="w-4 h-4 text-[#FFD21C]" />
                <span>Call View Deck Hotline: 0976-662-3453</span>
              </a>
            </div>
          </div>

          {/* Venue 2: Events Place Grand Hall */}
          <div className="rounded-3xl border border-[#E2E8F0] p-8 bg-white shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <span className="text-xs font-extrabold uppercase tracking-widest text-[#64748B]">
                  3rd Floor Level &bull; Grand Banquet
                </span>
                <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#FFD21C] text-[#0B2A67]">
                  180 Pax Capacity
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-[#0B2A67]">
                  C&amp;J&apos;s Events Place &amp; Banquet Hall
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  500-sqm venue with elevator access for weddings, birthdays, and corporate celebrations.
                </p>
              </div>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-4xl font-black text-[#0B2A67]">₱30,000</span>
                <span className="text-sm text-[#64748B] font-semibold">/ 4-Hour Venue Rental</span>
              </div>
              <span className="text-xs font-bold text-[#0B2A67] bg-[#EDF4FC] px-2.5 py-1 rounded-full inline-block">
                +₱5,000 per additional 1-hour extension
              </span>

              <ul className="space-y-2.5 pt-2 text-xs text-[#102A56]">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>500-sqm venue</strong> &amp; <strong>180 pax capacity</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>Basic Lights &amp; Sound System</strong> included</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>Fully Air-Conditioned</strong> banquet hall</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>Free access to Dressing Rooms &amp; Wash Area</strong></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>3rd Floor Level</strong> with dedicated elevator access</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#007d48] shrink-0 mt-0.5" />
                  <span><strong>Indoor car parking for 15 vehicles</strong> with 24/7 security</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <a
                href="tel:09171230382"
                className="w-full h-12 rounded-xl bg-[#0B2A67] hover:bg-[#123A82] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Phone className="w-4 h-4 text-[#FFD21C]" />
                <span>Call Events Hotline: 0917-123-0382</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Rows */}
      <div className="border-t border-[#E2E8F0] pt-12">
        <div className="border-b border-[#E2E8F0] pb-4 mb-8">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] block mb-1">
            Support &amp; Policies
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
            Rental Questions &amp; Policies
          </h2>
        </div>

        <div className="divide-y divide-[#E2E8F0] border-t border-b border-[#E2E8F0]">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <h3 className="text-base font-bold text-[#0B2A67] md:w-1/3 shrink-0">
                {faq.q}
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed md:w-2/3">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}