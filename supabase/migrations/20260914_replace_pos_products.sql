-- ============================================================================
-- Migration: 20260914_replace_pos_products.sql
-- Replace all POS products with the authentic Bar & Kitchen inventory items
-- ============================================================================

-- 1. Ensure foreign keys allow safe deletion of old products without breaking order history
ALTER TABLE public.equipment_rentals 
  DROP CONSTRAINT IF EXISTS equipment_rentals_product_id_fkey,
  ADD CONSTRAINT equipment_rentals_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.pos_products(id) ON DELETE SET NULL;

ALTER TABLE public.pos_transaction_items 
  DROP CONSTRAINT IF EXISTS pos_transaction_items_product_id_fkey,
  ADD CONSTRAINT pos_transaction_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.pos_products(id) ON DELETE SET NULL;

-- 2. Ensure SKU column exists in pos_products
ALTER TABLE public.pos_products ADD COLUMN IF NOT EXISTS sku text;

-- 3. Clear existing pos_products and pos_categories
DELETE FROM public.pos_products;
DELETE FROM public.pos_categories;

-- 4. Seed pos_categories
INSERT INTO public.pos_categories (name, slug, description, display_order, is_active) VALUES
('Coffee', 'coffee', 'Handcrafted espresso and caffeinated specialty drinks', 1, true),
('Decaf Coffee', 'decaf-coffee', 'Decaffeinated espresso and specialty lattes', 2, true),
('Non-Coffee & Tea', 'non-coffee-tea', 'Hot & iced chocolate, teas, and refreshers', 3, true),
('Fruit Shakes', 'fruit-shakes', 'Fresh fruit blended shakes', 4, true),
('Beverages & Hydration', 'beverages-hydration', 'Bottled water, sodas, Pocari Sweat, and Gatorade', 5, true),
('Silog Meals', 'silog-meals', 'All-day breakfast meals served with garlic rice & egg', 6, true),
('Snacks & Dimsum', 'snacks-dimsum', 'Nachos, fries, toge, siomai varieties, and siopao', 7, true),
('Noodles & Pasta', 'noodles-pasta', 'Pancit Canton varieties, spaghetti, and pizza', 8, true),
('Rice & Add-ons', 'rice-addons', 'Extra rice and sunny side up egg', 9, true),
('Bar Supplies', 'bar-supplies', 'Bar syrups, dairy, and weekly bar consumables', 10, true),
('Kitchen Supplies', 'kitchen-supplies', 'Kitchen seasoning powders, produce, and dairy', 11, true);

-- 5. Insert new Bar & Kitchen Products linked to categories
WITH cats AS (
  SELECT id, name FROM public.pos_categories
)
INSERT INTO public.pos_products (sku, name, category, category_id, price, stock_level, is_active)
SELECT 
  v.sku,
  v.name,
  v.category,
  c.id as category_id,
  v.price,
  v.stock_level,
  v.is_active
