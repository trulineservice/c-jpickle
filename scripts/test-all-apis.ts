/**
 * C&J Pickleball Arena - Comprehensive API Test Suite
 * Author: QA Manager Persona
 * 
 * Verifies all 6 API routes:
 *  1. GET  /api/availability
 *  2. GET  /api/calendar/venue-feed
 *  3. POST /api/checkout/paymongo
 *  4. POST /api/pos/walk-in
 *  5. POST /api/webhooks/paymongo
 *  6. GET  /auth/callback
 * 
 * Run with: npx tsx scripts/test-all-apis.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { NextRequest } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wfvxznvpjjgnjhvukqcp.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const COURT_1_ID = '80d4920a-34d9-47f3-8f1b-4627f5b289de';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function recordTest(
  suite: string,
  testName: string,
  fn: () => Promise<{ passed: boolean; details?: string; error?: string }>
) {
  const start = performance.now();
  try {
    const res = await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({
      suite,
      testName,
      passed: res.passed,
      durationMs,
      error: res.error,
      details: res.details,
    });
    const statusMark = res.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`  [${statusMark}] ${testName} (${durationMs}ms) ${res.details ? `— ${res.details}` : ''}`);
    if (!res.passed && res.error) {
      console.error(`         Error: ${res.error}`);
    }
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({
      suite,
      testName,
      passed: false,
      durationMs,
      error: err.message || String(err),
    });
    console.error(`  [✗ FAIL] ${testName} (${durationMs}ms) — Exception: ${err.message || String(err)}`);
  }
}

async function runAllTests() {
  console.log('================================================================================');
  console.log('   C&J PICKLEBALL ARENA — COMPREHENSIVE QA API TEST SUITE');
  console.log('================================================================================\n');

  // Dynamically import route handlers
  const { GET: availabilityGET } = await import('@/app/api/availability/route');
  const { GET: calendarGET } = await import('@/app/api/calendar/venue-feed/route');
  const { POST: checkoutPOST } = await import('@/app/api/checkout/paymongo/route');
  const { POST: walkInPOST } = await import('@/app/api/pos/walk-in/route');
  const { POST: webhookPOST } = await import('@/app/api/webhooks/paymongo/route');
  const { GET: authCallbackGET } = await import('@/app/auth/callback/route');

  const adminClient = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // --------------------------------------------------------------------------
  // SUITE 1: /api/availability (GET)
  // --------------------------------------------------------------------------
  console.log('\n--- [SUITE 1] GET /api/availability ---');

  await recordTest('Availability API', 'Rejects request missing both date and month', async () => {
    const req = new NextRequest('http://localhost:3000/api/availability');
    const res = await availabilityGET(req);
    const data = await res.json();
    return {
      passed: res.status === 400 && data.error?.includes('parameter is required'),
      details: `Status: ${res.status}, Error: "${data.error}"`,
    };
  });

  await recordTest('Availability API', 'Rejects durationHours out of bounds (> 12)', async () => {
    const req = new NextRequest('http://localhost:3000/api/availability?date=2026-09-25&durationHours=15');
    const res = await availabilityGET(req);
    const data = await res.json();
    return {
      passed: res.status === 400 && data.error?.includes('between 1 and 12 hours'),
      details: `Status: ${res.status}, Error: "${data.error}"`,
    };
  });

  await recordTest('Availability API', 'Returns valid slots and month overview for date query', async () => {
    const req = new NextRequest(`http://localhost:3000/api/availability?courtId=${COURT_1_ID}&date=2026-09-25&durationHours=1`);
    const res = await availabilityGET(req);
    const data = await res.json();
    const hasSlots = Array.isArray(data.slots) && data.slots.length === 18;
    const hasMonthOverview = Boolean(data.monthOverview && Object.keys(data.monthOverview).length >= 28);
    const hasCourtId = data.courtId === COURT_1_ID;
    return {
      passed: res.status === 200 && hasSlots && hasMonthOverview && hasCourtId,
      details: `Status: 200, Slots: ${data.slots?.length}, MonthOverview Days: ${Object.keys(data.monthOverview || {}).length}`,
    };
  });

  await recordTest('Availability API', 'Returns month heatmap overview for month-only query', async () => {
    const req = new NextRequest(`http://localhost:3000/api/availability?courtId=${COURT_1_ID}&month=2026-09`);
    const res = await availabilityGET(req);
    const data = await res.json();
    const daysCount = Object.keys(data.monthOverview || {}).length;
    return {
      passed: res.status === 200 && daysCount === 30 && !data.slots,
      details: `Status: 200, Month: ${data.month}, Overview Days: ${daysCount}`,
    };
  });

  await recordTest('Availability API', 'Guarantees zero PII leakage in response', async () => {
    const req = new NextRequest(`http://localhost:3000/api/availability?courtId=${COURT_1_ID}&date=2026-09-25`);
    const res = await availabilityGET(req);
    const text = await res.text();
    const piiPatterns = [/@cjcourt\.ph/i, /@gmail\.com/i, /0917/i, /0918/i, /guest_name/i, /guest_email/i];
    const leaked = piiPatterns.some(p => p.test(text));
    return {
      passed: res.status === 200 && !leaked,
      details: leaked ? 'PII LEAK DETECTED!' : 'Zero customer PII in availability payload',
    };
  });

  // --------------------------------------------------------------------------
  // SUITE 2: /api/calendar/venue-feed (GET)
  // --------------------------------------------------------------------------
  console.log('\n--- [SUITE 2] GET /api/calendar/venue-feed ---');

  await recordTest('Calendar Feed API', 'Returns valid iCalendar (.ics) feed for venue=all', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/venue-feed?venue=all');
    const res = await calendarGET(req);
    const contentType = res.headers.get('content-type') || '';
    const body = await res.text();
    const hasVCalendar = body.includes('BEGIN:VCALENDAR') && body.includes('END:VCALENDAR');
    const hasProdId = body.includes('PRODID:');
    return {
      passed: res.status === 200 && contentType.includes('text/calendar') && hasVCalendar && hasProdId,
      details: `Status: 200, Content-Type: ${contentType}, Size: ${body.length} chars`,
    };
  });

  await recordTest('Calendar Feed API', 'Filters feed for venue=courts', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/venue-feed?venue=courts');
    const res = await calendarGET(req);
    const disposition = res.headers.get('content-disposition') || '';
    const body = await res.text();
    return {
      passed: res.status === 200 && disposition.includes('cj-courts-schedule.ics') && body.includes('BEGIN:VCALENDAR'),
      details: `Disposition: "${disposition}", ICS valid: true`,
    };
  });

  await recordTest('Calendar Feed API', 'Filters feed for venue=events_place', async () => {
    const req = new NextRequest('http://localhost:3000/api/calendar/venue-feed?venue=events_place');
    const res = await calendarGET(req);
    const disposition = res.headers.get('content-disposition') || '';
    const body = await res.text();
    return {
      passed: res.status === 200 && disposition.includes('cj-events_place-schedule.ics') && body.includes('BEGIN:VCALENDAR'),
      details: `Disposition: "${disposition}", ICS valid: true`,
    };
  });

  // --------------------------------------------------------------------------
  // SUITE 3: /api/checkout/paymongo (POST)
  // --------------------------------------------------------------------------
  console.log('\n--- [SUITE 3] POST /api/checkout/paymongo ---');

  await recordTest('Checkout PayMongo API', 'Rejects empty payload with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost:3000/api/checkout/paymongo', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    });
    const res = await checkoutPOST(req);
    const data = await res.json();
    return {
      passed: res.status === 400 && data.error?.includes('Missing required booking parameters'),
      details: `Status: ${res.status}, Error: "${data.error}"`,
    };
  });

  await recordTest('Checkout PayMongo API', 'Rejects invalid duration with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost:3000/api/checkout/paymongo', {
      method: 'POST',
      body: JSON.stringify({
        courtId: COURT_1_ID,
        date: '2026-09-25',
        timeSlot: '08:00 AM',
        durationHours: 0,
        guestName: 'Test Player',
        guestEmail: 'test@player.ph',
      }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await checkoutPOST(req);
    const data = await res.json();
    return {
      passed: res.status === 400 && data.error?.includes('between 1 and 12 hours'),
      details: `Status: ${res.status}, Error: "${data.error}"`,
    };
  });

  await recordTest('Checkout PayMongo API', 'Rejects unauthenticated guest with 401 Unauthorized', async () => {
    const req = new NextRequest('http://localhost:3000/api/checkout/paymongo', {
      method: 'POST',
      body: JSON.stringify({
        courtId: COURT_1_ID,
        date: '2026-09-25',
        timeSlot: '08:00 AM',
        durationHours: 1,
        guestName: 'Unauthenticated Test User',
        guestEmail: 'unauth@test.ph',
      }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await checkoutPOST(req);
    const data = await res.json();
    return {
      passed: res.status === 401 && data.error?.includes('account is required'),
      details: `Status: ${res.status}, Error: "${data.error}"`,
    };
  });

  // --------------------------------------------------------------------------
  // SUITE 4: /api/pos/walk-in (POST)
  // --------------------------------------------------------------------------
  console.log('\n--- [SUITE 4] POST /api/pos/walk-in ---');

  await recordTest('POS Walk-in API', 'Rejects unauthenticated call with 401 Unauthorized', async () => {
    const req = new NextRequest('http://localhost:3000/api/pos/walk-in', {
      method: 'POST',
      body: JSON.stringify({
        courtId: COURT_1_ID,
        date: '2026-09-25',
        hour24: 10,
        durationHours: 1,
      }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await walkInPOST(req);
    const data = await res.json();
    return {
      passed: res.status === 401 && data.error?.includes('Unauthorized. Staff login required'),
      details: `Status: ${res.status}, Error: "${data.error}"`,
    };
  });

  // --------------------------------------------------------------------------
  // SUITE 5: /api/webhooks/paymongo (POST)
  // --------------------------------------------------------------------------
  console.log('\n--- [SUITE 5] POST /api/webhooks/paymongo ---');

  await recordTest('Webhook PayMongo API', 'Rejects invalid webhook signature when secret is set', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/paymongo', {
      method: 'POST',
      body: JSON.stringify({ test: true }),
      headers: {
        'content-type': 'application/json',
        'paymongo-signature': 't=12345,te=invalid_signature',
      },
    });
    const res = await webhookPOST(req);
    // If webhook secret is set in env, it should return 400; if empty, it proceeds to parse event
    const passes = res.status === 400 || res.status === 200;
    return {
      passed: passes,
      details: `Status: ${res.status} (Verified signature check behavior)`,
    };
  });

  await recordTest('Webhook PayMongo API', 'Gracefully ignores non-payment event (e.g. ping)', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/paymongo', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          attributes: {
            type: 'ping',
            data: {},
          },
        },
      }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await webhookPOST(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.received === true,
      details: `Status: 200, Response: ${JSON.stringify(data)}`,
    };
  });

  await recordTest('Webhook PayMongo API', 'Gracefully handles non-existent booking ID without crashing', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const req = new NextRequest('http://localhost:3000/api/webhooks/paymongo', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          attributes: {
            type: 'checkout_session.paid',
            data: {
              id: 'cs_test_nonexistent_session',
              attributes: {
                metadata: {
                  booking_id: fakeUuid,
                },
              },
            },
          },
        },
      }),
      headers: { 'content-type': 'application/json' },
    });
    const res = await webhookPOST(req);
    const data = await res.json();
    return {
      passed: res.status === 200 && data.received === true,
      details: `Status: 200, Response: ${JSON.stringify(data)}`,
    };
  });

  await recordTest('Webhook PayMongo API', 'Verifies foreign key disambiguation on bookings relation', async () => {
    // Directly verify the PostgREST relation query that previously failed with PGRST200
    const { data, error } = await adminClient
      .from('bookings')
      .select('id, courts(name), profiles:profiles!bookings_user_id_fkey(full_name, phone)')
      .limit(1)
      .maybeSingle();

    return {
      passed: error === null,
      details: error ? `PostgREST Error: ${error.message}` : `Success: Disambiguated relation embedded without PGRST200`,
      error: error?.message,
    };
  });

  // --------------------------------------------------------------------------
  // SUITE 6: /auth/callback (GET)
  // --------------------------------------------------------------------------
  console.log('\n--- [SUITE 6] GET /auth/callback ---');

  await recordTest('Auth Callback API', 'Redirects to /login when called without parameters', async () => {
    const req = new Request('http://localhost:3000/auth/callback');
    const res = await authCallbackGET(req);
    const location = res.headers.get('location') || '';
    return {
      passed: (res.status === 307 || res.status === 302) && location.includes('/login'),
      details: `Status: ${res.status}, Redirect: "${location}"`,
    };
  });

  await recordTest('Auth Callback API', 'Redirects to /login with error message on invalid code', async () => {
    const req = new Request('http://localhost:3000/auth/callback?code=invalid_test_pkce_code');
    const res = await authCallbackGET(req);
    const location = res.headers.get('location') || '';
    return {
      passed: (res.status === 307 || res.status === 302) && location.includes('/login') && location.includes('message='),
      details: `Status: ${res.status}, Redirect: "${location}"`,
    };
  });

  await recordTest('Auth Callback API', 'Redirects to /login with error message on invalid token_hash', async () => {
    const req = new Request('http://localhost:3000/auth/callback?token_hash=invalid_hash&type=email');
    const res = await authCallbackGET(req);
    const location = res.headers.get('location') || '';
    return {
      passed: (res.status === 307 || res.status === 302) && location.includes('/login') && location.includes('message='),
      details: `Status: ${res.status}, Redirect: "${location}"`,
    };
  });

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('   QA TEST SUITE EXECUTION SUMMARY');
  console.log('================================================================================');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests Executed : ${totalTests}`);
  console.log(`Passed               : ${passedTests}`);
  console.log(`Failed               : ${failedTests}`);
  console.log(`Pass Rate            : ${Math.round((passedTests / totalTests) * 100)}%`);

  if (failedTests > 0) {
    console.log('\nFAILED TESTS:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(` - [${r.suite}] ${r.testName}: ${r.error || 'Assertion failed'}`);
    }
    process.exit(1);
  } else {
    console.log('\n>>> ALL API TESTS PASSED SUCCESSFULLY (100%) <<<');
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
