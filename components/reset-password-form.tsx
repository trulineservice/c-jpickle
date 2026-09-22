"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { resetPasswordWithToken } from "@/app/actions";

interface ResetPasswordFormProps {
  token?: string;
  email?: string;
  errorMessage?: string;
}

export function ResetPasswordForm({
  token,
  email,
  errorMessage: initialErrorMessage,
}: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setValidationError("");

    if (password.length < 6) {
      e.preventDefault();
      setValidationError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      e.preventDefault();
      setValidationError("Passwords do not match. Please verify.");
      return;
    }
  };

  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  return (
    <form action={resetPasswordWithToken} onSubmit={handleSubmit} className="space-y-6">
      {token && <input type="hidden" name="token" value={token} />}

      {(initialErrorMessage || validationError) && (
        <div className="p-3.5 rounded-xl border border-[#bf050b]/30 bg-[#bf050b]/10 text-[#bf050b] text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p className="font-semibold leading-relaxed">{validationError || initialErrorMessage}</p>
        </div>
      )}

      {email && (
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 bg-[#EDF4FC] text-xs font-mono font-bold text-[#0B2A67] rounded-xl border border-[#0B2A67]/20 shadow-xs">
            {email}
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] block"
          >
            New Password
          </Label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 6 characters"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0B2A67] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:border-[#0B2A67] focus:ring-2 focus:ring-[#FFD21C]/50 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 p-1.5 rounded-lg text-[#64748B] hover:text-[#0B2A67] hover:bg-[#EDF4FC] transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="confirmPassword"
            className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] block"
          >
            Confirm New Password
          </Label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your new password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0B2A67] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:border-[#0B2A67] focus:ring-2 focus:ring-[#FFD21C]/50 focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 p-1.5 rounded-lg text-[#64748B] hover:text-[#0B2A67] hover:bg-[#EDF4FC] transition-colors cursor-pointer"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordsMatch && (
            <p className="text-[11px] text-[#007d48] flex items-center gap-1.5 mt-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match!
            </p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <AuthSubmitButton
          label="Save New Password"
          loadingLabel="Updating Password..."
          variant="yellow"
          className="w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
        />
      </div>
    </form>
  );
}
