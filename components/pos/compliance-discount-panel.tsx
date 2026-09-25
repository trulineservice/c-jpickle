"use client";

import React from "react";
import { UserCheck, ShieldCheck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ComplianceDiscountPanelProps {
  discountType: "none" | "senior_citizen" | "pwd" | "student" | "employee";
  onDiscountTypeChange: (type: "none" | "senior_citizen" | "pwd" | "student" | "employee") => void;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerTin: string;
  onCustomerTinChange: (val: string) => void;
  discountIdNumber: string;
  onDiscountIdNumberChange: (val: string) => void;
  complianceError: string | null;
  onOpenDiscountModal?: (type: "senior_citizen" | "pwd") => void;
  selectedItemCount?: number;
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
  onOpenDiscountModal,
  selectedItemCount = 0,
}: ComplianceDiscountPanelProps) {
  const isStatutory = discountType === "senior_citizen" || discountType === "pwd";
  const isStudent = discountType === "student";
  const isEmployee = discountType === "employee";

  const handleSelectDiscount = (type: "none" | "senior_citizen" | "pwd" | "student" | "employee") => {
    onDiscountTypeChange(type);
    if ((type === "senior_citizen" || type === "pwd") && onOpenDiscountModal) {
      onOpenDiscountModal(type);
    }
  };

  return (
    <div className="border border-[#E2E8F0] dark:border-white/10 rounded-3xl p-4 bg-white dark:bg-[#071E4B]/40 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-1.5">
        <label className="text-[11px] font-black uppercase tracking-wider text-[#0B2A67] dark:text-[#FFD21C] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#007d48] dark:text-[#10b981]" />
          Discounts &amp; Privileges
        </label>
        {isStatutory && (
          <button
            type="button"
            onClick={() => onOpenDiscountModal?.(discountType as any)}
            className="text-[9px] font-black text-[#007d48] dark:text-emerald-300 bg-[#007d48]/10 dark:bg-emerald-950/60 border border-[#007d48]/20 dark:border-emerald-800 px-2 py-0.5 rounded-full hover:bg-[#007d48]/20 transition-colors cursor-pointer"
          >
            20% Statutory &bull; {selectedItemCount > 0 ? `${selectedItemCount} Item(s)` : 'Select Items'}
          </button>
        )}
        {isStudent && (
          <span className="text-[9px] font-black text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
            ₱10 Off Flat
          </span>
        )}
        {isEmployee && (
          <span className="text-[9px] font-black text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
            10% Staff
          </span>
        )}
      </div>

      {/* Discount Type Selection Buttons */}
      <div className="grid grid-cols-5 gap-1">
        {[
          { id: "none", label: "Regular", sub: "Standard" },
          { id: "senior_citizen", label: "Senior", sub: "20% Off" },
          { id: "pwd", label: "PWD", sub: "20% Off" },
          { id: "student", label: "Student", sub: "₱10 Off" },
          { id: "employee", label: "Staff", sub: "10% Off" },
        ].map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => handleSelectDiscount(btn.id as any)}
            className={`py-1.5 px-1 text-center rounded-xl border text-[11px] font-black transition-all cursor-pointer active:scale-[0.97] flex flex-col items-center justify-center gap-0.5 ${
              discountType === btn.id
                ? "bg-[#0B2A67] text-white border-[#0B2A67] shadow-sm ring-2 ring-[#FFD21C]"
                : "bg-white dark:bg-white/5 text-[#64748B] dark:text-white/70 border-[#E2E8F0] dark:border-white/10 hover:border-[#0B2A67] dark:hover:border-[#FFD21C] hover:text-[#0B2A67] dark:hover:text-white"
            }`}
          >
            <span className="truncate w-full text-center">{btn.label}</span>
            <span className={`text-[9px] font-bold ${discountType === btn.id ? "text-[#FFD21C]" : "text-[#64748B] dark:text-white/50"}`}>
              {btn.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Conditional Statutory Input Fields (Senior / PWD) */}
      {isStatutory && (
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-white/10 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-[#FFD21C]">
              {discountType === 'senior_citizen' ? 'Senior Citizen' : 'PWD Cardholder'} Allocation
            </span>
            {onOpenDiscountModal && (
              <button
                type="button"
                onClick={() => onOpenDiscountModal(discountType as any)}
                className="text-[10px] font-bold text-[#007d48] dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Select Specific Items &rarr;</span>
              </button>
            )}
          </div>

          <div>
            <Label htmlFor="custName" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
              Customer Full Name <span className="text-[#bf050b]">*</span>
            </Label>
            <Input
              id="custName"
              value={customerName}
              onChange={(e) => onCustomerNameChange(e.target.value)}
              placeholder="Full Name on Senior / PWD ID"
              className="h-8 text-xs rounded-xl mt-0.5 bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label htmlFor="discId" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                ID Number <span className="text-[#bf050b]">*</span>
              </Label>
              <Input
                id="discId"
                value={discountIdNumber}
                onChange={(e) => onDiscountIdNumberChange(e.target.value)}
                placeholder="e.g. SC-104928"
                className="h-8 text-xs rounded-xl mt-0.5 font-mono bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
            <div>
              <Label htmlFor="custTin" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                TIN (Optional)
              </Label>
              <Input
                id="custTin"
                value={customerTin}
                onChange={(e) => onCustomerTinChange(e.target.value)}
                placeholder="000-000-000"
                className="h-8 text-xs rounded-xl mt-0.5 font-mono bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
          </div>

          <p className="text-[9px] text-[#64748B] dark:text-white/60 font-medium">
            Mandated under RA 9994 (Senior) &amp; RA 10754 (PWD) audit compliance.
          </p>
        </div>
      )}

      {/* Conditional Student Input Fields */}
      {isStudent && (
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-white/10 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label htmlFor="studentName" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                Student Name
              </Label>
              <Input
                id="studentName"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Student Name"
                className="h-8 text-xs rounded-xl mt-0.5 bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
            <div>
              <Label htmlFor="studentId" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                Student ID / School
              </Label>
              <Input
                id="studentId"
                value={discountIdNumber}
                onChange={(e) => onDiscountIdNumberChange(e.target.value)}
                placeholder="e.g. STU-2026-081"
                className="h-8 text-xs rounded-xl mt-0.5 font-mono bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
          </div>
          <p className="text-[9px] text-[#64748B] dark:text-white/60 font-medium">
            Student discount grants ₱10 off the total order.
          </p>
        </div>
      )}

      {/* Conditional Employee Input Fields */}
      {isEmployee && (
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-white/10 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label htmlFor="empName" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                Staff Name
              </Label>
              <Input
                id="empName"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Staff Member Name"
                className="h-8 text-xs rounded-xl mt-0.5 bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
            <div>
              <Label htmlFor="empId" className="text-[10px] font-black uppercase text-[#0B2A67] dark:text-white/80">
                Staff ID / Badge
              </Label>
              <Input
                id="empId"
                value={discountIdNumber}
                onChange={(e) => onDiscountIdNumberChange(e.target.value)}
                placeholder="e.g. EMP-004"
                className="h-8 text-xs rounded-xl mt-0.5 font-mono bg-white dark:bg-black/40 border-[#E2E8F0] dark:border-white/15 focus:border-[#0B2A67] dark:focus:border-[#FFD21C]"
              />
            </div>
          </div>
          <p className="text-[9px] text-[#64748B] dark:text-white/60 font-medium">
            Staff privilege discount grants 10% off the total order.
          </p>
        </div>
      )}

      {complianceError && (
        <div className="p-2 rounded-xl border border-[#bf050b]/30 bg-[#bf050b]/10 text-[10px] text-[#bf050b] dark:text-red-300 font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{complianceError}</span>
        </div>
      )}
    </div>
  );
}
