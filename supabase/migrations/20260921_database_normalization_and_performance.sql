-- ==============================================================================
-- C&J PICKLEBALL ARENA - DATABASE NORMALIZATION & PERFORMANCE OPTIMIZATION
-- Date: 2026-09-21
-- Purpose:
--   1. 3NF Data Normalization & Integrity Triggers:
--      - Backfill & sync bookings.customer_id <=> bookings.user_id
--      - Backfill & sync bookings.total_amount <=> bookings.total_price
--      - Backfill missing historical paddle rentals into equipment_rentals (3NF)
--      - Synchronize pos_products.category <=> category_id (pos_categories FK)
--   2. Indexing Performance (Resolving 10 Missing Foreign Key Indexes)
--   3. Security Definer View Hardening (player_stats with security_invoker = on)
--   4. Function Search Path Hardening (SET search_path = public, pg_temp)
--   5. Function PostgREST API Hardening (Revoke public execution of admin/sync RPCs)
--   6. RLS Optimization (Consolidate multiple permissive policies & use initPlan subqueries)
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- 1. DATA NORMALIZATION & INTEGRITY TRIGGERS
-- ----------------------------------------------------------------------------

-- A. Backfill bookings user_id <=> customer_id and total_price <=> total_amount
UPDATE public.bookings
SET customer_id = user_id
WHERE customer_id IS NULL AND user_id IS NOT NULL;

UPDATE public.bookings
SET user_id = customer_id
WHERE user_id IS NULL AND customer_id IS NOT NULL;

UPDATE public.bookings
SET total_amount = total_price
WHERE total_amount IS NULL AND total_price IS NOT NULL;

UPDATE public.bookings
SET total_price = total_amount
WHERE total_price IS NULL AND total_amount IS NOT NULL;

-- B. Create trigger function to maintain strict synchronization on bookings
CREATE OR REPLACE FUNCTION public.normalize_booking_fields()
RETURNS trigger AS $$
BEGIN
  -- Synchronize user_id and customer_id
  IF NEW.user_id IS NOT NULL AND NEW.customer_id IS NULL THEN
    NEW.customer_id := NEW.user_id;
  ELSIF NEW.customer_id IS NOT NULL AND NEW.user_id IS NULL THEN
    NEW.user_id := NEW.customer_id;
  END IF;

  -- Synchronize total_price and total_amount
  IF NEW.total_price IS NOT NULL AND NEW.total_amount IS NULL THEN
    NEW.total_amount := NEW.total_price;
  ELSIF NEW.total_amount IS NOT NULL AND NEW.total_price IS NULL THEN
    NEW.total_price := NEW.total_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_normalize_booking_fields ON public.bookings;
CREATE TRIGGER trg_normalize_booking_fields
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_booking_fields();

-- C. Backfill missing equipment rentals from historical bookings with paddle_count > 0
INSERT INTO public.equipment_rentals (
  booking_id,
  equipment_type,
  equipment_name,
  quantity,
  rate_per_unit,
  total_price,
  created_at
)
SELECT 
  b.id,
  'paddle',
  'C&J Pro 16mm Carbon Paddle',
  b.paddle_count,
  150.00,
  (b.paddle_count * 150.00),
  b.created_at
FROM public.bookings b
WHERE b.paddle_count > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.equipment_rentals er 
    WHERE er.booking_id = b.id AND er.equipment_type = 'paddle'
  );

-- D. Synchronize pos_products category and category_id
CREATE OR REPLACE FUNCTION public.sync_pos_product_category()
RETURNS trigger AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO NEW.category FROM public.pos_categories WHERE id = NEW.category_id;
  ELSIF NEW.category IS NOT NULL THEN
    SELECT id INTO NEW.category_id FROM public.pos_categories WHERE lower(name) = lower(NEW.category);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_pos_product_category ON public.pos_products;
CREATE TRIGGER trg_sync_pos_product_category
  BEFORE INSERT OR UPDATE ON public.pos_products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pos_product_category();


