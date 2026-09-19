import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { CalendarVenueEvent, generateIcsFeed } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

// Privileged Supabase client for reading active venue schedule
const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueFilter = searchParams.get('venue') || 'all'; // 'events_place' | 'view_deck' | 'courts' | 'all'

    // Calculate time window: past 30 days up to 180 days in advance
    const now = new Date();
    const pastWindow = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const futureWindow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const events: CalendarVenueEvent[] = [];

    // 1. Primary: Use SECURITY DEFINER RPC to fetch bookings securely without exposing user accounts
    const { data: rpcBookings, error: rpcError } = await adminSupabase.rpc('get_calendar_feed_bookings', {
      p_start_time: pastWindow,
      p_end_time: futureWindow,
      p_venue_filter: venueFilter,
    });

    if (!rpcError && rpcBookings && Array.isArray(rpcBookings)) {
      for (const b of rpcBookings) {
        events.push({
          id: b.id,
          courtId: b.court_id,
          courtName: b.court_name || 'Arena Facility',
          guestName: b.guest_name,
          guestPhone: b.guest_phone,
          guestEmail: b.guest_email,
          startTime: b.start_time,
          endTime: b.end_time,
          durationHours: b.duration_hours,
          totalPrice: Number(b.total_price),
          status: b.status,
          paymentMethod: b.payment_method,
          notes: b.notes,
        });
      }
    } else {
      // 2. Fallback: Direct select query if RPC unavailable
      console.warn('[Calendar Feed] RPC failed, using direct query fallback:', rpcError?.message);

      const { data: directBookings } = await adminSupabase
        .from('bookings')
        .select(`
          id,
          court_id,
          start_time,
          end_time,
          duration_hours,
          total_price,
          status,
          payment_method,
          guest_name,
          guest_phone,
          guest_email,
          notes,
          courts (
            id,
            name
          ),
          profiles:profiles!bookings_user_id_fkey (
            full_name,
            phone
          )
        `)
        .gte('end_time', pastWindow)
        .lte('start_time', futureWindow)
        .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment'])
        .order('start_time', { ascending: true });

      for (const b of directBookings || []) {
        const courtData = Array.isArray(b.courts) ? b.courts[0] : b.courts;
        const courtName = courtData?.name || 'Arena Facility';
        const courtLower = courtName.toLowerCase();

        if (venueFilter === 'events_place') {
          if (!courtLower.includes('events place') && !courtLower.includes('banquet')) continue;
        } else if (venueFilter === 'view_deck') {
          if (!courtLower.includes('view deck') && !courtLower.includes('deck')) continue;
        } else if (venueFilter === 'courts') {
          if (courtLower.includes('events place') || courtLower.includes('view deck')) continue;
        }

        const profileData = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
        const guestName = b.guest_name || profileData?.full_name || 'Reserved Guest';
        const guestPhone = b.guest_phone || profileData?.phone || null;

        events.push({
          id: b.id,
          courtId: b.court_id,
          courtName,
          guestName,
          guestPhone,
          guestEmail: b.guest_email,
          startTime: b.start_time,
          endTime: b.end_time,
          durationHours: b.duration_hours,
          totalPrice: Number(b.total_price),
          status: b.status,
          paymentMethod: b.payment_method,
          notes: b.notes,
        });
      }
    }

    // Determine descriptive calendar title
    let calName = 'C&J Arena — All Facilities & Court Schedule';
    if (venueFilter === 'events_place') {
      calName = 'C&J 3rd Floor Events Place & Banquet Hall Schedule';
    } else if (venueFilter === 'view_deck') {
      calName = 'C&J 5th Floor View Deck Private Lounge Schedule';
    } else if (venueFilter === 'courts') {
      calName = 'C&J Pickleball Courts 1 & 2 Schedule';
    }

    const icsContent = generateIcsFeed(events, calName);

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="cj-${venueFilter}-schedule.ics"`,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[Calendar Feed API Exception]:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
