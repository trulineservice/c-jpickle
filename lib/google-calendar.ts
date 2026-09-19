/**
 * Google Calendar & iCalendar (RFC 5545) Live Synchronization Utilities
 * For C&J Pickleball Arena, Events Place & View Deck Private Lounge
 */

export interface CalendarVenueEvent {
  id: string;
  courtId: string;
  courtName: string;
  guestName: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationHours: number;
  totalPrice: number;
  status: string;
  paymentMethod: string;
  notes?: string | null;
  paxEstimate?: number;
}

/**
 * Format a Date object or ISO string into RFC 5545 UTC timestamp (YYYYMMDDTHHMMSSZ)
 */
export function formatIcsDate(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Escape text for iCalendar description / summary fields per RFC 5545
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Determine the user-friendly event category and icon tag
 */
export function getVenueTag(courtName: string): {
  tag: string;
  category: 'events_place' | 'view_deck' | 'court';
  cleanName: string;
} {
  const lower = courtName.toLowerCase();
  if (lower.includes('events place') || lower.includes('banquet')) {
    return { tag: '🎉 [Events Place]', category: 'events_place', cleanName: '3rd Floor Events Place & Banquet Hall' };
  }
  if (lower.includes('view deck') || lower.includes('deck')) {
    return { tag: '🌆 [View Deck]', category: 'view_deck', cleanName: '5th Floor View Deck Private Lounge' };
  }
  return { tag: '🏓 [Court]', category: 'court', cleanName: courtName };
}

/**
 * Generate a complete RFC 5545 VCALENDAR string from a list of events
 */
export function generateIcsFeed(
  events: CalendarVenueEvent[],
  calendarName = 'C&J Arena, Events Place & View Deck Schedule'
): string {
  const nowIcs = formatIcsDate(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//C&J Pickleball Arena & Events Place//Live Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:Asia/Manila',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];

  for (const event of events) {
    const { tag, cleanName } = getVenueTag(event.courtName);
    const guest = event.guestName || 'Walk-in / Private Booking';
    const summary = `${tag} ${guest} (${cleanName})`;
    
    // Detailed description for calendar users
    const descParts = [
      `Venue: ${cleanName}`,
      `Reserved by: ${guest}`,
      event.guestPhone ? `Contact: ${event.guestPhone}` : null,
      event.guestEmail ? `Email: ${event.guestEmail}` : null,
      `Duration: ${event.durationHours} hr(s)`,
      `Total: ₱${Number(event.totalPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })} (${event.paymentMethod.toUpperCase()})`,
      `Status: ${event.status.toUpperCase()}`,
      event.notes ? `Details / Package: ${event.notes}` : null,
      'Location: C&J Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal',
      'Hotline: 0917-123-0382 (Events) / 0976-662-3453 (View Deck)',
    ].filter(Boolean);

    const description = escapeIcsText(descParts.join('\n'));
    const location = escapeIcsText("C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal");

    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${event.id}@cjpickleball.ph`,
      `DTSTAMP:${nowIcs}`,
      `DTSTART:${formatIcsDate(event.startTime)}`,
      `DTEND:${formatIcsDate(event.endTime)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'CLASS:PUBLIC',
      'TRANSP:OPAQUE',
      'SEQUENCE:0',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate a 1-click "Add to Google Calendar" web link for a single reservation
 */
export function getGoogleCalendarOneClickAddUrl(event: CalendarVenueEvent): string {
  const { tag, cleanName } = getVenueTag(event.courtName);
  const guest = event.guestName || 'Private Booking';
  const title = encodeURIComponent(`${tag} ${guest}`);
  
  const startStr = formatIcsDate(event.startTime);
  const endStr = formatIcsDate(event.endTime);
  const dates = `${startStr}/${endStr}`;

  const desc = encodeURIComponent(
    `Venue: ${cleanName}\nGuest: ${guest}\nContact: ${event.guestPhone || 'N/A'}\nDuration: ${
      event.durationHours
    } hrs\nAmount: ₱${Number(event.totalPrice).toFixed(2)}\nNotes: ${event.notes || 'None'}\nLocation: 25 Bologna St., Muzon, Taytay, Rizal`
  );
  const loc = encodeURIComponent("C&J's Events Place & Court Rental, 25 Bologna St., Muzon, Taytay, Rizal");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${desc}&location=${loc}`;
}

/**
 * Generate the direct Google Calendar WebCal subscription link
 * Opens Google Calendar directly and prompts the user to add the live subscription calendar.
 */
export function getGoogleCalendarSubscribeUrl(feedUrl: string): string {
  // Strip protocol and convert to webcal
  const cleanUrl = feedUrl.replace(/^https?:\/\//, '');
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent('webcal://' + cleanUrl)}`;
}
