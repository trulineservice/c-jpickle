---
name: pos-receipt-hardware-ui
description: Use this skill when developing or styling thermal printer receipts (58mm/80mm), QR code court passes, physical barcode scanner input handlers, or cashier keyboard shortcuts for the POS.
---

# POS Receipt & Hardware UI Skill

This skill contains precise specifications and code patterns for integrating hardware peripherals with the C&J Pickleball cashier and front-desk systems.

## 1. Thermal Receipt Printing (58mm & 80mm)

Thermal printers have no color, low DPI, and narrow printable widths. Printing regular web pages causes horizontal cutoffs, tiny text, and ugly browser headers/footers.

### `@media print` Thermal Stylesheet
```css
@media print {
  /* Hide all app chrome */
  body * {
    visibility: hidden;
  }
  
  #thermal-receipt, #thermal-receipt * {
    visibility: visible;
  }

  #thermal-receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm; /* Use 58mm for compact mobile belt printers */
    margin: 0;
    padding: 2mm;
    background: #fff;
    color: #000;
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.25;
  }

  @page {
    size: 80mm auto;
    margin: 0; /* Strips browser page number and timestamp headers */
  }
}
```

### Clean Thermal Receipt Layout Component
```tsx
export function ThermalReceiptView({ order }: { order: any }) {
  return (
    <div id="thermal-receipt" className="hidden print:block text-black font-mono">
      <div className="text-center pb-2 border-b border-dashed border-black">
        <h1 className="text-sm font-bold tracking-wider">C&J PICKLEBALL ARENA</h1>
        <p className="text-[10px]">Brgy. San Antonio, Pasig City</p>
        <p className="text-[10px]">TIN: 000-000-000-000-VAT</p>
        <p className="text-[10px] mt-1 font-bold">OFFICIAL SALES INVOICE</p>
      </div>

      <div className="text-[11px] my-2 space-y-0.5">
        <div className="flex justify-between">
          <span>Invoice #: {order.invoice_no}</span>
          <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p>Cashier: {order.cashier_name || 'Front Desk'}</p>
        {order.court_booking && (
          <p className="font-bold text-xs mt-1">Court: {order.court_booking.court_name} ({order.court_booking.time_slot})</p>
        )}
      </div>

      {/* Item Table */}
      <div className="border-t border-b border-dashed border-black py-2 my-2 text-[11px]">
        {order.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between py-0.5">
            <span className="truncate max-w-[140px]">{item.quantity}x {item.name}</span>
            <span>₱{item.total.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Totals & VAT Breakdown */}
      <div className="text-[11px] space-y-1">
        <div className="flex justify-between font-bold text-xs">
          <span>TOTAL AMOUNT DUE</span>
          <span>₱{order.total_amount.toFixed(2)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-[10px]">
            <span>Statutory Discount ({order.discount_type})</span>
            <span>-₱{order.discount_amount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[10px]">
          <span>Cash Tendered</span>
          <span>₱{order.cash_tendered.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span>Change</span>
          <span>₱{order.change.toFixed(2)}</span>
        </div>
      </div>

      <div className="text-center mt-4 pt-2 border-t border-dashed border-black text-[10px]">
        <p>Thank you for playing at C&J!</p>
        <p className="font-bold">SMASH • DINK • REPEAT</p>
      </div>
    </div>
  );
}
```

## 2. Hardware Barcode Scanner Listener

Physical USB/Bluetooth barcode scanners type key-by-key rapidly and finish with an `Enter` key event. This hook captures scans globally without requiring the cashier to click into an input box:

```tsx
import { useEffect, useRef } from "react";

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // If user is actively typing in a standard form input or textarea, ignore global scanner capture
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) && !target.dataset.scannerTarget) {
        return;
      }

      const now = Date.now();
      // Hardware scanners typically output characters faster than 40ms apart
      if (now - lastKeyTimeRef.current > 70) {
        bufferRef.current = ""; // Reset buffer if typing was slow (manual typing)
      }
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (bufferRef.current.length >= 3) {
          e.preventDefault();
          onScan(bufferRef.current);
          bufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
}
```

## 3. Front-Desk Hotkey System

Standardize shortcuts across cashier and booking interfaces:
- `F2`: Quick Search / Focus catalog
- `F4`: Toggle Senior / PWD Discount form
- `F8`: Split Tender / Multiple Payment Options
- `F10` / `Ctrl+Enter`: Quick Charge & Print Receipt
- `Escape`: Close Modals / Clear Cart Selection
