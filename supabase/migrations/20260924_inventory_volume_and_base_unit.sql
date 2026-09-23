-- Migration: 20260924_inventory_volume_and_base_unit.sql
-- Add base_unit and volume to pos_products for bar and kitchen volume tracking

-- 1. Add base_unit and volume columns
ALTER TABLE public.pos_products 
ADD COLUMN IF NOT EXISTS base_unit TEXT NOT NULL DEFAULT 'pcs',
ADD COLUMN IF NOT EXISTS volume NUMERIC NOT NULL DEFAULT 0;

-- 2. Update Bar Supplies with volume measurements
UPDATE public.pos_products SET base_unit = 'mL', volume = 1000, reorder_threshold = 2000 WHERE sku = 'BW-41'; -- Vivo 1000 mL
UPDATE public.pos_products SET base_unit = 'mL', volume = 300, stock_level = 24, reorder_threshold = 1800 WHERE sku = 'BW-42';  -- Fresh Milk 300 mL (24 units = 7,200 mL)
UPDATE public.pos_products SET base_unit = 'mL', volume = 1000, reorder_threshold = 3000 WHERE sku = 'BW-43'; -- Oatside 1000 mL
UPDATE public.pos_products SET base_unit = 'mL', volume = 750, stock_level = 1, reorder_threshold = 750 WHERE sku = 'BW-44';   -- Vanilla Syrup 750 mL (1 unit = 750 mL)
UPDATE public.pos_products SET base_unit = 'mL', volume = 750, reorder_threshold = 750 WHERE sku = 'BW-45';  -- Hazelnut Syrup 750 mL
UPDATE public.pos_products SET base_unit = 'mL', volume = 750, reorder_threshold = 750 WHERE sku = 'BW-46';  -- French Vanilla Syrup 750 mL
UPDATE public.pos_products SET base_unit = 'mL', volume = 750, reorder_threshold = 750 WHERE sku = 'BW-47';  -- Caramel Syrup 750 mL
UPDATE public.pos_products SET base_unit = 'mL', volume = 750, reorder_threshold = 750 WHERE sku = 'BW-48';  -- Chocolate Syrup 750 mL
UPDATE public.pos_products SET base_unit = 'g', volume = 1000, reorder_threshold = 2000 WHERE sku = 'BW-49';  -- Lychee 1000 g
UPDATE public.pos_products SET base_unit = 'g', volume = 390, reorder_threshold = 1170 WHERE sku = 'BW-50';   -- Condensed 390 g

-- 3. Update Kitchen Supplies with volume and weight measurements
UPDATE public.pos_products SET base_unit = 'g', volume = 1000, reorder_threshold = 2000 WHERE sku = 'KW-30';  -- Cheese Powder 1000 g
UPDATE public.pos_products SET base_unit = 'g', volume = 1000, reorder_threshold = 2000 WHERE sku = 'KW-31';  -- BBQ Powder 1000 g
UPDATE public.pos_products SET base_unit = 'g', volume = 1000, reorder_threshold = 2000 WHERE sku = 'KW-32';  -- Sour Cream Powder 1000 g
UPDATE public.pos_products SET base_unit = 'pcs', volume = 1, reorder_threshold = 5 WHERE sku = 'KW-33';       -- Cucumber 1 pc
UPDATE public.pos_products SET base_unit = 'pcs', volume = 1, reorder_threshold = 5 WHERE sku = 'KW-34';       -- Tomato 1 pc
UPDATE public.pos_products SET base_unit = 'g', volume = 160, reorder_threshold = 480 WHERE sku = 'KW-35';    -- Eden Cheese 160 g
UPDATE public.pos_products SET base_unit = 'mL', volume = 370, reorder_threshold = 1110 WHERE sku = 'KW-36';  -- Evap 370 mL
