import crypto from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Privileged Supabase client for reading settings and updating sync state
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface GoogleCalendarConfig {
  calendarId: string;
  serviceAccountEmail: string;
  privateKey: string;
  autoSyncEnabled: boolean;
}

// In-memory token cache to prevent redundant token requests
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Normalizes PEM RSA private key string, fixing escaped newlines, quotes, or JSON file pastes.
 */
export function normalizePrivateKey(rawKey: string): string {
  if (!rawKey) return '';
  let key = rawKey.trim();

  // 1. If key is a raw JSON string (user pasted full service account JSON)
  if (key.startsWith('{') && (key.includes('private_key') || key.includes('client_email'))) {
    try {
      const parsed = JSON.parse(key);
      if (parsed.private_key) key = parsed.private_key;
    } catch {
      // Continue cleanup
    }
  }

  // 2. Remove surrounding quotes
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // 3. Unescape escaped newlines
  key = key.replace(/\\n/g, '\n').replace(/\\r/g, '');

  // 4. Trim whitespace
  key = key.trim();

  // 5. Ensure PEM headers
  if (!key.includes('-----BEGIN PRIVATE KEY-----') && !key.includes('-----BEGIN RSA PRIVATE KEY-----')) {
    key = `-----BEGIN PRIVATE KEY-----\n${key}`;
  }
  if (!key.includes('-----END PRIVATE KEY-----') && !key.includes('-----END RSA PRIVATE KEY-----')) {
    key = `${key}\n-----END PRIVATE KEY-----`;
  }

  return key;
}

/**
 * Reads Google Calendar settings from DB (system_settings) or environment variables
 */
export async function getGoogleCalendarConfig(): Promise<GoogleCalendarConfig> {
  let dbCalendarId = '';
  let dbServiceEmail = '';
  let dbPrivateKey = '';
  let dbAutoSync = 'true';

  try {
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'google_calendar_id',
        'google_service_account_email',
        'google_private_key',
        'google_calendar_auto_sync_enabled',
      ]);

    if (settings) {
      for (const s of settings) {
        if (s.key === 'google_calendar_id') dbCalendarId = s.value;
        if (s.key === 'google_service_account_email') dbServiceEmail = s.value;
        if (s.key === 'google_private_key') dbPrivateKey = s.value;
        if (s.key === 'google_calendar_auto_sync_enabled') dbAutoSync = s.value;
      }
    }
  } catch (err) {
    console.warn('[Google Calendar Sync] Could not fetch settings from DB:', err);
  }

  const calendarId = dbCalendarId || process.env.GOOGLE_CALENDAR_ID || '';
  const serviceAccountEmail = dbServiceEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const rawKey = dbPrivateKey || process.env.GOOGLE_PRIVATE_KEY || '';
  const privateKey = normalizePrivateKey(rawKey);
  const autoSyncEnabled = dbAutoSync !== 'false';

  return {
    calendarId,
    serviceAccountEmail,
    privateKey,
    autoSyncEnabled,
  };
}

/**
 * Generate an OAuth2 access token for Google API using pure Node.js RS256 JWT
 */
