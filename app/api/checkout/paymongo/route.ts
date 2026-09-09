import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createPayMongoCheckoutSession } from '@/lib/paymongo';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courtId,
      date, // YYYY-MM-DD
      timeSlot, // e.g. "07:00 AM" or hour24
      hour24, // e.g. 7
      durationHours = 1,
      guestName,
      guestEmail,
      guestPhone,
      paddleCount,
      paddleRental = false,
      ballThrowerRental = false,
    } = body;

    if (!courtId || !date || (hour24 === undefined && !timeSlot)) {
      return NextResponse.json(
        { error: 'Missing required booking parameters (courtId, date, timeSlot).' },
        { status: 400 }
      );
    }

    if (!guestName || !guestEmail) {
      return NextResponse.json(
        { error: 'Please provide your full name and email address.' },
        { status: 400 }
      );
    }

    const duration = Math.max(1, parseInt(String(durationHours), 10));
    const startHour = hour24 !== undefined ? parseInt(String(hour24), 10) : parseHourFromSlot(timeSlot);

    // Strict boundary clamping for paddles (0 to 4 max)
    const rawPaddleCount = paddleCount !== undefined && paddleCount !== null
      ? parseInt(String(paddleCount), 10)
      : (paddleRental ? 1 : 0);
    const clampedPaddleCount = Math.min(4, Math.max(0, isNaN(rawPaddleCount) ? 0 : rawPaddleCount));

    // Calculate Start Time and End Time in Philippine Time (+08:00)
    const startTime = new Date(`${date}T${startHour.toString().padStart(2, '0')}:00:00.000+08:00`);
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    // Check if start time is in the past
    if (startTime.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Selected time slot has already passed. Please select a future time.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch Court Info & Hourly Rate
    let court = null;
    try {
      const { data: dbCourt, error: courtError } = await supabase
        .from('courts')
        .select('*')
        .eq('id', courtId)
        .maybeSingle();

      if (!courtError && dbCourt) {
        court = dbCourt;
      }
    } catch (err) {
      console.warn('Could not query courts from DB, using fallback court:', err);
    }

    if (!court) {
      // Graceful fallback to default courts
      court = {
        id: courtId,
        name: courtId === '052becb1-e01d-4cd9-88ae-3d6e419259fd' 
          ? 'Court 2 - Indoor (Tournament Spec)' 
          : 'Court 1 - Indoor (Pro Cushion)',
        hourly_rate: 300,
        type: 'indoor',
        is_active: true,
      };
    }

    // 2. Check for Overlapping Active/Locked Bookings
    const nowUtc = new Date();
    let overlappingBookings: Array<{ id: string; status: string; expires_at: string | null }> | null = null;
    try {
      const { data, error: overlapError } = await supabase
        .from('bookings')
        .select('id, status, expires_at')
        .eq('court_id', court.id)
        .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment'])
        .lt('start_time', endTime.toISOString())
        .gt('end_time', startTime.toISOString());

      if (overlapError) {
        console.warn('[Checkout API] Warning checking overlap from DB:', overlapError.message);
      } else {
        overlappingBookings = data;
      }
    } catch (err) {
      console.warn('[Checkout API] DB unreachable during overlap check:', err);
    }

    const activeConflict = (overlappingBookings || []).find((b) => {
      if (b.status === 'pending_payment') {
        return b.expires_at ? new Date(b.expires_at) > nowUtc : false;
      }
      return true;
    });

    if (activeConflict) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please select another slot.' },
        { status: 409 }
      );
    }

    // 3. Authenticate User (Required: Guests cannot book without an account)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'An active account is required to reserve a court. Please sign in or create an account.' },
        { status: 401 }
      );
    }

    // 4. Calculate Total Price purely server-side (court rate * duration + paddle count * 150 + ball thrower rental)
    const hourlyRate = court.hourly_rate !== undefined && court.hourly_rate !== null ? Number(court.hourly_rate) : 1;
    const courtPrice = hourlyRate * duration;
    const paddlePrice = clampedPaddleCount * 150;
    const ballThrowerPrice = ballThrowerRental ? 150 * duration : 0;
    const totalPrice = courtPrice + paddlePrice + ballThrowerPrice;

    // Compose rental notes
    const rentalNotes: string[] = [];
    if (clampedPaddleCount > 0) {
      rentalNotes.push(`${clampedPaddleCount}x Pro Carbon Paddle Rental (+₱${paddlePrice})`);
    }
    if (ballThrowerRental) {
      rentalNotes.push(`Smart Ball Thrower Machine (${duration}hr @ ₱150/hr = +₱${ballThrowerPrice})`);
    }
    const notesSummary = rentalNotes.length > 0 ? rentalNotes.join(' • ') : null;

    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const originUrl = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const formattedSlot = `${startHour % 12 === 0 ? 12 : startHour % 12}:00 ${startHour >= 12 ? 'PM' : 'AM'}`;

    const bookingPayload: Record<string, any> = {
      court_id: court.id,
      user_id: user.id,
      guest_name: guestName || user.user_metadata?.full_name || 'Member Player',
      guest_email: user.email || guestEmail,
      guest_phone: guestPhone || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_hours: duration,
      total_price: totalPrice,
      currency: 'PHP',
      status: 'paid', // Immediately recorded as paid at the same time as reservation
      payment_method: 'paymongo',
      expires_at: null, // Permanent paid reservation
      notes: notesSummary,
      paddle_count: clampedPaddleCount,
    };

    let bookingId: string | null = null;
    try {
      let { data: booking, error: insertError } = await adminSupabase
        .from('bookings')
        .insert(bookingPayload)
        .select('id')
        .single();

      // Self-healing fallback if remote DB doesn't have paddle_count column yet (PostgREST PGRST204 / 42703)
      if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('paddle_count'))) {
        console.warn('[Checkout API] paddle_count column not found in schema cache. Inserting without column (saved in notes).');
        delete bookingPayload.paddle_count;
        const retry = await adminSupabase
          .from('bookings')
          .insert(bookingPayload)
          .select('id')
          .single();
        booking = retry.data;
        insertError = retry.error;
      }

      if (booking?.id) {
        bookingId = booking.id;
      } else if (insertError) {
        console.warn('Booking insertion warning:', insertError.message);
      }
    } catch (insertErr) {
      console.warn('Database insert failed, using generated session booking ID:', insertErr);
    }

    if (!bookingId) {
      bookingId = crypto.randomUUID();
    }

    const { checkoutUrl, sessionId } = await createPayMongoCheckoutSession({
      bookingId,
      courtName: court.name,
      durationHours: duration,
      totalPrice,
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone,
      dateStr: date,
      timeSlot: formattedSlot,
      originUrl,
    });

    // Update booking with PayMongo session ID
    try {
      await adminSupabase
        .from('bookings')
        .update({ paymongo_checkout_session_id: sessionId })
        .eq('id', bookingId);
    } catch {
      // Non-blocking if offline
    }

    return NextResponse.json({
      success: true,
      bookingId,
      checkoutUrl,
      expiresAt: null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Checkout error:', errorMsg);
    return NextResponse.json({ error: errorMsg || 'Checkout initialization failed.' }, { status: 500 });
  }
}

function parseHourFromSlot(slotStr: string): number {
  const match = slotStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 7;
  let h = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h;
}
