import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ScheduleClient from './schedule-client';
import type { ScheduleBooking } from './schedule-client';

export const dynamic = 'force-dynamic';

interface RawScheduleBooking {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  status: string;
  payment_method: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  notes: string | null;
  expires_at?: string | null;
  down_payment_amount?: number;
  google_calendar_event_id?: string | null;
  google_calendar_synced_at?: string | null;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  courts: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface PageProps {
  searchParams?: Promise<{ date?: string }>;
}

export default async function CashierSchedulePage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['owner', 'admin', 'cashier', 'coordinator'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // Fetch active courts
  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  const resolvedParams = searchParams ? await searchParams : {};
  const requestedDate = resolvedParams?.date;

  // Resolve current date in Philippine Time (UTC+8)
  const nowUtc = new Date();
  const phDate = new Date(nowUtc.getTime() + 8 * 3600 * 1000);
  const todayStr = phDate.toISOString().split('T')[0];

  const targetDateStr =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : todayStr;

  const startOfDay = new Date(`${targetDateStr}T00:00:00.000+08:00`).toISOString();
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999+08:00`).toISOString();

  // Query bookings with disambiguated relationship alias
  const { data: rawData } = await supabase
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
      expires_at,
      down_payment_amount,
      google_calendar_event_id,
      google_calendar_synced_at,
      profiles:profiles!bookings_user_id_fkey ( full_name ),
      courts ( id, name )
    `)
    .gte('end_time', startOfDay)
    .lte('start_time', endOfDay)
    .in('status', ['paid', 'checked_in', 'walk_in', 'pending_payment', 'cancelled'])
    .order('start_time', { ascending: true });

  const rawBookings = (rawData as unknown as RawScheduleBooking[]) || [];

  const formattedBookings: ScheduleBooking[] = rawBookings.map((b) => {
    const singleProfile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    const singleCourt = Array.isArray(b.courts) ? b.courts[0] : b.courts;
    const isExpiredHold = b.status === 'pending_payment' && b.expires_at && new Date(b.expires_at) <= new Date();

    return {
      id: b.id,
      court_id: b.court_id,
      start_time: b.start_time,
      end_time: b.end_time,
      duration_hours: b.duration_hours,
      total_price: b.total_price,
      status: isExpiredHold ? 'expired' : b.status,
      payment_method: b.payment_method,
      guest_name: b.guest_name || singleProfile?.full_name || 'Walk-in Client',
      guest_phone: b.guest_phone,
      guest_email: b.guest_email,
      notes: b.notes,
      expires_at: b.expires_at,
      down_payment_amount: b.down_payment_amount ? Number(b.down_payment_amount) : 0,
      google_calendar_event_id: b.google_calendar_event_id || null,
      google_calendar_synced_at: b.google_calendar_synced_at || null,
      profiles: singleProfile || null,
      courts: singleCourt || null,
    };
  });

  return (
    <ScheduleClient
      initialBookings={formattedBookings}
      courts={courts || []}
      initialDateStr={targetDateStr}
    />
  );
}