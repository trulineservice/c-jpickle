import crypto from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Privileged Supabase client for reading settings and updating sync state
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface GoogleCalendarConfig {
  pickleballCalendarId: string;
  eventsCalendarId: string;
  legacyCalendarId: string;
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
  let dbPickleballCalId = '';
  let dbEventsCalId = '';
  let dbLegacyCalId = '';
  let dbServiceEmail = '';
  let dbPrivateKey = '';
  let dbAutoSync = 'true';

  try {
    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'google_pickleball_calendar_id',
        'google_events_calendar_id',
        'google_calendar_id',
        'google_service_account_email',
        'google_private_key',
        'google_calendar_auto_sync_enabled',
      ]);

    if (settings) {
      for (const s of settings) {
        if (s.key === 'google_pickleball_calendar_id') dbPickleballCalId = s.value;
        if (s.key === 'google_events_calendar_id') dbEventsCalId = s.value;
        if (s.key === 'google_calendar_id') dbLegacyCalId = s.value;
        if (s.key === 'google_service_account_email') dbServiceEmail = s.value;
        if (s.key === 'google_private_key') dbPrivateKey = s.value;
        if (s.key === 'google_calendar_auto_sync_enabled') dbAutoSync = s.value;
      }
    }
  } catch (err) {
    console.warn('[Google Calendar Sync] Could not fetch settings from DB:', err);
  }

  const pickleballCalendarId =
    dbPickleballCalId || process.env.GOOGLE_PICKLEBALL_CALENDAR_ID || '';
  const eventsCalendarId =
    dbEventsCalId || process.env.GOOGLE_EVENTS_CALENDAR_ID || '';
  const legacyCalendarId =
    dbLegacyCalId || process.env.GOOGLE_CALENDAR_ID || '';
  const serviceAccountEmail =
    dbServiceEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const rawKey = dbPrivateKey || process.env.GOOGLE_PRIVATE_KEY || '';
  const privateKey = normalizePrivateKey(rawKey);
  const autoSyncEnabled = dbAutoSync !== 'false';

  return {
    pickleballCalendarId,
    eventsCalendarId,
    legacyCalendarId,
    serviceAccountEmail,
    privateKey,
    autoSyncEnabled,
  };
}

/**
 * Determine target Google Calendar ID and category based on court/venue name
 */
