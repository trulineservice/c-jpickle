import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand-logo";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { resetPasswordWithTempPassword } from "@/app/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; success?: string; email?: string; dev_code?: string }>;
}) {
  const { message, success, email, dev_code } = await searchParams;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 font-sans bg-background text-foreground">
      <div className="w-full max-w-md border border-[#cacacb] dark:border-[#27272a] p-8 sm:p-10 bg-white dark:bg-[#121215] space-y-6">
        {success ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center pb-2">
              <CheckCircle2 className="h-12 w-12 text-[#007d48] dark:text-[#10b981]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
              Check Your Email
            </h1>
            {email && (
              <div className="inline-block px-3 py-1 bg-[#f5f5f5] dark:bg-[#18181c] text-xs font-mono font-semibold text-foreground rounded-full border border-[#cacacb] dark:border-[#27272a]">
                {email}
              </div>
            )}
            <p className="text-sm text-[#707072] dark:text-[#a1a1aa] leading-relaxed">
              {success}
            </p>

            {/* Sandbox Notice & Temporary Access Code */}
            {dev_code && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                  <span>SANDBOX ACCESS CODE</span>
                  <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full font-mono">Dev Mode</span>
                </div>
                <div className="bg-white dark:bg-[#18181c] border border-amber-500/40 rounded-lg p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#707072] dark:text-[#a1a1aa] tracking-wider mb-1">
                    Temporary Password
                  </div>
                  <div className="font-mono text-xl font-black text-foreground tracking-widest select-all">
                    {dev_code}
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                  Neither <strong>RESEND_API_KEY</strong> nor <strong>SMTP_PASS</strong> is configured in <code>.env</code> yet. Use the temporary password above to log in and change your password in Settings.
                </p>
              </div>
            )}

            {!dev_code && (
              <div className="p-3 bg-[#f8fafc] dark:bg-[#18181c] border border-[#e2e8f0] dark:border-[#27272a] rounded-lg text-xs text-[#64748b] dark:text-[#a1a1aa] text-left space-y-1">
                <p className="font-semibold text-[#334155] dark:text-foreground">Didn&apos;t see the message?</p>
                <p>Check your Spam/Junk folder. The email was dispatched directly by C&amp;J Pickleball Arena.</p>
              </div>
            )}

            <div className="pt-2">
              <Link href="/login">
                <button className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-medium text-sm rounded-full transition-colors">
                  Proceed to Login
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <form action={resetPasswordWithTempPassword} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center pb-2">
                <BrandLogo size="md" withSubtitle />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
                Reset Password
              </h1>
              <p className="text-xs text-[#707072] dark:text-[#a1a1aa]">
                Enter your email address and we&apos;ll send you a temporary password to access your account.
              </p>
            </div>

            {message && (
              <div className="p-3 border border-[#d30005] bg-white dark:bg-[#18181c] text-[#d30005] text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="player@example.com" 
                  required 
                  className="h-11 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-sm text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-[#111111] dark:focus-visible:border-white"
                />
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <AuthSubmitButton 
                label="Send Temporary Password"
                loadingLabel="Sending..."
                className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-medium text-sm rounded-full transition-colors"
              />
              
              <div className="text-xs text-center text-[#707072] dark:text-[#a1a1aa]">
                <Link href="/login" className="font-semibold text-foreground hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
