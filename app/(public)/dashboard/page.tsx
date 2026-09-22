import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import UserDashboardClient from './user-dashboard-client';
import type { UserBookingItem } from './user-dashboard-client';

export const dynamic = 'force-dynamic';

interface RawUserBooking {
  id: string;
  court_id: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  currency: string;
  status: string;
  payment_method: string;
  refund_wallet_type?: string | null;
  refund_account_name?: string | null;
  refund_account_number?: string | null;
  refund_status?: string | null;
  refund_reference?: string | null;
  created_at: string;
  courts: { name: string } | { name: string }[] | null;
}

export default async function UserDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, created_at')
    .eq('id', user.id)
    .single();

  // 3. Fetch user's bookings (matched by user_id, customer_id, or login email)
  let bookingsQuery = supabase
    .from('bookings')
    .select(`
      id,
      court_id,
      start_time,
      end_time,
      duration_hours,
      total_price,
      currency,
      status,
      payment_method,
      refund_wallet_type,
      refund_account_name,
      refund_account_number,
      refund_status,
      refund_reference,
      created_at,
      courts ( name )
    `);

  if (user.email) {
    bookingsQuery = bookingsQuery.or(`user_id.eq.${user.id},customer_id.eq.${user.id},guest_email.ilike.${user.email}`);
  } else {
    bookingsQuery = bookingsQuery.or(`user_id.eq.${user.id},customer_id.eq.${user.id}`);
  }

  const { data: rawData } = await bookingsQuery.order('start_time', { ascending: false });

  const rawBookings = (rawData as unknown as RawUserBooking[]) || [];

  const formattedBookings: UserBookingItem[] = rawBookings.map((b) => {
    const singleCourt = Array.isArray(b.courts) ? b.courts[0] : b.courts;
    const courtName = singleCourt?.name;

    return {
      id: b.id,
      court_id: b.court_id,
      start_time: b.start_time,
      end_time: b.end_time,
      duration_hours: b.duration_hours,
      total_price: Number(b.total_price),
      currency: b.currency || 'PHP',
      status: b.status,
      payment_method: b.payment_method,
      refund_wallet_type: b.refund_wallet_type || null,
      refund_account_name: b.refund_account_name || null,
      refund_account_number: b.refund_account_number || null,
      refund_status: b.refund_status || null,
      refund_reference: b.refund_reference || null,
      court_name: courtName || 'Court 1 - Indoor',
      created_at: b.created_at,
    };
  });

  return (
    <UserDashboardClient
      profile={{
        full_name: profile?.full_name || null,
        created_at: profile?.created_at || new Date().toISOString(),
      }}
      email={user.email || ''}
      bookings={formattedBookings}
    />
  );
}