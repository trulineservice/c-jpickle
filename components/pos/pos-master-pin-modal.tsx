"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  ShieldAlert, 
  X, 
  Delete, 
  Check, 
  Loader2, 
  AlertCircle,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { playHapticSound } from "@/lib/motion-feedback";

export interface PosMasterPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actionType?: "void_item" | "clear_cart" | "void_transaction";
  requireReason?: boolean;
  onSuccess: (pin: string, reason?: string) => Promise<{ success: boolean; error?: string } | void>;
}

const VOID_REASONS = [
  "Customer Cancellation",
  "Cashier Scanning Error / Wrong Item",
  "Product Quality / Customer Return",
  "Payment Method Discrepancy",
  "Kitchen / Bar Out of Stock",
  "Test / Training Transaction",
];

export function PosMasterPinModal({
  isOpen,
  onClose,
  title = "Master PIN Authorization",
  description = "Supervisor PIN code required to authorize this void action.",
  actionType = "void_transaction",
  requireReason = false,
  onSuccess,
}: PosMasterPinModalProps) {
  const [pin, setPin] = useState("");
  const [reason, setReason] = useState(VOID_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Mutable refs to prevent stale closure and double-submit issues during rapid typing
  const pinRef = React.useRef("");
  const isSubmittingRef = React.useRef(false);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      pinRef.current = "";
      isSubmittingRef.current = false;
      setPin("");
      setErrorMessage(null);
      setIsShaking(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleDigit = useCallback((digit: string) => {
    if (isSubmittingRef.current) return;
    if (pinRef.current.length < 8) {
      playHapticSound("tap");
      setErrorMessage(null);
      const next = pinRef.current + digit;
      pinRef.current = next;
      setPin(next);
    }
  }, []);

  const handleBackspace = useCallback(() => {
    if (isSubmittingRef.current) return;
    playHapticSound("tap");
    setErrorMessage(null);
    const next = pinRef.current.slice(0, -1);
    pinRef.current = next;
    setPin(next);
  }, []);

  const handleClear = useCallback(() => {
    if (isSubmittingRef.current) return;
    playHapticSound("tap");
    setErrorMessage(null);
    pinRef.current = "";
    setPin("");
  }, []);

  const handleSubmit = useCallback(async (pinToSubmit?: string) => {
    if (isSubmittingRef.current) return;
    const finalPin = pinToSubmit !== undefined ? pinToSubmit : pinRef.current;
    if (!finalPin || finalPin.length < 4) {
      setErrorMessage("Please enter at least 4 digits.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      playHapticSound("error");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorMessage(null);

    const finalReason = requireReason
      ? reason === "Other"
        ? customReason.trim() || "Supervisor Void"
        : reason
      : undefined;

    try {
      const result = await onSuccess(finalPin, finalReason);
      if (result && !result.success) {
        setErrorMessage(result.error || "Invalid Master PIN code.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        playHapticSound("error");
        pinRef.current = "";
        setPin("");
      } else {
        playHapticSound("success");
        onClose();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setErrorMessage(msg);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      playHapticSound("error");
      pinRef.current = "";
      setPin("");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [requireReason, reason, customReason, onSuccess, onClose]);

  // Physical keyboard listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing inside text input, textarea, or select
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!isSubmittingRef.current) {
          handleSubmit(pinRef.current);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, handleSubmit, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className={`relative w-full max-w-sm bg-white dark:bg-[#121215] border border-[#cacacb] dark:border-[#27272a] rounded-2xl p-6 shadow-2xl z-10 text-[#111111] dark:text-foreground transition-all duration-200 ${
          isShaking ? "animate-shake" : ""
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#707072] dark:text-[#8a8a93] hover:text-[#111111] dark:hover:text-foreground hover:bg-[#f5f5f5] dark:hover:bg-[#18181c] transition-colors cursor-pointer"
          aria-label="Close"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pb-4 border-b border-[#f0f0f0] dark:border-[#222226]">
          <div className="mx-auto w-10 h-10 rounded-full bg-[#fef2f2] dark:bg-[#2c1517] text-[#d30005] flex items-center justify-center mb-2 border border-[#fecaca] dark:border-[#7f1d1d]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight text-[#111111] dark:text-foreground">
            {title}
          </h3>
          <p className="text-xs text-[#707072] dark:text-[#8a8a93] max-w-xs mx-auto">
            {description}
          </p>
        </div>

        {/* Reason Selector (if required for transaction voiding) */}
        {requireReason && (
          <div className="pt-3 pb-1 space-y-1.5 text-left">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#707072] dark:text-[#8a8a93] block">
              Reason for Void:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-lg bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground outline-none font-medium cursor-pointer"
            >
              {VOID_REASONS.map((r) => (
                <option key={r} value={r} className="dark:bg-black">
                  {r}
                </option>
              ))}
              <option value="Other" className="dark:bg-black">Other (Type custom reason)</option>
            </select>

            {reason === "Other" && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify void reason..."
                className="w-full h-8 px-3 text-xs rounded-lg bg-[#f5f5f5] dark:bg-[#18181c] border border-[#cacacb] dark:border-[#27272a] text-[#111111] dark:text-foreground outline-none mt-1.5"
              />
            )}
          </div>
        )}

        {/* Masked PIN Indicators (Dynamic dots for 4 to 8 digits) */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2.5">
            {Array.from({ length: Math.max(4, Math.min(8, pin.length)) }).map((_, index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-150 flex items-center justify-center ${
                    isFilled
                      ? "bg-[#111111] dark:bg-white border-[#111111] dark:border-white scale-110"
                      : "border-[#cacacb] dark:border-[#3f3f46] bg-transparent"
                  }`}
                />
              );
            })}
          </div>

          {pin.length > 4 && (
            <div className="mt-2 text-[11px] font-mono font-bold text-[#707072] dark:text-[#8a8a93] animate-in fade-in">
              {pin.length} digits entered
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-3 text-xs text-[#d30005] font-semibold flex items-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tactile Keypad (3x4 Grid) */}
        <div className="grid grid-cols-3 gap-2 pt-1 pb-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit(num.toString())}
              className="h-12 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1e] hover:bg-[#ebebeb] dark:hover:bg-[#26262b] active:scale-95 text-lg font-bold text-[#111111] dark:text-foreground transition-all flex items-center justify-center cursor-pointer select-none"
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleClear}
            className="h-12 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1e] hover:bg-[#ebebeb] dark:hover:bg-[#26262b] active:scale-95 text-xs font-bold text-[#707072] dark:text-[#8a8a93] transition-all flex items-center justify-center cursor-pointer select-none disabled:opacity-40"
          >
            CLEAR
          </button>

          {/* Zero Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigit("0")}
            className="h-12 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1e] hover:bg-[#ebebeb] dark:hover:bg-[#26262b] active:scale-95 text-lg font-bold text-[#111111] dark:text-foreground transition-all flex items-center justify-center cursor-pointer select-none"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-[#f5f5f5] dark:bg-[#1a1a1e] hover:bg-[#ebebeb] dark:hover:bg-[#26262b] active:scale-95 text-[#707072] dark:text-[#8a8a93] transition-all flex items-center justify-center cursor-pointer select-none disabled:opacity-40"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 h-11 text-xs font-bold rounded-xl border-[#cacacb] dark:border-[#27272a] cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            disabled={isSubmitting || pin.length < 4}
            onClick={() => handleSubmit()}
            className="flex-1 h-11 text-xs font-bold rounded-xl bg-[#d30005] hover:bg-[#b00004] text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Authorize Void</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
