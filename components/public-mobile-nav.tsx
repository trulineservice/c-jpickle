'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calendar, ArrowRight, User, LogOut, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/actions';
import { BrandLogo } from '@/components/brand-logo';
import { SignOutButton } from '@/components/sign-out-button';
import { ReserveCourtModal } from '@/components/reserve-court-modal';

interface PublicMobileNavProps {
  userRole?: string;
  isLoggedIn: boolean;
}

export function PublicMobileNav({ userRole, isLoggedIn }: PublicMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isCurrent = (href: string) => {
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname === href) return true;
    return false;
  };

  return (
    <div className="lg:hidden flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        {isOpen ? <X className="w-6 h-6 text-[#FFD21C]" /> : <Menu className="w-6 h-6 text-white" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 top-[64px] z-50 bg-[#0B2A67] border-t border-white/10 flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-top-2 duration-200 text-white">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <BrandLogo size="sm" variant="badge" />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white"
                aria-label="Close menu"
              >
                <X className="w-6 h-6 text-[#FFD21C]" />
              </button>
            </div>

            <nav className="space-y-3">
              {[
                { label: "Home", href: "/" },
                { label: "About", href: "/about" },
                { label: "Pricing & Rates", href: "/pricing" },
                { label: "Services", href: "/#services" },
                { label: "Gallery", href: "/#gallery" },
                { label: "Contact", href: "/#contact" },
              ].map((item) => {
                const active = isCurrent(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between py-2 text-xl font-bold tracking-tight transition-colors ${
                      active ? "text-[#FFD21C]" : "text-white hover:text-[#FFD21C]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-[#FFD21C] shadow-xs" />
                    )}
                  </Link>
                );
              })}

              {/* Book Court & Events Place Primary CTAs */}
              <div className="pt-3 space-y-2">
                <Link
                  href="/book"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#FFD21C] text-[#0B2A67] font-bold text-base shadow-md hover:bg-[#E8BA00] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>Book Pickleball Court</span>
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/book-events"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-amber-500 text-white font-bold text-base shadow-md hover:bg-amber-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>🎉 Book Events Place &amp; Lounge</span>
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {isLoggedIn ? (
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs uppercase tracking-widest text-white/60 font-semibold mb-3">
                    My Account
                  </div>
                  {userRole === 'admin' || userRole === 'owner' ? (
                    <Link
                      href="/admin"
                      onClick={() => setIsOpen(false)}
                      className="block text-base font-semibold text-white hover:text-[#FFD21C] mb-2"
                    >
                      Admin Center
                    </Link>
                  ) : userRole === 'cashier' ? (
                    <Link
                      href="/cashier"
                      onClick={() => setIsOpen(false)}
                      className="block text-base font-semibold text-white hover:text-[#FFD21C] mb-2"
                    >
                      Cashier POS
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="block text-base font-semibold text-white hover:text-[#FFD21C] mb-2"
                    >
                      Player Pass &amp; Bookings
                    </Link>
                  )}
                  <form action={logout}>
                    <SignOutButton
                      isLinkStyle={true}
                      className="text-sm font-semibold text-red-400 hover:underline pt-2 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    />
                  </form>
                </div>
              ) : (
                <div className="pt-4 border-t border-white/10 space-y-2.5">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full"
                  >
                    <Button
                      variant="navy-outline"
                      size="lg"
                      className="w-full text-sm font-semibold"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsOpen(false)}
                    className="block w-full"
                  >
                    <Button
                      variant="yellow"
                      size="lg"
                      className="w-full text-sm font-bold"
                    >
                      Join C&amp;J Club
                    </Button>
                  </Link>
                </div>
              )}
            </nav>
          </div>

          <div className="pt-6 border-t border-white/10 text-xs text-white/70 space-y-2">
            <p className="font-semibold text-white">C&amp;J&apos;s Events Place Rentals</p>
            <p>25 Bologna Muzon, Taytay, Rizal • Daily 6:00 AM – 10:00 PM</p>
            <div className="pt-2 border-t border-white/10 text-[11px] space-y-1">
              <p className="font-medium text-[#FFD21C]">Hotlines:</p>
              <p>Court Rental: <a href="tel:09173188720" className="text-white hover:underline font-mono">0917-318-8720</a></p>
              <p>Events Place: <a href="tel:09171230382" className="text-white hover:underline font-mono">0917-123-0382</a></p>
              <p>View Deck Cafe: <a href="tel:09766623453" className="text-white hover:underline font-mono">0976-662-3453</a></p>
            </div>
            <div className="pt-2">
              <a
                href="https://www.facebook.com/profile.php?id=61557876219635"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FFD21C] hover:underline"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Follow on Facebook</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
