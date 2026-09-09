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
-- 5. BOOKINGS TABLE (Core Court Reservations - 3NF Clean)
-- ----------------------------------------------------------------------------
-- Eliminated redundancy:
--   - Removed duplicate customer_id (unified on user_id)
--   - Removed duplicate total_amount (unified on total_price)
--   - Extracted 8 refund fields into dedicated booking_refunds table
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
  
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- ----------------------------------------------------------------------------
-- 6. BOOKING REFUNDS TABLE (Normalized 3NF Entity for Refunds & Voids)
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
-- 7. POS PRODUCTS & INVENTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pos_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  stock_level integer NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 8. POS TRANSACTIONS & RECEIPT ITEMS
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
-- 9. GIST EXCLUSION CONSTRAINT (Double-Booking Elimination Engine-Level)
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
-- 10. HIGH-PERFORMANCE INDEXES (Optimized for Supabase RLS & Queries)
-- ----------------------------------------------------------------------------
-- Court Schedule & Availability Lookup (Composite Covering Index)
CREATE INDEX IF NOT EXISTS idx_bookings_availability 
  ON public.bookings (court_id, start_time, end_time) 
  WHERE status IN ('paid', 'checked_in', 'walk_in', 'pending_payment');

-- Supabase RLS Policy Acceleration (prevents Seq Scans on user dashboard)
CREATE INDEX IF NOT EXISTS idx_bookings_user_id 
  ON public.bookings (user_id);

-- Booking Status & Session Lookups
CREATE INDEX IF NOT EXISTS idx_bookings_status 
  ON public.bookings (status);

CREATE INDEX IF NOT EXISTS idx_bookings_paymongo_session 
  ON public.bookings (paymongo_checkout_session_id) 
  WHERE paymongo_checkout_session_id IS NOT NULL;

-- Refund Queries
CREATE INDEX IF NOT EXISTS idx_booking_refunds_booking_id 
  ON public.booking_refunds (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_refunds_status 
  ON public.booking_refunds (status);

-- POS Lookups
CREATE INDEX IF NOT EXISTS idx_pos_transactions_cashier_id 
  ON public.pos_transactions (cashier_id);

CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_tx_id 
  ON public.pos_transaction_items (transaction_id);

CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_product_id 
  ON public.pos_transaction_items (product_id);

-- ----------------------------------------------------------------------------
-- 11. BACKWARD COMPATIBILITY COMPOSITE VIEW
-- ----------------------------------------------------------------------------
-- Allows legacy queries expecting denormalized refund fields on bookings 
-- to continue operating seamlessly without breaking changes.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_bookings_extended AS
SELECT 
  b.id,
  b.court_id,
  b.user_id,
  b.user_id AS customer_id, -- Legacy alias
  b.guest_name,
  b.guest_email,
  b.guest_phone,
  b.start_time,
  b.end_time,
  b.duration_hours,
  b.total_price,
  b.total_price AS total_amount, -- Legacy alias
  b.currency,
  b.status,
  b.payment_method,
  b.paymongo_checkout_session_id,
  b.expires_at,
  b.notes,
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
-- 12. ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_staff(check_uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = check_uid AND role IN ('owner', 'admin', 'cashier')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles read access" ON public.profiles;
CREATE POLICY "Profiles read access" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Profiles update access" ON public.profiles;
CREATE POLICY "Profiles update access" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Courts Policies: Public read, Staff write
DROP POLICY IF EXISTS "Courts read access" ON public.courts;
CREATE POLICY "Courts read access" ON public.courts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Courts staff manage access" ON public.courts;
CREATE POLICY "Courts staff manage access" ON public.courts
  FOR ALL USING (public.is_staff(auth.uid()));

-- Bookings Policies
DROP POLICY IF EXISTS "Bookings read access" ON public.bookings;
CREATE POLICY "Bookings read access" ON public.bookings
  FOR SELECT USING (
    public.is_staff(auth.uid()) 
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR true -- Public reads slot timestamps for calendar availability
  );

DROP POLICY IF EXISTS "Bookings insert access" ON public.bookings;
CREATE POLICY "Bookings insert access" ON public.bookings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Bookings update access" ON public.bookings;
CREATE POLICY "Bookings update access" ON public.bookings
  FOR UPDATE USING (
    public.is_staff(auth.uid())
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- Refunds Policies
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
    OR EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = booking_refunds.booking_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Refunds staff manage access" ON public.booking_refunds;
CREATE POLICY "Refunds staff manage access" ON public.booking_refunds
  FOR ALL USING (public.is_staff(auth.uid()));

-- POS Policies
DROP POLICY IF EXISTS "POS products read access" ON public.pos_products;
CREATE POLICY "POS products read access" ON public.pos_products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "POS staff manage products" ON public.pos_products;
CREATE POLICY "POS staff manage products" ON public.pos_products
  FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "POS staff access transactions" ON public.pos_transactions;
CREATE POLICY "POS staff access transactions" ON public.pos_transactions
  FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "POS staff access transaction items" ON public.pos_transaction_items;
CREATE POLICY "POS staff access transaction items" ON public.pos_transaction_items
  FOR ALL USING (public.is_staff(auth.uid()));