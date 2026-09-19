import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { pushBookingToGoogleCalendar } from '@/lib/google-calendar-sync-engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Check Authenticated User & Staff Permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Staff login required.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || !['owner', 'admin', 'cashier'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden. Staff access required.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      courtId,
      date, // YYYY-MM-DD
      hour24, // e.g. 14 for 2:00 PM
      durationHours = 1,
      guestName = 'Walk-in Guest',
      guestPhone,
      guestEmail,
      paymentMethod = 'cash',
      notes,
    } = body;

    if (!courtId || !date || hour24 === undefined) {
      return NextResponse.json(
        { error: 'Missing required walk-in parameters (courtId, date, hour24).' },
        { status: 400 }
      );
    }

    const duration = Math.max(1, parseInt(String(durationHours), 10));
    const startHour = parseInt(String(hour24), 10);

    const startTime = new Date(`${date}T${startHour.toString().padStart(2, '0')}:00:00.000+08:00`);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    // 2. Fetch court info
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('*')
      .eq('id', courtId)
      .single();

    if (courtError || !court) {
      return NextResponse.json({ error: 'Court not found.' }, { status: 404 });
    }

    // 3. Overlap check
    const nowUtc = new Date();
    const { data: overlappingBookings } = await supabase
      .from('bookings')
      .select('id, status, expires_at')
      .eq('court_id', court.id)
      .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment'])
      .lt('start_time', endTime.toISOString())
      .gt('end_time', startTime.toISOString());

    const activeConflict = (overlappingBookings || []).find((b) => {
      if (b.status === 'pending_payment') {
        return b.expires_at ? new Date(b.expires_at) > nowUtc : false;
      }
      return true;
    });

    if (activeConflict) {
      return NextResponse.json(
        { error: 'Cannot book: court has a conflicting active reservation during this time.' },
        { status: 409 }
      );
    }

    const hourlyRate = court.hourly_rate !== undefined && court.hourly_rate !== null ? Number(court.hourly_rate) : 1;
    const totalPrice = hourlyRate * duration;

    // 4. Insert Confirmed Walk-In Booking
    const { data: newBooking, error: insertError } = await supabase
      .from('bookings')
      .insert({
        court_id: court.id,
        user_id: user.id,
        guest_name: guestName,
        guest_phone: guestPhone || null,
        guest_email: guestEmail || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_hours: duration,
        total_price: totalPrice,
        currency: 'PHP',
        status: 'walk_in',
        payment_method: paymentMethod === 'counter_qr' ? 'counter_qr' : 'cash',
        notes: notes || `Walk-in registered by ${profile.full_name || 'Cashier'}`,
      })
      .select('id')
      .single();

    if (insertError || !newBooking) {
      console.error('Walk-in booking error:', insertError);
      return NextResponse.json({ error: 'Failed to record walk-in booking.' }, { status: 500 });
    }

    // Automatically sync confirmed booking to Google Calendar
    try {
      await pushBookingToGoogleCalendar(newBooking.id);
    } catch (calErr) {
      console.error('[POS Walk-in] Google Calendar auto-sync error:', calErr);
    }

    return NextResponse.json({
      success: true,
      bookingId: newBooking.id,
      courtName: court.name,
      totalPrice,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('POS walk-in error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
