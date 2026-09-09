"use client";

import { useState, useTransition } from "react";
import { 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  Copy, 
  Loader2, 
  Wallet, 
  X,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminVoidAndRefundBooking } from "@/app/actions";

export interface AdminBookingRefundDetails {
  id: string;
  court_name: string;
  start_time: string;
  duration_hours: number;
  total_price: number;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  payment_method: string;
  status: string;
  refund_wallet_type?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_reason?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
}

interface AdminVoidRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: AdminBookingRefundDetails;
  onSuccess?: (message: string) => void;
}

export function AdminVoidRefundModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: AdminVoidRefundModalProps) {
  const [refundRef, setRefundRef] = useState(booking.refund_reference || "");
  const [adminNotes, setAdminNotes] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAction = (action: 'void_and_refund' | 'void_only' | 'reject_refund') => {
    setErrorMsg(null);

    startTransition(async () => {
      const res = await adminVoidAndRefundBooking({
        bookingId: booking.id,
        action,
        refundReference: refundRef,
        adminNotes,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess?.(res.message || "Action completed successfully.");
        onClose();
      }
    });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const hasWalletInfo = Boolean(booking.refund_account_number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] rounded-none p-6 sm:p-8 z-10 text-[#111111] dark:text-foreground animate-in zoom-in-95 duration-150">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors"
          aria-label="Close modal"
          disabled={isPending}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1 pb-4 border-b border-[#cacacb] dark:border-[#27272a]">
          <span className="text-xs font-bold uppercase tracking-widest text-[#707072] dark:text-[#8a8a93]">
            Schedule Operations
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-[#111111] dark:text-foreground">
            Void Schedule &amp; Process Refund
          </h3>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Ref #{booking.id.slice(0, 8).toUpperCase()} • {booking.court_name}
          </p>
        </div>

        {/* Booking Details Strip */}
        <div className="my-4 p-4 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#111111] dark:text-foreground">
              {booking.guest_name || "Guest Player"}
            </div>
            <div className="text-[11px] text-[#707072] dark:text-[#8a8a93]">
              {booking.guest_email || booking.guest_phone || "No contact info"}
            </div>
            <div className="text-[11px] text-[#707072] dark:text-[#8a8a93] flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-[#707072] dark:text-[#8a8a93]" />
              <span>{formatDateTime(booking.start_time)} ({booking.duration_hours} hr)</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#707072] dark:text-[#8a8a93] block font-bold uppercase">Total Paid</span>
            <span className="text-lg font-bold text-[#111111] dark:text-foreground">
              ₱{Number(booking.total_price).toFixed(2)}
            </span>
            <span className="text-[10px] text-[#707072] dark:text-[#8a8a93] block uppercase">
              via {booking.payment_method}
            </span>
          </div>
        </div>

        {/* E-Wallet Payout Details */}
        {hasWalletInfo ? (
          <div className="mb-4 p-4 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#111111] dark:text-foreground" />
                <span className="text-xs font-bold text-[#111111] dark:text-foreground uppercase tracking-wider">
                  Requested E-Wallet Payout
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-[#121215] text-[#111111] dark:text-foreground text-xs font-bold border border-[#cacacb] dark:border-[#27272a]">
                {booking.refund_wallet_type || "GCash"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a]">
                <span className="text-[10px] text-[#707072] dark:text-[#8a8a93] block font-bold uppercase">Account Name</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-semibold text-[#111111] dark:text-foreground truncate">
                    {booking.refund_account_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(booking.refund_account_name || "", "name")}
                    className="text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground p-1"
                    title="Copy name"
                  >
                    {copiedField === "name" ? <Check className="w-3.5 h-3.5 text-[#007d48]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a]">
                <span className="text-[10px] text-[#707072] dark:text-[#8a8a93] block font-bold uppercase">Account / Mobile No.</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-[#111111] dark:text-foreground truncate">
                    {booking.refund_account_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(booking.refund_account_number || "", "number")}
                    className="text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground p-1"
                    title="Copy number"
                  >
                    {copiedField === "number" ? <Check className="w-3.5 h-3.5 text-[#007d48]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {booking.refund_reason && (
              <div className="text-xs text-[#707072] dark:text-[#8a8a93] pt-1">
                <span className="text-[10px] font-bold uppercase block text-[#111111] dark:text-foreground">Player Reason:</span>
                <p className="italic bg-white dark:bg-[#121215] p-2 border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground mt-1">
                  &ldquo;{booking.refund_reason}&rdquo;
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 p-3 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] text-xs text-[#707072] dark:text-[#8a8a93]">
            No player-submitted e-wallet details recorded. You can still void the schedule to free the court.
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 border border-[#d30005] bg-white dark:bg-[#18181c] text-[#d30005] text-xs p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Admin Inputs */}
        <div className="space-y-3.5 mb-6">
          <div className="space-y-1.5">
            <Label htmlFor="refundRef" className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">
              E-Wallet Refund Reference / Receipt No.
            </Label>
            <Input
              id="refundRef"
              placeholder="e.g. GCash Ref # 10049284912"
              value={refundRef}
              onChange={(e) => setRefundRef(e.target.value)}
              className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border-transparent dark:border-[#27272a] text-xs text-[#111111] dark:text-foreground placeholder:text-[#707072] dark:placeholder:text-[#66666e]"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adminNotes" className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">
              Admin Notes (Optional)
            </Label>
            <Input
              id="adminNotes"
              placeholder="e.g. Refund sent via GCash by Admin"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border-transparent dark:border-[#27272a] text-xs text-[#111111] dark:text-foreground placeholder:text-[#707072] dark:placeholder:text-[#66666e]"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => handleAction('void_and_refund')}
            className="w-full h-11 bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-[#ededed] font-medium text-xs flex items-center justify-center gap-2 rounded-full cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#111111]" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Void Schedule &amp; Confirm Refund (₱{Number(booking.total_price).toFixed(2)})</span>
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => handleAction('void_only')}
              className="h-10 text-xs font-medium cursor-pointer"
            >
              Void Slot (No Refund)
            </Button>

            {booking.status === 'cancelled_refund_pending' && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleAction('reject_refund')}
                className="h-10 border-[#cacacb] dark:border-[#27272a] text-[#d30005] hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] text-xs font-medium cursor-pointer"
              >
                Reject Refund
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
