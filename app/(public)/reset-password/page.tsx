import Link from "next/link";
import { ArrowLeft, ShieldAlert, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { AuthLayoutShell } from "@/components/auth-layout-shell";
import { createClient } from "@/utils/supabase/server";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; message?: string }>;
}) {
  const { token, message } = await searchParams;

  const supabase = await createClient();
  let isValidToken = false;
  let targetEmail: string | undefined = undefined;
  let tokenErrorMessage: string | undefined = undefined;

  if (token) {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "verify_password_reset_token",
      {
        p_token: token.trim(),
      }
    );

    if (rpcError) {
      console.error("[Verify Token RPC Error]:", rpcError);
      tokenErrorMessage = "Unable to verify password reset link. Please try again.";
    } else {
      const result = rpcData as { valid?: boolean; email?: string; error?: string } | null;
      if (result?.valid) {
        isValidToken = true;
        targetEmail = result.email;
      } else {
        tokenErrorMessage = result?.error || "This reset link is invalid or has expired.";
      }
    }
  }

  // Check if user came from Supabase session recovery callback
  let hasSession = false;
  if (!isValidToken && !token) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      hasSession = true;
      targetEmail = user.email;
    }
  }

  return (
    <AuthLayoutShell
      heroTagline="Credential Security"
      heroHeadline="Set New Account Password"
      heroDescription="Choose a strong, secure passphrase to protect your C&J Pickleball court reservations, digital passes, and saved payment profiles."
    >
      <div className="space-y-6">
        {/* Form Header */}
        <div className="text-center space-y-2 pb-2 border-b border-[#E2E8F0]">
          <div className="flex justify-center pb-1">
            <BrandLogo size="md" withSubtitle />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FFD21C]/20 text-[#0B2A67] text-[11px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-[#bf050b]" />
            <span>Security Credentials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0B2A67] uppercase">
            Change Password
          </h1>
          <p className="text-xs text-[#64748B]">
            Set a new secure password for your C&amp;J Pickleball Arena account.
          </p>
        </div>

        {isValidToken && token ? (
          <ResetPasswordForm
            token={token}
            email={targetEmail}
            errorMessage={message}
          />
        ) : (
          <div className="space-y-6 text-center">
            <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-2xl text-left space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{token ? "Link Expired or Invalid" : "Reset Link Required"}</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {tokenErrorMessage ||
                  "To change your password, please request a secure password reset link through our Forgot Password page."}
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Link href="/forgot-password" className="block">
                <Button
                  variant="yellow"
                  size="lg"
                  className="w-full h-12 bg-[#FFD21C] hover:bg-[#E8BA00] text-[#0B2A67] font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-all"
                >
                  Request New Password Reset Link
                </Button>
              </Link>
              <div>
                <Link
                  href="/login"
                  className="text-xs font-bold text-[#0B2A67] hover:text-[#bf050b] hover:underline inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthLayoutShell>
  );
}