-- ----------------------------------------------------------------------------
-- 2. COVERING INDEXES FOR ALL FOREIGN KEYS (Performance Advisory Fix)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_cashier_id 
  ON public.bookings(cashier_id) 
  WHERE cashier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_refund_processed_by 
  ON public.bookings(refund_processed_by) 
  WHERE refund_processed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_court_maintenance_created_by 
  ON public.court_maintenance_schedules(created_by) 
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_court_pricing_rules_court_id 
  ON public.court_pricing_rules(court_id) 
  WHERE court_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_expenses_recorded_by 
  ON public.daily_expenses(recorded_by) 
  WHERE recorded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_rentals_product_id 
  ON public.equipment_rentals(product_id) 
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
  ON public.password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_pos_products_category_id 
  ON public.pos_products(category_id);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_voided_by 
  ON public.pos_transactions(voided_by) 
  WHERE voided_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_by 
  ON public.profiles(deleted_by) 
  WHERE deleted_by IS NOT NULL;


-- ----------------------------------------------------------------------------
-- 3. SECURITY DEFINER VIEW FIX (player_stats)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.player_stats 
WITH (security_invoker = on) AS
SELECT 
  p.id,
  count(b.id) FILTER (WHERE (b.status = ANY (ARRAY['paid'::text, 'checked_in'::text, 'walk_in'::text]))) AS total_played,
  COALESCE(sum(b.duration_hours) FILTER (WHERE (b.status = ANY (ARRAY['paid'::text, 'checked_in'::text, 'walk_in'::text]))), (0)::bigint) AS total_hours,
  COALESCE(sum(b.total_price) FILTER (WHERE (b.status = ANY (ARRAY['paid'::text, 'checked_in'::text, 'walk_in'::text]))), (0)::numeric) AS total_spend,
  max(b.start_time) FILTER (WHERE (b.status = ANY (ARRAY['paid'::text, 'checked_in'::text, 'walk_in'::text]))) AS last_played
FROM (public.profiles p
  LEFT JOIN public.bookings b ON (((b.user_id = p.id) OR ((b.guest_email IS NOT NULL) AND (lower(b.guest_email) = lower(p.email))))))
GROUP BY p.id;

GRANT SELECT ON public.player_stats TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. FUNCTION SEARCH_PATH HARDENING & PERMISSION REVOCATION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_pos_invoice_number()
RETURNS text AS $$
DECLARE
  today_str text;
  seq_val bigint;
