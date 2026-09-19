-- ============================================================================
-- GOOGLE CALENDAR AUTOMATED DIRECT SYNC & DOWN PAYMENT MIGRATION
-- ============================================================================

-- 1. Add down payment and Google Calendar sync tracking columns to public.bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS down_payment_amount numeric(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_synced_at timestamp with time zone;

-- 2. Ensure system_settings table exists and seed Google Calendar configuration keys
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Seed configuration keys if not already present
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('google_calendar_id', '', 'Target Google Calendar ID or Gmail address where events are automatically synced'),
  ('google_service_account_email', '', 'Google Cloud Service Account client email authorized to write events'),
  ('google_private_key', '', 'Google Cloud Service Account RSA Private Key (PEM format)'),
  ('google_calendar_auto_sync_enabled', 'true', 'Enable or disable automatic push synchronization to Google Calendar upon payment')
ON CONFLICT (key) DO NOTHING;

-- 3. Update get_calendar_feed_bookings RPC to include down_payment_amount and sync status
DROP FUNCTION IF EXISTS public.get_calendar_feed_bookings(timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION public.get_calendar_feed_bookings(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_venue_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  court_id UUID,
  court_name TEXT,
  court_type TEXT,
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_hours INT,
  total_price NUMERIC,
  down_payment_amount NUMERIC,
  status TEXT,
  payment_method TEXT,
  notes TEXT,
  google_calendar_event_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.court_id,
    c.name AS court_name,
    c.type::text AS court_type,
    COALESCE(b.guest_name, p.full_name, 'Reserved Guest')::text AS guest_name,
    COALESCE(b.guest_phone, p.phone)::text AS guest_phone,
    b.guest_email::text,
    b.start_time,
    b.end_time,
    b.duration_hours,
    b.total_price,
    COALESCE(b.down_payment_amount, 0) AS down_payment_amount,
    b.status::text,
    b.payment_method::text,
    b.notes::text,
    b.google_calendar_event_id::text
  FROM public.bookings b
  JOIN public.courts c ON b.court_id = c.id
  LEFT JOIN public.profiles p ON b.user_id = p.id
  WHERE b.status IN ('paid', 'checked_in', 'walk_in', 'pending_payment')
    AND b.end_time >= p_start_time
    AND b.start_time <= p_end_time
    AND (
      p_venue_filter = 'all'
      OR (p_venue_filter = 'events_place' AND (c.name ILIKE '%events place%' OR c.name ILIKE '%banquet%'))
      OR (p_venue_filter = 'view_deck' AND (c.name ILIKE '%view deck%' OR c.name ILIKE '%deck%'))
      OR (p_venue_filter = 'courts' AND c.name NOT ILIKE '%events place%' AND c.name NOT ILIKE '%view deck%')
    )
  ORDER BY b.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_calendar_feed_bookings TO anon, authenticated;
