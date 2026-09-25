import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "@/components/service-card";
import { createClient } from "@/utils/supabase/server";

const ReserveCourtModal = dynamic(
  () => import("@/components/reserve-court-modal").then((mod) => mod.ReserveCourtModal)
);
const ViewDeckMenuModal = dynamic(
  () => import("@/components/viewdeck-menu-modal").then((mod) => mod.ViewDeckMenuModal)
);
const EventInquiryModal = dynamic(
  () => import("@/components/event-inquiry-modal").then((mod) => mod.EventInquiryModal)
);
import {
  ArrowRight,
  Calendar,
  Utensils,
  Trophy,
  Activity,
  Star,
  Users,
  ShieldCheck,
  Zap,
  Phone,
  Sparkles,
  Flame,
  Coffee,
  MapPin,
  HelpCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const courts = [
    {
      id: "court-1",
      name: "Court 1 — Indoor (Pro Cushion)",
      category: "Indoor Pickleball",
      badge: "Pickleball",
      price: "₱350",
      rateText: "/ hour",
      specs: "Standard Court • Cushioned Surface",
      image: "/service-court.jpg",
    },
    {
      id: "court-2",
      name: "Court 2 — Indoor (Pickleball / Basketball)",
      category: "Multi-Sport Court",
      badge: "Pickleball & Basketball",
      price: "₱350",
      rateText: "/ hour",
      specs: "Pickleball & Basketball Half-Court",
      image: "/court-overhead.png",
    },
  ];

  const gearItems = [
    {
      id: "gear-paddle",
      name: "Pickleball Paddle Rental",
      category: "Rental Equipment",
      price: "₱110",
      type: "Per Session",
      badge: "Rental",
      image: "/gear-paddle.jpg",
    },
    {
      id: "gear-thrower",
      name: "Automatic Ball Machine",
      category: "Practice Machine",
      price: "₱350",
      type: "Add-On / Hour",
      badge: "Add-On",
      image: "/gear-ball-thrower.png",
    },
  ];

  const galleryImages = [
    {
      title: "Indoor Cushioned Playing Court",
      category: "Ground Floor Arena",
      image: "/service-court.jpg",
      badge: "Court 1 & 2",
    },
    {
      title: "5th-Floor View Deck Cafe & Lounge",
      category: "Panoramic Dining",
      image: "/service-viewdeck.jpg",
      badge: "View Deck Lounge",
    },
    {
      title: "3rd-Floor 180-Pax Banquet Hall",
      category: "Celebrations & Banquets",
      image: "/service-events.jpg",
      badge: "Events Place",
    },
    {
      title: "Court Panoramic Facility Perspective",
      category: "Sports Complex",
      image: "/court-panoramic.jpg",
      badge: "Arena Overview",
    },
    {
      title: "High-Energy Match Play",
      category: "Athlete Experience",
      image: "/hero-action.jpg",
      badge: "Action",
    },
    {
      title: "Dual-Sport Overhead Setup",
      category: "Pickleball & Basketball",
      image: "/court-overhead.png",
      badge: "Court 2",
    },
  ];

  const faqs = [
    {
      q: "How does live online court booking work at C&J?",
      a: "Select your desired date and court, pick single or contiguous multi-hour slots, add optional paddle rentals (₱110), and pay securely via PayMongo (GCash, Maya, or credit/debit card). You immediately receive an instant digital QR check-in pass.",
    },
    {
      q: "What is your cancellation and refund policy?",
      a: "We maintain a 2-day (48-hour) refundable cancellation policy. Cancellations made at least 2 days prior to your match time receive a 100% full refund directly to your original payment method. Within 2 days of match time, bookings are non-refundable, but players can easily reschedule their booking to any open slot.",
    },
    {
      q: "How much is the Pickleball & Sports Court rental?",
      a: "The standard court rate is a fixed flat ₱350 per hour on both Court 1 and Court 2 with zero surge pricing. Paddle rentals are available for ₱110 per session.",
    },
    {
      q: "How do I reserve C&J's Events Place for private occasions?",
      a: "Our package is ₱30,000 for a 4-hour venue rental. This includes our 500-sqm fully air-conditioned hall with 180 pax capacity, basic lights & sound system, dressing room access, 3rd floor elevator access, and 15 indoor parking slots. Call our events hotline at 0917-123-0382.",
    },
    {
      q: "What is the View Deck rental package?",
      a: "The View Deck is a 150-sqm 5th-floor air-conditioned venue with elevator access overlooking Metro Manila city lights. The rental is ₱4,000 for 2 hours and is 100% consumable on food and drinks (+₱2,500/hr extension). Accommodates up to 25 guests with full air-conditioning, sound system, and parking. Call 0976-662-3453.",
    },
    {
      q: "What footwear is required on the courts?",
      a: "Clean, non-marking athletic or court shoes are strictly required to protect the cushioned indoor surface.",
    },
  ];

  return (
    <div className="flex-1 flex flex-col font-sans bg-[#F5F7FA] text-[#102A56]">
      {/* ========================================================
          1. HERO SECTION — Deep Navy with Crimson Eyebrow & Floating Badges
          ======================================================== */}
      <section className="relative w-full bg-[#0B2A67] text-white overflow-hidden py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-6 space-y-6 z-10">
              {/* Brand Eyebrow with Crimson Accent */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-[#bf050b] rounded-full" />
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#FFD21C]">
                  C&amp;J&apos;s Events Place Rentals
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#bf050b] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  Taytay, Rizal
                </span>
              </div>

              {/* Large Headline */}
              <h1 className="text-4xl sm:text-6xl xl:text-7xl font-extrabold uppercase tracking-tight text-white leading-[1.02]">
                Your Event. <br />
                Your Court. <br />
                <span className="text-[#FFD21C]">Your Experience.</span>
              </h1>

              {/* Feature Indicators Row */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-2 text-xs sm:text-sm font-semibold text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#FFD21C]" />
                  <span>Banquet Events</span>
                </div>
                <span className="text-white/30">|</span>
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[#FFD21C]" />
                  <span>View Deck Dining</span>
                </div>
                <span className="text-white/30">|</span>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#bf050b]" />
                  <span className="text-white font-bold">Pickleball ₱350/hr</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {/* Primary Yellow Button: Book a Court */}
                <Link href="/book">
                  <Button
                    variant="yellow"
                    size="lg"
                    className="h-12 px-7 text-sm font-bold shadow-lg active:scale-[0.98] cursor-pointer flex items-center gap-2"
                  >
                    <span>Reserve Court — ₱350/hr</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Crimson Brand Button: Book an Event */}
                <EventInquiryModal
                  triggerVariant="red"
                  triggerClassName="h-12 px-7 text-sm font-bold shadow-lg active:scale-[0.98] cursor-pointer"
                  buttonText="Book an Event →"
                />

                {/* Cafe Menu Quick View */}
                <ViewDeckMenuModal
                  buttonText="Explore Cafe Menu"
                  triggerClassName="h-12 px-6 text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-[0.98] cursor-pointer"
                />
              </div>

              {/* Trust Proof Micro-Strip */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-white/70">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#007d48]" />
                  <span>2-Day Refund &amp; Reschedule Policy</span>
                </div>
                <span>&bull;</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FFD21C]" />
                  <span>25 Bologna St., Muzon, Taytay, Rizal</span>
                </div>
              </div>
            </div>

            {/* Right Photographic Collage Column with Spatial Badges */}
            <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-2xl">
                {/* Floating Badge 1: Top Left */}
                <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 z-20 bg-white text-[#0B2A67] px-4 py-2 rounded-2xl shadow-xl border-2 border-[#bf050b] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#bf050b] animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#0B2A67]">
                    Courts Open Daily
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#bf050b]/10 text-[#bf050b]">
                    6 AM – 12 AM
                  </span>
                </div>

                {/* Main High-Res Collage Image */}
                <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10]">
                  <Image
                    src="/hero-collage.jpg"
                    alt="C&J's Events Place, Dining View Deck, and Pickleball Court"
                    fill
                    sizes="(max-width: 1024px) 100vw, 650px"
                    className="object-cover object-center"
                    priority
                  />
                  {/* Soft gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#0B2A67]/30 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating Badge 2: Bottom Right */}
                <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 z-20 bg-[#071E4B] text-white px-4 py-2.5 rounded-2xl shadow-xl border border-[#FFD21C]/40 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#bf050b] text-white flex items-center justify-center font-bold shadow-xs">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold uppercase text-[#FFD21C] block leading-none">
                      ₱350 / HR Flat Rate
                    </span>
                    <span className="text-[10px] text-white/80">Indoor Cushioned Courts 1 &amp; 2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. OUR SERVICES SECTION (with Rates & Pricing embedded)
          ======================================================== */}
      <section id="services" className="scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        {/* Section Header */}
        <div className="text-center space-y-3 mb-12">
          <div className="w-12 h-1 bg-[#FFD21C] rounded-full mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
            Our Services &amp; Rates
          </h2>
          <p className="text-base sm:text-lg text-[#64748B] font-medium max-w-2xl mx-auto">
            Explore our multi-level sports and celebration facilities in Taytay, Rizal with straightforward flat rates.
          </p>
        </div>

        {/* 3 Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Court */}
          <ServiceCard
            id="court"
            title="Pickleball & Sports Arena"
            priceBadge="₱350 / HR Flat"
            description="Indoor cushioned pickleball and basketball courts available daily from 6:00 AM to 12:00 AM. Includes sports lighting, player seating, and ₱110 paddle rentals."
            image="/service-court.jpg"
            icon={<Trophy className="w-6 h-6" />}
            ctaText="Book Court — ₱350/hr"
            isLoggedIn={!!user}
          />

          {/* Card 2: Events */}
          <ServiceCard
            id="events"
            title="C&J's Events Place & Banquet Hall"
            priceBadge="₱30K / 4-HR Rental"
            description="500-sqm fully air-conditioned 3rd-floor venue for up to 180 guests. Complete with elevator access, basic lights & sound, dressing rooms, and 15 indoor parking slots."
            image="/service-events.jpg"
            icon={<Calendar className="w-6 h-6" />}
            ctaText="Inquire Venue — ₱30K"
            isLoggedIn={!!user}
          />

          {/* Card 3: View Deck */}
          <ServiceCard
            id="viewdeck"
            title="5th-Floor View Deck Dining & Lounge"
            priceBadge="₱4K / 2-HR Consumable"
            description="150-sqm air-conditioned private lounge for up to 25 guests overlooking Metro Manila city lights. 100% consumable on cafe food and drinks, elevator access, sound system, and parking."
            image="/service-viewdeck.jpg"
            icon={<Utensils className="w-6 h-6" />}
            ctaText="Explore Menu & Venue →"
            isLoggedIn={!!user}
          />
        </div>

        {/* Court Facilities & Live Slots Sub-section */}
        <div className="mt-16 pt-12 border-t border-[#E2E8F0]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 mb-8 border-b border-[#E2E8F0] gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-1">
                <Zap className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>Indoor Courts &bull; ₱350/hr</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A67]">
                Court Options &amp; Booking
              </h3>
            </div>
            <Link
              href="/book"
              className="text-sm font-bold text-[#0B2A67] hover:text-[#123A82] flex items-center gap-1.5 transition-colors"
            >
              <span>View All Live Slots</span>
              <ArrowRight className="w-4 h-4 text-[#FFD21C]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {courts.map((court) => (
              <div
                key={court.id}
                className="group bg-white rounded-2xl sm:rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative aspect-[16/9] w-full bg-[#F5F7FA] overflow-hidden">
                  <Image
                    src={court.image}
                    alt={court.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 600px"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="inline-block bg-white/95 backdrop-blur-sm text-[#0B2A67] text-xs font-bold px-3 py-1 rounded-full border border-[#E2E8F0] shadow-xs">
                      {court.badge}
                    </span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-[#0B2A67] group-hover:text-[#123A82] transition-colors">
                      {court.name}
                    </h4>
                    <p className="text-sm text-[#64748B] pt-0.5">{court.category}</p>
                    <p className="text-xs text-[#64748B] font-medium pt-1">{court.specs}</p>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-extrabold text-[#0B2A67]">{court.price}</span>
                      <span className="text-xs text-[#64748B] ml-1">{court.rateText}</span>
                    </div>

                    <Link href="/book">
                      <Button variant="yellow" size="sm" className="px-5 font-bold cursor-pointer active:scale-[0.98]">
                        <span>Reserve Slot</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment Rentals Sub-section */}
        <div className="mt-12 pt-10 border-t border-[#E2E8F0]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-4 mb-6 border-b border-[#E2E8F0] gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>Gear &amp; Equipment</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0B2A67]">
                Equipment Rental Add-ons
              </h3>
            </div>
            <Link
              href="/pricing"
              className="text-xs sm:text-sm font-bold text-[#0B2A67] hover:text-[#123A82] flex items-center gap-1.5 transition-colors"
            >
              <span>View Full Pricing Page</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FFD21C]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            {gearItems.map((item) => (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-200"
              >
                <div className="relative aspect-video w-full rounded-xl bg-[#F5F7FA] overflow-hidden mb-3">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    className="object-cover object-center p-3 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="inline-block bg-white text-[#0B2A67] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#E2E8F0]">
                      {item.badge}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold text-[#102A56] line-clamp-1">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-[#64748B] line-clamp-1">{item.category}</p>
                  <div className="pt-2 flex items-baseline justify-between">
                    <span className="text-sm sm:text-base font-extrabold text-[#0B2A67]">{item.price}</span>
                    <span className="text-[10px] text-[#64748B]">{item.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          3. DEDICATED VIEW DECK CAFE SECTION (Separate Div Class for Cafe)
          ======================================================== */}
      <section id="cafe" className="scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#0B2A67] via-[#071E4B] to-[#041230] text-white p-8 sm:p-12 border border-white/15 shadow-2xl relative overflow-hidden">
          {/* Ambient Lighting Blurs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD21C]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#bf050b]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFD21C]/20 border border-[#FFD21C]/30 text-[#FFD21C] text-xs font-black uppercase tracking-wider">
                <Coffee className="w-3.5 h-3.5" />
                <span>5th-Floor View Deck Cafe</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold uppercase tracking-tight text-white leading-tight">
                Fresh Coffee &bull; Refreshments &bull; Skyline Views
              </h2>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl">
                Relax before or after your match on our 5th-floor air-conditioned scenic lounge. Enjoy artisan espresso brews (Spanish Latte, Sea Salt Latte, Mocha), iced matcha, fruit teas, and hearty post-game meals with a breathtaking view of Metro Manila.
              </p>

              {/* Highlights Badge Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                  <span className="font-bold text-[#FFD21C] block text-sm">Artisan Coffee</span>
                  <span className="text-white/70 text-[11px]">Espresso, Lattes &amp; Cold Brews</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm">
                  <span className="font-bold text-[#FFD21C] block text-sm">100% Consumable</span>
                  <span className="text-white/70 text-[11px]">₱4K / 2-hr Private Lounge for 25 pax</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-sm col-span-2 sm:col-span-1">
                  <span className="font-bold text-[#FFD21C] block text-sm">Scenic Skyline</span>
                  <span className="text-white/70 text-[11px]">Overlooking Metro Manila lights</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <Link href="/menu">
                  <Button
                    variant="yellow"
                    size="lg"
                    className="h-12 px-7 font-bold text-sm shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-2"
                  >
                    <span>View Coffee &amp; Food Menu</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <ViewDeckMenuModal
                  buttonText="Quick Menu Preview"
                  triggerClassName="h-12 px-6 text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-[0.98] cursor-pointer"
                />
              </div>
            </div>

            {/* Right Cafe Showcase Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 aspect-[4/3]">
                <Image
                  src="/service-viewdeck.jpg"
                  alt="C&J View Deck Dining and Cafe Lounge"
                  fill
                  sizes="(max-width: 1024px) 100vw, 450px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A67]/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs">
                  <p className="font-bold text-[#FFD21C]">View Deck Lounge &amp; Cafe</p>
                  <p className="text-white/80 text-[11px]">5th Floor &bull; Elevator Access &bull; Full Air-Conditioning</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. FACILITY GALLERY & PHOTO SHOWCASE (Genuine Showcase)
          ======================================================== */}
      <section id="gallery" className="scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="text-center space-y-3 mb-12">
          <div className="w-12 h-1 bg-[#FFD21C] rounded-full mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
            Facility Gallery
          </h2>
          <p className="text-base sm:text-lg text-[#64748B] font-medium max-w-2xl mx-auto">
            A visual tour inside C&amp;J&apos;s multi-level sports, dining, and celebration complex in Taytay, Rizal.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryImages.map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-[#E2E8F0] shadow-sm hover:shadow-xl transition-all duration-300 aspect-[4/3]"
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B2A67]/90 via-[#0B2A67]/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Floating Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className="inline-block bg-white/95 backdrop-blur-sm text-[#0B2A67] text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-[#E2E8F0] shadow-sm">
                  {item.badge}
                </span>
              </div>

              {/* Bottom Caption */}
              <div className="absolute bottom-0 inset-x-0 p-5 text-white z-10 space-y-1">
                <p className="text-[11px] font-bold text-[#FFD21C] uppercase tracking-wider">
                  {item.category}
                </p>
                <h4 className="text-base sm:text-lg font-extrabold leading-snug">
                  {item.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          5. ABOUT C&J'S — Streamlined Story & Values
          ======================================================== */}
      <section id="about" className="scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-16">
        <div className="rounded-3xl bg-[#071E4B] text-white p-8 sm:p-12 border border-white/10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#bf050b]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#FFD21C]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-0.5 bg-[#FFD21C] rounded-full" />
                <span className="text-xs font-black uppercase tracking-widest text-[#FFD21C]">
                  About C&amp;J&apos;s Events Place &amp; Court Rental
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white leading-tight">
                Built For Athletics, Celebrations &amp; Community in Rizal
              </h2>
              <p className="text-sm text-white/80 leading-relaxed">
                Located at <strong>25 Bologna St., Muzon, Taytay, Rizal</strong>, C&amp;J was created around one simple philosophy: <em>Good Food, Great Events, Active Lifestyle</em>. From our ground-floor indoor cushioned courts to our 180-pax 3rd-floor air-conditioned banquet hall and 5th-floor scenic view deck lounge overlooking Metro Manila city lights, every space is designed for memorable experiences.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                  <span className="font-bold text-[#FFD21C] block">Ground Level</span>
                  <span className="text-white/80">Indoor Cushioned Courts &bull; ₱350/HR</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                  <span className="font-bold text-[#FFD21C] block">3rd Floor Level</span>
                  <span className="text-white/80">500-sqm Hall &bull; 180 Pax &bull; ₱30K</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                  <span className="font-bold text-[#FFD21C] block">5th Floor Level</span>
                  <span className="text-white/80">View Deck &bull; 25 Pax &bull; ₱4K Consumable</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
              <Link href="/about">
                <Button
                  variant="yellow"
                  size="lg"
                  className="w-full h-12 font-bold text-sm shadow-lg active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Read Our Full Story</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="navy-outline"
                  size="lg"
                  className="w-full h-12 border-white/20 text-white hover:bg-white/10 font-bold text-xs flex items-center justify-center gap-2"
                >
                  <span>Explore Rates &amp; Packages</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          6. DIRECT VENUE HOTLINES & CONTACTS
          ======================================================== */}
      <section id="contact" className="scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="pb-6 mb-8 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] block mb-1">
              Immediate Assistance &bull; Taytay, Rizal
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A67]">
              Contacts &amp; Inquiries
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://www.tiktok.com/@cj.events.place.r"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0B2A67] text-white text-xs font-bold hover:bg-[#123A82] transition-colors"
            >
              <span>TikTok @cj.events.place.r</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sports Court */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDF4FC] text-[#0B2A67] flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2A67]">
                Court Rental (Pickleball &amp; Dual-Sport)
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Hourly slots at ₱350/hr, league reservations, coaching sessions, and walk-in play. Daily 6:00 AM &ndash; 12:00 AM.
              </p>
            </div>
            <div className="pt-6 border-t border-[#E2E8F0]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Court Hotline
              </span>
              <a
                href="tel:09173188720"
                className="inline-flex items-center gap-2 text-lg font-mono font-extrabold text-[#0B2A67] hover:underline"
              >
                <Phone className="w-4 h-4 text-[#bf050b]" />
                <span>0917-318-8720</span>
              </a>
            </div>
          </div>

          {/* Card 2: Events Place */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFD21C]/20 text-[#0B2A67] flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2A67]">
                C&amp;J&apos;s Events Place (₱30K / 4-Hr Rental)
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                500-sqm fully air-conditioned hall for up to 180 pax on the 3rd floor with elevator access, dressing rooms, and 15 indoor parking slots.
              </p>
            </div>
            <div className="pt-6 border-t border-[#E2E8F0]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                Events Hotline
              </span>
              <a
                href="tel:09171230382"
                className="inline-flex items-center gap-2 text-lg font-mono font-extrabold text-[#0B2A67] hover:underline"
              >
                <Phone className="w-4 h-4 text-[#bf050b]" />
                <span>0917-123-0382</span>
              </a>
            </div>
          </div>

          {/* Card 3: View Deck Food, Cafe & Private Venue */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDF4FC] text-[#0B2A67] flex items-center justify-center font-bold">
                <Utensils className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2A67]">
                View Deck Venue &amp; Cafe (₱4K / 2-Hr)
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                150-sqm 5th-floor air-conditioned venue for up to 25 pax with elevator access overlooking Metro Manila city lights. ₱4,000 / 2-hr consumable (+₱2,500/hr extension), sound system, and parking.
              </p>
            </div>
            <div className="pt-6 border-t border-[#E2E8F0]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block mb-1">
                View Deck &amp; Cafe Hotline
              </span>
              <a
                href="tel:09766623453"
                className="inline-flex items-center gap-2 text-lg font-mono font-extrabold text-[#0B2A67] hover:underline"
              >
                <Phone className="w-4 h-4 text-[#bf050b]" />
                <span>0976-662-3453</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          7. FREQUENTLY ASKED QUESTIONS
          ======================================================== */}
      <section id="faq" className="scroll-mt-28 w-full max-w-7xl mx-auto px-4 sm:px-8 py-16">
        <div className="pb-6 mb-8 border-b border-[#E2E8F0]">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] block mb-1">
            General Information
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A67]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-[#E2E8F0] border-t border-b border-[#E2E8F0]">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
              <h3 className="text-base font-bold text-[#0B2A67] md:w-1/3 shrink-0 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-[#FFD21C] shrink-0 mt-1" />
                <span>{faq.q}</span>
              </h3>
              <p className="text-sm text-[#64748B] leading-relaxed md:w-2/3">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}