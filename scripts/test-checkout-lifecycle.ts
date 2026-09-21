import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLifecycle() {
  console.log('===========================================================');
  console.log('  TESTING CHECKOUT HOLD & INSTANT CANCELLATION RELEASE');
  console.log('===========================================================');

  const courtId = '80d4920a-34d9-47f3-8f1b-4627f5b289de';
  const testDate = '2026-09-22';
  const targetHour = 10; // 10:00 AM

  // 1. Check initial availability
  console.log('1. Checking initial availability for 10:00 AM...');
  const res1 = await fetch(`http://localhost:3000/api/availability?courtId=${courtId}&date=${testDate}&durationHours=1`);
  const data1: any = await res1.json();
  const slotBefore = data1.slots?.find((s: any) => s.hour24 === targetHour);
  console.log(`Initial slot status (Hour ${targetHour}): available = ${slotBefore?.available}`);
  if (!slotBefore?.available) {
    throw new Error('Slot should be initially available.');
  }

  // 2. Create a pending hold (simulating what checkout creates)
  console.log('2. Creating pending_payment hold (15 minutes)...');
  const startTime = new Date(`${testDate}T10:00:00.000+08:00`);
  const endTime = new Date(startTime.getTime() + 3600000);
  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      court_id: courtId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_hours: 1,
      total_price: 300,
      currency: 'PHP',
      status: 'pending_payment',
      payment_method: 'paymongo',
      expires_at: holdExpiresAt.toISOString(),
      guest_name: 'Lifecycle Test Player',
      guest_email: 'lifecycletest@example.com',
    })
    .select('id, status, expires_at')
    .single();

  if (insertError || !booking) {
    throw new Error('Failed to insert test pending booking: ' + insertError?.message);
  }
  console.log(`✅ Pending hold created! Booking ID: ${booking.id}, Status: ${booking.status}`);

  // 3. Verify slot is now temporarily locked (unavailable)
  console.log('3. Checking availability during pending hold...');
  const res2 = await fetch(`http://localhost:3000/api/availability?courtId=${courtId}&date=${testDate}&durationHours=1`);
  const data2: any = await res2.json();
  const slotDuring = data2.slots?.find((s: any) => s.hour24 === targetHour);
  console.log(`Slot during hold (Hour ${targetHour}): available = ${slotDuring?.available}`);
  if (slotDuring?.available) {
    throw new Error('Slot should be unavailable during active pending hold.');
  }

  // 4. Cancel the checkout hold via /api/checkout/cancel
  console.log('4. Calling POST /api/checkout/cancel to release the hold...');
  const cancelRes = await fetch('http://localhost:3000/api/checkout/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId: booking.id }),
  });
  const cancelData: any = await cancelRes.json();
  console.log('Cancel response:', cancelData);

  if (!cancelData.success) {
    throw new Error('Cancel failed: ' + cancelData.error);
  }
  console.log('✅ Cancel confirmed via API!');

  // 5. Verify slot is immediately available again
  console.log('5. Verifying slot availability after cancellation...');
  const res3 = await fetch(`http://localhost:3000/api/availability?courtId=${courtId}&date=${testDate}&durationHours=1`);
  const data3: any = await res3.json();
  const slotAfter = data3.slots?.find((s: any) => s.hour24 === targetHour);
  console.log(`Slot after cancellation (Hour ${targetHour}): available = ${slotAfter?.available}`);

  if (!slotAfter?.available) {
    throw new Error('Slot should be immediately AVAILABLE after cancellation!');
  }

  // 6. Cleanup
  console.log('6. Cleaning up test record...');
  await supabase.from('bookings').delete().eq('id', booking.id);

  console.log('🎉 ALL TESTS PASSED! Unpaid/cancelled checkout slot lifecycle is 100% verified.');
}

testLifecycle().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
