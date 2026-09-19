"use client";

import React from "react";
import { Printer, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PosCheckoutResult } from "@/app/actions";
import { playHapticSound } from "@/lib/motion-feedback";

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
    playHapticSound("scan");
    window.print();
  };

  const isDiscounted = invoice.discountType !== "none";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white animate-in fade-in duration-150">
      <div className="bg-white text-[#111111] max-w-md w-full rounded-2xl shadow-2xl border border-[#cacacb] overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:w-[80mm] print:border-none print:shadow-none print:m-0">
        {/* Modal Screen Header (Hidden on Print) */}
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fcfcfc] print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007d48]" />
            <span className="font-extrabold text-xs uppercase tracking-wider text-[#111111]">
              Official Sales Invoice (BIR RA 11976)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[#f0f0f0] text-[#707072] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable 80mm Continuous Thermal Receipt Container */}
        <div
          id="thermal-receipt-container"
          className="p-6 overflow-y-auto font-mono text-xs space-y-4 printable-receipt print:p-2 print:overflow-visible print:text-[11px] print:leading-tight"
          style={{
            WebkitPrintColorAdjust: "exact",
            colorAdjust: "exact",
          }}
        >
          {/* Business Header */}
          <div className="text-center space-y-1 border-b border-dashed border-[#111111] pb-3">
            <h2 className="font-black text-base uppercase tracking-tight text-[#111111]">
              C&amp;J&apos;S EVENTS PLACE &amp; SPORTS ARENA
            </h2>
            <p className="text-[10px] text-[#555555]">
              25 Bologna Muzon, Taytay, Rizal, Philippines, 1920
            </p>
            <p className="text-[10px] text-[#555555]">
              VAT Reg. TIN: 000-123-456-00000 &bull; EOPT Compliant
            </p>
            <div className="pt-1.5 font-bold text-xs text-[#111111] tracking-wider">
              {invoice.invoiceNumber}
            </div>
            <p className="text-[10px] text-[#555555]">
              {new Date(invoice.createdAt).toLocaleString("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          {/* Customer / BIR Compliance Privilege Details */}
          {(invoice.customerName || isDiscounted) && (
            <div className="border-b border-dashed border-[#111111] pb-2.5 text-[11px] space-y-1">
              {invoice.customerName && (
                <div className="flex justify-between">
                  <span className="text-[#555555]">Customer:</span>
                  <span className="font-bold">{invoice.customerName}</span>
                </div>
              )}
              {isDiscounted && (
                <>
                  <div className="flex justify-between font-semibold">
                    <span>Privilege:</span>
                    <span className="font-bold uppercase">
                      {invoice.discountType === "senior_citizen"
                        ? "Senior Citizen (RA 9994)"
                        : "PWD (RA 10754)"}
                    </span>
                  </div>
                  {invoice.discountIdNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#555555]">Privilege ID No:</span>
                      <span className="font-bold">{invoice.discountIdNumber}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Purchased Items Table */}
          <div className="border-b border-dashed border-[#111111] pb-3 space-y-1.5">
            <div className="grid grid-cols-12 font-bold text-[10px] text-[#555555] uppercase pb-1 border-b border-dotted border-[#999999]">
              <span className="col-span-6">ITEM</span>
              <span className="col-span-2 text-center">QTY</span>
              <span className="col-span-4 text-right">TOTAL</span>
            </div>
            {invoice.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 text-[11px]">
                <span className="col-span-6 font-medium truncate">{item.name}</span>
                <span className="col-span-2 text-center text-[#555555]">{item.quantity}</span>
                <span className="col-span-4 text-right font-bold">
                  ₱{item.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* BIR EOPT Statutory Tax Breakdown */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-[#555555]">
              <span>Gross Sales:</span>
              <span>₱{invoice.grossAmount.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between font-bold text-[#111111]">
                <span>Statutory 20% Discount:</span>
                <span>-₱{invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#555555]">
              <span>Vatable Sales:</span>
              <span>₱{invoice.vatableSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#555555]">
              <span>12% VAT:</span>
              <span>₱{invoice.vatAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#555555]">
              <span>VAT-Exempt Sales:</span>
              <span>₱{invoice.vatExemptSales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-black text-sm pt-2 border-t border-dashed border-[#111111] text-[#111111]">
              <span>TOTAL DUE:</span>
              <span>₱{invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#555555] text-[10px] pt-1">
              <span>Payment Mode:</span>
              <span className="font-bold uppercase text-[#111111]">{invoice.paymentMethod}</span>
            </div>
          </div>

          {/* Monochromatic Barcode Pattern for Thermal Head Alignment */}
          <div className="py-2 text-center flex flex-col items-center">
            <div className="w-48 h-8 flex items-end justify-center gap-[2px]">
              {Array.from({ length: 44 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-black"
                  style={{
                    width: i % 3 === 0 ? "3px" : i % 2 === 0 ? "2px" : "1px",
                    height: i % 5 === 0 ? "100%" : "80%",
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] text-[#555555] tracking-widest mt-1">
              *{invoice.invoiceNumber.replace(/[^A-Za-z0-9]/g, "")}*
            </span>
          </div>

          {/* Footer Receipt Notice */}
          <div className="text-center pt-2 border-t border-dashed border-[#111111] text-[9px] text-[#555555] space-y-0.5">
            <p className="font-bold text-[#111111]">THANK YOU FOR PLAYING AT C&amp;J!</p>
            <p>This document serves as an Official Sales Invoice.</p>
            <p>Non-refundable after 24h &bull; System Powered by Antigravity</p>
          </div>
        </div>

        {/* Modal Screen Action Controls (Hidden on Print) */}
        <div className="p-4 border-t border-[#e5e5e5] bg-[#fcfcfc] flex gap-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 text-xs font-bold h-10 rounded-full cursor-pointer"
          >
            Close Window
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1 text-xs font-bold h-10 rounded-full bg-[#111111] text-white hover:bg-[#222222] flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Print 80mm Receipt</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
