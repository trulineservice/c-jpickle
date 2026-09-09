import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { PickleballCourtVisualizer } from "@/components/pickleball-court-visualizer";
import { ReserveCourtModal } from "@/components/reserve-court-modal";
import { createClient } from "@/utils/supabase/server";
import {
  ArrowRight,
  Trophy,
  Activity,
  ShieldCheck,
  Zap,
  CheckCircle2,
  ChevronDown
} from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const courts = [
    {
      id: "court-1",
      name: "Court 1 — Indoor",
      category: "USA Pickleball Specification",
      badge: "Just In",
      price: "₱300",
      rateText: "/ hour",
      specs: "20' × 44' • 8mm Cushion Shock Pad",
      image: "/court-overhead.png",
      colors: ["#111111", "#1e3a5f", "#007d48"],
    },
    {
      id: "court-2",
      name: "Court 2 — Indoor",
      category: "USA Pickleball Specification",
      badge: "High Demand",
      price: "₱300",
      rateText: "/ hour",
      specs: "20' × 44' • 8mm Cushion Shock Pad",
      image: "/court-overhead.png",
      colors: ["#111111", "#2b3244", "#d30005"],
    },
    {
      id: "league-block",
      name: "League & Squad Contiguous Block",
      category: "3+ Hour Reserved Play",
      badge: "Multi-Hour",
      price: "₱300",
      rateText: "/ hr / court",
      specs: "Side-by-side Courts 1 & 2 Available",
      image: "/hero-action.jpg",
      colors: ["#111111", "#39393b", "#707072"],
    },
  ];

  const gearItems = [
    {
      id: "gear-paddle",
      name: "C&J Pro 16mm Raw Carbon Paddle",
      category: "Pro Rental Equipment",
      price: "₱150",
      type: "Rental / Session",
      badge: "Best Seller",
      image: "/gear-paddle.jpg",
      swatches: ["#111111", "#39393b", "#707072"],
    },
    {
      id: "gear-balls",
      name: "Franklin X-40 Tournament Balls (3-Pack)",
      category: "Official Match Play Balls",
      price: "₱150",
      type: "Rental / Included",
      badge: "USAP Approved",
      image: "/gear-balls.jpg",
      swatches: ["#d4ff00", "#ffffff"],
    },
    {
      id: "gear-combo",
      name: "Complete Doubles Squad Bundle",
      category: "4 Carbon Paddles + 6 Balls",
      price: "₱300",
      type: "Add-On / Session",
      badge: "Squad Pick",
      image: "/gear-paddle.jpg",
      swatches: ["#111111", "#d30005"],
    },
    {
      id: "gear-towel",
      name: "C&J Performance Microfiber Court Towel",
      category: "Court Accessories",
      price: "₱250",
      type: "Pro Shop Purchase",
      badge: "Pro Shop",
      image: "/gear-balls.jpg",
      swatches: ["#111111", "#ffffff"],
    },
  ];

  const faqs = [
    {
      q: "How does live online booking work at C&J?",
      a: "Select your desired date, choose single or contiguous multi-hour slots, add optional pro carbon paddles, and pay instantly via PayMongo with GCash, Maya, QR Ph, or credit cards. You receive an instant digital QR check-in pass."
    },
    {
      q: "What is your cancellation and refund policy?",
      a: "We maintain a strict 24-hour refundable cancellation policy. Cancel at least 24 hours prior to your match time for a 100% full refund directly to your original payment method. Cancellations within 24 hours are non-refundable."
    },
    {
      q: "What footwear is required on the cushioned courts?",
      a: "Clean, non-marking athletic or court shoes are strictly mandatory to protect the 8mm multi-layer polyurethane shock-absorption surface."
    },
    {
      q: "Can I bring my own paddles and balls?",
      a: "Yes! Players are encouraged to bring their own USAP-compliant gear, or you can rent our Pro Carbon Fiber paddles (₱150/session) directly at the counter."
    }
  ];

  return (
    <div className="flex-1 flex flex-col font-sans bg-background text-foreground">

      {/* 1. EDITORIAL CAMPAIGN HERO (Towering 96px Bebas Neue Uppercase Headline) */}
      <section className="relative w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-4 pb-12">
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[480px] sm:min-h-[580px] bg-[#f5f5f5] dark:bg-[#18181c] overflow-hidden">
          <Image
            src="/hero-action.jpg"
            alt="C&J Pickleball Arena Athlete Action"
            fill
            sizes="(max-width: 1440px) 100vw, 1440px"
            className="object-cover object-center"
            priority
          />
          {/* Subtle contrast gradient for legible typography */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          {/* Burned-in Display Campaign Typography */}
          <div className="absolute inset-0 p-6 sm:p-12 md:p-16 flex flex-col justify-end text-white z-10">
            <span className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-white/90 mb-2">
              Metro Manila • Tournament Grade Indoor Arena
            </span>

            <h1 className="text-5xl sm:text-7xl md:text-9xl font-display uppercase tracking-tight text-white leading-[0.88] max-w-4xl drop-shadow-sm">
              SERVE WITH FORCE. <br />
              OWN THE COURT.
            </h1>

            <p className="text-sm sm:text-base text-white/90 max-w-xl mt-4 leading-relaxed font-normal">
              Two USA Pickleball specification 8mm cushioned courts in Tomas Morato, Quezon City.
              Fixed ₱300/hr flat rate, air-conditioned lounge, and instant digital booking.
            </p>

            {/* Bottom-left White Pill CTA (button-outline-on-image) */}
            <div className="flex flex-wrap items-center gap-3 pt-6">
              <ReserveCourtModal
                isLoggedIn={!!user}
                buttonText="Book Court — ₱300/hr"
                triggerSize="lg"
                triggerVariant="on-image"
                triggerClassName="bg-white text-[#111111] hover:bg-[#f5f5f5] font-medium text-sm h-12 px-8 shadow-none"
              />
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/60 text-white hover:bg-white/20 h-12 px-7 text-sm font-medium"
                >
                  Rates &amp; Equipment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION RHYTHM: 48px GAP • FEATURED COURTS GRID (3-UP PLP CATALOG) */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="flex items-baseline justify-between border-b border-[#cacacb] dark:border-[#27272a] pb-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93] block mb-1">
              Arena Inventory
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-foreground uppercase">
              Featured Courts
            </h2>
          </div>
          <Link
            href="/book"
            className="text-sm font-medium text-[#111111] dark:text-foreground hover:text-[#707072] dark:hover:text-[#8a8a93] flex items-center gap-1"
          >
            <span>View All Slots</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3-Up Product Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {courts.map((court) => (
            <div key={court.id} className="group flex flex-col bg-white dark:bg-[#121215] border border-transparent dark:border-[#222226] p-0 md:p-3 transition-colors">
              {/* Product Card Image: Square 1:1 on Soft-Cloud (#f5f5f5) */}
              <div className="relative aspect-square w-full bg-[#f5f5f5] dark:bg-[#18181c] overflow-hidden">
                <Image
                  src={court.image}
                  alt={court.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1440px) 33vw, 480px"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />

                {/* Promo Badge (badge-promo) */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-block bg-white dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    {court.badge}
                  </span>
                </div>
              </div>

              {/* Card Metadata Stacked Below */}
              <div className="pt-4 space-y-1">
                {/* Swatch dots */}
                <div className="flex items-center gap-1.5 pb-1">
                  {court.colors.map((color, idx) => (
                    <span
                      key={idx}
                      className={`w-3 h-3 rounded-full border ${idx === 0 ? "ring-1 ring-[#111111] dark:ring-white ring-offset-1 dark:ring-offset-[#121215]" : "border-[#cacacb] dark:border-[#27272a]"
                        }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <h3 className="text-base font-semibold text-[#111111] dark:text-foreground group-hover:text-[#707072] dark:group-hover:text-[#8a8a93] transition-colors">
                  {court.name}
                </h3>
                <p className="text-sm text-[#707072] dark:text-[#8a8a93]">
                  {court.category}
                </p>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93] pt-0.5">
                  {court.specs}
                </p>

                {/* Price Row */}
                <div className="pt-2 flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-bold text-[#111111] dark:text-foreground">
                      {court.price}
                    </span>
                    <span className="text-xs text-[#707072] dark:text-[#8a8a93]">
                      {court.rateText}
                    </span>
                  </div>

                  <Link href="/book">
                    <Button size="sm" className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-[#ededed] text-xs px-4 cursor-pointer">
                      Book Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. PRO GEAR & ACCESSORIES RAIL (4-UP PRODUCT CATALOG) */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-12 border-t border-[#cacacb] dark:border-[#27272a]">
        <div className="flex items-baseline justify-between border-b border-[#cacacb] dark:border-[#27272a] pb-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93] block mb-1">
              Pro Shop &amp; Equipment
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-foreground uppercase">
              Tournament Gear &amp; Rentals
            </h2>
          </div>
          <Link
            href="/pricing"
            className="text-sm font-medium text-[#111111] dark:text-foreground hover:text-[#707072] dark:hover:text-[#8a8a93] flex items-center gap-1"
          >
            <span>Explore Gear</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4-Up Gear Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {gearItems.map((item) => (
            <div key={item.id} className="group flex flex-col bg-white dark:bg-[#121215] border border-transparent dark:border-[#222226] p-0 md:p-3 transition-colors">
              {/* 1:1 Square Product Image */}
              <div className="relative aspect-square w-full bg-[#f5f5f5] dark:bg-[#18181c] overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1440px) 25vw, 360px"
                  className="object-cover object-center p-4 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="inline-block bg-white dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-3 space-y-1">
                <h4 className="text-sm font-semibold text-[#111111] dark:text-foreground line-clamp-1 group-hover:text-[#707072] dark:group-hover:text-[#8a8a93]">
                  {item.name}
                </h4>
                <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
                  {item.category}
                </p>
                <div className="pt-1 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-[#111111] dark:text-foreground">
                    {item.price}
                  </span>
                  <span className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
                    {item.type}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. EDITORIAL CAMPAIGN SPLIT TILE ("THE KITCHEN HAS RULES") */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] min-h-[400px] bg-[#111111] overflow-hidden">
          <Image
            src="/court-editorial.jpg"
            alt="C&J Arena Indoor Pickleball Tournament Court"
            fill
            sizes="(max-width: 1440px) 100vw, 1440px"
            className="object-cover object-center filter contrast-110 brightness-75"
          />
          <div className="absolute inset-0 bg-black/40" />

          <div className="absolute inset-0 p-8 sm:p-14 flex flex-col justify-center max-w-2xl text-white z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">
              Championship Standards
            </span>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-display uppercase tracking-tight leading-[0.9] text-white">
              THE KITCHEN HAS RULES. <br />
              PLAY BY THEM.
            </h2>
            <p className="text-sm text-white/90 mt-4 leading-relaxed max-w-lg">
              Official 7-foot non-volley zones, true-bounce tournament surfaces, and 850-lux glare-free illumination engineered for peak competitive dinking.
            </p>
            <div className="pt-6">
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="on-image"
                  className="bg-white text-[#111111] hover:bg-[#f5f5f5] text-sm font-medium h-12 px-8 cursor-pointer"
                >
                  Read Court Guidelines
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE TECHNICAL BLUEPRINT */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93] block mb-1">
            Arena Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-foreground uppercase">
            Court Blueprint &amp; NVZ Strategy
          </h2>
        </div>
        <PickleballCourtVisualizer selectedCourtName="Court 1 &amp; Court 2" />
      </section>

      {/* 6. PDP-STYLE DISCLOSURE ROWS / FREQUENTLY ASKED QUESTIONS */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="border-b border-[#cacacb] dark:border-[#27272a] pb-4 mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93] block mb-1">
            Player Information
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] dark:text-foreground uppercase">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-[#cacacb] dark:divide-[#27272a] border-t border-b border-[#cacacb] dark:border-[#27272a]">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-[#111111] dark:text-foreground md:w-1/3 shrink-0">
                {faq.q}
              </h3>
              <p className="text-sm text-[#707072] dark:text-[#8a8a93] leading-relaxed md:w-2/3">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}