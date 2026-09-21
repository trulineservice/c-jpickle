import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId parameter.' }, { status: 400 });
    }

    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Cancel pending hold immediately so the court slot is freed
    const { data: cancelledBooking, error: cancelError } = await adminSupabase
      .from('bookings')
      .update({
        status: 'cancelled',
        notes: '[cancelled_by_user]',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('status', 'pending_payment')
      .select('id, court_id, start_time, end_time, status')
      .maybeSingle();

    if (cancelError) {
      console.error('[Checkout Cancel] Error cancelling booking hold:', cancelError);
      return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Temporary reservation hold released successfully.',
      cancelledBooking,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Checkout Cancel] Exception:', msg);
    return NextResponse.json({ error: msg || 'Failed to cancel checkout hold.' }, { status: 500 });
  }
}
