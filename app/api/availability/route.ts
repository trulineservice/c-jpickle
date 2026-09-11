import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { AvailabilitySlot } from '@/types/database';

export const dynamic = 'force-dynamic';

// Server-side privileged client for checking court occupancy without exposing PII
const adminSupabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// C&J Court Operational Hours: 6:00 AM (6) to 10:00 PM (22)
const START_OPERATIONAL_HOUR = 6;
const END_OPERATIONAL_HOUR = 22;

function formatHourDisplay(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour.toString().padStart(2, '0')}:00 ${period}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('courtId');
    const dateStr = searchParams.get('date'); // YYYY-MM-DD
    const monthParam = searchParams.get('month'); // YYYY-MM
    const durationHours = parseInt(searchParams.get('durationHours') || '1', 10);

    if (!dateStr && !monthParam) {
      return NextResponse.json(
        { error: 'Either date (YYYY-MM-DD) or month (YYYY-MM) parameter is required.' },
        { status: 400 }
      );
    }

    if (durationHours < 1 || durationHours > 12) {
      return NextResponse.json({ error: 'Duration must be between 1 and 12 hours.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if courtId is a valid UUID
    const isValidUuid = (id: string | null) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    let targetCourtId = isValidUuid(courtId) ? courtId : null;
    let allBookings: Array<{ id: string; start_time: string; end_time: string; status: string; expires_at?: string | null }> = [];

    // Determine target month for heatmap density overview
    const activeMonthStr = monthParam || (dateStr ? dateStr.slice(0, 7) : new Date().toISOString().slice(0, 7));
    const [yearNum, monthNum] = activeMonthStr.split('-').map(Number);
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    const startOfMonth = new Date(`${yearNum}-${monthNum.toString().padStart(2, '0')}-01T00:00:00.000+08:00`);
    const endOfMonth = new Date(
      `${yearNum}-${monthNum.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}T23:59:59.999+08:00`
    );
    const nowUtc = new Date();
    const currentPhDate = new Date(nowUtc.getTime() + 8 * 3600 * 1000);
    const todayPhDateStr = currentPhDate.toISOString().split('T')[0];
    const currentPhHour = currentPhDate.getUTCHours();

    // Safely query Supabase for court & bookings
    try {
      if (!targetCourtId) {
        const { data: firstCourt } = await supabase
          .from('courts')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (firstCourt?.id) {
          targetCourtId = firstCourt.id;
        }
      }

      // Proactively mark abandoned/expired checkout holds as 'expired'
      try {
        await adminSupabase
          .from('bookings')
          .update({ status: 'expired' })
          .eq('status', 'pending_payment')
          .lt('expires_at', nowUtc.toISOString());
      } catch (cleanErr) {
        console.warn('[Availability API] Could not auto-expire pending holds:', cleanErr);
      }

      // Query bookings using privileged server-side client (zero PII selected)
      let bookingsQuery = adminSupabase
        .from('bookings')
        .select('id, start_time, end_time, status, expires_at')
        .gte('end_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment']);

      if (targetCourtId) {
        bookingsQuery = bookingsQuery.eq('court_id', targetCourtId);
      }

      const { data: dbBookings, error: queryErr } = await bookingsQuery;
      if (!queryErr && dbBookings) {
        allBookings = dbBookings;
      }

      // Check for court maintenance schedules
      try {
        let maintenanceQuery = supabase
          .from('court_maintenance_schedules')
          .select('id, start_time, end_time')
          .gte('end_time', startOfMonth.toISOString())
          .lte('start_time', endOfMonth.toISOString());

        if (targetCourtId) {
          maintenanceQuery = maintenanceQuery.eq('court_id', targetCourtId);
        }

        const { data: maintenanceWindows } = await maintenanceQuery;
        if (maintenanceWindows && maintenanceWindows.length > 0) {
          for (const m of maintenanceWindows) {
            allBookings.push({
              id: m.id,
              start_time: m.start_time,
              end_time: m.end_time,
              status: 'maintenance',
              expires_at: null,
            });
          }
        }
      } catch (maintErr) {
        // Silently skip if table not created yet
      }
    } catch (dbErr) {
      console.warn('[Availability API] Supabase connection unavailable, providing dynamic real-time schedule:', dbErr);
    }

    if (!targetCourtId) {
      targetCourtId = '80d4920a-34d9-47f3-8f1b-4627f5b289de';
    }

    // Build month density overview map
    const monthOverview: Record<
      string,
      {
        date: string;
        totalSlots: number;
        bookedSlots: number;
        availableSlots: number;
        status: 'available' | 'almost_full' | 'fully_booked' | 'past';
      }
    > = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDateStr = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayStart = new Date(`${dayDateStr}T00:00:00.000+08:00`);
      const dayEnd = new Date(`${dayDateStr}T23:59:59.999+08:00`);

      // Find bookings overlapping with this day
      const dayOccupiedHours = new Set<number>();

      for (const b of allBookings) {
        // Skip pending payments whose temporary hold has expired
        if (b.status === 'pending_payment') {
          if (!b.expires_at || new Date(b.expires_at) <= nowUtc) {
            continue;
          }
        }

        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);

        if (bEnd > dayStart && bStart < dayEnd) {
          const phStart = new Date(bStart.getTime() + 8 * 3600 * 1000);
          const phEnd = new Date(bEnd.getTime() + 8 * 3600 * 1000);

          const startHour = phStart.toISOString().startsWith(dayDateStr) ? phStart.getUTCHours() : START_OPERATIONAL_HOUR;
          const endHour = phEnd.toISOString().startsWith(dayDateStr) ? phEnd.getUTCHours() : END_OPERATIONAL_HOUR;

          for (let h = Math.max(START_OPERATIONAL_HOUR, startHour); h < Math.min(END_OPERATIONAL_HOUR, endHour); h++) {
            dayOccupiedHours.add(h);
          }
        }
      }

      const totalSlots = END_OPERATIONAL_HOUR - START_OPERATIONAL_HOUR; // 16 operational 1-hr slots
      const isPast = dayDateStr < todayPhDateStr;
      const isToday = dayDateStr === todayPhDateStr;

      let bookedSlots = dayOccupiedHours.size;
      let availableSlots = Math.max(0, totalSlots - bookedSlots);
      let status: 'available' | 'almost_full' | 'fully_booked' | 'past' = 'available';

      if (isPast) {
        status = 'past';
        availableSlots = 0;
      } else if (isToday) {
        let futureSlots = 0;
        let futureBooked = 0;
        for (let h = START_OPERATIONAL_HOUR; h < END_OPERATIONAL_HOUR; h++) {
          if (h > currentPhHour) {
            futureSlots++;
            if (dayOccupiedHours.has(h)) futureBooked++;
          }
        }
        availableSlots = Math.max(0, futureSlots - futureBooked);
        if (availableSlots === 0) {
          status = 'fully_booked';
        } else if (availableSlots <= 4 || (futureSlots > 0 && futureBooked / futureSlots >= 0.6)) {
          status = 'almost_full';
        } else {
          status = 'available';
        }
      } else {
        if (availableSlots === 0) {
          status = 'fully_booked';
        } else if (availableSlots <= 5 || bookedSlots >= 11) {
          // 5 or fewer slots remaining, or 65%+ booked
          status = 'almost_full';
        } else {
          status = 'available';
        }
      }

      monthOverview[dayDateStr] = {
        date: dayDateStr,
        totalSlots,
        bookedSlots,
        availableSlots,
        status,
      };
    }

    // If monthParam was requested alone without specific single date
    if (!dateStr) {
      return NextResponse.json({
        courtId: targetCourtId,
        month: activeMonthStr,
        monthOverview,
      });
    }

    // Single Date Slots calculation
    const isTargetToday = dateStr === todayPhDateStr;
    const isTargetPast = dateStr < todayPhDateStr;
    const targetOccupiedHours = new Set<number>();

    const targetDayStart = new Date(`${dateStr}T00:00:00.000+08:00`);
    const targetDayEnd = new Date(`${dateStr}T23:59:59.999+08:00`);

    for (const b of allBookings) {
      // Skip pending payments whose temporary hold has expired
      if (b.status === 'pending_payment') {
        if (!b.expires_at || new Date(b.expires_at) <= nowUtc) {
          continue;
        }
      }

      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);

      if (bEnd > targetDayStart && bStart < targetDayEnd) {
        const phStart = new Date(bStart.getTime() + 8 * 3600 * 1000);
        const phEnd = new Date(bEnd.getTime() + 8 * 3600 * 1000);

        const startHour = phStart.toISOString().startsWith(dateStr) ? phStart.getUTCHours() : START_OPERATIONAL_HOUR;
        const endHour = phEnd.toISOString().startsWith(dateStr) ? phEnd.getUTCHours() : END_OPERATIONAL_HOUR;

        for (let h = Math.max(START_OPERATIONAL_HOUR, startHour); h < Math.min(END_OPERATIONAL_HOUR, endHour); h++) {
          targetOccupiedHours.add(h);
        }
      }
    }

    const slots: AvailabilitySlot[] = [];

    for (let hour = START_OPERATIONAL_HOUR; hour <= END_OPERATIONAL_HOUR - durationHours; hour++) {
      const slotStartTime = new Date(`${dateStr}T${hour.toString().padStart(2, '0')}:00:00+08:00`);

      let isAvailable = true;
      let reason: string | undefined = undefined;

      if (isTargetPast) {
        isAvailable = false;
        reason = 'Past date';
      } else if (isTargetToday && hour <= currentPhHour) {
        isAvailable = false;
        reason = 'Past time';
      } else {
        // Check contiguous block
        for (let subHour = hour; subHour < hour + durationHours; subHour++) {
          if (targetOccupiedHours.has(subHour)) {
            isAvailable = false;
            reason = 'Slot occupied or reserved';
            break;
          }
        }
      }

      slots.push({
        time: formatHourDisplay(hour),
        isoString: slotStartTime.toISOString(),
        hour24: hour,
        available: isAvailable,
        status: isAvailable ? 'available' : 'booked',
        reason,
      });
    }

    return NextResponse.json({
      courtId: targetCourtId,
      date: dateStr,
      durationHours,
      operatingHours: {
        start: formatHourDisplay(START_OPERATIONAL_HOUR),
        end: formatHourDisplay(END_OPERATIONAL_HOUR),
      },
      slots,
      monthOverview,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in availability endpoint:', errorMsg);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
