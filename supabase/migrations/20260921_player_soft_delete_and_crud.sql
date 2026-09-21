-- Migration: 20260921_player_soft_delete_and_crud.sql
-- Description: Adds soft delete tracking and player management metadata to public.profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT '3.0',
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Index for high-speed active player lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- RPC: Soft delete player profile
CREATE OR REPLACE FUNCTION public.soft_delete_player(
  p_player_id UUID,
  p_reason TEXT DEFAULT 'Archived by Administrator'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_adm BOOLEAN;
  v_target_role public.user_role;
BEGIN
  -- Verify caller is admin or owner
  SELECT public.is_admin(v_caller) INTO v_is_adm;
  IF NOT COALESCE(v_is_adm, false) THEN
    RAISE EXCEPTION 'Unauthorized: Only Administrators or Owners can archive players.';
  END IF;

  -- Verify target player exists and is not an owner/admin
  SELECT role INTO v_target_role FROM public.profiles WHERE id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player profile not found.';
  END IF;

  IF v_target_role IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Protected Account: Administrators or Facility Owners cannot be deleted.';
  END IF;

  UPDATE public.profiles
  SET
    is_deleted = true,
    deleted_at = now(),
    deleted_reason = COALESCE(p_reason, 'Archived by Administrator'),
    deleted_by = v_caller,
    updated_at = now()
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'archived_at', now()
  );
END;
$$;

-- RPC: Restore soft-deleted player profile
CREATE OR REPLACE FUNCTION public.restore_player(
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_adm BOOLEAN;
BEGIN
  SELECT public.is_admin(v_caller) INTO v_is_adm;
  IF NOT COALESCE(v_is_adm, false) THEN
    RAISE EXCEPTION 'Unauthorized: Only Administrators or Owners can restore players.';
  END IF;

  UPDATE public.profiles
  SET
    is_deleted = false,
    deleted_at = NULL,
    deleted_reason = NULL,
    deleted_by = NULL,
    updated_at = now()
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'player_id', p_player_id,
    'restored_at', now()
  );
END;
$$;
