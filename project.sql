-- =========================================================
-- C&J COURT - POSTGRESQL DATABASE SCHEMA
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('owner', 'admin', 'cashier', 'client', 'coordinator')),
  full_name text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Courts Table
CREATE TABLE IF NOT EXISTS public.courts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'indoor' CHECK (type IN ('indoor', 'outdoor')),
  hourly_rate numeric(10, 2) NOT NULL DEFAULT 300.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bookings Table
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
  refund_wallet_type text,
  refund_account_name text,
  refund_account_number text,
  refund_reason text,
  refund_status text DEFAULT 'none',
  refund_reference text,
  refund_processed_at timestamp with time zone,
  refund_processed_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_booking_time CHECK (end_time > start_time)
);

-- Overlapping bookings exclusion constraint
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS no_overlapping_court_bookings;
ALTER TABLE public.bookings ADD CONSTRAINT no_overlapping_court_bookings
EXCLUDE USING gist (
  court_id WITH =,
  tstzrange(start_time, end_time) WITH &&
) WHERE (
  status IN ('paid', 'checked_in', 'walk_in') 
  OR (status = 'pending_payment' AND expires_at > timezone('utc'::text, now()))
);

-- POS Products Table
CREATE TABLE IF NOT EXISTS public.pos_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric(10, 2) NOT NULL,
  category text NOT NULL,
  stock_level integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- POS Transactions Table
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_amount numeric(10, 2) NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided', 'refunded')),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- POS Transaction Items Table
CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.pos_products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_at_time numeric(10, 2) NOT NULL
);