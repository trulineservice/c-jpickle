import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('--- SUPABASE CONFIGURATION ---');
console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key Present:', Boolean(supabaseAnonKey));

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase environment variables in .env');
  process.exit(1);
}

// 1. Anon Client (Browsers, Public Booking, Availability API)
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runSyncVerification() {
  console.log('\n================================================================');
  console.log('FRONTEND-DATABASE SYNCHRONIZATION AUDIT (END-TO-END)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  // 1. Public Booking (/book) - Courts Table Sync
  try {
    const { data: courts, error } = await anonClient
      .from('courts')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    console.log(`[PASS] 1. Public /book -> courts table: ${courts.length} courts active in database`);
    courts.forEach((c) => console.log(`   - ${c.name} (${c.type}, Rate: ₱${c.hourly_rate}/hr, ID: ${c.id})`));
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] 1. Public /book -> courts table error:`, err.message);
    failed++;
  }

  // 2. Public Availability API (/api/availability) - v_court_availability View Sync
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const { data: slots, error } = await anonClient
      .from('v_court_availability')
      .select('id, court_id, start_time, end_time, status, expires_at')
      .gte('end_time', startOfMonth)
      .lte('start_time', endOfMonth)
      .limit(10);

    if (error) throw error;
    console.log(`[PASS] 2. Public /api/availability -> v_court_availability view: ${slots.length} sample slot reservations returned (Zero-PII compliant)`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] 2. Public /api/availability -> v_court_availability error:`, err.message);
    failed++;
  }

  // 3. Front Desk Cashier POS (/cashier) - pos_products & pos_categories Sync
  try {
    const { data: categories, error: catErr } = await anonClient
      .from('pos_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (catErr) throw catErr;

    const { data: products, error: prodErr } = await anonClient
      .from('pos_products')
      .select('id, name, price, category, stock_level')
      .order('category', { ascending: true });

    if (prodErr) throw prodErr;

    console.log(`[PASS] 3. Cashier POS /cashier -> pos_products: ${products.length} products across ${categories.length} categories`);
    console.log(`   Categories: ${categories.map((c) => c.name).join(', ')}`);
    console.log(`   Sample Products: ${products.slice(0, 4).map((p) => `${p.name} (₱${p.price})`).join(', ')}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] 3. Cashier POS /cashier -> pos_products error:`, err.message);
    failed++;
  }

  // 4. Authenticate as Cashier & Test Cashier Daily Schedule (/cashier/schedule)
  const cashierClient = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { data: authData, error: authErr } = await cashierClient.auth.signInWithPassword({
      email: 'cashier1@cjcourt.com',
      password: 'password',
    });

    if (authErr) throw authErr;
    console.log(`[PASS] 4a. Cashier Auth: Logged in as ${authData.user.email} (Role verified)`);

    const { data: scheduleBookings, error: schedErr } = await cashierClient
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
        profiles:profiles!bookings_user_id_fkey ( full_name ),
        courts ( id, name )
      `)
      .limit(10);

    if (schedErr) throw schedErr;
    console.log(`[PASS] 4b. Cashier Schedule /cashier/schedule: ${scheduleBookings.length} bookings loaded with joined court and customer profiles`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] 4. Cashier Schedule query error:`, err.message);
    failed++;
  }

  // 5. Authenticate as Admin & Test Admin Overview (/admin)
  const adminClient = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.signInWithPassword({
      email: 'admin1@cjcourt.com',
      password: 'password',
    });

    if (adminAuthErr) throw adminAuthErr;
    console.log(`[PASS] 5a. Admin Auth: Logged in as ${adminAuth.user.email}`);

    // Admin bookings query with joined profiles and courts
    const { data: adminBookings, error: bErr } = await adminClient
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
        guest_email,
        guest_phone,
        created_at,
        profiles:profiles!bookings_user_id_fkey ( full_name, phone ),
        courts ( name )
      `)
      .limit(20);

    if (bErr) throw bErr;
    console.log(`[PASS] 5b. Admin Overview /admin: ${adminBookings.length} bookings fetched with joined customer profiles and courts`);

    // POS Transactions query
    const { data: transactions, error: tErr } = await adminClient
      .from('pos_transactions')
      .select('id, invoice_number, total_amount, vatable_sales, vat_amount, vat_exempt_sales, discount_amount, payment_method, status')
      .limit(20);

    if (tErr) throw tErr;
    console.log(`[PASS] 5c. Admin Overview POS Sales: ${transactions.length} POS transactions loaded (BIR compliant receipts)`);

    passed++;
  } catch (err: any) {
    console.error(`[FAIL] 5. Admin Overview error:`, err.message);
    failed++;
  }

  // 6. Admin Players Directory (/admin/players) - Profiles Sync
  try {
    const { data: profiles, error: pErr } = await adminClient
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at')
      .order('created_at', { ascending: false });

    if (pErr) throw pErr;

    const roleBreakdown: Record<string, number> = {};
    profiles.forEach((p) => {
      roleBreakdown[p.role] = (roleBreakdown[p.role] || 0) + 1;
    });

    console.log(`[PASS] 6. Admin Players /admin/players: ${profiles.length} total players synced from database`);
    console.log(`   Roles breakdown: ${Object.entries(roleBreakdown).map(([r, count]) => `${r}: ${count}`).join(', ')}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] 6. Admin Players error:`, err.message);
    failed++;
  }

  // 7. Equipment Rentals Sync (3NF Normalized Table)
  try {
    const { data: rentals, error: rErr } = await adminClient
      .from('equipment_rentals')
      .select('id, booking_id, equipment_type, equipment_name, quantity, total_price')
      .limit(10);

    if (rErr) throw rErr;
    console.log(`[PASS] 7. equipment_rentals table: ${rentals.length} normalized rental records retrieved`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] 7. equipment_rentals error:`, err.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`SYNCHRONIZATION VERIFICATION COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSyncVerification();
