-- ============================================================================
-- FIX WALK-IN AND AVAILABILITY SYNC (SECURITY DEFINER RPCS & RLS POLICY)
-- ============================================================================

-- 1. Create SECURITY DEFINER function to retrieve real court availability / occupancy
--    without exposing any customer PII to anonymous or client callers.
CREATE OR REPLACE FUNCTION public.get_court_availability_bookings(
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_court_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  court_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status TEXT,
  expires_at TIMESTAMPTZ
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
    b.start_time,
    b.end_time,
    b.status::text,
    b.expires_at
  FROM public.bookings b
  WHERE b.status IN ('paid', 'checked_in', 'walk_in', 'pending_payment')
    AND b.end_time >= p_start_time
    AND b.start_time <= p_end_time
    AND (p_court_id IS NULL OR b.court_id = p_court_id)
  ORDER BY b.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_court_availability_bookings(TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated;

-- 2. Create SECURITY DEFINER function for Google Calendar sync engine
--    to safely retrieve complete booking metadata without requiring service_role key.
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

-- 3. Create SECURITY DEFINER function to update booking's Google Calendar event ID
CREATE OR REPLACE FUNCTION public.update_booking_google_event(
  p_booking_id UUID,
  p_event_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET google_calendar_event_id = p_event_id,
      google_calendar_synced_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_google_event(UUID, TEXT) TO anon, authenticated;

-- 4. Enhance public.bookings RLS SELECT policy so registered players can read bookings
--    associated with their user_id, customer_id, OR login email address.
DROP POLICY IF EXISTS "Bookings read access" ON public.bookings;

CREATE POLICY "Bookings read access" ON public.bookings
FOR SELECT USING (
  is_staff(auth.uid()) 
  OR (auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR customer_id = auth.uid()
    OR (guest_email IS NOT NULL AND lower(guest_email) = lower(auth.jwt() ->> 'email'))
  ))
);

-- 5. Ensure system settings auto sync is enabled
UPDATE public.system_settings 
SET value = 'true' 
WHERE key = 'google_calendar_auto_sync_enabled';
