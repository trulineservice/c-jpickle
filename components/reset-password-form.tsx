"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { resetPasswordWithToken } from "@/app/actions";

interface ResetPasswordFormProps {
  token: string;
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
      <input type="hidden" name="token" value={token} />

      {(initialErrorMessage || validationError) && (
        <div className="p-3 border border-[#d30005] bg-white dark:bg-[#18181c] text-[#d30005] text-xs flex items-center gap-2 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{validationError || initialErrorMessage}</p>
        </div>
      )}

      {email && (
        <div className="text-center">
          <span className="inline-block px-3 py-1 bg-[#f5f5f5] dark:bg-[#18181c] text-xs font-mono font-semibold text-foreground rounded-full border border-[#cacacb] dark:border-[#27272a]">
            {email}
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* New Password */}
        <div className="space-y-1.5">
          <Label
            htmlFor="password"
            className="text-xs font-bold uppercase tracking-wider text-foreground"
          >
            New Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 6 characters"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 px-4 pr-11 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-sm text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-[#111111] dark:focus-visible:border-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707072] hover:text-foreground transition-colors p-1"
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
            className="text-xs font-bold uppercase tracking-wider text-foreground"
          >
            Confirm New Password
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your new password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 px-4 pr-11 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-sm text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-[#111111] dark:focus-visible:border-white"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#707072] hover:text-foreground transition-colors p-1"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {passwordsMatch && (
            <p className="text-[11px] text-[#007d48] dark:text-[#10b981] flex items-center gap-1 mt-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
            </p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <AuthSubmitButton
          label="Save New Password"
          loadingLabel="Updating Password..."
          className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-medium text-sm rounded-full transition-colors"
        />
      </div>
    </form>
  );
}
