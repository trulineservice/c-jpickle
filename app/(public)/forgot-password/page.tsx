import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Mail, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { AuthLayoutShell } from "@/components/auth-layout-shell";
import { requestPasswordReset } from "@/app/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; success?: string; email?: string; dev_link?: string }>;
}) {
  const { message, success, email, dev_link } = await searchParams;

  return (
    <AuthLayoutShell
      heroTagline="Account Recovery"
      heroHeadline="Recover Your Member Account"
      heroDescription="Enter your registered player email to receive a secure, encrypted one-time link to update your password and regain court booking access."
    >
      {success ? (
        <div className="space-y-6 text-center py-4 animate-in fade-in duration-300">
          <div className="flex justify-center pb-1">
            <BrandLogo size="md" withSubtitle />
          </div>

          <div className="w-16 h-16 rounded-2xl bg-[#007d48]/10 text-[#007d48] border border-[#007d48]/25 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="h-8 w-8 text-[#007d48]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#007d48]/10 text-[#007d48] text-[11px] font-extrabold uppercase tracking-wider">
              <span>Instructions Sent</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B2A67] uppercase">
              Check Your Email
            </h2>
            {email && (
              <div className="inline-block px-4 py-2 bg-[#EDF4FC] text-xs sm:text-sm font-mono font-bold text-[#0B2A67] rounded-xl border border-[#0B2A67]/20 shadow-xs">
                {email}
              </div>
            )}
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-sm mx-auto">
              {success}
            </p>
          </div>

          {/* Sandbox Notice & Direct Link (if in dev mode) */}
          {dev_link && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-left space-y-2.5 max-w-sm mx-auto shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> Direct Reset Link
                </span>
                <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">Dev Mode</span>
              </div>
              <div className="pt-1">
                <a
                  href={dev_link}
                  className="block w-full text-center py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-[#071E4B] font-black text-xs rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Click Here to Change Password Directly
                </a>
              </div>
            </div>
          )}

          {!dev_link && (
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] text-left space-y-1 max-w-sm mx-auto">
              <p className="font-bold text-[#0B2A67]">Didn&apos;t see the message?</p>
              <p className="text-[11px]">Check your Spam or Promotions folder. The password reset link remains valid for 1 hour.</p>
            </div>
          )}

          <div className="pt-2 max-w-sm mx-auto">
            <Link href="/login" className="block w-full">
              <Button
                variant="yellow"
                size="lg"
                className="w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-all"
              >
                Return to Member Sign In
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form action={requestPasswordReset} className="space-y-6">
          {/* Form Header */}
          <div className="text-center space-y-2 pb-2 border-b border-[#E2E8F0]">
            <div className="flex justify-center pb-1">
              <BrandLogo size="md" withSubtitle />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#bf050b]" />
              <span>Password Recovery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B2A67] uppercase">
              Forgot Password
            </h1>
            <p className="text-xs text-[#64748B]">
              Enter your account email below and we&apos;ll send you a link to reset your credentials.
            </p>
          </div>

          {message && (
            <div className="p-3.5 rounded-xl border border-[#bf050b]/30 bg-[#bf050b]/10 text-[#bf050b] text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-semibold leading-relaxed">{message}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] block">
                Registered Email Address
              </Label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="player@example.com"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0B2A67] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:border-[#0B2A67] focus:ring-2 focus:ring-[#FFD21C]/50 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <AuthSubmitButton
              label="Send Password Reset Link"
              loadingLabel="Sending Link..."
              variant="yellow"
              className="w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
            />

            <div className="pt-2 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
              <Link
                href="/login"
                className="font-extrabold text-[#0B2A67] hover:text-[#bf050b] hover:underline transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </div>
        </form>
      )}
    </AuthLayoutShell>
  );
}
