-- Migration: Daily Expenses and Inventory Cost Pricing
-- Description: Adds cost_price and reorder_threshold to pos_products and creates daily_expenses table with RLS.

-- 1. Add cost_price and reorder_threshold to pos_products
ALTER TABLE public.pos_products 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC NOT NULL DEFAULT 0 CHECK (cost_price >= 0);

ALTER TABLE public.pos_products 
ADD COLUMN IF NOT EXISTS reorder_threshold INTEGER NOT NULL DEFAULT 10 CHECK (reorder_threshold >= 0);

-- Initialize reasonable cost prices for products where cost_price is 0 (approx 50% of selling price)
UPDATE public.pos_products
SET cost_price = ROUND(price * 0.5, 2)
WHERE cost_price = 0 AND price > 0;

-- 2. Create daily_expenses table
CREATE TABLE IF NOT EXISTS public.daily_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  receipt_reference TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast date querying
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON public.daily_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_category ON public.daily_expenses(category);

-- 3. Enable RLS on daily_expenses
ALTER TABLE public.daily_expenses ENABLE ROW LEVEL SECURITY;

-- Allow all staff (owner, admin, cashier) to read daily expenses
DROP POLICY IF EXISTS "Staff can read daily_expenses" ON public.daily_expenses;
CREATE POLICY "Staff can read daily_expenses"
ON public.daily_expenses
FOR SELECT
TO public
USING (is_staff(auth.uid()));

-- Allow all staff to record expenses
DROP POLICY IF EXISTS "Staff can insert daily_expenses" ON public.daily_expenses;
CREATE POLICY "Staff can insert daily_expenses"
ON public.daily_expenses
FOR INSERT
TO public
WITH CHECK (is_staff(auth.uid()));

-- Allow admin/owner to update expenses
DROP POLICY IF EXISTS "Admin can update daily_expenses" ON public.daily_expenses;
CREATE POLICY "Admin can update daily_expenses"
ON public.daily_expenses
FOR UPDATE
TO public
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Allow admin/owner to delete expenses
DROP POLICY IF EXISTS "Admin can delete daily_expenses" ON public.daily_expenses;
CREATE POLICY "Admin can delete daily_expenses"
ON public.daily_expenses
FOR DELETE
TO public
USING (is_admin(auth.uid()));
