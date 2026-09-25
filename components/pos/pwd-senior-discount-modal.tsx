"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, X, Plus, Minus, Check, AlertCircle, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PosCartItem, PosDiscountType } from "@/lib/stores/use-pos-cart-store";
import { playHapticSound } from "@/lib/motion-feedback";

interface PwdSeniorDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: PosCartItem[];
  discountType: PosDiscountType;
  initialSelections: Record<string, number>;
  initialCustomerName: string;
  initialDiscountIdNumber: string;
  initialCustomerTin: string;
  onApply: (payload: {
    discountType: PosDiscountType;
    selections: Record<string, number>;
    customerName: string;
    discountIdNumber: string;
    customerTin: string;
  }) => void;
}

export function PwdSeniorDiscountModal({
  isOpen,
  onClose,
  cart,
  discountType,
  initialSelections,
  initialCustomerName,
  initialDiscountIdNumber,
  initialCustomerTin,
  onApply,
}: PwdSeniorDiscountModalProps) {
  const [activeDiscountType, setActiveDiscountType] = useState<"senior_citizen" | "pwd">(
    discountType === "senior_citizen" ? "senior_citizen" : "pwd"
  );
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [discountIdNumber, setDiscountIdNumber] = useState(initialDiscountIdNumber);
  const [customerTin, setCustomerTin] = useState(initialCustomerTin);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveDiscountType(discountType === "senior_citizen" ? "senior_citizen" : "pwd");
      setCustomerName(initialCustomerName);
      setDiscountIdNumber(initialDiscountIdNumber);
      setCustomerTin(initialCustomerTin);

      // If initial selections passed, sync them, else default to selecting 1 unit per item
      if (Object.keys(initialSelections).length > 0) {
        setSelections({ ...initialSelections });
      } else {
        const defaults: Record<string, number> = {};
        cart.forEach((item) => {
          const key = item.cart_item_key || item.id;
          defaults[key] = 1;
        });
        setSelections(defaults);
      }
      setErrorMsg(null);
    }
  }, [isOpen, cart, discountType, initialSelections, initialCustomerName, initialDiscountIdNumber, initialCustomerTin]);

  if (!isOpen) return null;

  const grossTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Compute selected discountable gross
  const selectedGross = cart.reduce((sum, item) => {
    const key = item.cart_item_key || item.id;
    const qty = Math.min(item.quantity, Math.max(0, selections[key] || 0));
    return sum + item.price * qty;
  }, 0);

  const statutoryDiscount = Math.round(selectedGross * 0.20 * 100) / 100;
  const netPayable = Math.max(0, Math.round((grossTotal - statutoryDiscount) * 100) / 100);

  const handleQtyChange = (key: string, maxQty: number, delta: number) => {
    playHapticSound("tap");
    setSelections((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      return { ...prev, [key]: next };
    });
  };

  const handleSelectAll = () => {
    playHapticSound("tap");
    const allSelected: Record<string, number> = {};
    cart.forEach((item) => {
      const key = item.cart_item_key || item.id;
      allSelected[key] = item.quantity;
    });
    setSelections(allSelected);
  };

  const handleClearSelections = () => {
    playHapticSound("tap");
    setSelections({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg("Cardholder's full name is required for BIR audit compliance.");
      playHapticSound("error");
      return;
    }

    if (!discountIdNumber.trim()) {
      setErrorMsg(
        `Please enter the ${
          activeDiscountType === "senior_citizen" ? "Senior Citizen" : "PWD"
        } ID number.`
      );
      playHapticSound("error");
      return;
    }

    const totalSelectedQty = Object.values(selections).reduce((sum, q) => sum + q, 0);
    if (totalSelectedQty === 0) {
      setErrorMsg("Please select at least 1 item consumed by the cardholder.");
      playHapticSound("error");
      return;
    }

    playHapticSound("success");
    onApply({
      discountType: activeDiscountType,
      selections,
      customerName: customerName.trim(),
      discountIdNumber: discountIdNumber.trim(),
      customerTin: customerTin.trim(),
    });
  };

  const isSenior = activeDiscountType === "senior_citizen";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#071E4B] text-[#0B2A67] dark:text-white max-w-lg w-full rounded-3xl shadow-2xl border border-[#E2E8F0] dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-white/10 flex items-center justify-between bg-[#F8FAFC] dark:bg-[#030F28]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#007d48] text-white flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-[#0B2A67] dark:text-white">
                  {isSenior ? "Senior Citizen" : "PWD"} Discount Item Selector
                </h3>
                <span className="text-[10px] font-black bg-[#007d48]/10 text-[#007d48] dark:text-emerald-300 border border-[#007d48]/20 px-2 py-0.5 rounded-full">
                  RA {isSenior ? "9994" : "10754"} BIR
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-white/60 font-medium">
                Tap items consumed specifically by the cardholder
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#64748B] dark:text-white/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Discount Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#EDF4FC] dark:bg-black/30 border border-[#E2E8F0] dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setActiveDiscountType("senior_citizen");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeDiscountType === "senior_citizen"
                  ? "bg-[#0B2A67] text-white shadow-sm ring-2 ring-[#FFD21C]"
                  : "text-[#64748B] dark:text-white/70 hover:text-[#0B2A67]"
              }`}
            >
              <span>Senior Citizen (20%)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playHapticSound("tap");
                setActiveDiscountType("pwd");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeDiscountType === "pwd"
                  ? "bg-[#0B2A67] text-white shadow-sm ring-2 ring-[#FFD21C]"
                  : "text-[#64748B] dark:text-white/70 hover:text-[#0B2A67]"
              }`}
            >
              <span>PWD Cardholder (20%)</span>
            </button>
          </div>

          {/* BIR Compliance Cardholder Details Form */}
          <div className="p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-white/5 space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#007d48] dark:text-emerald-400" />
              Mandatory BIR Compliance Details
            </h4>
            <div className="space-y-2">
              <div>
                <Label htmlFor="cardholderName" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                  Cardholder Full Name <span className="text-[#bf050b]">*</span>
                </Label>
                <Input
                  id="cardholderName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full Name as printed on Senior / PWD ID"
                  className="h-9 text-xs rounded-xl mt-0.5 bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cardholderId" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                    ID Number <span className="text-[#bf050b]">*</span>
                  </Label>
                  <Input
                    id="cardholderId"
                    value={discountIdNumber}
                    onChange={(e) => setDiscountIdNumber(e.target.value)}
                    placeholder="e.g. PWD-994812"
                    className="h-9 text-xs font-mono rounded-xl mt-0.5 bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>
                <div>
                  <Label htmlFor="cardholderTin" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                    TIN (Optional)
                  </Label>
                  <Input
                    id="cardholderTin"
                    value={customerTin}
                    onChange={(e) => setCustomerTin(e.target.value)}
                    placeholder="000-000-000"
                    className="h-9 text-xs font-mono rounded-xl mt-0.5 bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Item Selector List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                Select Cardholder&apos;s Consumed Items
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-[#0B2A67] dark:text-[#FFD21C] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-white/20">|</span>
                <button
                  type="button"
                  onClick={handleClearSelections}
                  className="text-[10px] font-bold text-[#bf050b] hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {cart.map((item) => {
                const key = item.cart_item_key || item.id;
                const selectedQty = selections[key] || 0;
                const isSelected = selectedQty > 0;

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-[#007d48]/10 dark:bg-emerald-950/40 border-[#007d48]/40 dark:border-emerald-700/60 shadow-2xs"
                        : "bg-white dark:bg-white/5 border-[#E2E8F0] dark:border-white/10 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <h5 className="font-black text-xs text-[#0B2A67] dark:text-white truncate">
                          {item.name}
                        </h5>
                        {isSelected && (
                          <span className="text-[9px] font-black bg-[#007d48] text-white px-1.5 py-0.2 rounded-full">
                            {selectedQty} of {item.quantity} Discounted
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-[#64748B] dark:text-white/60">
                        ₱{item.price.toFixed(2)} each &bull; Line Total: ₱{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    {/* Quantity Stepper for Discount Allocation */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(key, item.quantity, -1)}
                        disabled={selectedQty <= 0}
                        className="w-7 h-7 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-white dark:bg-white/10 flex items-center justify-center text-[#0B2A67] dark:text-white disabled:opacity-30 cursor-pointer active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-[#0B2A67] dark:text-white">
                        {selectedQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(key, item.quantity, 1)}
                        disabled={selectedQty >= item.quantity}
                        className="w-7 h-7 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-white dark:bg-white/10 flex items-center justify-center text-[#0B2A67] dark:text-white disabled:opacity-30 cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl border border-[#bf050b]/30 bg-[#bf050b]/10 text-[11px] text-[#bf050b] dark:text-red-300 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Real-time Calculation Summary Box */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#030F28] border border-[#E2E8F0] dark:border-white/10 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#64748B] dark:text-white/70 font-medium">
              <span>Total Order Subtotal:</span>
              <span className="font-bold text-[#0B2A67] dark:text-white">₱{grossTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#64748B] dark:text-white/70 font-medium">
              <span>Cardholder Selected Items Gross:</span>
              <span className="font-bold text-[#007d48] dark:text-emerald-400">₱{selectedGross.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#007d48] dark:text-emerald-400 font-bold">
              <span>20% Statutory Discount (Selected Items):</span>
              <span>-₱{statutoryDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-[#E2E8F0] dark:border-white/10 text-sm font-black">
              <span>REVISED NET PAYABLE:</span>
              <span className="text-xl text-[#0B2A67] dark:text-[#FFD21C]">₱{netPayable.toFixed(2)}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-2xl text-xs font-bold border-[#E2E8F0] dark:border-white/15 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-2xl bg-[#007d48] hover:bg-[#006439] text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Apply Discount (₱{netPayable.toFixed(2)})</span>
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
