"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Zap,
  HelpCircle,
  Copy,
  Check,
  Terminal,
  ExternalLink,
} from "lucide-react";
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
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(true);
  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(false);
  const [copiedCommand, setCopiedCommand] = useState<boolean>(false);
  const printedInvoiceRef = useRef<string | null>(null);

  // Load auto-print preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cj_pos_auto_print");
      if (saved !== null) {
        setAutoPrintEnabled(saved === "true");
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  const handleToggleAutoPrint = (enabled: boolean) => {
    setAutoPrintEnabled(enabled);
    try {
      localStorage.setItem("cj_pos_auto_print", String(enabled));
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    playHapticSound("scan");
    window.print();
  };

  // Automated printing trigger upon modal opening
  useEffect(() => {
    if (isOpen && invoice && autoPrintEnabled) {
      // Guard against double printing the same invoice number
      if (printedInvoiceRef.current !== invoice.invoiceNumber) {
        printedInvoiceRef.current = invoice.invoiceNumber;
        const timer = setTimeout(() => {
          handlePrint();
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, invoice, autoPrintEnabled]);

  if (!isOpen || !invoice) return null;

  const isDiscounted = invoice.discountType !== "none";

  const chromeShortcutCommand = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --kiosk-printing --app=${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/cashier`;
  const edgeShortcutCommand = `msedge.exe --kiosk-printing --app=${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/cashier`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:p-0 print:bg-white animate-in fade-in duration-150">
      <div className="bg-white text-[#111111] max-w-md w-full rounded-2xl shadow-2xl border border-[#cacacb] overflow-hidden flex flex-col max-h-[92vh] print:max-w-none print:w-[80mm] print:border-none print:shadow-none print:m-0">
        
        {/* Modal Screen Header (Hidden on Print) */}
        <div className="p-3.5 sm:p-4 border-b border-[#e5e5e5] flex items-center justify-between bg-[#fcfcfc] print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#007d48] animate-pulse" />
            <span className="font-extrabold text-xs uppercase tracking-wider text-[#111111]">
              Official Sales Invoice (BIR RA 11976)
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSetupGuide(true)}
              title="How to enable zero-click silent printing"
              className="px-2 py-1 rounded-md text-[11px] font-bold text-[#0B2A67] bg-[#EDF4FC] hover:bg-[#dbeafe] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-[#E8BA00]" />
              <span className="hidden sm:inline">Silent Print Setup</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-[#f0f0f0] text-[#707072] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auto-Print Banner Status (Hidden on Print) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs flex items-center justify-between print:hidden">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoPrintEnabled}
              onChange={(e) => handleToggleAutoPrint(e.target.checked)}
              className="rounded text-[#0B2A67] focus:ring-[#0B2A67] w-4 h-4"
            />
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              Auto-Print on Checkout
            </span>
          </label>
          <button
            type="button"
            onClick={() => setShowSetupGuide(true)}
            className="text-[11px] text-[#0B2A67] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
          >
            <span>Bypass dialog?</span>
            <HelpCircle className="w-3 h-3 text-slate-400" />
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
            <div className="flex justify-center pb-1.5">
              <img
                src="/cj-logo-bw.png"
                alt="C&J Logo"
                className="h-9 w-auto object-contain print:h-8"
              />
            </div>
            <h2 className="font-black text-base uppercase tracking-tight text-[#111111]">
              C&amp;J&apos;S EVENTS PLACE &amp; SPORTS ARENA
            </h2>
            <p className="text-[10px] text-[#555555]">
              25 Bologna Muzon, Taytay, Rizal, Philippines, 1920
            </p>
            <p className="text-[10px] text-[#555555]">
              TIN: 000-123-456-00000 &bull; Non-VAT Registered
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
                        : invoice.discountType === "pwd"
                        ? "PWD (RA 10754)"
                        : invoice.discountType === "student"
                        ? "Student Privilege"
                        : invoice.discountType === "employee"
                        ? "Employee / Staff"
                        : "Special Privilege"}
                    </span>
                  </div>
                  {invoice.discountIdNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#555555]">
                        {invoice.discountType === "student"
                          ? "Student ID:"
                          : invoice.discountType === "employee"
                          ? "Staff ID:"
                          : "Privilege ID No:"}
                      </span>
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
            {invoice.items.map((item, idx) => {
              const selections = invoice.discountItemSelections || {};
              const discountedQty = selections[item.productId] || 0;
              const isStatutory = invoice.discountType === "senior_citizen" || invoice.discountType === "pwd";

              return (
                <div key={idx} className="space-y-0.5">
                  <div className="grid grid-cols-12 text-[11px]">
                    <span className="col-span-6 font-medium truncate">{item.name}</span>
                    <span className="col-span-2 text-center text-[#555555]">{item.quantity}</span>
                    <span className="col-span-4 text-right font-bold">
                      ₱{item.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {isStatutory && discountedQty > 0 && (
                    <div className="text-[9px] text-[#007d48] font-bold pl-1">
                      &bull; {discountedQty}x {invoice.discountType === "senior_citizen" ? "Senior" : "PWD"} 20% Disc. Applied
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Order Financial Summary (Tax Removed) */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-[#555555]">
              <span>Gross Sales:</span>
              <span>₱{invoice.grossAmount.toFixed(2)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between font-bold text-[#111111]">
                <span>
                  {invoice.discountType === "senior_citizen"
                    ? "Senior Discount (20%):"
                    : invoice.discountType === "pwd"
                    ? "PWD Discount (20%):"
                    : invoice.discountType === "student"
                    ? "Student Discount (₱10 Off):"
                    : invoice.discountType === "employee"
                    ? "Employee Discount (10%):"
                    : "Discount:"}
                </span>
                <span>-₱{invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm pt-2 border-t border-dashed border-[#111111] text-[#111111]">
              <span>TOTAL DUE:</span>
              <span>₱{invoice.total.toFixed(2)}</span>
            </div>
            {invoice.paymentMethod.startsWith("Split:") ? (
              <div className="space-y-1 pt-1.5 border-t border-dotted border-[#999999]/50 mt-1">
                <div className="flex justify-between text-[#555555] text-[10px]">
                  <span>Payment Mode:</span>
                  <span className="font-bold uppercase text-[#111111]">SPLIT PAYMENT</span>
                </div>
                <div className="space-y-0.5 text-[10px] font-mono">
                  {invoice.paymentMethod.replace("Split: ", "").split(" + ").map((part, idx) => {
                    const match = part.match(/^(.*?)\s*\(₱?([0-9.]+)\)$/);
                    const label = match ? match[1] : part;
                    const amt = match ? match[2] : "";
                    return (
                      <div key={idx} className="flex justify-between text-[#444444]">
                        <span>&bull; {label}:</span>
                        <span className="font-bold text-[#111111]">₱{Number(amt || 0).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex justify-between text-[#555555] text-[10px] pt-1">
                <span>Payment Mode:</span>
                <span className="font-bold uppercase text-[#111111]">{invoice.paymentMethod}</span>
              </div>
            )}
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
            <p>Non-refundable after 24h</p>
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

      {/* Zero-Click Kiosk Silent Printing Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] text-[#111111] dark:text-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-300 dark:border-white/20 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0B2A67] dark:bg-[#FFD21C] text-white dark:text-[#0B2A67] flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Automate Thermal Printing (Zero-Click)</h3>
                  <p className="text-[11px] text-slate-500">Bypass the browser print confirmation dialog</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                Normally, web browsers show a <strong>Print Preview</strong> window asking you to click &ldquo;Print&rdquo;.
                To eliminate this confirmation and make receipts print <strong>instantly</strong>, follow these 2 steps on your Cashier PC:
              </p>

              {/* Step 1 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <p className="font-black text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                  <span>Step 1: Set Receipt Printer as Windows Default</span>
                </p>
                <p className="text-[11px]">
                  Open <strong>Windows Settings &rarr; Bluetooth &amp; devices &rarr; Printers &amp; scanners</strong>. Click your POS Thermal Printer (Xprinter, Epson, POS-80) and click <strong>&ldquo;Set as default&rdquo;</strong>. Also ensure paper size is set to <strong>80mm roll</strong> and margins to <strong>None</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2">
                <p className="font-black text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
                  <span>Step 2: Launch Browser in &ldquo;Kiosk Printing&rdquo; Mode</span>
                </p>
                <p className="text-[11px]">
                  Google Chrome and Microsoft Edge include an official <code>--kiosk-printing</code> flag designed specifically for retail POS. It sends all print requests directly to your receipt printer without any preview or confirmation clicks!
                </p>
                
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Chrome POS Desktop Shortcut Target:
                  </span>
                  <div className="p-2 bg-black text-emerald-400 font-mono text-[11px] rounded-lg break-all select-all flex items-center justify-between gap-2">
                    <span className="truncate">{chromeShortcutCommand}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(chromeShortcutCommand)}
                      className="p-1 rounded hover:bg-white/20 text-white shrink-0 cursor-pointer"
                      title="Copy shortcut command"
                    >
                      {copiedCommand ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Or with Microsoft Edge:
                  </span>
                  <div className="p-2 bg-black text-emerald-400 font-mono text-[11px] rounded-lg break-all select-all flex items-center justify-between gap-2">
                    <span className="truncate">{edgeShortcutCommand}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(edgeShortcutCommand)}
                      className="p-1 rounded hover:bg-white/20 text-white shrink-0 cursor-pointer"
                      title="Copy shortcut command"
                    >
                      {copiedCommand ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                💡 <strong>Result:</strong> Every time you tap &ldquo;Complete &amp; Print Invoice&rdquo; on the cashier counter, the receipt will now feed and cut automatically from your printer with <strong>zero dialogs</strong> and <strong>zero clicks</strong>!
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={() => setShowSetupGuide(false)}
                className="h-9 px-4 text-xs font-bold bg-[#0B2A67] text-white hover:bg-[#123A82] rounded-xl cursor-pointer"
              >
                Got It!
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

