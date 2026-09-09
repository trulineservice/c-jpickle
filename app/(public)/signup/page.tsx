import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { signup } from "@/app/actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; verification_sent?: string; email?: string; next?: string }>;
}) {
  const { message, verification_sent, email, next } = await searchParams;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8 font-sans bg-background text-foreground">
      <div className="w-full max-w-md border border-[#cacacb] dark:border-[#27272a] p-8 sm:p-10 bg-white dark:bg-[#121215] space-y-6">
        {verification_sent === "true" ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center pb-2">
              <BrandLogo size="md" withSubtitle />
            </div>

            <div className="inline-flex p-4 rounded-full bg-[#f5f5f5] dark:bg-[#18181c] text-foreground border border-[#cacacb] dark:border-[#27272a]">
              <Inbox className="w-8 h-8 text-foreground" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Check Your Email</h2>
              <p className="text-xs sm:text-sm text-[#707072] dark:text-[#a1a1aa] leading-relaxed">
                We sent a verification link to:
              </p>
              <p className="text-sm font-semibold text-foreground bg-[#f5f5f5] dark:bg-[#18181c] px-4 py-2 rounded-full border border-[#cacacb] dark:border-[#27272a] inline-block break-all">
                {email || "your email address"}
              </p>
              <p className="text-xs text-[#707072] dark:text-[#a1a1aa] pt-2 leading-relaxed">
                Click the confirmation link in the email to activate your account and book courts.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Link href="/login" className="block w-full">
                <Button size="lg" className="w-full bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] text-sm font-medium">
                  Proceed to Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/" className="block w-full">
                <Button variant="ghost" size="sm" className="w-full text-xs text-[#707072] dark:text-[#a1a1aa] hover:text-foreground">
                  Back to Arena Home
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form action={signup} className="space-y-6">
            {next && <input type="hidden" name="next" value={next} />}
            
            <div className="text-center space-y-2">
              <div className="flex justify-center pb-2">
                <BrandLogo size="md" withSubtitle />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground uppercase">
                Join C&amp;J Pickleball
              </h1>
              <p className="text-xs text-[#707072] dark:text-[#a1a1aa]">
                Create a member account to reserve courts, access passes, and track match history.
              </p>
            </div>

            {message && (
              <div className="p-3 border border-[#d30005] bg-white dark:bg-[#18181c] text-[#d30005] text-xs flex items-center gap-2">
                <p>{message}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Full Name
                </Label>
                <Input 
                  id="fullName" 
                  name="fullName" 
                  type="text" 
                  placeholder="Juan Dela Cruz" 
                  required 
                  className="h-11 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-sm text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-[#111111] dark:focus-visible:border-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="juan@example.com" 
                  required 
                  className="h-11 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-sm text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-[#111111] dark:focus-visible:border-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Password
                </Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  placeholder="Minimum 6 characters"
                  className="h-11 px-4 rounded-full bg-[#f5f5f5] dark:bg-black border border-[#cacacb] dark:border-[#3f3f46] text-sm text-foreground placeholder:text-[#707072] dark:placeholder:text-[#a1a1aa] focus-visible:ring-1 focus-visible:ring-foreground focus-visible:border-[#111111] dark:focus-visible:border-white"
                />
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <AuthSubmitButton 
                label="Create Account"
                loadingLabel="Creating account..."
                className="w-full h-12 bg-[#111111] text-white hover:bg-[#222222] dark:bg-white dark:text-[#111111] dark:hover:bg-[#e5e5e5] font-medium text-sm rounded-full transition-colors"
              />
              
              <div className="text-xs text-center text-[#707072] dark:text-[#a1a1aa]">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-foreground hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}