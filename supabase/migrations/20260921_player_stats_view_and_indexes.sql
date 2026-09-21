-- ============================================================
-- Player Stats Aggregation View + Performance Indexes
-- Migration: 20260921_player_stats_view_and_indexes.sql
-- ============================================================

-- 1. Player Stats View
-- Replaces JS-side booking aggregation loops in /admin/players.
-- Computes per-player totals directly in Postgres.
DROP VIEW IF EXISTS public.player_stats;

CREATE VIEW public.player_stats
WITH (security_invoker = on) AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.role,
  p.created_at,
  p.is_deleted,
  p.deleted_at,
  p.deleted_reason,
  p.skill_level,
  p.emergency_contact,
  p.notes,
  COUNT(b.id) FILTER (
    WHERE b.status IN ('paid', 'checked_in', 'walk_in')
  ) AS total_played,
  COALESCE(
    SUM(b.duration_hours) FILTER (WHERE b.status IN ('paid', 'checked_in', 'walk_in')),
    0
  ) AS total_hours,
  COALESCE(
    SUM(b.total_price) FILTER (WHERE b.status IN ('paid', 'checked_in', 'walk_in')),
    0
  ) AS total_spend,
  MAX(b.start_time) FILTER (
    WHERE b.status IN ('paid', 'checked_in', 'walk_in')
  ) AS last_played
FROM public.profiles p
LEFT JOIN public.bookings b
  ON b.user_id = p.id
  OR (b.guest_email IS NOT NULL AND lower(b.guest_email) = lower(p.email))
GROUP BY p.id;

GRANT SELECT ON public.player_stats TO anon, authenticated, service_role;

-- 2. Performance Indexes for Paginated Queries

-- Players: full-text-like search on name/email
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_lower
  ON public.profiles (lower(full_name));

CREATE INDEX IF NOT EXISTS idx_profiles_role_is_deleted
  ON public.profiles (role, is_deleted);

-- POS Transactions: cashier + date range lookups
CREATE INDEX IF NOT EXISTS idx_pos_transactions_cashier_created
  ON public.pos_transactions (cashier_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_desc
  ON public.pos_transactions (created_at DESC);

-- Daily Expenses: date range lookups
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date_desc
  ON public.daily_expenses (expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_created_desc
  ON public.daily_expenses (created_at DESC);

-- Bookings: walk-in + date range lookups
CREATE INDEX IF NOT EXISTS idx_bookings_status_created
  ON public.bookings (status, created_at DESC);
