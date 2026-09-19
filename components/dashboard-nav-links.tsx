"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Boxes,
  TrendingDown,
  Calendar,
  ShieldAlert,
  Users,
  Home,
} from "lucide-react";
import { playHapticSound } from "@/lib/motion-feedback";

interface DashboardNavLinksProps {
  isOwnerOrAdmin: boolean;
}

export function DashboardNavLinks({ isOwnerOrAdmin }: DashboardNavLinksProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    playHapticSound("tap");
  };

  const navItems = [
    {
      section: "OPERATIONS",
      items: [
        { href: "/cashier", label: "POS Register", icon: ShoppingCart },
        { href: "/cashier/inventory", label: "Inventory Table", icon: Boxes },
        { href: "/cashier/expenses", label: "Daily Expenses & Margins", icon: TrendingDown },
        { href: "/cashier/reports", label: "Shift Reports", icon: ShoppingCart },
        { href: "/cashier/schedule", label: "Daily Court Schedule", icon: Calendar },
      ],
    },
  ];

  if (isOwnerOrAdmin) {
    navItems.push({
      section: "ADMINISTRATION",
      items: [
        { href: "/admin", label: "Financial Audit", icon: ShieldAlert },
        { href: "/admin/courts", label: "Manage Courts", icon: Calendar },
        { href: "/admin/players", label: "Players & History", icon: Users },
      ],
    });
  }

  const shortcutItems = [
    { href: "/book", label: "Public Booking", icon: Calendar },
    { href: "/", label: "Arena Homepage", icon: Home },
  ];

  return (
    <nav className="p-4 space-y-6">
      {navItems.map((group) => (
        <div key={group.section} className="space-y-1">
          <div className="text-[10px] font-black uppercase tracking-widest text-[#0B2A67] dark:text-[#FFD21C] px-3 mb-2">
            {group.section}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all relative group cursor-pointer ${
                  isActive
                    ? "bg-[#0B2A67] text-white shadow-md border-l-4 border-l-[#FFD21C]"
                    : "text-[#64748B] dark:text-white/80 hover:bg-[#EDF4FC] dark:hover:bg-white/10 hover:text-[#0B2A67] dark:hover:text-white"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-[#FFD21C]" : "text-[#64748B] dark:text-white/60 group-hover:text-[#0B2A67] dark:group-hover:text-white"
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#FFD21C] animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      ))}

      {/* Shortcuts */}
      <div className="space-y-1 pt-2 border-t border-[#E2E8F0] dark:border-white/10">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#64748B] dark:text-white/50 px-3 mb-2 mt-2">
          SHORTCUTS
        </div>
        {shortcutItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#64748B] dark:text-white/70 hover:text-[#0B2A67] dark:hover:text-white hover:bg-[#EDF4FC] dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Icon className="h-3.5 w-3.5 text-[#64748B] dark:text-white/50" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
