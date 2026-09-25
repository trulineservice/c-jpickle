-- Migration: Update indoor court hourly rate from ₱300.00 to ₱350.00
-- Date: 2026-09-24

ALTER TABLE public.courts 
  ALTER COLUMN hourly_rate SET DEFAULT 350.00;

UPDATE public.courts
SET hourly_rate = 350.00
WHERE hourly_rate = 300.00 OR hourly_rate IS NULL;