FROM (VALUES
  -- --------------------------------------------------------------------------
  -- BAR (DAILY): Coffee (00-01 to 00-11)
  -- --------------------------------------------------------------------------
  ('00-01', 'Long Black', 'Coffee', 110.00, 50, true),
  ('00-02', 'Capuccino', 'Coffee', 130.00, 50, true),
  ('00-03', 'Flat White', 'Coffee', 135.00, 50, true),
  ('00-04', 'Spanish Latte', 'Coffee', 145.00, 50, true),
  ('00-05', 'Seasalt Latte', 'Coffee', 150.00, 50, true),
  ('00-06', 'French Vanilla', 'Coffee', 145.00, 50, true),
  ('00-07', 'Caramel Macchiato', 'Coffee', 150.00, 50, true),
  ('00-08', 'Salted Caramel', 'Coffee', 145.00, 50, true),
  ('00-09', 'Brown Sugar Latte', 'Coffee', 145.00, 50, true),
  ('00-10', 'Mocha Latte', 'Coffee', 150.00, 50, true),
  ('00-11', 'Choco Hazelnut', 'Coffee', 150.00, 50, true),

  -- --------------------------------------------------------------------------
  -- BAR (DAILY): Decaf Coffee (00-12 to 00-22)
  -- --------------------------------------------------------------------------
  ('00-12', 'Americano Decaf', 'Decaf Coffee', 120.00, 40, true),
  ('00-13', 'Flat White Decaf', 'Decaf Coffee', 145.00, 40, true),
  ('00-14', 'Capuccino Decaf', 'Decaf Coffee', 140.00, 40, true),
  ('00-15', 'Spanish Latte Decaf', 'Decaf Coffee', 155.00, 40, true),
  ('00-16', 'French Vanilla Decaf', 'Decaf Coffee', 155.00, 40, true),
  ('00-17', 'Caramel Macchiato Decaf', 'Decaf Coffee', 160.00, 40, true),
  ('00-18', 'Salted Caramel Decaf', 'Decaf Coffee', 155.00, 40, true),
  ('00-19', 'Brown Sugar Latte Decaf', 'Decaf Coffee', 155.00, 40, true),
  ('00-20', 'Seasalt Butterscotch Decaf', 'Decaf Coffee', 165.00, 40, true),
  ('00-21', 'Mocha Latte Decaf', 'Decaf Coffee', 160.00, 40, true),
  ('00-22', 'Choco Hazelnut Decaf', 'Decaf Coffee', 160.00, 40, true),

  -- --------------------------------------------------------------------------
  -- BAR (DAILY): Non-Coffee & Tea (00-23 to 00-28)
  -- --------------------------------------------------------------------------
  ('00-23', 'Milk Choco', 'Non-Coffee & Tea', 120.00, 40, true),
  ('00-24', 'Hot Choco', 'Non-Coffee & Tea', 120.00, 40, true),
  ('00-25', 'Iced Tea', 'Non-Coffee & Tea', 65.00, 80, true),
  ('00-26', 'Lychee Aloe', 'Non-Coffee & Tea', 110.00, 40, true),
  ('00-27', 'Lychee Lemon', 'Non-Coffee & Tea', 110.00, 40, true),
  ('00-28', 'Strawberry Sparkle', 'Non-Coffee & Tea', 115.00, 40, true),

  -- --------------------------------------------------------------------------
  -- BAR (DAILY): Fruit Shakes (00-29 to 00-31)
  -- --------------------------------------------------------------------------
  ('00-29', 'Banana Shake', 'Fruit Shakes', 120.00, 30, true),
  ('00-30', 'Mango Shake', 'Fruit Shakes', 130.00, 30, true),
  ('00-31', 'Strawberry Shake', 'Fruit Shakes', 130.00, 30, true),

  -- --------------------------------------------------------------------------
  -- BAR (DAILY): Beverages & Hydration (00-32 to 00-40)
  -- --------------------------------------------------------------------------
  ('00-32', 'Water', 'Beverages & Hydration', 30.00, 150, true),
  ('00-33', 'Coke', 'Beverages & Hydration', 55.00, 60, true),
  ('00-34', 'Royal', 'Beverages & Hydration', 55.00, 60, true),
  ('00-35', 'Sprite', 'Beverages & Hydration', 55.00, 60, true),
  ('00-36', 'Coke Zero', 'Beverages & Hydration', 55.00, 60, true),
  ('00-37', 'Gatorade Blue', 'Beverages & Hydration', 75.00, 50, true),
  ('00-38', 'Gatorade Violet', 'Beverages & Hydration', 75.00, 50, true),
  ('00-39', 'Gatorade Red', 'Beverages & Hydration', 75.00, 50, true),
  ('00-40', 'Pocari', 'Beverages & Hydration', 70.00, 60, true),

  -- --------------------------------------------------------------------------
  -- KITCHEN (DAILY): Silog Meals (00-1 to 00-11)
  -- --------------------------------------------------------------------------
  ('K00-01', 'Baconsilog', 'Silog Meals', 140.00, 30, true),
  ('K00-02', 'Bangsilog', 'Silog Meals', 155.00, 30, true),
  ('K00-03', 'Chickensilog', 'Silog Meals', 150.00, 30, true),
  ('K00-04', 'Cornsilog', 'Silog Meals', 130.00, 30, true),
  ('K00-05', 'Hotsilog', 'Silog Meals', 120.00, 30, true),
  ('K00-06', 'Liemposilog', 'Silog Meals', 165.00, 30, true),
  ('K00-07', 'Garlic Longsilog', 'Silog Meals', 140.00, 30, true),
  ('K00-08', 'Sweet Longsilog', 'Silog Meals', 140.00, 30, true),
  ('K00-09', 'Tapsilog', 'Silog Meals', 160.00, 35, true),
  ('K00-10', 'Tocilog', 'Silog Meals', 145.00, 30, true),
  ('K00-11', 'Spamsilog', 'Silog Meals', 145.00, 30, true),

  -- --------------------------------------------------------------------------
  -- KITCHEN (DAILY): Snacks & Dimsum (00-12 to 00-14, 00-23 to 00-27)
  -- --------------------------------------------------------------------------
  ('K00-12', 'Beef Nachos', 'Snacks & Dimsum', 150.00, 25, true),
  ('K00-13', 'Toge', 'Snacks & Dimsum', 65.00, 30, true),
  ('K00-14', 'Fries', 'Snacks & Dimsum', 90.00, 40, true),
  ('K00-23', 'Siomai Pork', 'Snacks & Dimsum', 70.00, 40, true),
  ('K00-24', 'Siomai Chicken', 'Snacks & Dimsum', 70.00, 40, true),
  ('K00-25', 'Siomai Beef', 'Snacks & Dimsum', 75.00, 40, true),
  ('K00-26', 'Siomai Japanese', 'Snacks & Dimsum', 85.00, 40, true),
  ('K00-27', 'Siopao', 'Snacks & Dimsum', 70.00, 30, true),

  -- --------------------------------------------------------------------------
  -- KITCHEN (DAILY): Noodles & Pasta (00-15 to 00-19, 00-28 to 00-30)
  -- --------------------------------------------------------------------------
  ('K00-15', 'Pancit Canton Sweet & Spicy', 'Noodles & Pasta', 50.00, 50, true),
  ('K00-16', 'Pancit Canton Chilimansi', 'Noodles & Pasta', 50.00, 50, true),
  ('K00-17', 'Pancit Canton Calamansi', 'Noodles & Pasta', 50.00, 50, true),
  ('K00-18', 'Pancit Canton Hot & Spicy', 'Noodles & Pasta', 50.00, 50, true),
  ('K00-19', 'Pancit Canton Original', 'Noodles & Pasta', 50.00, 50, true),
  ('K00-28', 'Spaghetti Longganisa', 'Noodles & Pasta', 140.00, 25, true),
  ('K00-29', 'Spaghetti Meatballs', 'Noodles & Pasta', 150.00, 25, true),
  ('K00-30', 'Pizza', 'Noodles & Pasta', 240.00, 20, true),

  -- --------------------------------------------------------------------------
  -- KITCHEN (DAILY): Rice & Add-ons (00-20 to 00-22)
  -- --------------------------------------------------------------------------
  ('K00-20', 'Egg', 'Rice & Add-ons', 20.00, 100, true),
  ('K00-21', 'White Rice', 'Rice & Add-ons', 25.00, 100, true),
  ('K00-22', 'Garlic Rice', 'Rice & Add-ons', 30.00, 100, true),

  -- --------------------------------------------------------------------------
  -- KITCHEN (WEEKLY): Supplies & Ingredients (KW-30 to KW-36)
  -- --------------------------------------------------------------------------
  ('KW-30', 'Cheese Powder', 'Kitchen Supplies', 0.00, 10, true),
  ('KW-31', 'BBQ Powder', 'Kitchen Supplies', 0.00, 10, true),
  ('KW-32', 'Sour Cream Powder', 'Kitchen Supplies', 0.00, 10, true),
  ('KW-33', 'Cucumber', 'Kitchen Supplies', 0.00, 15, true),
  ('KW-34', 'Tomato', 'Kitchen Supplies', 0.00, 15, true),
  ('KW-35', 'Eden Cheese', 'Kitchen Supplies', 0.00, 12, true),
  ('KW-36', 'Evap', 'Kitchen Supplies', 0.00, 20, true),

  -- --------------------------------------------------------------------------
  -- BAR (WEEKLY): Supplies & Ingredients (BW-41 to BW-50)
  -- --------------------------------------------------------------------------
  ('BW-41', 'Vivo', 'Bar Supplies', 0.00, 10, true),
  ('BW-42', 'Fresh Milk', 'Bar Supplies', 0.00, 24, true),
  ('BW-43', 'Oatside', 'Bar Supplies', 0.00, 18, true),
  ('BW-44', 'Vanilla Syrup', 'Bar Supplies', 0.00, 6, true),
  ('BW-45', 'Hazelnut Syrup', 'Bar Supplies', 0.00, 6, true),
  ('BW-46', 'French Vanilla Syrup', 'Bar Supplies', 0.00, 6, true),
  ('BW-47', 'Caramel Syrup', 'Bar Supplies', 0.00, 6, true),
  ('BW-48', 'Chocolate Syrup', 'Bar Supplies', 0.00, 6, true),
  ('BW-49', 'Lychee', 'Bar Supplies', 0.00, 10, true),
  ('BW-50', 'Condensed', 'Bar Supplies', 0.00, 24, true)
) AS v(sku, name, category, price, stock_level, is_active)
JOIN cats c ON c.name = v.category;
