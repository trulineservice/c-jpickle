import Link from "next/link";
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "@/components/reset-password-form";
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
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 font-sans bg-background text-foreground">
      <div className="w-full max-w-md border border-[#cacacb] dark:border-[#27272a] p-8 sm:p-10 bg-white dark:bg-[#121215] space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center pb-2">
            <BrandLogo size="md" withSubtitle />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
            Change Password
          </h1>
          <p className="text-xs text-[#707072] dark:text-[#a1a1aa]">
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
            <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-xl text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
                <span>{token ? "Link Expired or Invalid" : "Reset Link Required"}</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {tokenErrorMessage ||
                  "To change your password, please request a secure password change link through our Forgot Password page."}
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Link href="/forgot-password" className="block">
                <button className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-medium text-sm rounded-full transition-colors">
                  Request New Password Reset Link
                </button>
              </Link>
              <div>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-foreground hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
