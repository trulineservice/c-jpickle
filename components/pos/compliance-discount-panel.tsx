"use client";

import React from "react";
import { UserCheck, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ComplianceDiscountPanelProps {
  discountType: "none" | "senior_citizen" | "pwd";
  onDiscountTypeChange: (type: "none" | "senior_citizen" | "pwd") => void;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerTin: string;
  onCustomerTinChange: (val: string) => void;
  discountIdNumber: string;
  onDiscountIdNumberChange: (val: string) => void;
  complianceError: string | null;
}

export function ComplianceDiscountPanel({
  discountType,
  onDiscountTypeChange,
  customerName,
  onCustomerNameChange,
  customerTin,
  onCustomerTinChange,
  discountIdNumber,
  onDiscountIdNumberChange,
  complianceError,
}: ComplianceDiscountPanelProps) {
  const isStatutory = discountType === "senior_citizen" || discountType === "pwd";

  return (
    <div className="border border-[#e5e5e5] dark:border-white/10 rounded-2xl p-4 bg-[#fcfcfc] dark:bg-[#071E4B]/30 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-[#0B2A67] dark:text-white flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#007d48] dark:text-[#10b981]" />
          Philippine BIR EOPT &amp; Statutory Discounts
        </label>
        {isStatutory && (
          <span className="text-[10px] font-black text-[#007d48] dark:text-emerald-300 bg-[#007d48]/10 dark:bg-emerald-950/60 border border-[#007d48]/20 dark:border-emerald-800 px-2.5 py-0.5 rounded-full">
            20% Discount + 12% VAT Exempt
          </span>
        )}
      </div>

      {/* Discount Type Radio Selection */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: "none", label: "Regular" },
          { id: "senior_citizen", label: "Senior Citizen" },
          { id: "pwd", label: "PWD" },
        ].map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => onDiscountTypeChange(btn.id as any)}
            className={`py-2 px-2 text-center rounded-xl border text-xs font-black transition-all cursor-pointer active:scale-[0.98] ${
              discountType === btn.id
                ? "bg-[#0B2A67] text-white border-[#0B2A67] shadow-sm ring-2 ring-[#FFD21C]"
                : "bg-white dark:bg-white/5 text-[#707072] dark:text-white/70 border-[#e5e5e5] dark:border-white/10 hover:border-[#0B2A67] dark:hover:border-[#FFD21C] hover:text-[#0B2A67] dark:hover:text-white"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Conditional Statutory Input Fields */}
      {isStatutory && (
        <div className="space-y-2.5 pt-2.5 border-t border-[#f0f0f0] dark:border-white/10 animate-in fade-in duration-200">
          <div>
            <Label htmlFor="custName" className="text-[11px] font-black uppercase text-[#0B2A67] dark:text-white/80">
              Customer Full Name <span className="text-[#bf050b]">*</span>
            </Label>
            <Input
              id="custName"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Full Name as shown on Senior / PWD ID"
              className="h-9 text-xs rounded-xl mt-1 bg-white dark:bg-black/40 border-[#e5e5e5] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="discId" className="text-[11px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                Senior / PWD ID Number <span className="text-[#bf050b]">*</span>
              </Label>
              <Input
                id="discId"
                value={discountIdNumber}
                onChange={(e) => onDiscountIdNumberChange(e.target.value)}
                placeholder="e.g. SC-104928"
                className="h-9 text-xs rounded-xl mt-1 font-mono bg-white dark:bg-black/40 border-[#e5e5e5] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
            <div>
              <Label htmlFor="custTin" className="text-[11px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                Customer TIN (Optional)
              </Label>
              <Input
                id="custTin"
                value={customerTin}
                onChange={(e) => onCustomerTinChange(e.target.value)}
                placeholder="000-000-000-000"
                className="h-9 text-xs rounded-xl mt-1 font-mono bg-white dark:bg-black/40 border-[#e5e5e5] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
          </div>

          <p className="text-[10px] text-[#707072] dark:text-white/60 font-medium">
            Mandated under RA 9994 (Senior Citizens) &amp; RA 10754 (PWDs). Required for BIR audit compliance.
          </p>
        </div>
      )}

      {complianceError && (
        <div className="p-2.5 rounded-xl border border-[#bf050b]/30 bg-[#bf050b]/10 text-[11px] text-[#bf050b] dark:text-red-300 font-bold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{complianceError}</span>
        </div>
      )}
    </div>
  );
}
