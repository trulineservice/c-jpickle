-- ============================================================================
-- Migration: 20260918_pos_voiding_and_master_pin.sql
-- Add void audit columns to pos_transactions & initialize system_settings
-- ============================================================================

-- 1. Add voiding audit columns to pos_transactions
ALTER TABLE public.pos_transactions 
  ADD COLUMN IF NOT EXISTS void_reason text,
  ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.profiles(id);

-- 2. Create system_settings table for facility-wide configurations (e.g. POS Master PIN)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read system_settings
DROP POLICY IF EXISTS "Allow authenticated read system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated read system_settings" 
  ON public.system_settings 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow only owners and admins to modify system_settings
DROP POLICY IF EXISTS "Allow owner/admin modify system_settings" ON public.system_settings;
CREATE POLICY "Allow owner/admin modify system_settings" 
  ON public.system_settings 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Seed default POS Master PIN (8888) if not present
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'pos_master_pin', 
  '8888', 
  'Master PIN code required for POS item voiding, order cancellation, and sales invoice voiding'
)
ON CONFLICT (key) DO NOTHING;
