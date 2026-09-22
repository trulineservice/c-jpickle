"use client";

import { useState } from "react";
import { 
  ShieldCheck, 
  Clock, 
  RotateCcw, 
  Footprints, 
  QrCode, 
  X, 
  ArrowRight, 
  AlertTriangle,
  CheckCircle2,
  Lock,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { playHapticSound } from "@/lib/motion-feedback";

interface PolicyAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  bookingDetails?: {
    courtName: string;
    dateStr: string;
    timeSlotDisplay: string | null;
    totalAmount: number;
  };
}

export function PolicyAgreementModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  bookingDetails,
}: PolicyAgreementModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      setHasScrolledToBottom(true);
    }
  };

  const handleConfirm = () => {
    playHapticSound("success");
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#071E4B] border border-[#0B2A67]/20 dark:border-white/10 rounded-3xl p-6 sm:p-8 z-10 text-[#0B2A67] dark:text-white shadow-2xl animate-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFD21C]/20 text-[#B8860B] dark:text-[#FFD21C] border border-[#FFD21C]/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#007d48]" />
              Mandatory Player Policy
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#0B2A67] dark:text-white">
            Court Booking &amp; Refund Policy
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/70">
            Please read and acknowledge the following terms before proceeding to actual payment.
          </p>
        </div>

        {/* Scrollable Policy Body */}
        <div 
          onScroll={handleScroll}
          className="overflow-y-auto pr-1 -mr-1 space-y-4 py-4 flex-1 text-xs text-slate-700 dark:text-white/80"
        >
          {/* Reservation Summary Snapshot */}
          {bookingDetails && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/50 block">
                  Reservation
                </span>
                <span className="font-extrabold text-[#0B2A67] dark:text-white">
                  {bookingDetails.courtName}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-white/70 block">
                  {bookingDetails.timeSlotDisplay}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/50 block">
                  Amount Due
                </span>
                <span className="text-base font-black text-[#0B2A67] dark:text-[#FFD21C]">
                  ₱{bookingDetails.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Policy Item 1: 2-Day (48-Hour) Refund Rule */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-extrabold">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>1. 2-Day (48-Hour) Advance Refund Policy</span>
            </div>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-200/80 leading-relaxed pl-6">
              Court reservations cancelled at least <strong>2 days (48 hours)</strong> prior to the scheduled start time receive a <strong>100% full refund</strong> directly back to your GCash, Maya, or original payment method.
            </p>
          </div>

          {/* Policy Item 2: Non-Refundable Period within 2 Days */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-1">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-extrabold">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>2. Non-Refundable Period (&lt; 2 Days)</span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-200/80 leading-relaxed pl-6">
              Cancellations requested <strong>within 2 days (less than 48 hours)</strong> of your reservation start time are <strong>strictly non-refundable</strong>, as your court has been reserved and blocked from other players.
            </p>
          </div>

          {/* Policy Item 3: Match Reschedule Feature */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 space-y-1">
            <div className="flex items-center gap-2 text-[#0B2A67] dark:text-blue-300 font-extrabold">
              <RotateCcw className="w-4 h-4 text-[#0B2A67] dark:text-[#FFD21C] shrink-0" />
              <span>3. Match Reschedule Feature</span>
            </div>
            <p className="text-[11px] text-blue-900/90 dark:text-blue-200/80 leading-relaxed pl-6">
              If you cannot make your session within the 2-day period, <strong>you can reschedule your booking</strong> to any available future date and time slot directly from your Player Dashboard at zero fee.
            </p>
          </div>

          {/* Policy Item 4: Footwear & Court Etiquette */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold">
              <Footprints className="w-4 h-4 text-[#FFD21C] shrink-0" />
              <span>4. Non-Marking Footwear Required</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 leading-relaxed pl-6">
              Clean, non-marking athletic or court shoes are strictly mandatory to protect the cushioned indoor surface. Slippers, boots, and black-soled marking shoes are prohibited inside the playing arena.
            </p>
          </div>

          {/* Policy Item 5: Instant Pass & Arrival */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-extrabold">
              <QrCode className="w-4 h-4 text-[#FFD21C] shrink-0" />
              <span>5. Fast Check-in &amp; Instant QR Pass</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-white/70 leading-relaxed pl-6">
              Upon successful payment via PayMongo, your digital QR court pass is generated instantly in your athlete account and emailed to you for swift front-counter check-in.
            </p>
          </div>

          {/* Checkbox Acknowledgment */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-[#0B2A67]/20 dark:border-white/15 bg-white dark:bg-white/5 cursor-pointer hover:border-[#0B2A67] transition-all">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                playHapticSound("tap");
                setIsChecked(e.target.checked);
              }}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0B2A67] focus:ring-[#FFD21C] cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[#0B2A67] dark:text-white block">
                I have read and agree to the 2-Day Refund &amp; Reschedule Policy
              </span>
              <span className="text-[11px] text-slate-500 dark:text-white/60 block">
                I understand that refunds require 48 hours notice, while rescheduling is available within 2 days.
              </span>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-1/3 h-12 text-xs font-bold border-slate-200 dark:border-white/10 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl cursor-pointer"
          >
            Review Details
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isChecked || isSubmitting}
            className="w-2/3 h-12 bg-[#FFD21C] text-[#0B2A67] hover:bg-[#f0c410] font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#0B2A67]" />
                <span>Connecting PayMongo...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-[#0B2A67]" />
                <span>I Understand &mdash; Proceed to Payment</span>
                <ArrowRight className="w-4 h-4 text-[#0B2A67]" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
