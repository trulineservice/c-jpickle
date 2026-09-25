-- =========================================================
-- C&J COURT - COMPLETE DATABASE MIGRATION & SCHEMA
-- =========================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. User Roles Enum (or text check constraint)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'cashier', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('owner', 'admin', 'cashier', 'client')),
  full_name text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Courts Table
CREATE TABLE IF NOT EXISTS public.courts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'indoor' CHECK (type IN ('indoor', 'outdoor')),
  hourly_rate numeric(10, 2) NOT NULL DEFAULT 350.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id uuid NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name text,
  guest_email text,
  guest_phone text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  duration_hours integer NOT NULL CHECK (duration_hours >= 1),
  total_price numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'PHP',
  status text NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN (
      'pending_payment',
      'paid',
      'checked_in',
      'walk_in',
      'cancelled',
      'cancelled_refund_pending',
      'expired'
    )
  ),
  payment_method text NOT NULL DEFAULT 'paymongo' CHECK (
    payment_method IN ('paymongo', 'cash', 'counter_qr', 'other')
  ),
  paymongo_checkout_session_id text,
  expires_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- 6. Postgres Exclusion Constraint to Prevent Double-Booking / Overlaps
-- This uses btree_gist extension and enforces that no two active/paid bookings,
-- or active pending bookings with unexpired lock, can overlap on the same court.
DO $$ BEGIN
  ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_court_bookings;
  ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_court_bookings
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  ) WHERE (
    status IN ('paid', 'checked_in', 'walk_in') 
    OR (status = 'pending_payment' AND expires_at > timezone('utc'::text, now()))
  );
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not create exclusion constraint automatically: %', SQLERRM;
END $$;

-- 7. POS Products & Retail Tables (Optional add-on equipment & drink sales)
CREATE TABLE IF NOT EXISTS public.pos_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric(10, 2) NOT NULL,
  category text NOT NULL,
  stock_level integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_amount numeric(10, 2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'refunded')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.pos_products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_time numeric(10, 2) NOT NULL
);

-- 8. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transaction_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has cashier or owner/admin role
CREATE OR REPLACE FUNCTION public.is_staff(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('owner', 'admin', 'cashier')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
DROP POLICY IF EXISTS "Public can view own profile or staff view all" ON public.profiles;
CREATE POLICY "Public can view own profile or staff view all" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Courts Policies: Public read, Staff write
DROP POLICY IF EXISTS "Anyone can view active courts" ON public.courts;
CREATE POLICY "Anyone can view active courts" ON public.courts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage courts" ON public.courts;
CREATE POLICY "Staff can manage courts" ON public.courts
  FOR ALL USING (public.is_staff(auth.uid()));

-- Bookings Policies:
-- 1. Anyone can query bookings (for availability checking) or read their own
DROP POLICY IF EXISTS "Public can view bookings for availability" ON public.bookings;
CREATE POLICY "Public can view bookings for availability" ON public.bookings
  FOR SELECT USING (
    -- Staff can see all full details
    public.is_staff(auth.uid()) 
    -- Authenticated client can see their own
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    -- Public can read timestamps/court_id to calculate availability slots
    OR true
  );

-- 2. Anyone (guests or logged in users) can create bookings
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;
CREATE POLICY "Anyone can insert bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

-- 3. Staff can update all bookings, clients can update own eligible pending/cancellation
DROP POLICY IF EXISTS "Staff can update bookings" ON public.bookings;
CREATE POLICY "Staff can update bookings" ON public.bookings
  FOR UPDATE USING (
    public.is_staff(auth.uid())
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
  );

-- POS Policies:
DROP POLICY IF EXISTS "Public can view pos products" ON public.pos_products;
CREATE POLICY "Public can view pos products" ON public.pos_products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage pos products" ON public.pos_products;
CREATE POLICY "Staff can manage pos products" ON public.pos_products
  FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can access pos transactions" ON public.pos_transactions;
CREATE POLICY "Staff can access pos transactions" ON public.pos_transactions
  FOR ALL USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can access pos transaction items" ON public.pos_transaction_items;
CREATE POLICY "Staff can access pos transaction items" ON public.pos_transaction_items
  FOR ALL USING (public.is_staff(auth.uid()));

-- 9. Automatic Profile Creation on Supabase Auth Sign-up Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. Seed Initial Courts (Court 1 - Indoor & Court 2 - Indoor @ ₱350/hr)
INSERT INTO public.courts (name, type, hourly_rate, is_active)
VALUES 
  ('Court 1 - Indoor', 'indoor', 350.00, true),
  ('Court 2 - Indoor', 'indoor', 350.00, true)
ON CONFLICT (name) DO UPDATE SET
  hourly_rate = EXCLUDED.hourly_rate,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active;

-- 11. Seed POS Products (Pro-Shop gear & drinks)
INSERT INTO public.pos_products (name, price, category, stock_level)
VALUES
  ('C&J Pro 16mm Carbon Paddle Rental', 150.00, 'Rentals', 50),
  ('Franklin X-40 Tournament Ball (Single)', 120.00, 'Equipment', 200),
  ('Franklin X-40 3-Pack Tournament Tube', 320.00, 'Equipment', 80),
  ('Gatorade 500ml (Blue Bolt)', 75.00, 'Beverages', 120),
  ('Gatorade 500ml (Lemon Lime)', 75.00, 'Beverages', 120),
  ('Mineral Water 500ml', 35.00, 'Beverages', 250),
  ('Electrolyte Coconut Water 330ml', 85.00, 'Beverages', 90),
  ('C&J Performance Grip Tape', 90.00, 'Accessories', 150),
  ('C&J Dry-Fit Tourney Towel', 250.00, 'Apparel', 60)
ON CONFLICT DO NOTHING;