async function getGoogleServiceAccountAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes
  if (cachedAccessToken && tokenExpiresAt > nowSec + 300) {
    return cachedAccessToken;
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    aud: 'https://oauth2.googleapis.com/token',
    exp: nowSec + 3600, // 1 hour expiration
    iat: nowSec,
  };

  const base64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const unsignedToken = `${base64Url(header)}.${base64Url(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  sign.end();

  const signature = sign.sign(privateKey, 'base64url');
  const jwtAssertion = `${unsignedToken}.${signature}`;

  // Exchange signed JWT for OAuth2 bearer token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtAssertion,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(
      tokenData.error_description || tokenData.error || 'Failed to obtain Google access token'
    );
  }

  const tokenStr = tokenData.access_token as string;
  cachedAccessToken = tokenStr;
  tokenExpiresAt = nowSec + (tokenData.expires_in || 3600);

  return tokenStr;
}

/**
 * Automatically pushes or updates a confirmed reservation into Google Calendar
 * Triggered on PayMongo down payment, full payment, or POS/cashier down payment
 */
export async function pushBookingToGoogleCalendar(bookingId: string): Promise<{
  success: boolean;
  googleEventId?: string;
  error?: string;
}> {
  try {
    const config = await getGoogleCalendarConfig();

    if (!config.autoSyncEnabled) {
      console.log(`[Google Calendar] Auto-sync is disabled. Skipping booking #${bookingId}`);
      return { success: false, error: 'Auto-sync is disabled in settings' };
    }

    if (!config.serviceAccountEmail || !config.privateKey || !config.calendarId) {
      console.warn(
        `[Google Calendar Auto-Sync] Credentials not fully configured. Calendar ID: ${config.calendarId || 'missing'}, Service Account: ${config.serviceAccountEmail || 'missing'}`
      );
      return {
        success: false,
        error: 'Google Service Account credentials or Calendar ID not configured',
      };
    }

    // 1. Fetch booking details with court and user profile
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        court_id,
        start_time,
        end_time,
        duration_hours,
        total_price,
        down_payment_amount,
        status,
        payment_method,
        guest_name,
        guest_phone,
        guest_email,
        notes,
        google_calendar_event_id,
        courts (
          id,
          name,
          type
        ),
        profiles:profiles!bookings_user_id_fkey (
          full_name,
          phone,
          email
        )
      `)
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: `Booking not found: ${fetchErr?.message}` };
    }

    const courtData = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts;
    const courtName = courtData?.name || 'C&J Arena Venue';
    const courtLower = courtName.toLowerCase();

    const isEventsPlace = courtLower.includes('events place') || courtLower.includes('banquet');
    const isViewDeck = courtLower.includes('view deck') || courtLower.includes('deck');

    const profileData = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
    const guestName = booking.guest_name || profileData?.full_name || 'Client';
    const guestPhone = booking.guest_phone || profileData?.phone || 'N/A';
    const guestEmail = booking.guest_email || profileData?.email || 'N/A';

    const totalPrice = Number(booking.total_price || 0);
    const downPayment = Number(booking.down_payment_amount || 0);
    const balanceRemaining = Math.max(0, totalPrice - downPayment);

    let venuePrefix = '🏓 [Court]';
    if (isEventsPlace) venuePrefix = '🎉 [Events Place Rental]';
    if (isViewDeck) venuePrefix = '🌆 [View Deck Lounge]';

    const paymentLabel =
      downPayment > 0 && downPayment < totalPrice
        ? `Deposit Paid: ₱${downPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
        : `PAID: ₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

    const eventSummary = `${venuePrefix} ${guestName} (${paymentLabel})`;

    const descriptionLines = [
      `🏛️ VENUE: ${courtName}`,
      `👤 GUEST: ${guestName}`,
      `📞 CONTACT: ${guestPhone}`,
      `✉️ EMAIL: ${guestEmail}`,
      `----------------------------------------`,
      `💰 FINANCIAL SUMMARY:`,
      `   • Total Package: ₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      `   • Down Payment / Deposit Paid: ₱${downPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      `   • Balance Due: ₱${balanceRemaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      `   • Payment Method: ${(booking.payment_method || 'Online').toUpperCase()}`,
      `   • Status: ${booking.status.toUpperCase()}`,
      `----------------------------------------`,
      `⏱️ DURATION: ${booking.duration_hours || 1} Hour(s)`,
      booking.notes ? `📝 PACKAGE / SPECIAL REQUESTS:\n${booking.notes}` : null,
      `📍 ADDRESS: C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal`,
      `⚡ AUTOMATED BOOKING ID: #${booking.id}`,
    ].filter(Boolean);

    // 2. Obtain Google Access Token
    const accessToken = await getGoogleServiceAccountAccessToken(
      config.serviceAccountEmail,
      config.privateKey
    );

    const targetCalendarId = encodeURIComponent(config.calendarId.trim());
    const existingGoogleEventId = booking.google_calendar_event_id;

    const eventBody = {
      summary: eventSummary,
      description: descriptionLines.join('\n'),
      location: "C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal",
      start: {
        dateTime: new Date(booking.start_time).toISOString(),
        timeZone: 'Asia/Manila',
      },
      end: {
        dateTime: new Date(booking.end_time).toISOString(),
        timeZone: 'Asia/Manila',
      },
      colorId: isEventsPlace ? '11' : isViewDeck ? '5' : '10', // 11=Red/Festive, 5=Yellow, 10=Green
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 }, // 1 day before
          { method: 'popup', minutes: 120 },  // 2 hours before
        ],
      },
    };

    let googleApiUrl = `https://www.googleapis.com/calendar/v3/calendars/${targetCalendarId}/events`;
    let method = 'POST';

    // If event was previously synced, update it instead of creating a duplicate
    if (existingGoogleEventId) {
      googleApiUrl += `/${encodeURIComponent(existingGoogleEventId)}`;
      method = 'PUT';
    }

    const apiRes = await fetch(googleApiUrl, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    const apiData = await apiRes.json();

    if (!apiRes.ok) {
      console.error('[Google Calendar API Error]:', apiData);
      return {
        success: false,
        error: apiData.error?.message || 'Google Calendar API request failed',
      };
    }

    const savedEventId = apiData.id;

    // 3. Record Google Event ID and sync timestamp in database
    await supabaseAdmin
      .from('bookings')
      .update({
        google_calendar_event_id: savedEventId,
        google_calendar_synced_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    console.log(
      `[Google Calendar Auto-Sync SUCCESS] Synced booking #${booking.id} to Google Calendar (${savedEventId})`
    );

    return { success: true, googleEventId: savedEventId };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Google Calendar Sync Exception]:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Send a verification test event to confirm Google Calendar API integration
 */
export async function testGoogleCalendarConnection(): Promise<{
  success: boolean;
  eventId?: string;
  calendarId?: string;
  error?: string;
  message?: string;
}> {
  try {
    const config = await getGoogleCalendarConfig();

    if (!config.serviceAccountEmail || !config.privateKey || !config.calendarId) {
      return {
        success: false,
        error:
          'Please provide your Google Calendar ID, Service Account Email, and Private Key in Settings.',
      };
    }

    const accessToken = await getGoogleServiceAccountAccessToken(
      config.serviceAccountEmail,
      config.privateKey
    );

    const now = new Date();
    const startTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);  // 1 hour later

    const testEvent = {
      summary: '✅ C&J Arena — Google Calendar Auto-Sync Verified',
      description:
        'Success! Your C&J Pickleball Arena and Events Place automated Google Calendar integration is working.\n\nWhenever a guest pays a down payment or reserves the Events Place or View Deck, events will be automatically created here in real time!',
      location: "C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal",
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Manila',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Manila',
      },
      colorId: '10', // Green
    };

    const targetCalendarId = encodeURIComponent(config.calendarId.trim());
    const apiRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${targetCalendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testEvent),
      }
    );

    const apiData = await apiRes.json();

    if (!apiRes.ok) {
      return {
        success: false,
        error:
          apiData.error?.message ||
          'Failed to write test event to Google Calendar. Make sure your calendar is shared with the service account email with "Make changes to events" permission.',
      };
    }

    return {
      success: true,
      eventId: apiData.id,
      calendarId: config.calendarId,
      message: `Test event created successfully in ${config.calendarId}! Check your Google Calendar.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
