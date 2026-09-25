-- ============================================================================
-- SEPARATE GOOGLE CALENDARS FOR PICKLEBALL COURTS AND EVENTS PLACE
-- ============================================================================

-- 1. Insert distinct calendar setting keys in public.system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('google_pickleball_calendar_id', '', 'Target Google Calendar ID for Pickleball Courts (Court 1 & Court 2)'),
  ('google_events_calendar_id', '', 'Target Google Calendar ID for Events Place & View Deck Lounge')
ON CONFLICT (key) DO NOTHING;

-- 2. Add google_calendar_target_id to public.bookings to record which calendar was targeted
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS google_calendar_target_id text;

-- 3. Update get_booking_sync_details RPC to include target calendar ID
CREATE OR REPLACE FUNCTION public.get_booking_sync_details(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', b.id,
    'court_id', b.court_id,
    'start_time', b.start_time,
    'end_time', b.end_time,
    'duration_hours', b.duration_hours,
    'total_price', b.total_price,
    'down_payment_amount', b.down_payment_amount,
    'status', b.status,
    'payment_method', b.payment_method,
    'guest_name', b.guest_name,
    'guest_phone', b.guest_phone,
    'guest_email', b.guest_email,
    'notes', b.notes,
    'google_calendar_event_id', b.google_calendar_event_id,
    'google_calendar_target_id', b.google_calendar_target_id,
    'court_name', c.name,
    'court_type', c.type,
    'profile_full_name', p.full_name,
    'profile_phone', p.phone,
    'profile_email', p.email
  ) INTO res
  FROM public.bookings b
  LEFT JOIN public.courts c ON b.court_id = c.id
  LEFT JOIN public.profiles p ON b.user_id = p.id
  WHERE b.id = p_booking_id;
  
  RETURN res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_sync_details(UUID) TO anon, authenticated;

-- 4. Update update_booking_google_event RPC to support target calendar id
CREATE OR REPLACE FUNCTION public.update_booking_google_event(
  p_booking_id UUID,
  p_event_id TEXT,
  p_target_calendar_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET google_calendar_event_id = p_event_id,
      google_calendar_target_id = COALESCE(p_target_calendar_id, google_calendar_target_id),
      google_calendar_synced_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_google_event(UUID, TEXT, TEXT) TO anon, authenticated;
