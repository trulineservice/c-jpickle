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
  CheckCircle2,
  Sparkles,
  Flame,
  Clock,
  MapPin,
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
      price: "₱300",
      rateText: "/ hour",
      specs: "Standard Court • Cushioned Surface",
      image: "/service-court.jpg",
    },
    {
      id: "court-2",
      name: "Court 2 — Indoor (Pickleball / Basketball)",
      category: "Multi-Sport Court",
      badge: "Pickleball & Basketball",
      price: "₱300",
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
      price: "₱150",
      type: "Per Session",
      badge: "Rental",
      image: "/gear-paddle.jpg",
    },
    {
      id: "gear-thrower",
      name: "Automatic Ball Machine",
      category: "Practice Machine",
      price: "₱150",
      type: "Add-On / Hour",
      badge: "Add-On",
      image: "/gear-ball-thrower.png",
    },
  ];

  const faqs = [
    {
      q: "How does live online court booking work at C&J?",
      a: "Select your desired date, choose single or contiguous multi-hour slots, add optional paddle rentals, and pay securely via PayMongo with GCash, Maya, or card. You will receive an instant digital QR check-in pass.",
    },
    {
      q: "How do I reserve C&J's Events Place for private occasions?",
      a: "Our rate is ₱30,000 for a 4-hour venue rental. This includes our 500-sqm fully air-conditioned hall with 180 pax capacity, basic lights & sound system, dressing room access, 3rd floor elevator access, and 15 indoor parking slots. Click 'Book an Event' or call 0917-123-0382.",
    },
    {
      q: "What is the View Deck rental rate?",
      a: "The View Deck is a 150-sqm 5th-floor venue with elevator access overlooking Metro Manila city lights. The rental is ₱4,000 for 2 hours and is 100% consumable on food and drinks (additional ₱2,500 per 1-hour extension). Accommodates up to 25 guests with full air-conditioning, a basic sound system, and parking. Call 0976-662-3453.",
    },
    {
      q: "What is your cancellation and refund policy?",
      a: "We maintain a 2-day (48-hour) refundable cancellation policy. Cancel at least 2 days prior to your match time for a 100% full refund directly to your original payment method. Cancellations within 2 days are non-refundable, but players can easily reschedule their booking to any available date and time.",
    },
    {
      q: "What footwear is required on the courts?",
      a: "Clean, non-marking athletic or court shoes are required to protect the cushioned indoor surface.",
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
                  <span className="text-white font-bold">Pickleball/Basketball</span>
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
                    <span>Reserve Court</span>
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
                    6 AM – 10 PM
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
                      ₱300 / HR Flat
                    </span>
                    <span className="text-[10px] text-white/80">Courts 1 &amp; 2 Indoor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. OUR SERVICES SECTION — 3 Premium Rounded Cards
          ======================================================== */}
      <section id="services" className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
        {/* Section Header */}
        <div className="text-center space-y-3 mb-12">
          <div className="w-12 h-1 bg-[#FFD21C] rounded-full mx-auto" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B2A67] uppercase">
            Our Services
          </h2>
          <p className="text-base sm:text-lg text-[#64748B] font-medium">
            Great spaces for every occasion in Taytay, Rizal
          </p>
        </div>

        {/* 3 Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: View Deck */}
          <ServiceCard
            id="viewdeck"
            title="View Deck Dining & Private Venue"
            description="150-sqm 5th-floor air-conditioned venue for up to 25 guests overlooking Metro Manila city lights. ₱4,000 for 2 hours (consumable on food & drinks). Elevator access, sound system, and 15 indoor parking slots."
            image="/service-viewdeck.jpg"
            icon={<Utensils className="w-6 h-6" />}
            ctaText="Explore Menu & Venue →"
            isLoggedIn={!!user}
          />

          {/* Card 2: Events */}
          <ServiceCard
            id="events"
            title="C&J's Events Place & Banquet Hall"
            description="Celebrate in our 500-sqm fully air-conditioned venue for up to 180 guests with elevator access and 15 indoor parking slots. ₱30K for 4 hours."
            image="/service-events.jpg"
            icon={<Calendar className="w-6 h-6" />}
            ctaText="Book an Event →"
            isLoggedIn={!!user}
          />

          {/* Card 3: Court */}
          <ServiceCard
            id="court"
            title="Pickleball & Sports Arena"
            description="Indoor cushioned pickleball and basketball courts available daily from 6:00 AM to 12:00 AM."
            image="/service-court.jpg"
            icon={<Trophy className="w-6 h-6" />}
            ctaText="Book a Court →"
            isLoggedIn={!!user}
          />
        </div>
      </section>


      {/* ========================================================
          4. BENEFITS / WHY C&J'S BANNER — Light Blue Surface
          ======================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 pb-16">
        <div className="rounded-2xl sm:rounded-3xl bg-[#EDF4FC] border border-[#E2E8F0] p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Item 1 */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-xs">
                <Star className="w-5 h-5 text-[#0B2A67]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#0B2A67] tracking-tight">
                  Cushioned Indoor Flooring
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Shock-absorbing court surface designed for comfortable, low-impact play.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-xs">
                <Utensils className="w-5 h-5 text-[#0B2A67]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#0B2A67] tracking-tight">
                  View Deck Cafe
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Freshly brewed coffee, refreshments, and meals served daily with skyline views.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5 text-[#0B2A67]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#0B2A67] tracking-tight">
                  500 sqm • 180 Pax Capacity
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Full centralized A/C, basic sound &amp; lights, elevator access, dressing rooms, and 15 indoor parking slots.
                </p>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-[#007d48]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#0B2A67] tracking-tight">
                  2-Day Refund &amp; Reschedule Policy
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  100% refund on cancellations made at least 2 days ahead. Within 2 days, players can flexibly reschedule their session.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          ABOUT C&J'S — Our Facility & Story
          ======================================================== */}
      <section id="about" className="w-full max-w-7xl mx-auto px-4 sm:px-8 pb-16">
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
                Located at <strong>25 Bologna St., Muzon, Taytay, Rizal</strong>, C&amp;J was created around one simple philosophy: <em>Good Food, Great Events, Active Lifestyle</em>. From our indoor cushioned courts to our 180-pax 3rd-floor air-conditioned banquet hall and 5th-floor scenic view deck lounge overlooking Metro Manila city lights, every space is designed for memorable experiences.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                  <span className="font-bold text-[#FFD21C] block">Ground Level</span>
                  <span className="text-white/80">Indoor Cushioned Courts &bull; ₱300/HR</span>
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
          5. FEATURED COURTS & LIVE AVAILABILITY PREVIEW
          ======================================================== */}
      <section id="gallery" className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 mb-8 border-b border-[#E2E8F0] gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-1">
              <Zap className="w-3.5 h-3.5 text-[#FFD21C]" />
              <span>Court Facilities &amp; Rates</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A67]">
              Indoor Sports Courts
            </h2>
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
                  <h3 className="text-xl font-bold text-[#0B2A67] group-hover:text-[#123A82] transition-colors">
                    {court.name}
                  </h3>
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
      </section>

      {/* ========================================================
          6. EQUIPMENT RENTALS & ADD-ONS
          ======================================================== */}
      <section id="gear" className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 mb-8 border-b border-[#E2E8F0] gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFD21C]" />
              <span>Court Add-ons</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A67]">
              Equipment Rentals
            </h2>
          </div>
          <Link
            href="/book"
            className="text-sm font-bold text-[#0B2A67] hover:text-[#123A82] flex items-center gap-1.5 transition-colors"
          >
            <span>Reserve With Court Booking</span>
            <ArrowRight className="w-4 h-4 text-[#FFD21C]" />
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
      </section>

      {/* ========================================================
          7. DIRECT VENUE HOTLINES (Court, Events, Cafe)
          ======================================================== */}
      <section id="contact" className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="pb-6 mb-8 border-b border-[#E2E8F0]">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] block mb-1">
            Immediate Assistance
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B2A67]">
            Call for Inquiries &amp; Reservations
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sports Court */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDF4FC] text-[#0B2A67] flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0B2A67]">
                Court Rental (Pickleball &amp; Basketball)
              </h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Hourly slots, league reservations, coaching drills, and open-play tournament sessions.
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
                150-sqm 5th-floor air-conditioned venue for up to 25 pax with elevator access overlooking Metro Manila city lights. ₱4,000 / 2-hr consumable (+₱2,500/hr), sound system, and 15 indoor parking slots.
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
          8. FREQUENTLY ASKED QUESTIONS
          ======================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-12">
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
              <h3 className="text-base font-bold text-[#0B2A67] md:w-1/3 shrink-0">
                {faq.q}
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