import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { ReserveCourtModal } from "@/components/reserve-court-modal";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import { PublicNavLinks } from "@/components/public-nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import {
  MapPin,
  Clock,
  Phone,
  Calendar,
} from "lucide-react";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = "client";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = profile?.role || "client";
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#102A56] flex flex-col font-sans selection:bg-[#FFD21C] selection:text-[#0B2A67]">
      {/* 1. Deep Navy Utility Strip */}
      <div className="bg-[#071E4B] text-white/80 text-xs h-9 px-4 sm:px-8 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-tight text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FFD21C]" />
            C&amp;J&apos;s Events Place Rentals
          </span>
          <span className="text-white/30 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-white/70">
            25 Bologna Muzon, Taytay, Rizal • Daily 6:00 AM – 12:00 AM
          </span>
        </div>

        <div className="flex items-center gap-4 font-medium text-[11px] sm:text-xs">
          <span className="hidden md:inline text-white/80">
            Fixed ₱300 / hr Court Rate
          </span>
          <span className="hidden md:inline text-white/30">•</span>
          <Link href="/pricing" className="hover:text-[#FFD21C] text-white/80 transition-colors">
            Rates &amp; Gear
          </Link>
          <span className="text-white/30">•</span>
          <Link href="/book" className="hover:text-[#FFD21C] text-[#FFD21C] font-bold transition-colors">
            Live Booking
          </Link>
          <span className="text-white/30">•</span>
          {user ? (
            <Link
              href={userRole === "admin" || userRole === "owner" ? "/admin" : userRole === "coordinator" ? "/cashier/schedule" : userRole === "cashier" ? "/cashier" : "/dashboard"}
              className="hover:text-[#FFD21C] text-white font-semibold transition-colors"
            >
              My Account
            </Link>
          ) : (
            <Link href="/login" className="hover:text-[#FFD21C] text-white font-semibold transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* 2. Primary Deep Navy Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#0B2A67] border-b border-[#071E4B] shadow-md px-4 sm:px-8 h-18 sm:h-20 flex items-center justify-between transition-colors">
        {/* Left: C&J's White Card Badge Logo */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center">
            <BrandLogo variant="badge" size="md" />
          </Link>

          {/* Desktop Center Navigation with Dynamic Active Route & Section Underline */}
          <PublicNavLinks />
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Active Live Status */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#123A82] border border-white/10 text-xs font-medium text-white">
            <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
            <span className="text-[11px] font-semibold">Courts 1 &amp; 2 Open</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              {userRole === "admin" || userRole === "owner" ? (
                <Link href="/admin">
                  <Button size="sm" variant="navy-outline" className="text-xs px-3.5">
                    Admin
                  </Button>
                </Link>
              ) : userRole === "cashier" ? (
                <Link href="/cashier">
                  <Button size="sm" variant="navy-outline" className="text-xs px-3.5">
                    POS
                  </Button>
                </Link>
              ) : userRole === "coordinator" ? (
                <Link href="/cashier/schedule">
                  <Button size="sm" variant="navy-outline" className="text-xs px-3.5">
                    Court Schedule
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button size="sm" variant="navy-outline" className="text-xs px-3.5">
                    Pass &amp; Bookings
                  </Button>
                </Link>
              )}

              <Link href="/book">
                <Button size="sm" variant="yellow" className="text-xs px-4 h-9">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  <span>Book Now</span>
                </Button>
              </Link>

              <form action={logout}>
                <SignOutButton
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-red-300 hover:bg-white/10 text-xs h-8 px-2.5 sm:px-3 flex items-center gap-1.5 cursor-pointer transition-colors"
                />
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-block">
                <Button variant="ghost" size="sm" className="text-white hover:text-[#FFD21C] hover:bg-white/10 text-xs font-semibold">
                  Sign In
                </Button>
              </Link>
              {/* Primary Yellow Book Now Button */}
              <ReserveCourtModal
                isLoggedIn={!!user}
                buttonText="Book Now"
                triggerSize="sm"
                triggerVariant="yellow"
                triggerClassName="bg-[#FFD21C] text-[#0B2A67] hover:bg-[#E8BA00] font-bold text-xs sm:text-sm px-5 h-9 rounded-full shadow-sm hover:shadow transition-all"
              />
            </div>
          )}

          {/* Mobile Drawer Trigger */}
          <PublicMobileNav userRole={userRole} isLoggedIn={!!user} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* 3. Deep Navy Footer */}
      <footer className="bg-[#071E4B] text-white pt-16 pb-12 px-6 sm:px-12 mt-20 border-t border-[#0B2A67]">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Top Row: Brand, Nav & Socials */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b border-white/10">
            {/* Left: Brand Logo */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <Link href="/">
                <BrandLogo variant="inverted" size="lg" />
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm font-medium text-white/90">
              <Link href="/" className="hover:text-[#FFD21C] transition-colors">
                Home
              </Link>
              <Link href="/menu" className="hover:text-[#FFD21C] transition-colors">
                Coffee Menu
              </Link>
              <Link href="/about" className="hover:text-[#FFD21C] transition-colors">
                About
              </Link>
              <Link href="/pricing" className="hover:text-[#FFD21C] transition-colors">
                Pricing
              </Link>
              <Link href="/#services" className="hover:text-[#FFD21C] transition-colors">
                Services
              </Link>
              <Link href="/#gallery" className="hover:text-[#FFD21C] transition-colors">
                Gallery
              </Link>
              <Link href="/#contact" className="hover:text-[#FFD21C] transition-colors">
                Contact
              </Link>
            </nav>

            {/* Right: Social Media Icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61557876219635"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FFD21C] hover:text-[#0B2A67] text-white flex items-center justify-center transition-all duration-200"
                aria-label="C&J Facebook Page"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FFD21C] hover:text-[#0B2A67] text-white flex items-center justify-center transition-all duration-200"
                aria-label="C&J Instagram"
              >
                <svg className="w-5 h-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-[#FFD21C] hover:text-[#0B2A67] text-white flex items-center justify-center transition-all duration-200"
                aria-label="C&J TikTok"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.76 1.12-.03 2.19-.6 2.77-1.57.34-.54.51-1.18.5-1.82V.02z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Middle Row: Venue Information & Hotlines */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm text-white/70">
            {/* Col 1 */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-base uppercase tracking-wider">
                C&amp;J&apos;s Events Place Rentals
              </h4>
              <p className="leading-relaxed text-xs">
                Taytay, Rizal&apos;s premier multi-level sports and celebrations complex. 25 Bologna St., Muzon. Featuring indoor cushioned courts, 180-pax air-conditioned banquet hall, and 5th-floor scenic view deck.
              </p>
              <Link href="/about" className="inline-flex items-center gap-1 text-xs font-bold text-[#FFD21C] hover:underline">
                <span>Learn more about C&amp;J &rarr;</span>
              </Link>
            </div>

            {/* Col 2 */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                Court Inquiries (₱300/HR)
              </h4>
              <p className="text-xs">Indoor cushioned pickleball &amp; dual-sport courts. Daily 6 AM &ndash; 10 PM.</p>
              <a href="tel:09173188720" className="inline-flex items-center gap-2 text-white hover:text-[#FFD21C] font-mono text-sm font-bold">
                <Phone className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>0917-318-8720</span>
              </a>
            </div>

            {/* Col 3 */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                Events Place (₱30K / 4-HR)
              </h4>
              <p className="text-xs">3rd Floor 500-sqm hall, 180 pax capacity, full A/C, elevator, dressing rooms &amp; parking.</p>
              <a href="tel:09171230382" className="inline-flex items-center gap-2 text-white hover:text-[#FFD21C] font-mono text-sm font-bold">
                <Phone className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>0917-123-0382</span>
              </a>
            </div>

            {/* Col 4 */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                View Deck (₱4K / 2-HR)
              </h4>
              <p className="text-xs">5th Floor 150-sqm consumable lounge for 25 pax with elevator overlooking city lights.</p>
              <a href="tel:09766623453" className="inline-flex items-center gap-2 text-white hover:text-[#FFD21C] font-mono text-sm font-bold">
                <Phone className="w-3.5 h-3.5 text-[#FFD21C]" />
                <span>0976-662-3453</span>
              </a>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Motto */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
            <div>
              &copy; {new Date().getFullYear()} C&amp;J&apos;s Events Place Rentals. All rights reserved.
            </div>

            <div className="font-serif italic text-sm sm:text-base text-[#FFD21C] tracking-wide">
              Good Food &nbsp;•&nbsp; Great Events &nbsp;•&nbsp; Active Lifestyle
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}