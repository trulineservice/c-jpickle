import Link from "next/link";
import { AlertCircle, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { PasswordInput } from "@/components/password-input";
import { AuthLayoutShell } from "@/components/auth-layout-shell";
import { login, signInWithGoogle } from "@/app/actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";


export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; type?: string; email?: string; next?: string }>;
}) {
  const { message, type, email, next } = await searchParams;
  const isSuccess = type === "success";

  return (
    <AuthLayoutShell
      heroTagline="Member Portal & Court Pass"
      heroHeadline="Welcome Back to C&J Arena"
      heroDescription="Sign in to view your match schedule, digital QR court pass, booking history, and exclusive View Deck cafe perks."
    >
      <div className="space-y-6">
        {/* Form Header */}
        <div className="text-center space-y-2 pb-2 border-b border-[#E2E8F0]">
          <div className="flex justify-center pb-1">
            <BrandLogo size="md" withSubtitle />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-[11px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#bf050b]" />
            <span>Player Authentication</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B2A67] uppercase">
            Sign In
          </h1>
          <p className="text-xs text-[#64748B]">
            Access your reservations, player pass, and court booking history.
          </p>
        </div>

        {/* Status / Error Alert Message */}
        {message && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200 ${
              isSuccess
                ? "border-[#007d48]/30 bg-[#007d48]/10 text-[#007d48]"
                : "border-[#bf050b]/30 bg-[#bf050b]/10 text-[#bf050b]"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#007d48]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#bf050b]" />
            )}
            <p className="font-semibold leading-relaxed">{message}</p>
          </div>
        )}

        {/* Google OAuth */}
        <GoogleSignInButton action={signInWithGoogle} next={next ?? undefined} />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E2E8F0]" />
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
            or sign in with email
          </span>
          <div className="flex-1 h-px bg-[#E2E8F0]" />
        </div>

        {/* Email & Password Form */}
        <form action={login} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}

          {/* Input Fields */}
          <div className="space-y-4">
            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] block">
                Email Address
              </Label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={email ?? ""}
                  placeholder="player@example.com"
                  required
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0B2A67] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:border-[#0B2A67] focus:ring-2 focus:ring-[#FFD21C]/50 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password with Eye Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67]">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#64748B] hover:text-[#0B2A67] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {/* Action Controls */}
          <div className="pt-2 space-y-4">
            <AuthSubmitButton
              label="Sign In to Member Portal"
              loadingLabel="Verifying Credentials..."
              variant="yellow"
              className="w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
            />

            <div className="pt-2 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-extrabold text-[#0B2A67] hover:text-[#bf050b] hover:underline transition-colors"
              >
                Create Account →
              </Link>
            </div>
          </div>
        </form>
      </div>
    </AuthLayoutShell>
  );
}