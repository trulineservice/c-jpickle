-- ==============================================================================
-- C&J PICKLEBALL ARENA - DATABASE SECURITY AUDIT (RLS) & 3NF NORMALIZATION
-- Author: Database Manager Persona
-- Purpose: 
--   1. Harden RLS policies (eliminate PII data leaks & privilege escalation)
--   2. Implement 3NF normalized tables:
--      - equipment_rentals (normalized from bookings.notes & paddle_count)
--      - pos_categories (normalized from pos_products.category)
--      - court_maintenance_schedules (arena upkeep scheduling)
--      - court_pricing_rules (peak / off-peak rate normalization)
--      - security_audit_logs (immutable compliance audit trail)
--   3. Create zero-PII public availability view (v_court_availability)
-- ==============================================================================

-- ----------------------------------------------------------------------------
-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS (search_path defense)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff(check_uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND role IN ('owner', 'admin', 'cashier')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin(check_uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 2. NEW NORMALIZED TABLES (3NF ARCHITECTURE)
-- ----------------------------------------------------------------------------

-- Table A: POS Categories (Normalized Product Categories)
CREATE TABLE IF NOT EXISTS public.pos_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed Default Categories
INSERT INTO public.pos_categories (name, slug, display_order)
VALUES 
  ('Rentals', 'rentals', 1),
  ('Equipment', 'equipment', 2),
  ('Accessories', 'accessories', 3),
  ('Beverages', 'beverages', 4),
  ('Apparel', 'apparel', 5)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  display_order = EXCLUDED.display_order;

-- Link pos_products to pos_categories if column missing
ALTER TABLE public.pos_products 
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.pos_categories(id) ON DELETE SET NULL;

-- Backfill category_id
UPDATE public.pos_products p
SET category_id = c.id
FROM public.pos_categories c
WHERE lower(p.category) = lower(c.name)
  AND p.category_id IS NULL;

-- Table B: Equipment Rentals (Normalized Rental Line Items)
CREATE TABLE IF NOT EXISTS public.equipment_rentals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.pos_products(id) ON DELETE RESTRICT,
  equipment_type text NOT NULL CHECK (equipment_type IN ('paddle', 'ball_thrower', 'balls', 'other')),
  equipment_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 4),
  rate_per_unit numeric(10, 2) NOT NULL CHECK (rate_per_unit >= 0),
  total_price numeric(10, 2) NOT NULL CHECK (total_price >= 0),
  returned_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_equipment_rentals_booking_id 
  ON public.equipment_rentals (booking_id);

-- Table C: Court Maintenance Schedules (Prevents Bookings During Upkeep)
CREATE TABLE IF NOT EXISTS public.court_maintenance_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_maintenance_time CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_court_maintenance_court_time 
  ON public.court_maintenance_schedules (court_id, start_time, end_time);

-- Table D: Court Pricing Rules (Peak & Off-Peak Dynamic Rate Normalization)
CREATE TABLE IF NOT EXISTS public.court_pricing_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE, -- NULL means arena-wide rule
  name text NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat, NULL=All days
  start_hour integer NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour integer NOT NULL CHECK (end_hour BETWEEN 1 AND 24 AND end_hour > start_hour),
  hourly_rate numeric(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table E: Security Audit Logs (Immutable Statutory & Action Trail)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_security_audit_entity 
  ON public.security_audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_security_audit_actor 
  ON public.security_audit_logs (actor_id);

-- Ensure paddle_count is present on bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS paddle_count integer NOT NULL DEFAULT 0 
  CHECK (paddle_count >= 0 AND paddle_count <= 4);

-- ----------------------------------------------------------------------------
-- 3. ZERO-PII PUBLIC AVAILABILITY VIEW (v_court_availability)
-- ----------------------------------------------------------------------------
-- Prevents data scraping of customer names, emails, phones, notes, or totals
-- while providing the /book schedule grid with exact slot availability.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_court_availability AS
SELECT 
  b.id,
  b.court_id,
  b.start_time,
  b.end_time,
  b.status,
  b.expires_at
FROM public.bookings b
WHERE b.status IN ('paid', 'checked_in', 'walk_in', 'pending_payment');

GRANT SELECT ON public.v_court_availability TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- A. PROFILES RLS (Privilege Escalation Prevention)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_staff(auth.uid()));

-- Users can only update their own profile; cannot self-promote their role!
DROP POLICY IF EXISTS "Profiles update access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles self update" ON public.profiles;
CREATE POLICY "Profiles self update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND (
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      OR public.is_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Profiles admin manage" ON public.profiles;
CREATE POLICY "Profiles admin manage" ON public.profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- B. COURTS RLS (Admin Write Only)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Courts read access" ON public.courts;
CREATE POLICY "Courts read access" ON public.courts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Courts staff manage access" ON public.courts;
DROP POLICY IF EXISTS "Courts admin manage" ON public.courts;
CREATE POLICY "Courts admin manage" ON public.courts
  FOR ALL USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- C. BOOKINGS RLS (Zero PII Leaks)
-- ----------------------------------------------------------------------------
-- Staff can view all; Users can ONLY view their own bookings.
-- Public slot viewing is redirected to v_court_availability!
DROP POLICY IF EXISTS "Bookings read access" ON public.bookings;
CREATE POLICY "Bookings read access" ON public.bookings
  FOR SELECT USING (
    public.is_staff(auth.uid()) 
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Insert: Staff can insert walk-in/paid; Authenticated user can only insert pending_payment for themselves
DROP POLICY IF EXISTS "Bookings insert access" ON public.bookings;
CREATE POLICY "Bookings insert access" ON public.bookings
  FOR INSERT WITH CHECK (
    public.is_staff(auth.uid())
    OR (
      auth.uid() IS NOT NULL 
      AND user_id = auth.uid()
      AND status = 'pending_payment'
    )
  );

-- Update: Staff can update any booking; User can only update status to 'cancelled'
DROP POLICY IF EXISTS "Bookings update access" ON public.bookings;
DROP POLICY IF EXISTS "Bookings staff update" ON public.bookings;
CREATE POLICY "Bookings staff update" ON public.bookings
  FOR UPDATE USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Bookings user cancel own" ON public.bookings;
CREATE POLICY "Bookings user cancel own" ON public.bookings
  FOR UPDATE USING (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
    AND status = 'cancelled'
  );

-- ----------------------------------------------------------------------------
-- D. BOOKING REFUNDS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Refunds staff or owner read access" ON public.booking_refunds;
CREATE POLICY "Refunds staff or owner read access" ON public.booking_refunds
  FOR SELECT USING (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_refunds.booking_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Refunds customer insert access" ON public.booking_refunds;
CREATE POLICY "Refunds customer insert access" ON public.booking_refunds
  FOR INSERT WITH CHECK (
    public.is_staff(auth.uid())
    OR (
      status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_refunds.booking_id AND b.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Refunds staff manage access" ON public.booking_refunds;
CREATE POLICY "Refunds staff manage access" ON public.booking_refunds
  FOR UPDATE USING (public.is_staff(auth.uid()));

-- ----------------------------------------------------------------------------
-- E. EQUIPMENT RENTALS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Equipment rentals read access" ON public.equipment_rentals;
CREATE POLICY "Equipment rentals read access" ON public.equipment_rentals
  FOR SELECT USING (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = equipment_rentals.booking_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Equipment rentals insert access" ON public.equipment_rentals;
CREATE POLICY "Equipment rentals insert access" ON public.equipment_rentals
  FOR INSERT WITH CHECK (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = equipment_rentals.booking_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Equipment rentals staff manage" ON public.equipment_rentals;
CREATE POLICY "Equipment rentals staff manage" ON public.equipment_rentals
  FOR ALL USING (public.is_staff(auth.uid()));

-- ----------------------------------------------------------------------------
-- F. POS CATEGORIES & PRODUCTS RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "POS categories read" ON public.pos_categories;
CREATE POLICY "POS categories read" ON public.pos_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "POS categories admin manage" ON public.pos_categories;
CREATE POLICY "POS categories admin manage" ON public.pos_categories
  FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "POS products read access" ON public.pos_products;
CREATE POLICY "POS products read access" ON public.pos_products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "POS staff manage products" ON public.pos_products;
DROP POLICY IF EXISTS "POS products admin manage" ON public.pos_products;
CREATE POLICY "POS products admin manage" ON public.pos_products
  FOR ALL USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- G. POS TRANSACTIONS & ITEMS RLS (Fiscal Integrity Protection)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "POS staff access transactions" ON public.pos_transactions;
CREATE POLICY "POS staff access transactions" ON public.pos_transactions
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "POS staff insert transactions" ON public.pos_transactions
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- Transactions cannot be deleted; updates (void/refund) restricted to Admin
CREATE POLICY "POS admin update transactions" ON public.pos_transactions
  FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "POS staff access transaction items" ON public.pos_transaction_items;
CREATE POLICY "POS staff access transaction items" ON public.pos_transaction_items
  FOR SELECT USING (public.is_staff(auth.uid()));

CREATE POLICY "POS staff insert transaction items" ON public.pos_transaction_items
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- ----------------------------------------------------------------------------
-- H. COURT MAINTENANCE & PRICING RULES RLS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Court maintenance read" ON public.court_maintenance_schedules;
CREATE POLICY "Court maintenance read" ON public.court_maintenance_schedules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Court maintenance admin manage" ON public.court_maintenance_schedules;
CREATE POLICY "Court maintenance admin manage" ON public.court_maintenance_schedules
  FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Court pricing read" ON public.court_pricing_rules;
CREATE POLICY "Court pricing read" ON public.court_pricing_rules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Court pricing admin manage" ON public.court_pricing_rules;
CREATE POLICY "Court pricing admin manage" ON public.court_pricing_rules
  FOR ALL USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- I. SECURITY AUDIT LOGS RLS (Immutable Append-Only Audit Trail)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Audit logs admin read" ON public.security_audit_logs;
CREATE POLICY "Audit logs admin read" ON public.security_audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Audit logs insert" ON public.security_audit_logs;
CREATE POLICY "Audit logs insert" ON public.security_audit_logs
  FOR INSERT WITH CHECK (true);
-- Note: NO UPDATE OR DELETE POLICY -> Immutable log guaranteed!
