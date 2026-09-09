-- ============================================================================
-- C&J PICKLEBALL ARENA - PHASE 1 COMPLIANCE & BALL THROWER MIGRATION
-- ============================================================================

-- 1. Add BIR EOPT Compliance Columns to pos_transactions
ALTER TABLE public.pos_transactions 
  ADD COLUMN IF NOT EXISTS invoice_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_tin text,
  ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS discount_id_number text,
  ADD COLUMN IF NOT EXISTS gross_amount numeric(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS vatable_sales numeric(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS vat_amount numeric(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS vat_exempt_sales numeric(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS zero_rated_sales numeric(10, 2) DEFAULT 0.00;

-- 2. Create Sequence and Function for Sequential Sales Invoice (SI) Numbering
CREATE SEQUENCE IF NOT EXISTS public.pos_invoice_seq START WITH 1001;

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
$$ LANGUAGE plpgsql;

-- Backfill existing pos_transactions with invoice numbers and base tax breakdown if missing
UPDATE public.pos_transactions
SET 
  invoice_number = 'SI-' || to_char(created_at, 'YYYYMMDD') || '-' || lpad(existing.row_number::text, 5, '0'),
  gross_amount = COALESCE(total_amount, 0),
  vatable_sales = ROUND(COALESCE(total_amount, 0) / 1.12, 2),
  vat_amount = ROUND(COALESCE(total_amount, 0) - (COALESCE(total_amount, 0) / 1.12), 2)
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS row_number
  FROM public.pos_transactions
  WHERE invoice_number IS NULL
) existing
WHERE public.pos_transactions.id = existing.id
  AND public.pos_transactions.invoice_number IS NULL;

-- 3. Seed / Ensure Smart Ball Thrower Machine Rental is in pos_products
INSERT INTO public.pos_products (name, price, category, stock_level, is_active)
VALUES 
  ('Smart Ball Thrower Machine Rental (1 Hr)', 150.00, 'Rentals', 5, true)
ON CONFLICT (name) DO UPDATE 
SET 
  price = 150.00,
  category = 'Rentals',
  is_active = true;
