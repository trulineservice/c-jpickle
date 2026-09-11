-- Migration: Update v_court_availability view with security_invoker = on
-- Resolves Supabase Security Advisor linter check: 0010_security_definer_view

ALTER VIEW IF EXISTS public.v_court_availability SET (security_invoker = on);
