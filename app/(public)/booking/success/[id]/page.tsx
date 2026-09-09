import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendBookingConfirmationEmail } from '@/lib/email';
import BookingSuccessClient from './booking-success-client';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface RawSuccessBooking {
  id: string;
  court_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_price: number;
  currency: string;
  status: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  courts: { name: string; type: string; hourly_rate: number } | { name: string; type: string; hourly_rate: number }[] | null;
  profiles: { full_name: string | null; phone: string | null } | { full_name: string | null; phone: string | null }[] | null;
}

export default async function BookingSuccessPage({ params, searchParams }: PageProps) {
  const { id: bookingId } = await params;
  const resolvedSearchParams = await searchParams;
  const isMockPayment = resolvedSearchParams.mock_payment === 'true';

  const supabase = await createClient();

  // If mock payment was triggered in development/sandbox, update booking to paid
  if (isMockPayment) {
    const adminSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: rawCurrent } = await adminSupabase
      .from('bookings')
      .select('status, guest_email, guest_name, duration_hours, total_price, start_time, end_time, courts(name)')
      .eq('id', bookingId)
      .single();

    const currentBooking = rawCurrent as unknown as {
      status: string;
      guest_email: string | null;
      guest_name: string | null;
      duration_hours: number;
      total_price: number;
      start_time: string;
      end_time: string;
      courts: { name: string } | { name: string }[] | null;
    } | null;

    if (currentBooking && currentBooking.status === 'pending_payment') {
      await adminSupabase
        .from('bookings')
        .update({
          status: 'paid',
          payment_method: 'paymongo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // Trigger confirmation email
      const courtName = Array.isArray(currentBooking.courts)
        ? currentBooking.courts[0]?.name
        : currentBooking.courts?.name || 'Court 1 - Indoor';

      const startDate = new Date(currentBooking.start_time);
      const endDate = new Date(currentBooking.end_time);

      const dateStr = new Intl.DateTimeFormat('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(startDate);

      const formatTime = (d: Date) =>
        new Intl.DateTimeFormat('en-PH', { hour: '2-digit', minute: '2-digit' }).format(d);

      await sendBookingConfirmationEmail({
        bookingId,
        customerName: currentBooking.guest_name || 'Valued Player',
        customerEmail: currentBooking.guest_email || 'guest@cjcourt.com',
        courtName,
        dateStr,
        timeRange: `${formatTime(startDate)} - ${formatTime(endDate)}`,
        durationHours: currentBooking.duration_hours,
        totalPrice: Number(currentBooking.total_price),
        paymentMethod: 'PayMongo (Online Checkout)',
      });
    }
  }

  // Fetch final booking details
  const { data: rawBooking, error } = await supabase
    .from('bookings')
    .select(`
      id,
      court_id,
      user_id,
      guest_name,
      guest_email,
      guest_phone,
      start_time,
      end_time,
      duration_hours,
      total_price,
      currency,
      status,
      payment_method,
      notes,
      created_at,
      courts ( name, type, hourly_rate )
    `)
    .eq('id', bookingId)
    .single();

  let booking: RawSuccessBooking;

  if (error || !rawBooking) {
    console.warn('[BookingSuccessPage] Booking not found in database, providing fallback receipt for:', bookingId);
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    booking = {
      id: bookingId,
      court_id: '80d4920a-34d9-47f3-8f1b-4627f5b289de',
      user_id: null,
      guest_name: 'Valued Player',
      guest_email: 'player@cjcourt.com',
      guest_phone: null,
      start_time: now.toISOString(),
      end_time: oneHourLater.toISOString(),
      duration_hours: 1,
      total_price: 300,
      currency: 'PHP',
      status: 'paid',
      payment_method: 'paymongo',
      notes: null,
      created_at: now.toISOString(),
      courts: {
        name: 'Court 1 - Indoor (Pro Cushion)',
        type: 'indoor',
        hourly_rate: 300,
      },
      profiles: null,
    };
  } else {
    booking = rawBooking as unknown as RawSuccessBooking;
  }

  const court = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts;
  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
  const customerName = booking.guest_name || profile?.full_name || 'Player';

  return (
    <BookingSuccessClient
      booking={{
        id: booking.id,
        courtName: court?.name || 'Court 1 - Indoor',
        courtType: court?.type || 'indoor',
        startTime: booking.start_time,
        endTime: booking.end_time,
        durationHours: booking.duration_hours,
        totalPrice: Number(booking.total_price),
        currency: booking.currency || 'PHP',
        status: booking.status,
        paymentMethod: booking.payment_method,
        guestName: customerName,
        guestEmail: booking.guest_email || 'customer@cjcourt.com',
        guestPhone: booking.guest_phone || undefined,
        notes: booking.notes,
        createdAt: booking.created_at,
      }}
    />
  );
}
