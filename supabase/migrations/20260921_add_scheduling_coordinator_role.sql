-- ============================================================================
-- Migration: 20260921_add_scheduling_coordinator_role.sql
-- Description: Adds 'coordinator' to user_role enum and updates public.is_staff
--              to grant Scheduling Coordinators court & booking visibility.
-- ============================================================================

-- 1. Add 'coordinator' to user_role ENUM type if not already present
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'coordinator';

-- 2. Update is_staff helper function to include 'coordinator'
CREATE OR REPLACE FUNCTION public.is_staff(check_uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND role IN ('owner', 'admin', 'cashier', 'coordinator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;
