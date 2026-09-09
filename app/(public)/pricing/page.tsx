import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
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
      description: "Standard hourly slot on Court 1 - Indoor or Court 2 - Indoor. Zero surge fees.",
      features: [
        "USA Pickleball certified 20' × 44' court",
        "8mm cushioned polyurethane shock pad",
        "850-lux glare-free tournament LED lighting",
        "Air-conditioned lounge & locker access",
        "Instant PayMongo checkout (GCash, Maya, Cards)",
        "Strict 24-hour refundable cancellation guarantee"
      ],
      cta: "Book Court — ₱300/hr",
      href: "/book",
      highlighted: true,
    },
    {
      name: "Pro Carbon Gear Add-On",
      badge: "Pro Equipment",
      price: "₱150",
      period: "/ session",
      description: "Tournament-spec gear bundle for casual players and competitive drills.",
      features: [
        "2 × 16mm Raw Carbon Fiber Paddles",
        "3 × Franklin X-40 Tournament Balls",
        "Free paddle grip wipe & court towel service",
        "Selectable during online booking flow",
        "Instant pickup at the Pro Shop counter"
      ],
      cta: "Add at Booking",
      href: "/book",
      highlighted: false,
    },
    {
      name: "League & Squad Block",
      badge: "Multi-Hour",
      price: "₱300",
      period: "/ hr / court",
      description: "Contiguous 3+ hour block reservation for leagues, clubs, and team training.",
      features: [
        "Continuous slot locking without interruption",
        "Side-by-side Courts 1 & 2 available",
        "Official tournament scoreboards & clipboards",
        "Digital PDF printable receipts for clubs",
        "Dedicated check-in lane at the front desk"
      ],
      cta: "Reserve League Block",
      href: "/book",
      highlighted: false,
    },
  ];

  const faqs = [
    {
      q: "What is your cancellation and refund policy?",
      a: "Reservations cancelled at least 24 hours prior to the scheduled start time receive a 100% full refund processed back to your original payment method. Cancellations made within 24 hours of play are strictly non-refundable."
    },
    {
      q: "What footwear is required on court?",
      a: "Clean, non-marking athletic or court shoes are strictly required to preserve the tournament 8mm polyurethane cushioned surface."
    },
    {
      q: "Do I need to bring my own paddles and balls?",
      a: "You may bring your own USAP-compliant equipment or rent our Pro Carbon Fiber bundle (2x 16mm paddles + 3x balls) for ₱150 during online booking or at the front counter."
    },
    {
      q: "Can I book contiguous multi-hour slots?",
      a: "Yes. Our real-time calendar allows booking up to 12 contiguous hours for tournaments, clinics, and squad match play."
    }
  ];

  return (
    <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 py-12 font-sans bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-[#cacacb] dark:border-[#27272a] pb-8 mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#a1a1aa] block mb-2">
          Pricing &amp; Equipment
        </span>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-display uppercase tracking-tight text-foreground">
          TRANSPARENT VALUE. <br />
          TOURNAMENT STANDARDS.
        </h1>
        <p className="text-sm sm:text-base text-[#707072] dark:text-[#a1a1aa] max-w-2xl mt-4 leading-relaxed font-normal">
          Zero surge pricing. Zero hidden fees. Enjoy Metro Manila&apos;s premier indoor cushioned courts for a fixed flat rate of ₱300 per hour.
        </p>
      </div>

      {/* 3-Up Pricing Tiers (Catalog Cards with 1px Hairlines) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            className={`flex flex-col justify-between border p-8 bg-white dark:bg-[#121215] ${
              tier.highlighted ? "border-[#111111] dark:border-white" : "border-[#cacacb] dark:border-[#27272a]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#cacacb] dark:border-[#27272a] mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#a1a1aa]">
                  {tier.badge}
                </span>
                {tier.highlighted && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#111111] text-white dark:bg-white dark:text-[#111111]">
                    Primary Rate
                  </span>
                )}
              </div>

              <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                {tier.name}
              </h3>

              <div className="flex items-baseline gap-1.5 pt-2 pb-4">
                <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  {tier.price}
                </span>
                <span className="text-sm text-[#707072] dark:text-[#a1a1aa]">
                  {tier.period}
                </span>
              </div>

              <p className="text-sm text-[#707072] dark:text-[#a1a1aa] pb-6 border-b border-[#e5e5e5] dark:border-[#27272a]">
                {tier.description}
              </p>

              {/* Features List */}
              <ul className="space-y-3.5 pt-6 text-sm text-foreground">
                {tier.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#007d48] dark:text-[#10b981] shrink-0 mt-0.5" />
                    <span className="text-[#39393b] dark:text-[#d4d4d8]">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-8 mt-8 border-t border-[#e5e5e5] dark:border-[#27272a]">
              {tier.highlighted ? (
                <ReserveCourtModal
                  isLoggedIn={!!user}
                  buttonText={tier.cta}
                  triggerSize="lg"
                  triggerClassName="w-full bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] text-sm font-medium h-12"
                />
              ) : (
                <Link href={tier.href} className="w-full block">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full bg-[#f5f5f5] text-[#111111] hover:bg-[#e5e5e5] dark:bg-[#18181c] dark:text-white dark:hover:bg-[#27272a] text-sm font-medium h-12"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* PDP-Style FAQ Disclosure Rows */}
      <div className="border-t border-[#cacacb] dark:border-[#27272a] pt-12">
        <div className="border-b border-[#cacacb] dark:border-[#27272a] pb-4 mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#a1a1aa] block mb-1">
            Support &amp; Policies
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
            Rental Questions &amp; Arena Policies
          </h2>
        </div>

        <div className="divide-y divide-[#cacacb] dark:divide-[#27272a] border-t border-b border-[#cacacb] dark:border-[#27272a]">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-foreground md:w-1/3 shrink-0">
                {faq.q}
              </h3>
              <p className="text-sm text-[#707072] dark:text-[#a1a1aa] leading-relaxed md:w-2/3">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}