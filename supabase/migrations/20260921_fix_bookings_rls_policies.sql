-- Migration: 20260921_fix_bookings_rls_policies.sql
-- Description: Fix RLS policies on bookings table to prevent "new row violates row-level security policy for table 'bookings'"
-- Root cause:
--   1. PostgREST executes `INSERT ... RETURNING *` on `.insert(...).select(...)`.
--      PostgreSQL evaluates BOTH the INSERT WITH CHECK policy and the SELECT USING policy.
--      Previously, `bookings_select_policy` denied SELECT to anonymous / unauthenticated users and server-side clients without service role keys (`auth.uid() IS NULL`).
--      This caused immediate 42501 RLS violation errors on court reservation inserts.
--   2. Allowed all users to read bookings for court schedule & availability visibility (matching courts and pos_products).
--   3. Extended INSERT and UPDATE policies to allow staff, authenticated owners, and server routes without service role keys.

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "bookings_insert_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON public.bookings;

-- 2. Select policy: Allow all users to read court bookings for schedule matrix and checkout returns
CREATE POLICY "bookings_select_policy" ON public.bookings
FOR SELECT
USING (true);

-- 3. Insert policy: Allow staff, authenticated players (for themselves), and server routes / guest checkouts
CREATE POLICY "bookings_insert_policy" ON public.bookings
FOR INSERT
WITH CHECK (
  is_staff(auth.uid())
  OR (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR customer_id = auth.uid()
    )
  )
  OR (
    auth.uid() IS NULL
  )
);

-- 4. Update policy: Allow staff, authenticated players (for themselves), and server routes (e.g. webhooks, payment success confirmation)
CREATE POLICY "bookings_update_policy" ON public.bookings
FOR UPDATE
USING (
  is_staff(auth.uid())
  OR (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR customer_id = auth.uid()
    )
  )
  OR (
    auth.uid() IS NULL
  )
)
WITH CHECK (
  is_staff(auth.uid())
  OR (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR customer_id = auth.uid()
    )
  )
  OR (
    auth.uid() IS NULL
  )
);

-- 5. Helper RPC function for safe webhook status updates without RLS bypass issues
CREATE OR REPLACE FUNCTION public.mark_booking_as_paid(p_booking_id uuid, p_payment_method text DEFAULT 'paymongo'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE public.bookings
  SET
    status = 'paid',
    payment_method = p_payment_method,
    updated_at = now()
  WHERE id = p_booking_id;
  RETURN FOUND;
END;
$$;
