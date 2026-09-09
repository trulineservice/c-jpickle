import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { ReserveCourtModal } from "@/components/reserve-court-modal";
import { PublicMobileNav } from "@/components/public-mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  MapPin,
  Clock,
  Phone,
  Search,
  CheckCircle2,
  Calendar,
  LogOut,
  ChevronRight
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-foreground selection:text-background transition-colors duration-150">
      {/* 1. Utility Bar (Soft-Cloud Strip) */}
      <div className="bg-[#f5f5f5] dark:bg-[#121215] text-foreground text-xs h-9 px-4 sm:px-8 flex items-center justify-between border-b border-[#e5e5e5] dark:border-[#222226]">
        <div className="flex items-center gap-3">
          <span className="font-semibold tracking-tight text-foreground">
            C&amp;J Pickleball Arena QC
          </span>
          <span className="text-[#cacacb] dark:text-[#3f3f46]">•</span>
          <span className="hidden sm:inline text-[#707072] dark:text-[#a1a1aa]">
            Tomas Morato, Quezon City • Daily 6:00 AM – 10:00 PM
          </span>
        </div>

        <div className="flex items-center gap-4 font-medium text-[11px] sm:text-xs">
          <span className="hidden md:inline text-[#707072] dark:text-[#a1a1aa]">
            Fixed ₱300 / hr Flat Rate
          </span>
          <span className="hidden md:inline text-[#cacacb] dark:text-[#3f3f46]">•</span>
          <Link href="/pricing" className="hover:text-foreground text-[#707072] dark:text-[#a1a1aa] transition-colors">
            Court Specs
          </Link>
          <span className="text-[#cacacb] dark:text-[#3f3f46]">•</span>
          <Link href="/book" className="hover:text-foreground text-[#707072] dark:text-[#a1a1aa] transition-colors font-semibold">
            Live Booking
          </Link>
          <span className="text-[#cacacb] dark:text-[#3f3f46]">•</span>
          {user ? (
            <Link
              href={userRole === "admin" || userRole === "owner" ? "/admin" : userRole === "cashier" ? "/cashier" : "/dashboard"}
              className="hover:text-foreground text-foreground transition-colors font-semibold"
            >
              My Account
            </Link>
          ) : (
            <Link href="/login" className="hover:text-foreground text-foreground transition-colors font-semibold">
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* 2. Primary Nav Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-[#e5e5e5] dark:border-[#222226] px-4 sm:px-8 h-16 flex items-center justify-between transition-colors">
        {/* Left: Brand Logo */}
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center">
            <BrandLogo size="md" withSubtitle />
          </Link>

          {/* Center Links (Desktop) */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium text-foreground">
            <Link
              href="/"
              className="py-1 hover:text-[#707072] dark:hover:text-[#a1a1aa] transition-colors relative"
            >
              Arena Home
            </Link>
            <Link
              href="/book"
              className="py-1 hover:text-[#707072] dark:hover:text-[#a1a1aa] transition-colors flex items-center gap-1.5"
            >
              <span>Book Court</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
                ₱300/HR
              </span>
            </Link>
            <Link
              href="/pricing"
              className="py-1 hover:text-[#707072] dark:hover:text-[#a1a1aa] transition-colors"
            >
              Rates &amp; Gear
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Active Courts Live Signal */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent dark:border-[#27272a] text-xs font-medium text-foreground">
            <span className="w-2 h-2 rounded-full bg-[#007d48] dark:bg-[#10b981]" />
            <span className="text-[11px] font-medium">Courts 1 &amp; 2 Open</span>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle variant="icon" />

          {user ? (
            <div className="flex items-center gap-2">
              {userRole === "admin" || userRole === "owner" ? (
                <Link href="/admin">
                  <Button size="sm" variant="secondary" className="text-xs px-3.5">
                    Admin
                  </Button>
                </Link>
              ) : userRole === "cashier" ? (
                <Link href="/cashier">
                  <Button size="sm" variant="secondary" className="text-xs px-3.5">
                    POS
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button size="sm" variant="secondary" className="text-xs px-3.5">
                    Pass &amp; Bookings
                  </Button>
                </Link>
              )}

              <Link href="/book">
                <Button size="sm" className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 text-xs px-4">
                  Book Slot
                </Button>
              </Link>

              <form action={logout}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="text-[#707072] dark:text-[#a1a1aa] hover:text-[#d30005] hover:bg-[#fff5f5] dark:hover:bg-red-950/20 text-xs h-8 px-2.5 sm:px-3 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="hidden sm:inline-block">
                <Button variant="ghost" size="sm" className="text-foreground text-xs font-medium">
                  Sign In
                </Button>
              </Link>
              <ReserveCourtModal
                isLoggedIn={!!user}
                buttonText="Book Court"
                triggerSize="sm"
                triggerClassName="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-zinc-200 text-xs px-5"
              />
            </div>
          )}

          {/* Mobile Drawer Trigger */}
          <PublicMobileNav userRole={userRole} isLoggedIn={!!user} />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* 3. Footer */}
      <footer className="border-t border-[#cacacb] dark:border-[#222226] bg-white dark:bg-[#0c0c0e] pt-16 pb-12 px-6 sm:px-12 mt-20 transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Col 1: Brand & Identity */}
          <div className="space-y-4">
            <BrandLogo size="md" withSubtitle />
            <p className="text-sm text-[#707072] dark:text-[#a1a1aa] leading-relaxed pt-2 max-w-sm">
              Metro Manila&apos;s tournament-grade indoor pickleball arena. 
              Featuring USA Pickleball certified 8mm polyurethane cushioned courts, 
              850-lux lighting, pro carbon paddle rentals, and instant PayMongo checkout.
            </p>
          </div>

          {/* Col 2: Fast Navigation */}
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground mb-5 uppercase">
              Court Reservations
            </h4>
            <ul className="space-y-3 text-sm text-[#707072] dark:text-[#a1a1aa]">
              <li>
                <Link href="/book" className="hover:text-foreground transition-colors">
                  Court 1 — Indoor (Pro Cushion)
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-foreground transition-colors">
                  Court 2 — Indoor (Tournament Spec)
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  Hourly Rates &amp; Multi-Hour Blocks
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  Pro Carbon Paddle Rentals (₱150)
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Digital QR Pass &amp; Check-In
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Specifications */}
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground mb-5 uppercase">
              Arena Specifications
            </h4>
            <ul className="space-y-3 text-sm text-[#707072] dark:text-[#a1a1aa]">
              <li>Official 20&apos; × 44&apos; USAP Dimensions</li>
              <li>8mm Multi-Layer Polyurethane Cushion</li>
              <li>7-Foot Non-Volley Zone (The Kitchen)</li>
              <li>36&quot; Post / 34&quot; Center Tension Nets</li>
              <li>Air-Conditioned Indoor Lounge &amp; Lockers</li>
            </ul>
          </div>

          {/* Col 4: Location & Operating Hours */}
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground mb-5 uppercase">
              Arena Contact
            </h4>
            <div className="space-y-3 text-sm text-[#707072] dark:text-[#a1a1aa]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-foreground shrink-0 mt-0.5" />
                <span>Tomas Morato Avenue, Quezon City, Metro Manila</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-foreground shrink-0" />
                <span>Open Daily: 6:00 AM – 10:00 PM</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-foreground shrink-0" />
                <span>+63 (917) 555-CJCOURT</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1px Hairline Divider */}
        <div className="border-t border-[#cacacb] dark:border-[#222226] pt-8 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-[#707072] dark:text-[#a1a1aa] gap-4">
          <div className="flex items-center gap-2">
            <span className="text-foreground font-semibold">Philippines</span>
            <span>&copy; {new Date().getFullYear()} C&amp;J Pickleball Arena Inc. All Rights Reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[11px] text-[#707072] dark:text-[#a1a1aa]">
            <span className="text-[#007d48] dark:text-[#10b981] font-medium">
              Strict 24-Hour Refundable Cancellation Guarantee
            </span>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Rules of the Kitchen
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}