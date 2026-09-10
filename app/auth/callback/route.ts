import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Determine base origin properly even behind proxies/custom domains
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const baseOrigin = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || origin);

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });
    if (!error) {
      return NextResponse.redirect(`${baseOrigin}${next}`);
    }
    console.error('[Auth Callback] OTP verification error:', error.message);
    return NextResponse.redirect(
      `${baseOrigin}/login?message=${encodeURIComponent('Verification link expired or already used. Please try signing in.')}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseOrigin}${next}`);
    }
    console.error('[Auth Callback] Code exchange error:', error.message);
    return NextResponse.redirect(
      `${baseOrigin}/login?message=${encodeURIComponent('Verification link expired or already used. Please try signing in.')}`
    );
  }

  return NextResponse.redirect(
    `${baseOrigin}/login?message=${encodeURIComponent('Email verified successfully! You may now sign in.')}`
  );
}
