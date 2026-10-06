-- =============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Creates core relational tables and indexes for POS Billing System
-- Target Database: PostgreSQL (pos_billing_db)
-- =============================================================================

-- 1. Stores Table
CREATE TABLE IF NOT EXISTS stores (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  long_name VARCHAR(255),
  address TEXT NOT NULL,
  mobile_number VARCHAR(32) NOT NULL,
  phone_number VARCHAR(32),
  email VARCHAR(255) NOT NULL,
  food_license_number VARCHAR(64),
  gst_number VARCHAR(32),
  country VARCHAR(64) DEFAULT 'India',
  state VARCHAR(64) NOT NULL,
  invoice_prefix VARCHAR(16) DEFAULT 'INV',
  receipt_footer_text TEXT,
  paper_size VARCHAR(16) DEFAULT '80mm',
  enable_whatsapp_receipt BOOLEAN DEFAULT true,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_id VARCHAR(64),
  updated_id VARCHAR(64)
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tax Rates Table
CREATE TABLE IF NOT EXISTS tax_rates (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  igst NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  cgst NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  sgst NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  product_number VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  cost NUMERIC(12, 2) NOT NULL,
  ingredients TEXT,
  notes TEXT,
  is_exp_date BOOLEAN DEFAULT false,
  days INT,
  category_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
  tax_rate_id VARCHAR(64) REFERENCES tax_rates(id) ON DELETE SET NULL,
  tax_percent NUMERIC(5, 2) DEFAULT 5.0,
  stock_quantity INT DEFAULT 0,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_id VARCHAR(64),
  updated_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(product_number);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(32) NOT NULL,
  gst_number VARCHAR(32),
  state VARCHAR(64) DEFAULT 'Maharashtra',
  country VARCHAR(64) DEFAULT 'India',
  total_visits INT DEFAULT 1,
  total_spend NUMERIC(12, 2) DEFAULT 0.0,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);

-- 6. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id VARCHAR(64) PRIMARY KEY,
  vendor_code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(128),
  pin VARCHAR(16),
  email VARCHAR(255),
  mobile_number VARCHAR(32),
  note TEXT,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(64) PRIMARY KEY,
  document_number VARCHAR(64) UNIQUE NOT NULL,
  vendor_id VARCHAR(64) REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name VARCHAR(255) NOT NULL,
  store_id VARCHAR(64) REFERENCES stores(id) ON DELETE SET NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(64) DEFAULT 'Sent',
  total_amount NUMERIC(12, 2) DEFAULT 0.0,
  items JSONB DEFAULT '[]'::jsonb,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Material Inward Table
CREATE TABLE IF NOT EXISTS material_inward (
  id VARCHAR(64) PRIMARY KEY,
  purchase_order_id VARCHAR(64),
  vendor_id VARCHAR(64) REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name VARCHAR(255) NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  is_po_available BOOLEAN DEFAULT true,
  items JSONB DEFAULT '[]'::jsonb,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Return Reasons Table
CREATE TABLE IF NOT EXISTS return_reasons (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- 10. Material Returns Table
CREATE TABLE IF NOT EXISTS material_returns (
  id VARCHAR(64) PRIMARY KEY,
  document_number VARCHAR(64) UNIQUE NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  vendor_id VARCHAR(64) REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name VARCHAR(255) NOT NULL,
  store_id VARCHAR(64) REFERENCES stores(id) ON DELETE SET NULL,
  material_return_id VARCHAR(64) REFERENCES return_reasons(id) ON DELETE SET NULL,
  return_reason VARCHAR(255),
  total_return_amount NUMERIC(12, 2) DEFAULT 0.0,
  status VARCHAR(64) DEFAULT 'Credit Note Pending',
  items JSONB DEFAULT '[]'::jsonb,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Staged Buckets (Held Carts) Table
CREATE TABLE IF NOT EXISTS staged_buckets (
  id VARCHAR(64) PRIMARY KEY,
  bucket_number VARCHAR(64) NOT NULL,
  customer_name VARCHAR(255),
  items_count INT DEFAULT 0,
  total NUMERIC(12, 2) DEFAULT 0.0,
  cart_data JSONB NOT NULL,
  timestamp VARCHAR(32),
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  document_number VARCHAR(64) UNIQUE NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  customer_id VARCHAR(64),
  customer_name VARCHAR(255),
  mobile_number VARCHAR(32),
  store_id VARCHAR(64),
  store_name VARCHAR(255),
  subtotal NUMERIC(12, 2) NOT NULL,
  cgst NUMERIC(12, 2) DEFAULT 0.0,
  sgst NUMERIC(12, 2) DEFAULT 0.0,
  igst NUMERIC(12, 2) DEFAULT 0.0,
  round_off NUMERIC(8, 2) DEFAULT 0.0,
  amount NUMERIC(12, 2) NOT NULL,
  mode_of_payment INT DEFAULT 0, -- 0 = Cash, 1 = UPI
  is_payment_received BOOLEAN DEFAULT true,
  is_share_receipt_through_sms BOOLEAN DEFAULT false,
  cancellation_reason TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_id VARCHAR(64),
  updated_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_docnum ON invoices(document_number);

-- 13. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(64) NOT NULL,
  store VARCHAR(255),
  status VARCHAR(32) DEFAULT 'Active',
  last_login VARCHAR(64),
  record_status INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Permissions Matrix Table
CREATE TABLE IF NOT EXISTS permissions_matrix (
  id SERIAL PRIMARY KEY,
  module VARCHAR(128) NOT NULL,
  admin_perm JSONB NOT NULL,
  cashier_perm JSONB NOT NULL,
  inventory_perm JSONB NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_matrix_module ON permissions_matrix(module);
