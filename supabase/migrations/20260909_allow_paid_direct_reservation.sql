-- Migration: Allow reservations to be created directly with 'paid' status
-- Ensures simultaneous reservation and payment recording

DROP POLICY IF EXISTS "Bookings insert access" ON public.bookings;
CREATE POLICY "Bookings insert access" ON public.bookings
  FOR INSERT WITH CHECK (
    public.is_staff(auth.uid())
    OR (
      auth.uid() IS NOT NULL 
      AND user_id = auth.uid()
      AND status IN ('paid', 'pending_payment', 'walk_in')
    )
  );
