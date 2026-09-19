"use client";

import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { playHapticSound } from "@/lib/motion-feedback";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  name: string;
  placeholder?: string;
}

export function PasswordInput({
  id,
  name,
  placeholder = "••••••••",
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    playHapticSound("tap");
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative flex items-center">
      <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
        <Lock className="w-4 h-4" />
      </div>
      <input
        {...props}
        id={id}
        name={name}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        className={`w-full h-11 pl-10 pr-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0B2A67] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:border-[#0B2A67] focus:ring-2 focus:ring-[#FFD21C]/50 focus:outline-none transition-all ${
          className || ""
        }`}
      />
      <button
        type="button"
        onClick={togglePassword}
        className="absolute right-3 p-1.5 rounded-lg text-[#64748B] hover:text-[#0B2A67] hover:bg-[#EDF4FC] transition-colors cursor-pointer"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}
