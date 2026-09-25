import Link from "next/link";
import { ArrowRight, Inbox, Mail, User, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { PasswordInput } from "@/components/password-input";
import { AuthLayoutShell } from "@/components/auth-layout-shell";
import { signup, signInWithGoogle } from "@/app/actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";


export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; verification_sent?: string; email?: string; next?: string }>;
}) {
  const { message, verification_sent, email, next } = await searchParams;

  return (
    <AuthLayoutShell
      heroTagline="Athlete Membership & VIP Pass"
      heroHeadline="Join C&J Pickleball Club"
      heroDescription="Create your player profile to reserve courts online, access instant QR check-in passes, track match stats, and receive View Deck dining discounts."
    >
      {verification_sent === "true" ? (
        <div className="text-center space-y-6 py-4 animate-in fade-in duration-300">
          <div className="flex justify-center pb-1">
            <BrandLogo size="md" withSubtitle />
          </div>

          <div className="w-16 h-16 rounded-2xl bg-[#007d48]/10 text-[#007d48] border border-[#007d48]/25 flex items-center justify-center mx-auto shadow-xs">
            <Inbox className="w-8 h-8 text-[#007d48]" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#007d48]/10 text-[#007d48] text-[11px] font-extrabold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verification Link Dispatched</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B2A67] uppercase">
              Check Your Email
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-sm mx-auto">
              We sent an official activation link to:
            </p>
            <p className="text-xs sm:text-sm font-mono font-bold text-[#0B2A67] bg-[#EDF4FC] px-4 py-2 rounded-xl border border-[#0B2A67]/20 inline-block break-all shadow-xs">
              {email || "your email address"}
            </p>
            <p className="text-xs text-[#64748B] pt-2 leading-relaxed max-w-sm mx-auto">
              Click the confirmation link inside the message to verify your email and unlock court reservations and online booking.
            </p>
          </div>

          <div className="pt-4 space-y-3 max-w-sm mx-auto">
            <Link href="/login" className="block w-full">
              <Button
                variant="yellow"
                size="lg"
                className="w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/" className="block w-full">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs font-bold text-[#64748B] hover:text-[#0B2A67] cursor-pointer"
              >
                Back to Arena Home
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Form Header */}
          <div className="text-center space-y-2 pb-2 border-b border-[#E2E8F0]">
            <div className="flex justify-center pb-1">
              <BrandLogo size="md" withSubtitle />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-[11px] font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#bf050b]" />
              <span>Instant Member Pass</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B2A67] uppercase">
              Join C&amp;J Club
            </h1>
            <p className="text-xs text-[#64748B]">
              Create an athlete profile to reserve courts, get digital passes, and track matches.
            </p>
          </div>

          {/* Error Message */}
          {message && (
            <div className="p-3.5 rounded-xl border border-[#bf050b]/30 bg-[#bf050b]/10 text-[#bf050b] text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
              <p className="font-semibold leading-relaxed">{message}</p>
            </div>
          )}

          {/* Google OAuth */}
          <GoogleSignInButton
            action={signInWithGoogle}
            next={next ?? undefined}
            label="Sign up with Google"
          />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
              or create account with email
            </span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Email Sign-up Form */}
          <form action={signup} className="space-y-4">
            {next && <input type="hidden" name="next" value={next} />}

            {/* Input Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] block">
                  Full Name
                </Label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[#64748B] pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="e.g. Maria Santos"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0B2A67] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:border-[#0B2A67] focus:ring-2 focus:ring-[#FFD21C]/50 focus:outline-none transition-all"
                  />
                </div>
              </div>

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
                    placeholder="player@example.com"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#0B2A67] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:border-[#0B2A67] focus:ring-2 focus:ring-[#FFD21C]/50 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-extrabold uppercase tracking-wider text-[#0B2A67] block">
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-4">
              <AuthSubmitButton
                label="Create Member Account"
                loadingLabel="Creating Account..."
                variant="yellow"
                className="w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all cursor-pointer"
              />

              <div className="pt-2 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-extrabold text-[#0B2A67] hover:text-[#bf050b] hover:underline transition-colors"
                >
                  Sign in here →
                </Link>
              </div>
            </div>
          </form>
        </div>
      )}
    </AuthLayoutShell>
  );
}