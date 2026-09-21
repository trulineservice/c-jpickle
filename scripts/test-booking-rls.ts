import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

async function runRlsVerification() {
  console.log('====================================================');
  console.log('  VERIFYING BOOKINGS RLS POLICIES (INSERT + SELECT)');
  console.log('====================================================');

  const futureDays = 5000 + Math.floor(Math.random() * 5000);
  const startTime = new Date(Date.now() + 86400000 * futureDays);
  const endTime = new Date(startTime.getTime() + 3600000);

  const payload = {
    court_id: '052becb1-e01d-4cd9-88ae-3d6e419259fd',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    duration_hours: 1,
    total_price: 300,
    currency: 'PHP',
    status: 'paid',
    guest_name: 'RLS Verification Player',
    guest_email: 'rls-test@cjcourt.com',
  };

  console.log('1. Testing .insert().select("id").single()...');
  const { data: insertData, error: insertError } = await anonSupabase
    .from('bookings')
    .insert(payload)
    .select('id, status, total_price')
    .single();

  if (insertError) {
    console.error('❌ Insert failed with RLS violation:', insertError);
    process.exit(1);
  }

  console.log('✅ Insert + Returning SELECT succeeded! Booking ID:', insertData.id);

  console.log('2. Testing .update() on inserted booking...');
  const { error: updateError } = await anonSupabase
    .from('bookings')
    .update({ notes: 'Verified RLS policy update test' })
    .eq('id', insertData.id);

  if (updateError) {
    console.error('❌ Update failed with RLS violation:', updateError);
    process.exit(1);
  }

  console.log('✅ Update succeeded!');

  // Cleanup
  console.log('3. Cleaning up test record...');
  await anonSupabase.from('bookings').delete().eq('id', insertData.id);
  console.log('✅ Cleanup finished. All RLS checks passed!');
}

runRlsVerification().catch((err) => {
  console.error('Fatal error during RLS verification:', err);
  process.exit(1);
});
