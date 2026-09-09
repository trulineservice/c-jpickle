'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import {
  Menu,
  X,
  ShoppingCart,
  Calendar,
  ShieldAlert,
  Home,
  LogOut,
  Users
} from 'lucide-react';
import { logout } from '@/app/actions';

interface DashboardMobileNavProps {
  userRole: string;
  userName: string;
  isOwnerOrAdmin: boolean;
}

export function DashboardMobileNav({
  userRole,
  userName,
  isOwnerOrAdmin,
}: DashboardMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden sticky top-0 z-50 bg-white border-b border-[#cacacb] px-4 py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center">
        <BrandLogo size="sm" />
      </Link>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#111111] bg-[#f5f5f5] border border-[#cacacb] px-2.5 py-0.5 rounded-full">
          {userRole}
        </span>
        <form action={logout}>
          <Button
            variant="outline"
            size="sm"
            type="submit"
            className="h-8 px-2.5 text-xs text-[#707072] hover:text-[#d30005] hover:bg-[#fff5f5] border-[#cacacb] gap-1 font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sign Out</span>
          </Button>
        </form>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-full text-[#111111] hover:bg-[#f5f5f5] border border-[#cacacb] cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 top-[57px] z-50 bg-white border-t border-[#cacacb] flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-top duration-200">
          <div className="space-y-6">
            {/* User Profile Info */}
            <div className="p-4 border border-[#cacacb] bg-[#f5f5f5] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#111111] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#111111] truncate">{userName}</p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#707072]">
                  {userRole} Terminal
                </span>
              </div>
            </div>

            <nav className="space-y-2">
              <div className="text-[10px] font-bold text-[#707072] uppercase tracking-widest px-2 mb-2">
                Operations
              </div>

              <Link
                href="/cashier"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-full bg-[#f5f5f5] text-xs font-semibold text-[#111111]"
              >
                <ShoppingCart className="w-4 h-4" />
                POS Register
              </Link>

              <Link
                href="/cashier/schedule"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-full border border-[#cacacb] text-xs font-semibold text-[#111111]"
              >
                <Calendar className="w-4 h-4" />
                Daily Court Schedule
              </Link>

              <Link
                href="/cashier/reports"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-full border border-[#cacacb] text-xs font-semibold text-[#111111]"
              >
                <ShoppingCart className="w-4 h-4" />
                Shift Reports
              </Link>

              {isOwnerOrAdmin && (
                <>
                  <div className="text-[10px] font-bold text-[#707072] uppercase tracking-widest px-2 mb-2 mt-4">
                    Administration
                  </div>

                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-full border border-[#111111] bg-[#111111] text-white text-xs font-semibold"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Financial Audit
                  </Link>

                  <Link
                    href="/admin/courts"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-full border border-[#cacacb] text-xs font-semibold text-[#111111]"
                  >
                    <Calendar className="w-4 h-4" />
                    Manage Courts
                  </Link>

                  <Link
                    href="/admin/players"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-full border border-[#cacacb] text-xs font-semibold text-[#111111]"
                  >
                    <Users className="w-4 h-4" />
                    Players &amp; History
                  </Link>
                </>
              )}

              <div className="text-[10px] font-bold text-[#707072] uppercase tracking-widest px-2 mb-2 mt-4">
                Shortcuts
              </div>

              <Link
                href="/book"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-medium text-[#707072] hover:text-[#111111]"
              >
                <Calendar className="w-4 h-4" />
                Public Booking Page
              </Link>

              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-medium text-[#707072] hover:text-[#111111]"
              >
                <Home className="w-4 h-4" />
                Arena Homepage
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
