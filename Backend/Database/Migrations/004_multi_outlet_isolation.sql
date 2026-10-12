-- =============================================================================
-- Migration: 004_multi_outlet_isolation.sql
-- Description: Establishes full multi-outlet isolation across products, inventory,
--              staged cart buckets, invoices, material inwards, and purchase orders.
-- Target Database: PostgreSQL (pos_billing_db)
-- =============================================================================

-- 1. Update Stores Table with Outlet Prefixes
ALTER TABLE stores ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(16) DEFAULT 'INV';

INSERT INTO stores (id, name, long_name, address, mobile_number, phone_number, email, food_license_number, gst_number, state, invoice_prefix)
VALUES 
('store_mum_01', 'DailyMart Express (Mumbai)', 'DailyMart Retail Private Limited', 'Plot 12, Commercial Hub, MG Road, Mumbai', '+91 98765 43210', '022-28765432', 'mumbai01@dailymart.in', '11522001000123', '27AABCU9603R1ZM', 'Maharashtra', 'MUM'),
('store_pune_02', 'DailyMart Supercenter (Pune)', 'DailyMart Retail Pune Pvt Ltd', 'Shop 4-8, Phoenix Mall, Viman Nagar, Pune', '+91 98230 11223', '020-66778899', 'pune.viman@dailymart.in', '11522001000456', '27AABCU9603R1ZM', 'Maharashtra', 'PUN'),
('store_blr_03', 'DailyMart Hypermarket (Bengaluru)', 'DailyMart South India Retail Ltd', 'Tower B, Outer Ring Road, Bellandur, Bengaluru', '+91 98450 33445', '080-44556677', 'blr.bellandur@dailymart.in', '11522001000789', '29AABCU9603R1ZL', 'Karnataka', 'BLR')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  invoice_prefix = EXCLUDED.invoice_prefix,
  state = EXCLUDED.state;

-- 2. Products Table: Add Store Columns & Compound Unique Index
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id VARCHAR(64) DEFAULT 'store_mum_01';
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) DEFAULT 'DailyMart Express (Mumbai)';

UPDATE products SET store_id = 'store_mum_01', store_name = 'DailyMart Express (Mumbai)' 
WHERE store_id IS NULL OR store_id = '';

-- Drop legacy global unique constraint on barcode alone
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_product_number_key;
DROP INDEX IF EXISTS idx_products_barcode;

-- Create Compound Unique Index: product_number is unique per store outlet
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_store ON products (product_number, store_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON products (store_id);

-- 3. Material Inward Table: Store Scoping
ALTER TABLE material_inward ADD COLUMN IF NOT EXISTS store_id VARCHAR(64) DEFAULT 'store_mum_01';
ALTER TABLE material_inward ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) DEFAULT 'DailyMart Express (Mumbai)';

UPDATE material_inward SET store_id = 'store_mum_01', store_name = 'DailyMart Express (Mumbai)' 
WHERE store_id IS NULL OR store_id = '';

CREATE INDEX IF NOT EXISTS idx_material_inward_store ON material_inward (store_id);

-- 4. Staged Buckets (Held Carts): Store Scoping
ALTER TABLE staged_buckets ADD COLUMN IF NOT EXISTS store_id VARCHAR(64) DEFAULT 'store_mum_01';
ALTER TABLE staged_buckets ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) DEFAULT 'DailyMart Express (Mumbai)';

UPDATE staged_buckets SET store_id = 'store_mum_01', store_name = 'DailyMart Express (Mumbai)' 
WHERE store_id IS NULL OR store_id = '';

CREATE INDEX IF NOT EXISTS idx_staged_buckets_store ON staged_buckets (store_id);

-- 5. Invoices Table: Store Scoping
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS store_id VARCHAR(64) DEFAULT 'store_mum_01';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) DEFAULT 'DailyMart Express (Mumbai)';

UPDATE invoices SET store_id = 'store_mum_01', store_name = 'DailyMart Express (Mumbai)' 
WHERE store_id IS NULL OR store_id = '';

CREATE INDEX IF NOT EXISTS idx_invoices_store ON invoices (store_id);

-- 6. Purchase Orders & Material Returns Indexes
UPDATE purchase_orders SET store_id = 'store_mum_01' WHERE store_id IS NULL OR store_id = '';
UPDATE material_returns SET store_id = 'store_mum_01' WHERE store_id IS NULL OR store_id = '';

CREATE INDEX IF NOT EXISTS idx_purchase_orders_store ON purchase_orders (store_id);
CREATE INDEX IF NOT EXISTS idx_material_returns_store ON material_returns (store_id);

-- 7. Seed Initial Catalog Clones for Pune Outlet (store_pune_02)
INSERT INTO products (id, product_number, name, cost, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent, stock_quantity, unit, store_id, store_name, record_status)
SELECT 
  'prd_pune_' || SUBSTRING(id FROM 5),
  product_number,
  CASE 
    WHEN name LIKE '%(Pune)%' THEN name 
    ELSE name || ' (Pune)' 
  END,
  cost, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent,
  CASE 
    WHEN product_number = '200100101001' THEN 16.000
    WHEN product_number = '200100102002' THEN 12.000
    WHEN product_number = '200100103003' THEN 8.000
    WHEN product_number = '200100104004' THEN 40.000
    WHEN product_number = '200100106006' THEN 25.000
    WHEN product_number = '200100107007' THEN 15.000
    ELSE 10.000 
  END,
  unit,
  'store_pune_02',
  'DailyMart Supercenter (Pune)',
  0
FROM products p
WHERE p.store_id = 'store_mum_01'
  AND NOT EXISTS (
    SELECT 1 FROM products ep 
    WHERE ep.id = ('prd_pune_' || SUBSTRING(p.id FROM 5)) 
       OR (ep.product_number = p.product_number AND ep.store_id = 'store_pune_02')
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Initial Catalog Clones for Bengaluru Outlet (store_blr_03)
INSERT INTO products (id, product_number, name, cost, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent, stock_quantity, unit, store_id, store_name, record_status)
SELECT 
  'prd_blr_' || SUBSTRING(id FROM 5),
  product_number,
  CASE 
    WHEN name LIKE '%(Bengaluru)%' THEN name 
    ELSE name || ' (Bengaluru)' 
  END,
  cost, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent,
  CASE 
    WHEN product_number = '200100101001' THEN 20.000
    WHEN product_number = '200100102002' THEN 30.000
    WHEN product_number = '200100103003' THEN 15.000
    WHEN product_number = '200100104004' THEN 50.000
    WHEN product_number = '200100106006' THEN 35.000
    WHEN product_number = '200100107007' THEN 25.000
    ELSE 10.000 
  END,
  unit,
  'store_blr_03',
  'DailyMart Hypermarket (Bengaluru)',
  0
FROM products p
WHERE p.store_id = 'store_mum_01'
  AND NOT EXISTS (
    SELECT 1 FROM products ep 
    WHERE ep.id = ('prd_blr_' || SUBSTRING(p.id FROM 5)) 
       OR (ep.product_number = p.product_number AND ep.store_id = 'store_blr_03')
  )
ON CONFLICT (id) DO NOTHING;
