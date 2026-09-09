"use client";

import { useState, useTransition } from "react";
import { 
  AlertCircle, 
  Loader2, 
  X,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestBookingRefund } from "@/app/actions";

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    court_name: string;
    start_time: string;
    duration_hours: number;
    total_price: number;
  };
  onSuccess: (message: string) => void;
}

export function RefundRequestModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: RefundRequestModalProps) {
  const [walletType, setWalletType] = useState("GCash");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [reason, setReason] = useState("Schedule Conflict");
  const [customReason, setCustomReason] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!accountName.trim() || !accountNumber.trim()) {
      setErrorMsg("Please fill in both the account holder name and account/mobile number.");
      return;
    }

    const finalReason = reason === "Other" ? (customReason.trim() || "Other reason") : reason;

    startTransition(async () => {
      const res = await requestBookingRefund({
        bookingId: booking.id,
        walletType,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        reason: finalReason,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess(res.message || "Cancellation and refund requested successfully.");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
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
            Cancellation Guarantee
          </span>
          <h3 className="text-2xl font-bold tracking-tight text-[#111111] dark:text-foreground">
            Request Court Refund
          </h3>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93]">
            Please enter your receiving account so management can disburse your refundable amount.
          </p>
        </div>

        {/* Booking Summary Strip */}
        <div className="my-4 p-4 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#111111] dark:text-foreground block">
              {booking.court_name}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#707072] dark:text-[#8a8a93]">
              <Clock className="w-3.5 h-3.5 text-[#707072] dark:text-[#8a8a93]" />
              <span>{formatDateTime(booking.start_time)} ({booking.duration_hours} hr)</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#707072] dark:text-[#8a8a93] block font-bold uppercase">Refund</span>
            <span className="text-lg font-bold text-[#111111] dark:text-foreground">
              ₱{Number(booking.total_price).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 border border-[#d30005] bg-white dark:bg-[#18181c] text-[#d30005] text-xs p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Refund Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* E-Wallet Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">
              Select Receiving E-Wallet
            </Label>
            <div className="flex flex-wrap gap-2">
              {["GCash", "Maya", "GrabPay", "GoTyme", "Bank"].map((wallet) => (
                <button
                  key={wallet}
                  type="button"
                  onClick={() => setWalletType(wallet)}
                  className={`h-9 px-4 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    walletType === wallet
                      ? "bg-[#111111] dark:bg-white text-white dark:text-[#111111] border-[#111111] dark:border-white"
                      : "bg-white dark:bg-[#18181c] border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground hover:border-[#111111] dark:hover:border-white"
                  }`}
                >
                  {wallet}
                </button>
              ))}
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <Label htmlFor="accountName" className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">
              Account Holder Name <span className="text-[#d30005]">*</span>
            </Label>
            <Input
              id="accountName"
              placeholder="e.g. Juan C. Dela Cruz"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border-transparent dark:border-[#27272a] text-xs text-[#111111] dark:text-foreground placeholder:text-[#707072] dark:placeholder:text-[#66666e]"
            />
          </div>

          {/* Account Number */}
          <div className="space-y-1.5">
            <Label htmlFor="accountNumber" className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">
              {walletType} Account / Mobile Number <span className="text-[#d30005]">*</span>
            </Label>
            <Input
              id="accountNumber"
              placeholder="e.g. 0917 123 4567"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border-transparent dark:border-[#27272a] text-xs text-[#111111] dark:text-foreground placeholder:text-[#707072] dark:placeholder:text-[#66666e]"
            />
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider text-[#111111] dark:text-foreground">
              Reason for Cancellation
            </Label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#f5f5f5] dark:bg-[#18181c] border border-transparent dark:border-[#27272a] text-[#111111] dark:text-foreground text-xs h-10 px-4 rounded-full focus:border-[#111111] dark:focus:border-white outline-none cursor-pointer"
            >
              <option value="Schedule Conflict" className="dark:bg-[#18181c] dark:text-foreground">Schedule Conflict</option>
              <option value="Emergency / Illness" className="dark:bg-[#18181c] dark:text-foreground">Emergency / Illness</option>
              <option value="Severe Weather / Travel Issues" className="dark:bg-[#18181c] dark:text-foreground">Severe Weather / Travel Issues</option>
              <option value="Booked Wrong Court or Time" className="dark:bg-[#18181c] dark:text-foreground">Booked Wrong Court or Time</option>
              <option value="Other" className="dark:bg-[#18181c] dark:text-foreground">Other Reason</option>
            </select>
          </div>

          {reason === "Other" && (
            <div className="space-y-1.5">
              <Input
                placeholder="Briefly state your reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="h-10 px-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] border-transparent dark:border-[#27272a] text-xs text-[#111111] dark:text-foreground placeholder:text-[#707072] dark:placeholder:text-[#66666e]"
              />
            </div>
          )}

          {/* Policy Note */}
          <div className="p-3 border border-[#cacacb] dark:border-[#27272a] bg-[#f5f5f5] dark:bg-[#18181c] text-[11px] text-[#707072] dark:text-[#8a8a93] leading-relaxed">
            <strong className="text-[#111111] dark:text-foreground">24-Hour Policy:</strong> Cancellations made 24+ hours before start time receive a 100% full refund to your specified {walletType} account within 24–48 hours.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isPending}
              className="w-1/3 h-11 text-xs font-medium cursor-pointer"
            >
              Keep Slot
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-2/3 h-11 bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#222222] dark:hover:bg-[#ededed] text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#111111]" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Refund (₱{Number(booking.total_price).toFixed(2)})</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
