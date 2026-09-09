import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { logout } from "@/app/actions";
import { BrandLogo } from "@/components/brand-logo";
import { DashboardMobileNav } from "@/components/dashboard-mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ShoppingCart,
  Calendar,
  LogOut,
  ShieldAlert,
  Home,
  Users
} from "lucide-react";

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

      {/* Clean Editorial Sidebar */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-[#0e0e11] border-r border-[#cacacb] dark:border-[#222226] flex-col justify-between shrink-0 transition-colors">
        <div>
          {/* Brand Logo Header */}
          <div className="p-6 border-b border-[#cacacb] dark:border-[#222226] space-y-4">
            <Link href="/" className="flex items-center">
              <BrandLogo size="sm" withSubtitle />
            </Link>

            {/* Staff Card */}
            <div className="p-3 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] flex items-center justify-center font-bold text-xs shrink-0">
                {profile?.full_name?.charAt(0) || "U"}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-foreground truncate">{profile?.full_name || user.email}</p>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93]">
                  {userRole} Terminal
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="text-[10px] font-bold text-[#707072] dark:text-[#8a8a93] uppercase tracking-widest px-3 mb-2 mt-2">
              Operations
            </div>

            <Link
              href="/cashier"
              className="flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-semibold text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              POS Register
            </Link>

            <Link
              href="/cashier/schedule"
              className="flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-semibold text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
            >
              <Calendar className="h-4 w-4" />
              Daily Court Schedule
            </Link>

            <Link
              href="/cashier/reports"
              className="flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-semibold text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Shift Reports
            </Link>

            {isOwnerOrAdmin && (
              <>
                <div className="text-[10px] font-bold text-[#707072] dark:text-[#8a8a93] uppercase tracking-widest px-3 mb-2 mt-6">
                  Administration
                </div>

                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-semibold text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
                >
                  <ShieldAlert className="h-4 w-4" />
                  Financial Audit
                </Link>

                <Link
                  href="/admin/courts"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-semibold text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Manage Courts
                </Link>

                <Link
                  href="/admin/players"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-full text-xs font-semibold text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Players &amp; History
                </Link>
              </>
            )}

            <div className="text-[10px] font-bold text-[#707072] dark:text-[#8a8a93] uppercase tracking-widest px-3 mb-2 mt-6">
              Shortcuts
            </div>

            <Link
              href="/book"
              className="flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              Public Booking
            </Link>

            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-full text-xs font-medium text-[#707072] dark:text-[#8a8a93] hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1e] transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              Arena Homepage
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer: Theme Toggle */}
        <div className="p-4 border-t border-[#cacacb] dark:border-[#222226] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#707072] dark:text-[#8a8a93]">
            Appearance
          </span>
          <ThemeToggle variant="compact" />
        </div>
      </aside>

      {/* Main Terminal Area with Persistent Header */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-background">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 border-b border-[#cacacb] dark:border-[#222226] px-6 sm:px-8 items-center justify-between bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-xs sticky top-0 z-30 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
              C&amp;J Arena
            </span>
            <span className="text-[#cacacb] dark:text-[#27272a]">•</span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-[11px] font-semibold text-foreground border border-[#cacacb] dark:border-[#27272a]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#007d48] dark:bg-[#10b981]" />
              <span className="capitalize">{userRole} Console</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle variant="icon" />

            <div className="text-right hidden lg:block">
              <p className="text-xs font-bold text-foreground leading-tight">
                {profile?.full_name || user.email}
              </p>
              <p className="text-[10px] text-[#707072] dark:text-[#8a8a93] leading-tight">
                {user.email}
              </p>
            </div>

            <form action={logout}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="border-[#cacacb] dark:border-[#27272a] text-foreground hover:text-[#d30005] hover:border-[#d30005]/40 hover:bg-[#fff5f5] dark:hover:bg-red-950/20 text-xs font-semibold h-9 px-4 gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
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