BEGIN
  today_str := to_char(timezone('Asia/Manila', now()), 'YYYYMMDD');
  seq_val := nextval('public.pos_invoice_seq');
  RETURN 'SI-' || today_str || '-' || lpad(seq_val::text, 5, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.handle_user_profile_sync()
RETURNS trigger AS $$
DECLARE
  assigned_role public.user_role := 'client';
  meta_role text;
BEGIN
  meta_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'client'));
  IF meta_role IN ('owner', 'admin', 'cashier', 'client', 'customer', 'coordinator') THEN
    assigned_role := meta_role::public.user_role;
  ELSE
    assigned_role := 'client'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    assigned_role,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.restore_player(p_player_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.soft_delete_player(p_player_id uuid, p_reason text DEFAULT 'Archived by Administrator'::text)
RETURNS jsonb AS $$
DECLARE
  v_caller UUID := (SELECT auth.uid());
  v_is_adm BOOLEAN;
  v_target_role public.user_role;
BEGIN
  SELECT public.is_admin(v_caller) INTO v_is_adm;
  IF NOT COALESCE(v_is_adm, false) THEN
    RAISE EXCEPTION 'Unauthorized: Only Administrators or Owners can archive players.';
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke anonymous PostgREST access to internal administrative/trigger functions
REVOKE EXECUTE ON FUNCTION public.restore_player(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.soft_delete_player(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_booking_google_event(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_user_profile_sync() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. RLS POLICY CONSOLIDATION & INITPLAN SUBQUERY OPTIMIZATION
-- ----------------------------------------------------------------------------

-- A. BOOKING_REFUNDS
DROP POLICY IF EXISTS "Refunds customer insert access" ON public.booking_refunds;
DROP POLICY IF EXISTS "Refunds insert access" ON public.booking_refunds;
DROP POLICY IF EXISTS "Refunds staff or owner read access" ON public.booking_refunds;
DROP POLICY IF EXISTS "Refunds read access" ON public.booking_refunds;
DROP POLICY IF EXISTS "Refunds staff manage access" ON public.booking_refunds;
DROP POLICY IF EXISTS "Refunds staff modify access" ON public.booking_refunds;

CREATE POLICY "booking_refunds_select_policy" ON public.booking_refunds
  FOR SELECT USING (
    public.is_staff((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_refunds.booking_id 
        AND (b.user_id = (SELECT auth.uid()) OR b.customer_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "booking_refunds_insert_policy" ON public.booking_refunds
  FOR INSERT WITH CHECK (
    public.is_staff((SELECT auth.uid()))
    OR (
      status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_refunds.booking_id 
          AND (b.user_id = (SELECT auth.uid()) OR b.customer_id = (SELECT auth.uid()))
      )
    )
  );

CREATE POLICY "booking_refunds_update_policy" ON public.booking_refunds
  FOR UPDATE USING (public.is_staff((SELECT auth.uid())));


-- B. COURTS
DROP POLICY IF EXISTS "Courts admin manage" ON public.courts;
DROP POLICY IF EXISTS "Courts staff delete access" ON public.courts;
DROP POLICY IF EXISTS "Courts staff insert access" ON public.courts;
DROP POLICY IF EXISTS "Courts read access" ON public.courts;
DROP POLICY IF EXISTS "Courts staff update access" ON public.courts;

CREATE POLICY "courts_select_policy" ON public.courts
  FOR SELECT USING (true);

CREATE POLICY "courts_insert_policy" ON public.courts
  FOR INSERT WITH CHECK (public.is_staff((SELECT auth.uid())));

CREATE POLICY "courts_update_policy" ON public.courts
  FOR UPDATE USING (public.is_staff((SELECT auth.uid())));

CREATE POLICY "courts_delete_policy" ON public.courts
  FOR DELETE USING (public.is_staff((SELECT auth.uid())));


-- C. POS_PRODUCTS
DROP POLICY IF EXISTS "POS products admin manage" ON public.pos_products;
DROP POLICY IF EXISTS "POS staff delete products" ON public.pos_products;
DROP POLICY IF EXISTS "POS staff write products" ON public.pos_products;
DROP POLICY IF EXISTS "POS products read access" ON public.pos_products;
DROP POLICY IF EXISTS "POS staff update products" ON public.pos_products;

CREATE POLICY "pos_products_select_policy" ON public.pos_products
  FOR SELECT USING (true);

CREATE POLICY "pos_products_insert_policy" ON public.pos_products
  FOR INSERT WITH CHECK (public.is_staff((SELECT auth.uid())));

CREATE POLICY "pos_products_update_policy" ON public.pos_products
  FOR UPDATE USING (public.is_staff((SELECT auth.uid())));

CREATE POLICY "pos_products_delete_policy" ON public.pos_products
  FOR DELETE USING (public.is_staff((SELECT auth.uid())));


-- D. POS_CATEGORIES
DROP POLICY IF EXISTS "POS categories admin manage" ON public.pos_categories;
DROP POLICY IF EXISTS "POS categories read" ON public.pos_categories;

CREATE POLICY "pos_categories_select_policy" ON public.pos_categories
  FOR SELECT USING (true);

CREATE POLICY "pos_categories_insert_policy" ON public.pos_categories
  FOR INSERT WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "pos_categories_update_policy" ON public.pos_categories
  FOR UPDATE USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "pos_categories_delete_policy" ON public.pos_categories
  FOR DELETE USING (public.is_admin((SELECT auth.uid())));


-- E. EQUIPMENT_RENTALS
DROP POLICY IF EXISTS "Equipment rentals staff manage" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Anyone can insert equipment rentals" ON public.equipment_rentals;
DROP POLICY IF EXISTS "Equipment rentals read access" ON public.equipment_rentals;

CREATE POLICY "equipment_rentals_select_policy" ON public.equipment_rentals
  FOR SELECT USING (
    public.is_staff((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = equipment_rentals.booking_id 
        AND (b.user_id = (SELECT auth.uid()) OR b.customer_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "equipment_rentals_insert_policy" ON public.equipment_rentals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "equipment_rentals_update_policy" ON public.equipment_rentals
  FOR UPDATE USING (public.is_staff((SELECT auth.uid())));

CREATE POLICY "equipment_rentals_delete_policy" ON public.equipment_rentals
  FOR DELETE USING (public.is_staff((SELECT auth.uid())));


-- F. COURT_PRICING_RULES
DROP POLICY IF EXISTS "Court pricing admin manage" ON public.court_pricing_rules;
DROP POLICY IF EXISTS "Court pricing read" ON public.court_pricing_rules;

CREATE POLICY "court_pricing_rules_select_policy" ON public.court_pricing_rules
  FOR SELECT USING (true);

CREATE POLICY "court_pricing_rules_insert_policy" ON public.court_pricing_rules
  FOR INSERT WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "court_pricing_rules_update_policy" ON public.court_pricing_rules
  FOR UPDATE USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "court_pricing_rules_delete_policy" ON public.court_pricing_rules
  FOR DELETE USING (public.is_admin((SELECT auth.uid())));


-- G. COURT_MAINTENANCE_SCHEDULES
DROP POLICY IF EXISTS "Court maintenance admin manage" ON public.court_maintenance_schedules;
DROP POLICY IF EXISTS "Court maintenance read" ON public.court_maintenance_schedules;

CREATE POLICY "court_maintenance_select_policy" ON public.court_maintenance_schedules
  FOR SELECT USING (true);

CREATE POLICY "court_maintenance_insert_policy" ON public.court_maintenance_schedules
  FOR INSERT WITH CHECK (public.is_admin((SELECT auth.uid())));

CREATE POLICY "court_maintenance_update_policy" ON public.court_maintenance_schedules
  FOR UPDATE USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "court_maintenance_delete_policy" ON public.court_maintenance_schedules
  FOR DELETE USING (public.is_admin((SELECT auth.uid())));


-- H. PROFILES
DROP POLICY IF EXISTS "Profiles admin manage" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self update" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    (SELECT auth.uid()) = id 
    OR public.is_staff((SELECT auth.uid()))
  );

CREATE POLICY "profiles_self_update_policy" ON public.profiles
  FOR UPDATE USING (
    (SELECT auth.uid()) = id
    OR public.is_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    public.is_admin((SELECT auth.uid()))
    OR (
      (SELECT auth.uid()) = id 
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "profiles_admin_insert_policy" ON public.profiles
  FOR INSERT WITH CHECK (
    public.is_admin((SELECT auth.uid())) 
    OR (SELECT auth.uid()) = id
  );

CREATE POLICY "profiles_admin_delete_policy" ON public.profiles
  FOR DELETE USING (public.is_admin((SELECT auth.uid())));


-- I. BOOKINGS
DROP POLICY IF EXISTS "Bookings insert access" ON public.bookings;
DROP POLICY IF EXISTS "Bookings read access" ON public.bookings;
DROP POLICY IF EXISTS "Bookings staff update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings user cancel own" ON public.bookings;

CREATE POLICY "bookings_select_policy" ON public.bookings
  FOR SELECT USING (
    public.is_staff((SELECT auth.uid())) 
    OR (
      (SELECT auth.uid()) IS NOT NULL 
      AND (
        user_id = (SELECT auth.uid()) 
        OR customer_id = (SELECT auth.uid())
        OR (guest_email IS NOT NULL AND lower(guest_email) = lower((SELECT auth.jwt()) ->> 'email'))
      )
    )
  );

CREATE POLICY "bookings_insert_policy" ON public.bookings
  FOR INSERT WITH CHECK (
    public.is_staff((SELECT auth.uid()))
    OR (
      (status = 'pending_payment'::text)
      AND (
        (SELECT auth.uid()) IS NULL 
        OR user_id = (SELECT auth.uid()) 
        OR customer_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "bookings_update_policy" ON public.bookings
  FOR UPDATE USING (
    public.is_staff((SELECT auth.uid()))
    OR (
      (SELECT auth.uid()) IS NOT NULL 
      AND (user_id = (SELECT auth.uid()) OR customer_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    public.is_staff((SELECT auth.uid()))
    OR (
      (SELECT auth.uid()) IS NOT NULL 
      AND (user_id = (SELECT auth.uid()) OR customer_id = (SELECT auth.uid()))
      AND status = 'cancelled'::text
    )
  );


-- J. POS_TRANSACTIONS & POS_TRANSACTION_ITEMS
DROP POLICY IF EXISTS "POS staff insert transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "POS staff access transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "POS admin update transactions" ON public.pos_transactions;

CREATE POLICY "pos_transactions_select_policy" ON public.pos_transactions
  FOR SELECT USING (public.is_staff((SELECT auth.uid())));

CREATE POLICY "pos_transactions_insert_policy" ON public.pos_transactions
  FOR INSERT WITH CHECK (public.is_staff((SELECT auth.uid())));

CREATE POLICY "pos_transactions_update_policy" ON public.pos_transactions
  FOR UPDATE USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "POS staff insert transaction items" ON public.pos_transaction_items;
DROP POLICY IF EXISTS "POS staff access transaction items" ON public.pos_transaction_items;

CREATE POLICY "pos_transaction_items_select_policy" ON public.pos_transaction_items
  FOR SELECT USING (public.is_staff((SELECT auth.uid())));

CREATE POLICY "pos_transaction_items_insert_policy" ON public.pos_transaction_items
  FOR INSERT WITH CHECK (public.is_staff((SELECT auth.uid())));


-- K. DAILY_EXPENSES & CASHIER_DUTY_SESSIONS
DROP POLICY IF EXISTS "Staff can read daily_expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Staff can insert daily_expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Admin can update daily_expenses" ON public.daily_expenses;
DROP POLICY IF EXISTS "Admin can delete daily_expenses" ON public.daily_expenses;

CREATE POLICY "daily_expenses_select_policy" ON public.daily_expenses
  FOR SELECT USING (public.is_staff((SELECT auth.uid())));

CREATE POLICY "daily_expenses_insert_policy" ON public.daily_expenses
  FOR INSERT WITH CHECK (public.is_staff((SELECT auth.uid())));

CREATE POLICY "daily_expenses_update_policy" ON public.daily_expenses
  FOR UPDATE USING (public.is_admin((SELECT auth.uid())));

CREATE POLICY "daily_expenses_delete_policy" ON public.daily_expenses
  FOR DELETE USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Duty sessions staff read" ON public.cashier_duty_sessions;
DROP POLICY IF EXISTS "Duty sessions cashier insert" ON public.cashier_duty_sessions;
DROP POLICY IF EXISTS "Duty sessions cashier update" ON public.cashier_duty_sessions;

CREATE POLICY "duty_sessions_select_policy" ON public.cashier_duty_sessions
  FOR SELECT USING (public.is_staff((SELECT auth.uid())));

CREATE POLICY "duty_sessions_insert_policy" ON public.cashier_duty_sessions
  FOR INSERT WITH CHECK (
    public.is_staff((SELECT auth.uid())) 
    AND (cashier_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())))
  );

CREATE POLICY "duty_sessions_update_policy" ON public.cashier_duty_sessions
  FOR UPDATE USING (
    public.is_staff((SELECT auth.uid())) 
    AND (cashier_id = (SELECT auth.uid()) OR public.is_admin((SELECT auth.uid())))
  );


-- L. SECURITY_AUDIT_LOGS & SYSTEM_SETTINGS
DROP POLICY IF EXISTS "Audit logs admin read" ON public.security_audit_logs;
CREATE POLICY "security_audit_logs_select_policy" ON public.security_audit_logs
  FOR SELECT USING (public.is_admin((SELECT auth.uid())));

DROP POLICY IF EXISTS "Allow owner/admin modify system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_modify_policy" ON public.system_settings;
CREATE POLICY "system_settings_modify_policy" ON public.system_settings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
        AND profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])
    )
  );

CREATE POLICY "system_settings_update_policy" ON public.system_settings
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
        AND profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])
    )
  );

CREATE POLICY "system_settings_delete_policy" ON public.system_settings
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
        AND profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])
    )
  );

-- Drop duplicate index on daily_expenses
DROP INDEX IF EXISTS public.idx_daily_expenses_date_desc;

