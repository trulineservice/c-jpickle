"use client";

import React from "react";
import { Printer, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PosCheckoutResult } from "@/app/actions";

interface SalesInvoiceModalProps {
  invoice: PosCheckoutResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SalesInvoiceModal({
  invoice,
  isOpen,
  onClose,
}: SalesInvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDiscounted = invoice.discountType !== "none";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-[#111111] max-w-md w-full rounded-2xl shadow-2xl border border-[#cacacb] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fcfcfc]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007d48]" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#111111]">
              Official Sales Invoice (BIR EOPT)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#f0f0f0] text-[#707072] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 overflow-y-auto font-mono text-xs space-y-4 printable-receipt">
          {/* Business Header */}
          <div className="text-center space-y-1 border-b border-dashed border-[#cacacb] pb-4">
            <h2 className="font-black text-base uppercase tracking-tight text-[#111111]">
              C&amp;J PICKLEBALL ARENA
            </h2>
            <p className="text-[11px] text-[#707072]">
              Tomas Morato Ave., Quezon City, Metro Manila
            </p>
            <p className="text-[10px] text-[#707072]">
              VAT Reg. TIN: 000-123-456-00000 • NON-VAT / VAT Reg
            </p>
            <div className="pt-2 font-bold text-xs text-[#007d48]">
              {invoice.invoiceNumber}
            </div>
            <p className="text-[10px] text-[#707072]">
              {new Date(invoice.createdAt).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Customer / Compliance Details */}
          {(invoice.customerName || isDiscounted) && (
            <div className="border-b border-dashed border-[#cacacb] pb-3 text-[11px] space-y-1">
              {invoice.customerName && (
                <div className="flex justify-between">
                  <span className="text-[#707072]">Customer:</span>
                  <span className="font-bold">{invoice.customerName}</span>
                </div>
              )}
              {isDiscounted && (
                <>
                  <div className="flex justify-between text-[#007d48]">
                    <span>Discount Privilege:</span>
                    <span className="font-bold uppercase">
                      {invoice.discountType === "senior_citizen"
                        ? "Senior Citizen (RA 9994)"
                        : "PWD (RA 10754)"}
                    </span>
                  </div>
                  {invoice.discountIdNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#707072]">Senior/PWD ID No:</span>
                      <span className="font-bold">{invoice.discountIdNumber}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Purchased Items Table */}
          <div className="border-b border-dashed border-[#cacacb] pb-3 space-y-2">
            <div className="grid grid-cols-12 font-bold text-[11px] text-[#707072]">
              <span className="col-span-6">ITEM</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-4 text-right">TOTAL</span>
            </div>
            {invoice.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-[11px]">
                <span className="col-span-6 font-medium truncate">{item.name}</span>
                <span className="col-span-2 text-center text-[#707072]">{item.quantity}</span>
                <span className="col-span-4 text-right font-bold">
                  ₱{item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* BIR EOPT Statutory Tax Breakdown */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between text-[#707072]">
              <span>Gross Sales:</span>
              <span>₱{invoice.grossAmount.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-[#007d48] font-semibold">
                <span>Statutory 20% Discount:</span>
                <span>-₱{invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#707072]">
              <span>Vatable Sales:</span>
              <span>₱{invoice.vatableSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#707072]">
              <span>12% VAT:</span>
              <span>₱{invoice.vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#707072]">
              <span>VAT-Exempt Sales:</span>
              <span>₱{invoice.vatExemptSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-2 border-t border-dashed border-[#cacacb] text-[#111111]">
              <span>TOTAL AMOUNT DUE:</span>
              <span>₱{invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#707072] text-[10px] pt-1">
              <span>Payment Method:</span>
              <span className="font-bold uppercase">{invoice.paymentMethod}</span>
            </div>
          </div>

          {/* Footer Receipt Notice */}
          <div className="text-center pt-3 border-t border-dashed border-[#cacacb] text-[10px] text-[#707072] space-y-1">
            <p className="font-bold text-[#111111]">THANK YOU FOR PLAYING AT C&amp;J!</p>
            <p>This document serves as an Official Sales Invoice.</p>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="p-4 border-t border-[#e5e5e5] bg-[#fcfcfc] flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 text-xs font-bold h-10 rounded-full"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1 text-xs font-bold h-10 rounded-full bg-[#111111] text-white hover:bg-[#222222] flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
