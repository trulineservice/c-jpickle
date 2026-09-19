"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  UserCheck, 
  UserPlus, 
  ArrowRight, 
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { playHapticSound } from "@/lib/motion-feedback";

interface ReserveCourtModalProps {
  isLoggedIn?: boolean;
  triggerClassName?: string;
  triggerSize?: "default" | "xs" | "sm" | "lg" | "icon";
  triggerVariant?: "default" | "yellow" | "navy" | "navy-outline" | "red" | "outline" | "ghost" | "secondary" | "on-image";
  buttonText?: string;
  showIcon?: boolean;
}

export function ReserveCourtModal({
  isLoggedIn = false,
  triggerClassName,
  triggerSize = "lg",
  triggerVariant = "yellow",
  buttonText = "Reserve Court (₱300 / hr)",
  showIcon = true,
}: ReserveCourtModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playHapticSound("tap");
    if (isLoggedIn) {
      router.push("/book");
    } else {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-[#071E4B]/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Dialog Container */}
      <div className="relative w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl sm:rounded-3xl p-6 sm:p-8 z-10 text-[#102A56] shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-[#64748B] hover:text-[#0B2A67] hover:bg-[#F5F7FA] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 pb-2">
          <span className="inline-block px-3 py-1 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-[11px] font-bold tracking-widest uppercase">
            Court Reservation
          </span>
          <h3 className="text-2xl font-extrabold tracking-tight text-[#0B2A67]">
            Book Your Court
          </h3>
          <p className="text-sm text-[#64748B] leading-relaxed max-w-xs mx-auto">
            Sign in to your player account for 1-tap booking, digital pass access, or proceed directly as a guest.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 pt-4">
          <Link href="/login?next=/book" className="block w-full">
            <Button 
              variant="yellow" 
              className="w-full h-12 text-sm font-bold shadow-md rounded-xl justify-between px-5 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#0B2A67]/10 flex items-center justify-center text-[#0B2A67]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span>Sign In to Account</span>
              </div>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          <Link href="/signup?next=/book" className="block w-full">
            <Button 
              variant="outline" 
              className="w-full h-12 text-sm font-bold rounded-xl justify-between px-5 border-[#E2E8F0] hover:bg-[#EDF4FC] hover:text-[#0B2A67] group text-[#102A56]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EDF4FC] flex items-center justify-center text-[#0B2A67]">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span>Create New Account</span>
              </div>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
              Or
            </span>
          </div>

          <Link href="/book" className="block w-full">
            <Button 
              variant="ghost" 
              className="w-full h-10 text-xs font-bold text-[#64748B] hover:text-[#0B2A67] hover:bg-[#F5F7FA] rounded-xl"
            >
              Continue as Guest &rarr;
            </Button>
          </Link>
        </div>

        <div className="pt-4 mt-4 border-t border-[#E2E8F0] text-center">
          <p className="text-[11px] text-[#64748B]">
            Instant confirmation &bull; GCash, Maya &amp; Card via PayMongo
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        size={triggerSize}
        variant={triggerVariant}
        onClick={handleTriggerClick}
        className={triggerClassName}
      >
        <span>{buttonText}</span>
        {showIcon && <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" />}
      </Button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
