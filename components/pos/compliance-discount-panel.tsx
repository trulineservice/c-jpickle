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
    <div className="border border-[#e5e5e5] rounded-xl p-4 bg-[#fcfcfc] space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#007d48]" />
          Philippine BIR EOPT &amp; Statutory Discounts
        </label>
        {isStatutory && (
          <span className="text-[10px] font-bold text-[#007d48] bg-[#007d48]/10 px-2 py-0.5 rounded-full">
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
            className={`py-2 px-2 text-center rounded-lg border text-xs font-bold transition-all ${
              discountType === btn.id
                ? "bg-[#111111] text-white border-[#111111] shadow-xs"
                : "bg-white text-[#707072] border-[#e5e5e5] hover:border-[#111111] hover:text-[#111111]"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Conditional Statutory Input Fields */}
      {isStatutory && (
        <div className="space-y-2 pt-2 border-t border-[#f0f0f0] animate-in fade-in duration-200">
          <div>
            <Label htmlFor="custName" className="text-[11px] font-bold uppercase text-[#707072] dark:text-[#a1a1aa]">
              Customer Full Name <span className="text-[#d30005]">*</span>
            </Label>
            <Input
              id="custName"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Full Name as shown on Senior / PWD ID"
              className="h-9 text-xs rounded-lg mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="discId" className="text-[11px] font-bold uppercase text-[#707072] dark:text-[#a1a1aa]">
                Senior / PWD ID Number <span className="text-[#d30005]">*</span>
              </Label>
              <Input
                id="discId"
                value={discountIdNumber}
                onChange={(e) => onDiscountIdNumberChange(e.target.value)}
                placeholder="e.g. SC-104928"
                className="h-9 text-xs rounded-lg mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="custTin" className="text-[11px] font-bold uppercase text-[#707072] dark:text-[#a1a1aa]">
                Customer TIN (Optional)
              </Label>
              <Input
                id="custTin"
                value={customerTin}
                onChange={(e) => onCustomerTinChange(e.target.value)}
                placeholder="000-000-000-000"
                className="h-9 text-xs rounded-lg mt-1 font-mono"
              />
            </div>
          </div>

          <p className="text-[10px] text-[#707072]">
            Mandated under RA 9994 (Senior Citizens) &amp; RA 10754 (PWDs). Required for BIR audit compliance.
          </p>
        </div>
      )}

      {complianceError && (
        <div className="p-2.5 rounded-lg border border-[#d30005]/20 bg-[#d30005]/5 text-[11px] text-[#d30005] flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{complianceError}</span>
        </div>
      )}
    </div>
  );
}
