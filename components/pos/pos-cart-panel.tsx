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
    <div className="border border-[#e5e5e5] rounded-2xl p-5 bg-white shadow-sm flex flex-col h-full space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-[#111111]" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-[#111111]">
            Active Order
          </h3>
          <span className="text-xs bg-[#f5f5f5] text-[#707072] px-2 py-0.5 rounded-full font-bold">
            {cart.reduce((total, i) => total + i.quantity, 0)}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-xs text-[#707072] hover:text-[#d30005] font-semibold transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[320px] pr-1">
        {cart.length === 0 ? (
          <div className="h-44 border border-dashed border-[#e5e5e5] rounded-xl flex flex-col items-center justify-center text-xs text-[#707072] gap-1">
            <ShoppingCart className="w-6 h-6 text-[#cacacb]" />
            <p>Cart is empty</p>
            <span className="text-[11px] text-[#a0a0a2]">Click items on the left to add</span>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl border border-[#f0f0f0] bg-[#fcfcfc] hover:border-[#e5e5e5] transition-colors"
            >
              <div className="flex-1 min-w-0 pr-2">
                <h5 className="font-bold text-xs text-[#111111] truncate">{item.name}</h5>
                <span className="text-[11px] text-[#707072]">₱{item.price} each</span>
              </div>

              {/* Quantity Adjusters */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="w-7 h-7 rounded-lg border border-[#e5e5e5] bg-white flex items-center justify-center text-[#111111] hover:bg-[#f5f5f5]"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold text-[#111111]">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="w-7 h-7 rounded-lg border border-[#e5e5e5] bg-white flex items-center justify-center text-[#111111] hover:bg-[#f5f5f5]"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="w-7 h-7 rounded-lg text-[#707072] hover:text-[#d30005] flex items-center justify-center ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Channel Selector */}
      <div className="space-y-2 pt-2 border-t border-[#f0f0f0]">
        <label className="text-xs font-bold uppercase tracking-wider text-[#707072] block">
          Payment Method
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {paymentMethods.map((pm) => {
            const Icon = pm.icon;
            const isSelected = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => onPaymentMethodChange(pm.id)}
                className={`py-2 px-1.5 rounded-lg border text-[11px] font-bold flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                    : "bg-white text-[#707072] border-[#e5e5e5] hover:border-[#111111]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{pm.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Financial Summary & Total */}
      <div className="border-t border-[#f0f0f0] pt-3 space-y-1.5 text-xs">
        <div className="flex justify-between text-[#707072]">
          <span>Gross Subtotal:</span>
          <span>₱{grossSubtotal.toFixed(2)}</span>
        </div>
        {isStatutory && (
          <div className="flex justify-between text-[#007d48] font-semibold">
            <span>20% Senior/PWD Discount:</span>
            <span>-₱{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[#707072] text-[11px]">
          <span>{isStatutory ? "VAT-Exempt Base:" : "Vatable Sales:"}</span>
          <span>₱{(isStatutory ? vatExemptSales : vatableSales).toFixed(2)}</span>
        </div>
        {!isStatutory && (
          <div className="flex justify-between text-[#707072] text-[11px]">
            <span>12% VAT:</span>
            <span>₱{vatAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-2 border-t border-[#f0f0f0] text-sm font-black text-[#111111]">
          <span>NET PAYABLE:</span>
          <span className="text-xl">₱{netPayable.toFixed(2)}</span>
        </div>
      </div>

      {/* Charge & Print Button */}
      <Button
        type="button"
        disabled={cart.length === 0 || isProcessing}
        onClick={onCheckout}
        className="w-full h-12 rounded-full bg-[#111111] text-white hover:bg-[#222222] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating Invoice...
          </>
        ) : (
          `Complete & Print Invoice (₱${netPayable.toFixed(2)})`
        )}
      </Button>
    </div>
  );
}
