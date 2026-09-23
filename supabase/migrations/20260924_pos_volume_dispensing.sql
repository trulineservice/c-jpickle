-- Migration: 20260924_pos_volume_dispensing.sql
-- Enables fractional container tracking and records exact volume dispensed per POS line item

-- 1. Alter pos_products.stock_level to NUMERIC to support precise fractional units
ALTER TABLE public.pos_products 
  ALTER COLUMN stock_level TYPE NUMERIC USING stock_level::NUMERIC;

-- 2. Add dispensed_volume and volume_unit to pos_transaction_items
ALTER TABLE public.pos_transaction_items 
  ADD COLUMN IF NOT EXISTS dispensed_volume NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS volume_unit TEXT DEFAULT 'pcs';