export function getCalendarTargetForBooking(
  courtName: string,
  config: GoogleCalendarConfig
): {
  targetCalendarId: string;
  isEventsPlace: boolean;
  isViewDeck: boolean;
  category: 'events' | 'pickleball';
  calendarNameLabel: string;
} {
  const lower = (courtName || '').toLowerCase();
  const isEventsPlace = lower.includes('events place') || lower.includes('banquet');
  const isViewDeck = lower.includes('view deck') || lower.includes('deck') || lower.includes('lounge');

  if (isEventsPlace || isViewDeck) {
    const targetCalendarId =
      config.eventsCalendarId.trim() ||
      config.legacyCalendarId.trim() ||
      config.pickleballCalendarId.trim();
    return {
      targetCalendarId,
      isEventsPlace,
      isViewDeck,
      category: 'events',
      calendarNameLabel: isEventsPlace ? "Events Place & Banquet Hall" : "View Deck Private Lounge",
    };
  }

  // Pickleball Court (Court 1, Court 2, etc.)
  const targetCalendarId =
    config.pickleballCalendarId.trim() ||
    config.legacyCalendarId.trim() ||
    config.eventsCalendarId.trim();
  return {
    targetCalendarId,
    isEventsPlace: false,
    isViewDeck: false,
    category: 'pickleball',
    calendarNameLabel: 'Pickleball Courts',
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
 * Triggered in real time on PayMongo down payment, full payment, or POS/cashier down payment/walk-in/reschedule
 */
export async function pushBookingToGoogleCalendar(bookingId: string): Promise<{
  success: boolean;
  googleEventId?: string;
  targetCalendarId?: string;
  calendarCategory?: 'events' | 'pickleball';
  error?: string;
}> {
  try {
    const config = await getGoogleCalendarConfig();

    if (!config.autoSyncEnabled) {
      console.log(`[Google Calendar] Auto-sync is disabled. Skipping booking #${bookingId}`);
      return { success: false, error: 'Auto-sync is disabled in settings' };
    }

    if (!config.serviceAccountEmail || !config.privateKey) {
      console.warn(
        `[Google Calendar Auto-Sync] Service Account credentials not fully configured.`
      );
      return {
        success: false,
        error: 'Google Service Account credentials not configured',
      };
    }

    // 1. Fetch booking details with court and user profile
    let booking: any = null;
    const { data: rpcBooking, error: rpcErr } = await supabaseAdmin.rpc('get_booking_sync_details', {
      p_booking_id: bookingId,
    });

    if (!rpcErr && rpcBooking && rpcBooking.id) {
      booking = {
        id: rpcBooking.id,
        court_id: rpcBooking.court_id,
        start_time: rpcBooking.start_time,
        end_time: rpcBooking.end_time,
        duration_hours: rpcBooking.duration_hours,
        total_price: rpcBooking.total_price,
        down_payment_amount: rpcBooking.down_payment_amount,
        status: rpcBooking.status,
        payment_method: rpcBooking.payment_method,
        guest_name: rpcBooking.guest_name,
        guest_phone: rpcBooking.guest_phone,
        guest_email: rpcBooking.guest_email,
        notes: rpcBooking.notes,
        google_calendar_event_id: rpcBooking.google_calendar_event_id,
        google_calendar_target_id: rpcBooking.google_calendar_target_id,
        courts: {
          id: rpcBooking.court_id,
          name: rpcBooking.court_name,
          type: rpcBooking.court_type,
        },
        profiles: {
          full_name: rpcBooking.profile_full_name,
          phone: rpcBooking.profile_phone,
          email: rpcBooking.profile_email,
        },
      };
    } else {
      // Fallback: direct table select
      const { data: fallbackBooking, error: fetchErr } = await supabaseAdmin
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
          google_calendar_target_id,
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

      if (fetchErr || !fallbackBooking) {
        return { success: false, error: `Booking not found: ${rpcErr?.message || fetchErr?.message}` };
      }
      booking = fallbackBooking;
    }

    // Do not push cancelled/expired bookings through create/update flow
    if (['cancelled', 'cancelled_refund_pending', 'expired'].includes(booking.status)) {
      await deleteGoogleCalendarEvent(booking.id);
      return { success: true, error: 'Booking is cancelled; removed from Google Calendar.' };
    }

    const courtData = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts;
    const courtName = courtData?.name || 'C&J Arena Venue';

    // Separate target calendar according to Pickleball vs Events Place
    const { targetCalendarId, isEventsPlace, isViewDeck, category } = getCalendarTargetForBooking(
      courtName,
      config
    );

    if (!targetCalendarId) {
      console.warn(
        `[Google Calendar Auto-Sync] Target Calendar ID is missing for category: ${category}`
      );
      return {
        success: false,
        error: `Target Google Calendar ID not configured for ${category === 'events' ? "Events Place" : "Pickleball Courts"}.`,
      };
    }

    const profileData = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
    const guestName = booking.guest_name || profileData?.full_name || (category === 'events' ? 'Event Organizer' : 'Player');
    const guestPhone = booking.guest_phone || profileData?.phone || 'N/A';
    const guestEmail = booking.guest_email || profileData?.email || 'N/A';

    const totalPrice = Number(booking.total_price || 0);
    const downPayment = Number(booking.down_payment_amount || 0);
    const balanceRemaining = Math.max(0, totalPrice - downPayment);

    let venuePrefix = '🏓 [Court]';
    let colorId = '10'; // 10 = Green / Basil
    if (isEventsPlace) {
      venuePrefix = '🎉 [Events Place Rental]';
      colorId = '11'; // 11 = Flamingo / Red
    } else if (isViewDeck) {
      venuePrefix = '🌆 [View Deck Lounge]';
      colorId = '5'; // 5 = Banana / Yellow
    } else {
      if (courtName.includes('1')) {
        venuePrefix = '🏓 [Court 1 - Indoor]';
        colorId = '10';
      } else if (courtName.includes('2')) {
        venuePrefix = '🏓 [Court 2 - Dual]';
        colorId = '9'; // 9 = Blueberry / Dark Blue
      }
    }

    const paymentLabel =
      downPayment > 0 && downPayment < totalPrice
        ? `Deposit Paid: ₱${downPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
        : `PAID: ₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

    const eventSummary = `${venuePrefix} ${guestName} (${paymentLabel})`;

    const descriptionLines = [
      category === 'events' ? `🏛️ EVENT VENUE: ${courtName}` : `🏓 COURT FACILITY: ${courtName}`,
      `👤 RESERVED BY: ${guestName}`,
      `📞 CONTACT PHONE: ${guestPhone}`,
      `✉️ EMAIL ADDRESS: ${guestEmail}`,
      `----------------------------------------`,
      `💰 FINANCIAL BREAKDOWN:`,
      `   • Total Amount: ₱${totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      `   • Down Payment / Paid: ₱${downPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      `   • Balance Remaining: ₱${balanceRemaining.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
      `   • Payment Method: ${(booking.payment_method || 'Online').toUpperCase()}`,
      `   • Status: ${booking.status.toUpperCase()}`,
      `----------------------------------------`,
      `⏱️ DURATION: ${booking.duration_hours || 1} Hour(s)`,
      booking.notes ? `📝 NOTES / SPECIAL REQUESTS:\n${booking.notes}` : null,
      `📍 ADDRESS: C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal`,
      `⚡ SYSTEM BOOKING ID: #${booking.id}`,
    ].filter(Boolean);

    // 2. Obtain Google Access Token
    const accessToken = await getGoogleServiceAccountAccessToken(
      config.serviceAccountEmail,
      config.privateKey
    );

    const encodedTargetCalId = encodeURIComponent(targetCalendarId.trim());
    const existingGoogleEventId = booking.google_calendar_event_id;
    const existingTargetCalId = booking.google_calendar_target_id;

    // If previously synced to a DIFFERENT calendar (e.g. rescheduled from Court to Events Place), delete from old calendar
    if (existingGoogleEventId && existingTargetCalId && existingTargetCalId !== targetCalendarId) {
      try {
        const oldCalEncoded = encodeURIComponent(existingTargetCalId.trim());
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${oldCalEncoded}/events/${encodeURIComponent(existingGoogleEventId)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch (delErr) {
        console.warn('[Google Calendar Sync] Could not delete from old calendar on switch:', delErr);
      }
    }

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
      colorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 1440 }, // 1 day before
          { method: 'popup', minutes: 120 },  // 2 hours before
        ],
      },
    };

    let googleApiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodedTargetCalId}/events`;
    let method = 'POST';

    // If event was previously synced to this same calendar, update it
    if (existingGoogleEventId && (!existingTargetCalId || existingTargetCalId === targetCalendarId)) {
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

    // 3. Record Google Event ID and target calendar in database
    const { error: rpcUpdateErr } = await supabaseAdmin.rpc('update_booking_google_event', {
      p_booking_id: booking.id,
      p_event_id: savedEventId,
      p_target_calendar_id: targetCalendarId,
    });

    if (rpcUpdateErr) {
      await supabaseAdmin
        .from('bookings')
        .update({
          google_calendar_event_id: savedEventId,
          google_calendar_target_id: targetCalendarId,
          google_calendar_synced_at: new Date().toISOString(),
        })
        .eq('id', booking.id);
    }

    console.log(
      `[Google Calendar Auto-Sync SUCCESS] Synced booking #${booking.id} to ${category.toUpperCase()} Calendar (${targetCalendarId}) -> Event ID: ${savedEventId}`
    );

    return {
      success: true,
      googleEventId: savedEventId,
      targetCalendarId,
      calendarCategory: category,
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Google Calendar Sync Exception]:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Remove or cancel an event on Google Calendar when a booking is cancelled, voided, or refunded
 */
export async function deleteGoogleCalendarEvent(bookingId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const config = await getGoogleCalendarConfig();
    if (!config.serviceAccountEmail || !config.privateKey) {
      return { success: true }; // Nothing configured to delete
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('id, court_id, google_calendar_event_id, google_calendar_target_id, courts (name)')
      .eq('id', bookingId)
      .single();

    if (!booking || !booking.google_calendar_event_id) {
      return { success: true };
    }

    const courtData = Array.isArray(booking.courts) ? booking.courts[0] : booking.courts;
    const courtName = courtData?.name || '';
    const { targetCalendarId } = getCalendarTargetForBooking(courtName, config);
    const activeCalendarId = booking.google_calendar_target_id || targetCalendarId;

    if (!activeCalendarId) return { success: true };

    const accessToken = await getGoogleServiceAccountAccessToken(
      config.serviceAccountEmail,
      config.privateKey
    );

    const encodedCal = encodeURIComponent(activeCalendarId.trim());
    const encodedEvent = encodeURIComponent(booking.google_calendar_event_id.trim());

    const apiRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${encodedEvent}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (apiRes.ok || apiRes.status === 404 || apiRes.status === 410) {
      // Clear event ID in database
      await supabaseAdmin
        .from('bookings')
        .update({
          google_calendar_event_id: null,
          google_calendar_target_id: null,
          google_calendar_synced_at: null,
        })
        .eq('id', booking.id);

      console.log(`[Google Calendar Sync] Deleted event for cancelled booking #${booking.id}`);
      return { success: true };
    }

    const errData = await apiRes.json().catch(() => ({}));
    return { success: false, error: errData.error?.message || 'Failed to delete event from Google Calendar' };
  } catch (err: any) {
    console.warn('[Google Calendar Delete Warning]:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send a verification test event to confirm Google Calendar API integration
 */
export async function testGoogleCalendarConnection(targetCategory: 'pickleball' | 'events' | 'both' = 'both'): Promise<{
  success: boolean;
  pickleballResult?: { success: boolean; message?: string; error?: string; calendarId?: string };
  eventsResult?: { success: boolean; message?: string; error?: string; calendarId?: string };
  error?: string;
  message?: string;
}> {
  try {
    const config = await getGoogleCalendarConfig();

    if (!config.serviceAccountEmail || !config.privateKey) {
      return {
        success: false,
        error: 'Please provide your Google Service Account Email and Private Key in Settings.',
      };
    }

    const accessToken = await getGoogleServiceAccountAccessToken(
      config.serviceAccountEmail,
      config.privateKey
    );

    const now = new Date();
    const startTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins from now
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);  // 1 hour later

    let pickleballRes: { success: boolean; message?: string; error?: string; calendarId?: string } | undefined;
    let eventsRes: { success: boolean; message?: string; error?: string; calendarId?: string } | undefined;

    // 1. Test Pickleball Calendar
    if (targetCategory === 'pickleball' || targetCategory === 'both') {
      const pCalId = config.pickleballCalendarId.trim() || config.legacyCalendarId.trim();
      if (!pCalId) {
        pickleballRes = {
          success: false,
          error: 'Pickleball Calendar ID is not specified.',
        };
      } else {
        const testEvent = {
          summary: '✅ 🏓 C&J Pickleball Court Calendar — Sync Verified',
          description:
            'Success! Your C&J Pickleball Arena Court 1 & Court 2 automated Google Calendar integration is working in real time!\n\nCourt reservations and walk-ins will be synced here automatically.',
          location: "C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal",
          start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Manila' },
          end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Manila' },
          colorId: '10', // Green
        };

        const apiRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(pCalId)}/events`,
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

        if (apiRes.ok) {
          pickleballRes = {
            success: true,
            calendarId: pCalId,
            message: `Pickleball test event verified in ${pCalId}!`,
          };
        } else {
          pickleballRes = {
            success: false,
            calendarId: pCalId,
            error: apiData.error?.message || 'Access denied. Make sure calendar is shared with Service Account.',
          };
        }
      }
    }

    // 2. Test Events Place Calendar
    if (targetCategory === 'events' || targetCategory === 'both') {
      const eCalId = config.eventsCalendarId.trim() || config.legacyCalendarId.trim();
      if (!eCalId) {
        eventsRes = {
          success: false,
          error: 'Events Place Calendar ID is not specified.',
        };
      } else {
        const testEvent = {
          summary: '✅ 🎉 C&J Events Place & View Deck Calendar — Sync Verified',
          description:
            'Success! Your C&J 3rd Floor Events Place & 5th Floor View Deck automated Google Calendar integration is working in real time!\n\nBanquet hall rentals, catering events, and private lounge reservations will be synced here automatically.',
          location: "C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal",
          start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Manila' },
          end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Manila' },
          colorId: '11', // Red / Flamingo
        };

        const apiRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(eCalId)}/events`,
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

        if (apiRes.ok) {
          eventsRes = {
            success: true,
            calendarId: eCalId,
            message: `Events Place test event verified in ${eCalId}!`,
          };
        } else {
          eventsRes = {
            success: false,
            calendarId: eCalId,
            error: apiData.error?.message || 'Access denied. Make sure calendar is shared with Service Account.',
          };
        }
      }
    }

    const overallSuccess =
      targetCategory === 'pickleball'
        ? pickleballRes?.success === true
        : targetCategory === 'events'
        ? eventsRes?.success === true
        : (pickleballRes?.success ?? true) && (eventsRes?.success ?? true);

    return {
      success: overallSuccess,
      pickleballResult: pickleballRes,
      eventsResult: eventsRes,
      message: overallSuccess
        ? 'Google Calendar verification successful!'
        : 'One or more calendar tests failed. Check calendar sharing permissions.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
