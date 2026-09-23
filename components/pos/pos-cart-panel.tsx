"use client";

import React from "react";
import { ShoppingCart, Plus, Minus, Trash2, Banknote, CreditCard, QrCode, Loader2, Zap, ArrowLeftRight, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  dispensed_volume?: number;
  base_unit?: string;
  cart_item_key?: string;
}

export interface PosCartPanelProps {
  cart: PosCartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  discountType: "none" | "senior_citizen" | "pwd" | "student" | "employee";
  splitEwalletPercent?: number;
  onSplitEwalletPercentChange?: (pct: number) => void;
  splitEwalletAmount?: string;
  onSplitEwalletAmountChange?: (amt: string) => void;
  splitCashAmount?: string;
  onSplitCashAmountChange?: (amt: string) => void;
  isProcessing: boolean;
  onCheckout: () => void;
}

export function PosCartPanel({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  paymentMethod,
  onPaymentMethodChange,
  discountType,
  splitEwalletPercent = 50,
  onSplitEwalletPercentChange,
  splitEwalletAmount = "",
  onSplitEwalletAmountChange,
  splitCashAmount = "",
  onSplitCashAmountChange,
  isProcessing,
  onCheckout,
}: PosCartPanelProps) {
  // Financial computations (tax removed, straight discounts applied)
  const grossSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  let discountAmount = 0;
  let discountLabel = "";

  if (discountType === "senior_citizen" || discountType === "pwd") {
    discountAmount = Math.round((grossSubtotal * 0.20) * 100) / 100;
    discountLabel = discountType === "senior_citizen" ? "Senior Citizen (20%)" : "PWD (20%)";
  } else if (discountType === "student") {
    discountAmount = grossSubtotal > 0 ? Math.min(10, grossSubtotal) : 0;
    discountLabel = "Student Discount (₱10 Off)";
  } else if (discountType === "employee") {
    discountAmount = Math.round((grossSubtotal * 0.10) * 100) / 100;
    discountLabel = "Employee Discount (10%)";
  }

  const netPayable = Math.max(0, Math.round((grossSubtotal - discountAmount) * 100) / 100);

  // Split Payment Amount Calculations
  const isSplitPayment = paymentMethod === "Split Payment";

  // Effective E-Wallet and Cash Amounts
  const hasEwalletInput = splitEwalletAmount.trim() !== "";
  const hasCashInput = splitCashAmount.trim() !== "";

  let ewalletAmt = 0;
  let cashAmt = 0;

  if (hasEwalletInput && hasCashInput) {
    ewalletAmt = parseFloat(splitEwalletAmount) || 0;
    cashAmt = parseFloat(splitCashAmount) || 0;
  } else if (hasEwalletInput) {
    ewalletAmt = parseFloat(splitEwalletAmount) || 0;
    cashAmt = Math.max(0, Math.round((netPayable - ewalletAmt) * 100) / 100);
  } else if (hasCashInput) {
    cashAmt = parseFloat(splitCashAmount) || 0;
    ewalletAmt = Math.max(0, Math.round((netPayable - cashAmt) * 100) / 100);
  } else {
    // Both start at zero until cashier inputs an amount
    ewalletAmt = 0;
    cashAmt = 0;
  }

  const splitSum = Math.round((ewalletAmt + cashAmt) * 100) / 100;
  const splitDiff = Math.round((splitSum - netPayable) * 100) / 100;
  const isBalanced = (hasEwalletInput || hasCashInput) && Math.abs(splitDiff) < 0.01 && netPayable > 0;

  const handleEwalletInputChange = (val: string) => {
    onSplitEwalletAmountChange?.(val);
    if (val.trim() !== "") {
      const num = parseFloat(val) || 0;
      const remainingCash = Math.max(0, Math.round((netPayable - num) * 100) / 100);
      onSplitCashAmountChange?.(remainingCash.toFixed(2));
    } else {
      onSplitCashAmountChange?.("");
    }
  };

  const handleCashInputChange = (val: string) => {
    onSplitCashAmountChange?.(val);
    if (val.trim() !== "") {
      const num = parseFloat(val) || 0;
      const remainingEwallet = Math.max(0, Math.round((netPayable - num) * 100) / 100);
      onSplitEwalletAmountChange?.(remainingEwallet.toFixed(2));
    } else {
      onSplitEwalletAmountChange?.("");
    }
  };

  const handleSplit5050 = () => {
    const half = Math.round((netPayable / 2) * 100) / 100;
    const remainder = Math.max(0, Math.round((netPayable - half) * 100) / 100);
    onSplitEwalletAmountChange?.(half.toFixed(2));
    onSplitCashAmountChange?.(remainder.toFixed(2));
  };

  const handleAutoBalance = () => {
    const currentEwallet = parseFloat(splitEwalletAmount) || ewalletAmt;
    const remainingCash = Math.max(0, Math.round((netPayable - currentEwallet) * 100) / 100);
    onSplitEwalletAmountChange?.(currentEwallet.toFixed(2));
    onSplitCashAmountChange?.(remainingCash.toFixed(2));
  };

  const paymentMethods = [
    { id: "GCash / QR Ph", label: "GCash / QR", icon: QrCode },
    { id: "Cash", label: "Cash", icon: Banknote },
    { id: "Credit / Debit Card", label: "Card", icon: CreditCard },
    { id: "Split Payment", label: "Split Pay", icon: ArrowLeftRight },
  ];

  return (
    <div className="border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-5 bg-white dark:bg-[#071E4B]/40 shadow-sm flex flex-col h-full space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-white/10 pb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] flex items-center justify-center font-bold">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <h3 className="font-black text-sm uppercase tracking-wider text-[#0B2A67] dark:text-white">
            Active Order
          </h3>
          <span className="text-xs bg-[#FFD21C] text-[#0B2A67] px-2.5 py-0.5 rounded-full font-black">
            {cart.reduce((total, i) => total + i.quantity, 0)}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs text-[#bf050b] hover:text-[#d30005] font-extrabold transition-colors cursor-pointer"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[320px] pr-1">
        {cart.length === 0 ? (
          <div className="h-44 border-2 border-dashed border-[#E2E8F0] dark:border-white/15 rounded-2xl flex flex-col items-center justify-center text-xs text-[#64748B] dark:text-white/60 gap-1.5 p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <p className="font-extrabold text-[#0B2A67] dark:text-white">Order cart is empty</p>
            <span className="text-[11px] text-[#64748B] dark:text-white/50">Click catalog items on the left to add to order</span>
          </div>
        ) : (
          cart.map((item) => {
            const itemKey = item.cart_item_key || item.id;
            return (
              <div
                key={itemKey}
                className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-white/15 bg-[#F8FAFC] dark:bg-[#030F28] hover:border-[#0B2A67] transition-all shadow-2xs"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h5 className="font-black text-xs text-[#0B2A67] dark:text-white truncate">{item.name}</h5>
                    {item.dispensed_volume !== undefined && item.dispensed_volume > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#EDF4FC] dark:bg-white/10 text-[#0B2A67] dark:text-[#FFD21C] border border-[#0B2A67]/20 rounded">
                        {item.dispensed_volume.toLocaleString('en-US')} {item.base_unit || 'mL'}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-[#64748B] dark:text-white/60">₱{item.price.toFixed(2)} each</span>
                </div>

                {/* Quantity Adjusters */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(itemKey, -1)}
                    className="w-7 h-7 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-white dark:bg-white/10 flex items-center justify-center text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] active:scale-[0.95] cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-[#0B2A67] dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(itemKey, 1)}
                    className="w-7 h-7 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-white dark:bg-white/10 flex items-center justify-center text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] active:scale-[0.95] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(itemKey)}
                    className="w-7 h-7 rounded-xl text-[#bf050b] hover:bg-[#bf050b]/10 flex items-center justify-center ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Channel Selector */}
      <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0] dark:border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] block">
            Payment Channel
          </label>
          {isSplitPayment && (
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full">
              E-Wallet ₱{ewalletAmt.toFixed(2)} + Cash ₱{cashAmt.toFixed(2)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {paymentMethods.map((pm) => {
            const Icon = pm.icon;
            const isSelected = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => onPaymentMethodChange(pm.id)}
                className={`py-2 px-1.5 rounded-xl border text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-[0.97] ${
                  isSelected
                    ? "bg-[#0B2A67] text-white border-[#0B2A67] shadow-md ring-2 ring-[#FFD21C]"
                    : "bg-white dark:bg-white/5 text-[#64748B] dark:text-white/70 border-[#E2E8F0] dark:border-white/10 hover:border-[#0B2A67] hover:text-[#0B2A67]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-[#FFD21C]" : "text-[#64748B] dark:text-white/60"}`} />
                <span className="truncate text-[10px] text-center">{pm.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Split Payment Amount Configuration Panel */}
        {isSplitPayment && (
          <div className="p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Custom Amount Split
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                isBalanced
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : splitDiff > 0
                  ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                  : "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
              }`}>
                {isBalanced ? "✓ Balanced" : splitDiff > 0 ? `+₱${splitDiff.toFixed(2)} Over` : `-₱${Math.abs(splitDiff).toFixed(2)} Short`}
              </span>
            </div>

            {/* Direct Input Fields */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                  E-Wallet Amount (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-indigo-600 dark:text-indigo-400">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitEwalletAmount}
                    onChange={(e) => handleEwalletInputChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-black/50 font-mono text-xs font-bold text-indigo-900 dark:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 block">
                  Cash Amount (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-emerald-600 dark:text-emerald-400">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splitCashAmount}
                    onChange={(e) => handleCashInputChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-black/50 font-mono text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Total Balance Helper & Quick Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-indigo-100 dark:border-white/10 text-[10px]">
              <span className="font-semibold text-slate-500 dark:text-white/60">
                Split Total: <strong className="font-mono text-slate-800 dark:text-white">₱{splitSum.toFixed(2)}</strong> / ₱{netPayable.toFixed(2)}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleSplit5050}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white text-[10px] font-bold hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  50 / 50
                </button>
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 cursor-pointer shadow-2xs transition-colors"
                >
                  Auto-Balance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary & Total */}
      <div className="border-t border-[#E2E8F0] dark:border-white/10 pt-3.5 space-y-2 text-xs">
        <div className="flex justify-between text-[#64748B] dark:text-white/70 font-semibold">
          <span>Gross Subtotal:</span>
          <span className="font-extrabold text-[#0B2A67] dark:text-white">₱{grossSubtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-[#007d48] dark:text-emerald-400 font-bold">
            <span>{discountLabel}:</span>
            <span>-₱{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {isSplitPayment && (
          <div className="pt-2 border-t border-dashed border-[#E2E8F0] dark:border-white/10 space-y-1 text-[11px]">
            <div className="flex justify-between text-indigo-700 dark:text-indigo-400 font-semibold">
              <span>Split: E-Wallet:</span>
              <span className="font-mono font-bold">₱{ewalletAmt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
              <span>Split: Cash:</span>
              <span className="font-mono font-bold">₱{cashAmt.toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-2.5 border-t border-[#E2E8F0] dark:border-white/10 text-sm font-black text-[#0B2A67] dark:text-white">
          <span>NET PAYABLE:</span>
          <span className="text-2xl font-black text-[#0B2A67] dark:text-[#FFD21C]">₱{netPayable.toFixed(2)}</span>
        </div>
      </div>

      {/* Charge & Print Button */}
      <Button
        type="button"
        disabled={cart.length === 0 || isProcessing || (isSplitPayment && !isBalanced)}
        onClick={onCheckout}
        className="w-full h-13 rounded-2xl bg-[#0B2A67] hover:bg-[#123A82] text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-[#FFD21C]/30"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#FFD21C]" />
            <span>Processing Invoice...</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4 text-[#FFD21C]" />
            <span>Complete &amp; Print Invoice (₱{netPayable.toFixed(2)})</span>
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#64748B] dark:text-white/60 font-semibold pt-0.5">
        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
        <span>Auto-Print Active &bull; Instant thermal dispatch</span>
      </div>
    </div>
  );
}
