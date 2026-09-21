import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardMobileNav } from "@/components/dashboard-mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import {
  ShoppingCart,
  Calendar,
  LogOut,
  ShieldAlert,
  Home,
  Users,
  Boxes,
  TrendingDown
} from "lucide-react";

import { DashboardNavLinks } from "@/components/dashboard-nav-links";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role || "client";
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground font-sans transition-colors duration-150">
      {/* Mobile Top Navigation Bar */}
      <DashboardMobileNav
        userRole={userRole}
        userName={profile?.full_name || user.email || "Staff"}
        isOwnerOrAdmin={isOwnerOrAdmin}
      />

      {/* High-Impact Executive Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-[#071E4B] border-r border-[#E2E8F0] dark:border-white/10 flex-col justify-between shrink-0 transition-colors shadow-sm">
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-[#E2E8F0] dark:border-white/10 space-y-4">
            <Link href="/" className="flex items-center justify-center">
              <BrandLogo size="sm" withSubtitle />
            </Link>

            {/* Staff Badge Card */}
            <div className="p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-white/15 bg-[#F8FAFC] dark:bg-[#030F28] flex items-center gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                {profile?.full_name?.charAt(0).toUpperCase() || "S"}
              </div>
              <div className="truncate">
                <p className="text-xs font-extrabold text-[#0B2A67] dark:text-white truncate">
                  {profile?.full_name || user.email}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#007d48] dark:bg-[#52d694] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#FFD21C] dark:text-[#FFD21C]">
                    {userRole} Terminal
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links with Active Indicator */}
          <DashboardNavLinks isOwnerOrAdmin={isOwnerOrAdmin} />
        </div>

        {/* Sidebar Footer: Theme Toggle */}
        <div className="p-4 border-t border-[#E2E8F0] dark:border-white/10 flex items-center justify-between bg-[#F8FAFC] dark:bg-[#030F28]">
          <span className="text-xs font-bold text-[#64748B] dark:text-white/70">
            Appearance
          </span>
          <ThemeToggle variant="compact" />
        </div>
      </aside>

      {/* Main Terminal Area with Persistent Header */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-background">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 border-b border-[#E2E8F0] dark:border-white/10 px-6 sm:px-8 items-center justify-between bg-white/95 dark:bg-[#071E4B]/95 backdrop-blur-md sticky top-0 z-30 transition-colors shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#0B2A67] dark:text-[#FFD21C]">
              C&amp;J Arena
            </span>
            <span className="text-[#64748B] dark:text-white/30">•</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDF4FC] dark:bg-white/10 text-xs font-black text-[#0B2A67] dark:text-white border border-[#0B2A67]/20 dark:border-white/20">
              <span className="w-2 h-2 rounded-full bg-[#007d48] dark:bg-[#52d694] animate-pulse" />
              <span className="capitalize">{userRole} Console Active</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle variant="icon" />

            <div className="text-right hidden lg:block">
              <p className="text-xs font-black text-[#0B2A67] dark:text-white leading-tight">
                {profile?.full_name || user.email}
              </p>
              <p className="text-[10px] font-medium text-[#64748B] dark:text-white/70 leading-tight">
                {user.email}
              </p>
            </div>

            <form action={logout}>
              <SignOutButton
                variant="outline"
                size="sm"
                className="border-[#E2E8F0] dark:border-white/20 text-[#0B2A67] dark:text-white hover:text-[#bf050b] hover:border-[#bf050b]/40 hover:bg-[#bf050b]/10 text-xs font-bold h-9 px-4 gap-1.5 transition-colors cursor-pointer rounded-xl"
              />
            </form>
          </div>
        </header>

        {/* Main Terminal Content */}
        <main className="flex-1 overflow-auto bg-background text-foreground">
          {children}
        </main>
      </div>
    </div>
  );
}