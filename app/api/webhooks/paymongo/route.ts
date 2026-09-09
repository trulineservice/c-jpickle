import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { verifyPayMongoSignature } from '@/lib/paymongo';
import { sendBookingConfirmationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('paymongo-signature');
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET || '';

    // Verify signature if secret is present
    if (webhookSecret) {
      const isValid = verifyPayMongoSignature(rawBody, signatureHeader, webhookSecret);
      if (!isValid) {
        console.error('[PayMongo Webhook] Invalid signature detected.');
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.data?.attributes?.type;
    const resourceData = event?.data?.attributes?.data;

    console.log(`[PayMongo Webhook] Received event: ${eventType}`);

    if (eventType === 'checkout_session.paid' || eventType === 'payment.paid') {
      const attributes = resourceData?.attributes || {};
      const metadata = attributes?.metadata || {};
      const bookingId = metadata?.booking_id;
      const checkoutSessionId = resourceData?.id;

      if (!bookingId && !checkoutSessionId) {
        console.warn('[PayMongo Webhook] Missing booking ID in metadata or attributes.');
        return NextResponse.json({ received: true });
      }

      // Initialize service role client to bypass RLS for webhook updates
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Locate booking by ID or paymongo session ID
      let query = supabaseAdmin.from('bookings').select('*, courts(name), profiles(full_name, phone)');

      if (bookingId) {
        query = query.eq('id', bookingId);
      } else {
        query = query.eq('paymongo_checkout_session_id', checkoutSessionId);
      }

      const { data: booking, error: fetchError } = await query.single();

      if (fetchError || !booking) {
        console.error('[PayMongo Webhook] Booking not found for webhook:', fetchError);
        return NextResponse.json({ received: true });
      }

      // Update status to 'paid'
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'paid',
          payment_method: 'paymongo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error('[PayMongo Webhook] Failed to update booking to paid:', updateError);
      } else {
        console.log(`[PayMongo Webhook] Booking #${booking.id} successfully marked as PAID.`);
      }

      // Trigger Resend Confirmation Email
      const customerEmail = booking.guest_email || 'customer@cjcourt.com';
      const customerName = booking.guest_name || 'Player';
      const courtName = Array.isArray(booking.courts)
        ? booking.courts[0]?.name
        : booking.courts?.name || 'Court 1 - Indoor';

      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      const dateStr = new Intl.DateTimeFormat('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(startDate);

      const formatTime = (d: Date) =>
        new Intl.DateTimeFormat('en-PH', { hour: '2-digit', minute: '2-digit' }).format(d);

      const timeRange = `${formatTime(startDate)} - ${formatTime(endDate)}`;

      await sendBookingConfirmationEmail({
        bookingId: booking.id,
        customerName,
        customerEmail,
        courtName,
        dateStr,
        timeRange,
        durationHours: booking.duration_hours,
        totalPrice: Number(booking.total_price),
        paymentMethod: 'PayMongo (Online)',
        notes: booking.notes,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[PayMongo Webhook Error]:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
