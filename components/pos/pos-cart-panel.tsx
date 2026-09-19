"use client";

import React from "react";
import { ShoppingCart, Plus, Minus, Trash2, Banknote, CreditCard, QrCode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PosCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

interface PosCartPanelProps {
  cart: PosCartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  discountType: "none" | "senior_citizen" | "pwd";
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
  isProcessing,
  onCheckout,
}: PosCartPanelProps) {
  // Financial computations
  const grossSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const isStatutory = discountType === "senior_citizen" || discountType === "pwd";

  let vatableSales = 0;
  let vatAmount = 0;
  let vatExemptSales = 0;
  let discountAmount = 0;
  let netPayable = grossSubtotal;

  if (isStatutory) {
    // 12% VAT Exemption Base
    vatExemptSales = Math.round((grossSubtotal / 1.12) * 100) / 100;
    // 20% Discount on Net Base
    discountAmount = Math.round((vatExemptSales * 0.20) * 100) / 100;
    // Net Payable
    netPayable = Math.round((vatExemptSales - discountAmount) * 100) / 100;
  } else {
    vatableSales = Math.round((grossSubtotal / 1.12) * 100) / 100;
    vatAmount = Math.round((grossSubtotal - vatableSales) * 100) / 100;
    netPayable = grossSubtotal;
  }

  const paymentMethods = [
    { id: "GCash / QR Ph", icon: QrCode },
    { id: "Cash", icon: Banknote },
    { id: "Credit / Debit Card", icon: CreditCard },
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
          cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E2E8F0] dark:border-white/15 bg-[#F8FAFC] dark:bg-[#030F28] hover:border-[#0B2A67] transition-all shadow-2xs"
            >
              <div className="flex-1 min-w-0 pr-2">
                <h5 className="font-black text-xs text-[#0B2A67] dark:text-white truncate">{item.name}</h5>
                <span className="text-[11px] font-bold text-[#64748B] dark:text-white/60">₱{item.price.toFixed(2)} each</span>
              </div>

              {/* Quantity Adjusters */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="w-7 h-7 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-white dark:bg-white/10 flex items-center justify-center text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] active:scale-[0.95] cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-black text-[#0B2A67] dark:text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="w-7 h-7 rounded-xl border border-[#E2E8F0] dark:border-white/20 bg-white dark:bg-white/10 flex items-center justify-center text-[#0B2A67] dark:text-white hover:bg-[#EDF4FC] active:scale-[0.95] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="w-7 h-7 rounded-xl text-[#bf050b] hover:bg-[#bf050b]/10 flex items-center justify-center ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Channel Selector */}
      <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-white/10">
        <label className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] block">
          Payment Channel
        </label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map((pm) => {
            const Icon = pm.icon;
            const isSelected = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => onPaymentMethodChange(pm.id)}
                className={`py-2.5 px-2 rounded-xl border text-[11px] font-black flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-[0.97] ${
                  isSelected
                    ? "bg-[#0B2A67] text-white border-[#0B2A67] shadow-md ring-2 ring-[#FFD21C]"
                    : "bg-white dark:bg-white/5 text-[#64748B] dark:text-white/70 border-[#E2E8F0] dark:border-white/10 hover:border-[#0B2A67] hover:text-[#0B2A67]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? "text-[#FFD21C]" : "text-[#64748B] dark:text-white/60"}`} />
                <span className="truncate">{pm.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Summary & Total */}
      <div className="border-t border-[#E2E8F0] dark:border-white/10 pt-3.5 space-y-2 text-xs">
        <div className="flex justify-between text-[#64748B] dark:text-white/70 font-semibold">
          <span>Gross Subtotal:</span>
          <span className="font-extrabold text-[#0B2A67] dark:text-white">₱{grossSubtotal.toFixed(2)}</span>
        </div>
        {isStatutory && (
          <div className="flex justify-between text-[#007d48] font-bold">
            <span>20% Senior/PWD Discount:</span>
            <span>-₱{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[#64748B] dark:text-white/60 text-[11px]">
          <span>{isStatutory ? "VAT-Exempt Base:" : "Vatable Sales:"}</span>
          <span>₱{(isStatutory ? vatExemptSales : vatableSales).toFixed(2)}</span>
        </div>
        {!isStatutory && (
          <div className="flex justify-between text-[#64748B] dark:text-white/60 text-[11px]">
            <span>12% VAT:</span>
            <span>₱{vatAmount.toFixed(2)}</span>
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
        disabled={cart.length === 0 || isProcessing}
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
    </div>
  );
}
