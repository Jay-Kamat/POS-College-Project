-- =============================================================================
-- Migration: 003_add_measuring_units.sql
-- Description: Adds unit of measure (UoM) to products and ensures stock quantities
--              support fractional metric quantities (KG, LTR, etc.)
-- =============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(32) DEFAULT 'PCS';
ALTER TABLE products ALTER COLUMN stock_quantity TYPE NUMERIC(14, 3);

-- Update existing catalog items with appropriate unit codes
UPDATE products SET unit = 'PACK' WHERE LOWER(name) LIKE '%bread%' OR LOWER(name) LIKE '%pouch%' OR LOWER(name) LIKE '%chips%' OR LOWER(name) LIKE '%butter%';
UPDATE products SET unit = 'KG' WHERE LOWER(name) LIKE '%rice%' OR LOWER(name) LIKE '%potato%' OR LOWER(name) LIKE '%flour%' OR LOWER(name) LIKE '%sugar%' OR LOWER(name) LIKE '%mango%';
UPDATE products SET unit = 'LTR' WHERE LOWER(name) LIKE '%oil%' OR LOWER(name) LIKE '%loose milk%';
UPDATE products SET unit = 'BOX' WHERE LOWER(name) LIKE '%tea bags%' OR LOWER(name) LIKE '%box%';
