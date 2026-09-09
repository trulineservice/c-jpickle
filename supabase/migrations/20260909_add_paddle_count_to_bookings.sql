-- ==============================================================================
-- Migration: Add paddle_count to public.bookings
-- Author: Database Manager Persona
-- Purpose: Support multi-paddle rentals (0 to 4 max) with CHECK constraint
-- ==============================================================================

-- 1. Add paddle_count column with default 0 and strict bounds [0, 4]
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS paddle_count integer NOT NULL DEFAULT 0 
CHECK (paddle_count >= 0 AND paddle_count <= 4);

-- 2. PostgREST / Supabase documentation comment
COMMENT ON COLUMN public.bookings.paddle_count IS 
'Number of rented Pro 16mm Raw Carbon Paddles (0 to 4 max, ₱150 each)';

-- 3. Partial index for fast rental inventory audits and cashier check-in lookups
CREATE INDEX IF NOT EXISTS idx_bookings_paddle_count 
ON public.bookings (paddle_count) 
WHERE paddle_count > 0;
