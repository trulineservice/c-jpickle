-- ============================================================================
-- CASHIER DUTY & SHIFT SYSTEM
-- Tracks active shifts, duty clock-ins/clock-outs, and historical time inspection.
-- ============================================================================

-- 1. Create cashier_duty_sessions table
CREATE TABLE IF NOT EXISTS public.cashier_duty_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'on_duty' CHECK (status IN ('on_duty', 'off_duty')),
  opening_float NUMERIC(10, 2) DEFAULT 0,
  closing_cash NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast time-range querying
CREATE INDEX IF NOT EXISTS idx_duty_sessions_cashier_time 
ON public.cashier_duty_sessions (cashier_id, started_at, ended_at);

CREATE INDEX IF NOT EXISTS idx_duty_sessions_status 
ON public.cashier_duty_sessions (status);

-- 2. Add cashier_id column to bookings table if not exists
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES public.profiles(id);

-- 3. Enable RLS on cashier_duty_sessions
ALTER TABLE public.cashier_duty_sessions ENABLE ROW LEVEL SECURITY;

-- Staff (cashiers, coordinators, admins, owners) can read all duty sessions
DROP POLICY IF EXISTS "Duty sessions staff read" ON public.cashier_duty_sessions;
CREATE POLICY "Duty sessions staff read" ON public.cashier_duty_sessions
FOR SELECT USING (
  is_staff(auth.uid())
);

-- Cashiers can insert their own duty sessions
DROP POLICY IF EXISTS "Duty sessions cashier insert" ON public.cashier_duty_sessions;
CREATE POLICY "Duty sessions cashier insert" ON public.cashier_duty_sessions
FOR INSERT WITH CHECK (
  is_staff(auth.uid()) AND (cashier_id = auth.uid() OR is_admin(auth.uid()))
);

-- Cashiers can update their own duty session (e.g. clock out) or Admins can update any
DROP POLICY IF EXISTS "Duty sessions cashier update" ON public.cashier_duty_sessions;
CREATE POLICY "Duty sessions cashier update" ON public.cashier_duty_sessions
FOR UPDATE USING (
  is_staff(auth.uid()) AND (cashier_id = auth.uid() OR is_admin(auth.uid()))
);

-- 4. Create SECURITY DEFINER function to find cashiers on duty at any given timestamp
CREATE OR REPLACE FUNCTION public.get_cashiers_on_duty_at(p_target_time TIMESTAMPTZ)
RETURNS TABLE (
  session_id UUID,
  cashier_id UUID,
  cashier_name TEXT,
  cashier_email TEXT,
  cashier_phone TEXT,
  cashier_role TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status TEXT,
  opening_float NUMERIC,
  closing_cash NUMERIC,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS session_id,
    s.cashier_id,
    COALESCE(p.full_name, 'Staff Member')::TEXT AS cashier_name,
    p.email::TEXT AS cashier_email,
    p.phone::TEXT AS cashier_phone,
    p.role::TEXT AS cashier_role,
    s.started_at,
    s.ended_at,
    s.status::TEXT,
    COALESCE(s.opening_float, 0) AS opening_float,
    s.closing_cash,
    s.notes::TEXT
  FROM public.cashier_duty_sessions s
  JOIN public.profiles p ON s.cashier_id = p.id
  WHERE s.started_at <= p_target_time
    AND (s.ended_at IS NULL OR s.ended_at >= p_target_time)
  ORDER BY s.started_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cashiers_on_duty_at(TIMESTAMPTZ) TO anon, authenticated;

-- 5. Seed initial realistic duty sessions for today and recent days based on POS transactions
-- Seed today's active shift for Lucas Soriano and Cashier Staff so admin sees them on duty right now!
INSERT INTO public.cashier_duty_sessions (cashier_id, started_at, status, opening_float, notes)
SELECT 
  p.id,
  timezone('utc'::text, now()) - interval '4 hours',
  'on_duty',
  1000.00,
  'Morning opening cash register drawer float (₱1,000)'
FROM public.profiles p
WHERE p.role = 'cashier' AND p.email = 'cashier1@cjcourt.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.cashier_duty_sessions s 
    WHERE s.cashier_id = p.id AND s.status = 'on_duty'
  )
LIMIT 1;

-- Also seed yesterday's completed shift for Enzo Santiago
INSERT INTO public.cashier_duty_sessions (cashier_id, started_at, ended_at, status, opening_float, closing_cash, notes)
SELECT 
  p.id,
  timezone('utc'::text, now()) - interval '28 hours',
  timezone('utc'::text, now()) - interval '20 hours',
  'off_duty',
  1000.00,
  14500.00,
  'Completed full shift with zero cash variance'
FROM public.profiles p
WHERE p.role = 'cashier' AND p.email = 'cashier2@cjcourt.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.cashier_duty_sessions s 
    WHERE s.cashier_id = p.id AND s.status = 'off_duty'
  )
LIMIT 1;
