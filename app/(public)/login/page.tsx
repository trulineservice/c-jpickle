import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand-logo";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { login } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; next?: string }>;
}) {
  const { message, next } = await searchParams;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 font-sans bg-background text-foreground">
      <div className="w-full max-w-md border border-[#cacacb] dark:border-[#27272a] p-8 sm:p-10 bg-white dark:bg-[#121215] space-y-6">
        <form action={login} className="space-y-6">
          {next && <input type="hidden" name="next" value={next} />}
          
          <div className="text-center space-y-2">
            <div className="flex justify-center pb-2">
              <BrandLogo size="md" withSubtitle />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
              Sign In
            </h1>
            <p className="text-xs text-[#707072] dark:text-[#a1a1aa]">
              Access your reservations, player pass, and court booking history.
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs text-[#707072] dark:text-[#a1a1aa] hover:text-foreground underline">
                  Forgot?
                </Link>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="h-11 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-sm text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-[#111111] dark:focus-visible:border-white"
              />
            </div>
          </div>

          <div className="pt-2 space-y-4">
            <AuthSubmitButton 
              label="Sign In"
              loadingLabel="Signing in..."
              className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-medium text-sm rounded-full transition-colors"
            />
            
            <div className="text-xs text-center text-[#707072] dark:text-[#a1a1aa]">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-foreground hover:underline">
                Join C&amp;J Club
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}