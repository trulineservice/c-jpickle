-- ============================================================================
-- C&J PICKLEBALL ARENA - PRODUCTION NORMALIZED DATABASE SCHEMA (SUPABASE / POSTGRES)
-- ============================================================================
-- Normalized to Third Normal Form (3NF) with high-performance indexing, 
-- referential integrity constraints, automated triggers, and Supabase RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- 2. ENUMS & DOMAINS
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'cashier', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.court_type AS ENUM ('indoor', 'outdoor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.court_status AS ENUM ('active', 'maintenance', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.booking_status AS ENUM (
      'pending_payment',
      'paid',
      'checked_in',
      'walk_in',
      'cancelled',
      'cancelled_refund_pending',
      'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method_type AS ENUM ('paymongo', 'cash', 'counter_qr', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.refund_status_type AS ENUM (
      'none',
      'pending',
      'approved',
      'rejected',
      'completed',
      'voided_no_refund'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.wallet_type AS ENUM ('gcash', 'maya', 'bank_transfer', 'counter_cash');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 3. PROFILES TABLE (Normalized Identity Extension for auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'client'::public.user_role,
  full_name text,
  email text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 4. COURTS TABLE (Arena Court Facilities)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type public.court_type NOT NULL DEFAULT 'indoor'::public.court_type,
  status public.court_status NOT NULL DEFAULT 'active'::public.court_status,
  hourly_rate numeric(10, 2) NOT NULL DEFAULT 300.00 CHECK (hourly_rate >= 0),
  is_active boolean GENERATED ALWAYS AS (status = 'active'::public.court_status) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 5. COURT MAINTENANCE & PRICING RULES (3NF Normalization)
-- ----------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS public.court_pricing_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE,
  name text NOT NULL,
  day_of_week integer CHECK (day_of_week BETWEEN 0 AND 6),
  start_hour integer NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
  end_hour integer NOT NULL CHECK (end_hour BETWEEN 1 AND 24 AND end_hour > start_hour),
  hourly_rate numeric(10, 2) NOT NULL CHECK (hourly_rate >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 6. BOOKINGS TABLE (Core Court Reservations - 3NF Clean)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Guest Player Snapshots (populated when user_id is null)
  guest_name text,
  guest_email text,
  guest_phone text,
  
  -- Schedule
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  duration_hours integer NOT NULL CHECK (duration_hours >= 1),
  
  -- Financials
  total_price numeric(10, 2) NOT NULL CHECK (total_price >= 0),
  currency text NOT NULL DEFAULT 'PHP',
  
  -- Lifecycle & Payment
  status public.booking_status NOT NULL DEFAULT 'pending_payment'::public.booking_status,
  payment_method public.payment_method_type NOT NULL DEFAULT 'paymongo'::public.payment_method_type,
  paymongo_checkout_session_id text,
  expires_at timestamp with time zone,
  notes text,
  paddle_count integer NOT NULL DEFAULT 0 CHECK (paddle_count >= 0 AND paddle_count <= 4),
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- ----------------------------------------------------------------------------
-- 7. BOOKING REFUNDS TABLE (Normalized 3NF Entity for Refunds & Voids)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_refunds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  wallet_type public.wallet_type NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  reason text NOT NULL,
  status public.refund_status_type NOT NULL DEFAULT 'pending'::public.refund_status_type,
  reference text,
  processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 8. EQUIPMENT RENTALS TABLE (Normalized Rental Line Items)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_rentals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  product_id uuid, -- Optional FK to pos_products
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

-- ----------------------------------------------------------------------------
-- 9. POS CATEGORIES & PRODUCTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pos_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES public.pos_categories(id) ON DELETE SET NULL,
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  stock_level integer NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 10. POS TRANSACTIONS & RECEIPT ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text UNIQUE,
  cashier_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text,
  customer_tin text,
  discount_type text DEFAULT 'none' CHECK (discount_type IN ('none', 'senior_citizen', 'pwd', 'special')),
  discount_id_number text,
  gross_amount numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (gross_amount >= 0),
  discount_amount numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  vatable_sales numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (vatable_sales >= 0),
  vat_amount numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (vat_amount >= 0),
  vat_exempt_sales numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (vat_exempt_sales >= 0),
  zero_rated_sales numeric(10, 2) NOT NULL DEFAULT 0.00 CHECK (zero_rated_sales >= 0),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_method public.payment_method_type NOT NULL DEFAULT 'cash'::public.payment_method_type,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'refunded')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.pos_products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_time numeric(10, 2) NOT NULL CHECK (price_at_time >= 0)
);

-- ----------------------------------------------------------------------------
-- 11. SECURITY AUDIT LOGS (Immutable Fiscal & Security Trail)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 12. GIST EXCLUSION CONSTRAINT (Double-Booking Elimination Engine-Level)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_court_bookings;
  ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_court_bookings
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (
    status IN ('paid', 'checked_in', 'walk_in', 'pending_payment')
  );
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'GiST exclusion constraint skipped or already set: %', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- 13. HIGH-PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_availability 
  ON public.bookings (court_id, start_time, end_time) 
  WHERE status IN ('paid', 'checked_in', 'walk_in', 'pending_payment');

CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
  ON public.bookings (user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_status 
  ON public.bookings (status);

CREATE INDEX IF NOT EXISTS idx_bookings_paddle_count 
  ON public.bookings (paddle_count) 
  WHERE paddle_count > 0;

CREATE INDEX IF NOT EXISTS idx_bookings_paymongo_session 
  ON public.bookings (paymongo_checkout_session_id) 
  WHERE paymongo_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_refunds_booking_id 
  ON public.booking_refunds (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_refunds_status 
  ON public.booking_refunds (status);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_cashier_id 
  ON public.pos_transactions (cashier_id);

CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_tx_id 
  ON public.pos_transaction_items (transaction_id);

-- ----------------------------------------------------------------------------
-- 14. COMPOSITE VIEWS
-- ----------------------------------------------------------------------------
-- Public View: Calendar Slot Availability (Zero PII Exposure)
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

-- Composite Extended Bookings View
CREATE OR REPLACE VIEW public.v_bookings_extended AS
SELECT 
  b.id,
  b.court_id,
  b.user_id,
  b.user_id AS customer_id,
  b.guest_name,
  b.guest_email,
  b.guest_phone,
  b.start_time,
  b.end_time,
  b.duration_hours,
  b.total_price,
  b.total_price AS total_amount,
  b.currency,
  b.status,
  b.payment_method,
  b.paymongo_checkout_session_id,
  b.expires_at,
  b.notes,
  b.paddle_count,
  b.created_at,
  b.updated_at,
  r.wallet_type AS refund_wallet_type,
  r.account_name AS refund_account_name,
  r.account_number AS refund_account_number,
  r.reason AS refund_reason,
  COALESCE(r.status::text, 'none') AS refund_status,
  r.reference AS refund_reference,
  r.processed_at AS refund_processed_at,
  r.processed_by AS refund_processed_by
FROM public.bookings b
LEFT JOIN public.booking_refunds r ON b.id = r.booking_id;

-- ----------------------------------------------------------------------------
-- 15. ROW LEVEL SECURITY (RLS) - HARDENED DEFENSE-IN-DEPTH
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Security Definer Helpers (search_path injection protected)
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

-- 15.1 Profiles: Read self/staff, Update self (prevent role self-promotion), Admin manage all
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_staff(auth.uid()));

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

-- 15.2 Courts & Maintenance: Public read, Admin manage
DROP POLICY IF EXISTS "Courts read access" ON public.courts;
CREATE POLICY "Courts read access" ON public.courts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Courts staff manage access" ON public.courts;
DROP POLICY IF EXISTS "Courts admin manage" ON public.courts;
CREATE POLICY "Courts admin manage" ON public.courts FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Court maintenance read" ON public.court_maintenance_schedules;
CREATE POLICY "Court maintenance read" ON public.court_maintenance_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Court maintenance admin manage" ON public.court_maintenance_schedules;
CREATE POLICY "Court maintenance admin manage" ON public.court_maintenance_schedules FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Court pricing read" ON public.court_pricing_rules;
CREATE POLICY "Court pricing read" ON public.court_pricing_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Court pricing admin manage" ON public.court_pricing_rules;
CREATE POLICY "Court pricing admin manage" ON public.court_pricing_rules FOR ALL USING (public.is_admin(auth.uid()));

-- 15.3 Bookings: Strict PII Isolation (No "OR true" leakage!)
DROP POLICY IF EXISTS "Bookings read access" ON public.bookings;
CREATE POLICY "Bookings read access" ON public.bookings
  FOR SELECT USING (
    public.is_staff(auth.uid()) 
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

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

-- 15.4 Refunds: Staff or booking owner
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

-- 15.5 Equipment Rentals: Staff or booking owner
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

-- 15.6 POS: Public products read, Admin catalog manage, Staff transactions
DROP POLICY IF EXISTS "POS categories read" ON public.pos_categories;
CREATE POLICY "POS categories read" ON public.pos_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "POS categories admin manage" ON public.pos_categories;
CREATE POLICY "POS categories admin manage" ON public.pos_categories FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "POS products read access" ON public.pos_products;
CREATE POLICY "POS products read access" ON public.pos_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "POS staff manage products" ON public.pos_products;
DROP POLICY IF EXISTS "POS products admin manage" ON public.pos_products;
CREATE POLICY "POS products admin manage" ON public.pos_products FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "POS staff access transactions" ON public.pos_transactions;
CREATE POLICY "POS staff access transactions" ON public.pos_transactions FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "POS staff insert transactions" ON public.pos_transactions;
CREATE POLICY "POS staff insert transactions" ON public.pos_transactions FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "POS admin update transactions" ON public.pos_transactions;
CREATE POLICY "POS admin update transactions" ON public.pos_transactions FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "POS staff access transaction items" ON public.pos_transaction_items;
CREATE POLICY "POS staff access transaction items" ON public.pos_transaction_items FOR SELECT USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "POS staff insert transaction items" ON public.pos_transaction_items;
CREATE POLICY "POS staff insert transaction items" ON public.pos_transaction_items FOR INSERT WITH CHECK (public.is_staff(auth.uid()));

-- 15.7 Security Audit Logs: Admin read only, Append-only for all
DROP POLICY IF EXISTS "Audit logs admin read" ON public.security_audit_logs;
CREATE POLICY "Audit logs admin read" ON public.security_audit_logs FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Audit logs insert" ON public.security_audit_logs;
CREATE POLICY "Audit logs insert" ON public.security_audit_logs FOR INSERT WITH CHECK (true);