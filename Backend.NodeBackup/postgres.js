import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, Client } = pg;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'pos_billing_db'
};

// 1. Ensure the PostgreSQL database exists
export async function ensureDatabaseExists() {
  const adminClient = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbConfig.database]
    );

    if (res.rowCount === 0) {
      console.log(`[PostgreSQL] Database "${dbConfig.database}" does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${dbConfig.database}"`);
      console.log(`[PostgreSQL] Database "${dbConfig.database}" created successfully.`);
    } else {
      console.log(`[PostgreSQL] Database "${dbConfig.database}" is ready.`);
    }
  } catch (err) {
    console.error('[PostgreSQL] Error checking/creating database:', err.message);
  } finally {
    await adminClient.end();
  }
}

// 2. Main Connection Pool
export const pool = new Pool(dbConfig);

// Helper for queries
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('[SQL]', { text: text.slice(0, 80), duration: `${duration}ms`, rows: res.rowCount });
  return res;
}

// 3. Initialize all schema tables and seed data
export async function initializeSchema() {
  await ensureDatabaseExists();

  const schemaSql = `
    -- Stores Table
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

    -- Categories Table
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      record_status INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Tax Rates Table
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

    -- Products Table
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

    -- Customers Table
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

    -- Vendors Table
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

    -- Purchase Orders Table
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

    -- Material Inward Table
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

    -- Return Reasons Table
    CREATE TABLE IF NOT EXISTS return_reasons (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    );

    -- Material Returns Table
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

    -- Staged Buckets (Held Carts) Table
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

    -- Invoices Table
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

    -- Users Table
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

    -- Permissions Matrix Table
    CREATE TABLE IF NOT EXISTS permissions_matrix (
      id SERIAL PRIMARY KEY,
      module VARCHAR(128) NOT NULL,
      admin_perm JSONB NOT NULL,
      cashier_perm JSONB NOT NULL,
      inventory_perm JSONB NOT NULL
    );
  `;

  await pool.query(schemaSql);
  console.log('[PostgreSQL] Database tables initialized successfully.');

  // Seed initial data if tables are empty
  await seedInitialData();
}

// 4. Seed Data
async function seedInitialData() {
  const storeCount = await pool.query('SELECT COUNT(*) FROM stores');
  if (parseInt(storeCount.rows[0].count, 10) === 0) {
    console.log('[PostgreSQL] Seeding initial data into tables...');

    // Stores
    await pool.query(`
      INSERT INTO stores (id, name, long_name, address, mobile_number, phone_number, email, food_license_number, gst_number, state)
      VALUES ('store_mum_01', 'DailyMart Express', 'DailyMart Retail Private Limited', 'Plot 12, Commercial Hub, MG Road, Mumbai', '+91 98765 43210', '022-28765432', 'mumbai01@dailymart.in', '11522001000123', '27AABCU9603R1ZM', 'Maharashtra');
    `);

    // Categories
    await pool.query(`
      INSERT INTO categories (id, name) VALUES
      ('cat_all', 'All Items'),
      ('cat_dairy', 'Dairy'),
      ('cat_bakery', 'Bakery'),
      ('cat_bev', 'Beverages'),
      ('cat_staples', 'Staples'),
      ('cat_snacks', 'Snacks');
    `);

    // Tax Rates
    await pool.query(`
      INSERT INTO tax_rates (id, name, igst, cgst, sgst) VALUES
      ('tax_0', 'GST 0% (Exempt)', 0.0, 0.0, 0.0),
      ('tax_5', 'GST 5% Standard', 5.0, 2.5, 2.5),
      ('tax_12', 'GST 12% Standard', 12.0, 6.0, 6.0),
      ('tax_18', 'GST 18% Standard', 18.0, 9.0, 9.0),
      ('tax_28', 'GST 28% Luxury', 28.0, 14.0, 14.0);
    `);

    // Products
    await pool.query(`
      INSERT INTO products (id, product_number, name, cost, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent, stock_quantity) VALUES
      ('prd_01', '200100101001', 'Cow Milk 500ml', 30.00, 'Pasteurized Cow Milk', 'Keep refrigerated below 4°C', true, 3, 'cat_dairy', 'tax_5', 5, 45),
      ('prd_02', '200100102002', 'Whole Wheat Bread 400g', 40.00, 'Whole wheat flour, yeast, water', 'Fresh daily bake', true, 5, 'cat_bakery', 'tax_0', 0, 28),
      ('prd_03', '200100103003', 'Cold Coffee 200ml', 45.00, 'Milk, Arabica coffee beans, sugar', 'Ready to drink chilled', true, 30, 'cat_bev', 'tax_18', 18, 19),
      ('prd_04', '200100104004', 'Royal Basmati Rice 1kg', 110.00, 'Aged Long Grain Basmati', 'Grade A premium rice', false, NULL, 'cat_staples', 'tax_5', 5, 60),
      ('prd_05', '200100105005', 'Dark Chocolate Cake 500g', 350.00, 'Cocoa, dark chocolate, flour, sugar', 'Eggless celebration cake', true, 2, 'cat_bakery', 'tax_18', 18, 12),
      ('prd_06', '200100106006', 'Masala Potato Chips 100g', 20.00, 'Potatoes, edible oil, spices', 'Crispy fried snack', true, 60, 'cat_snacks', 'tax_12', 12, 50),
      ('prd_07', '200100107007', 'Fresh Butter 200g', 65.00, 'Cream, salt', 'Store refrigerated', true, 45, 'cat_dairy', 'tax_12', 12, 34),
      ('prd_08', '200100108008', 'Green Tea Bags 25s', 140.00, 'Natural green tea leaves', 'Antioxidant rich', true, 180, 'cat_bev', 'tax_5', 5, 22);
    `);

    // Customers
    await pool.query(`
      INSERT INTO customers (id, name, mobile_number, gst_number, state, country, total_visits, total_spend) VALUES
      ('cust_01', 'Jay Sharma', '9876543210', '', 'Maharashtra', 'India', 14, 4250.00),
      ('cust_02', 'Priya Patel', '9820011223', '27AABCZ1234P1ZR', 'Maharashtra', 'India', 6, 8900.00),
      ('cust_03', 'Rahul Verma', '9819988776', '', 'Gujarat', 'India', 2, 620.00);
    `);

    // Vendors
    await pool.query(`
      INSERT INTO vendors (id, vendor_code, name, address, city, pin, email, mobile_number, note) VALUES
      ('vnd_01', 'VND-101', 'Fresh Dairy Co-operative Ltd', 'Sector 4, MIDC Industrial Area', 'Pune', '411001', 'orders@freshdairy.com', '+91 98220 12345', 'Net 15 days payment terms'),
      ('vnd_02', 'VND-102', 'Golden Crust Bakers LLP', 'Plot 88, Andheri West', 'Mumbai', '400053', 'dispatch@goldencrust.in', '+91 98210 98765', 'Daily morning delivery by 7 AM'),
      ('vnd_03', 'VND-103', 'Royal Agro Commodities Pvt Ltd', 'Grain Market Yard', 'Nagpur', '440008', 'sales@royalagro.com', '+91 98230 45678', 'Bulk staples supplier');
    `);

    // Return Reasons
    await pool.query(`
      INSERT INTO return_reasons (id, name) VALUES
      ('ret_01', 'Expired Goods'),
      ('ret_02', 'Damaged Packaging / Seal Broken'),
      ('ret_03', 'Quality Defect / Discoloration'),
      ('ret_04', 'Excess Delivery Beyond PO'),
      ('ret_05', 'Short Shelf-Life Delivered');
    `);

    // Purchase Orders
    await pool.query(`
      INSERT INTO purchase_orders (id, document_number, vendor_id, vendor_name, store_id, status, total_amount, items) VALUES
      ('po_01', 'PO-2026-00045', 'vnd_01', 'Fresh Dairy Co-operative Ltd', 'store_mum_01', 'Received', 2600.00, '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "Quantity": 100, "Rate": 26.00, "DeliveryDate": "2026-10-04"}]'::jsonb),
      ('po_02', 'PO-2026-00046', 'vnd_02', 'Golden Crust Bakers LLP', 'store_mum_01', 'Partially Received', 1800.00, '[{"ProductId": "prd_02", "ProductName": "Whole Wheat Bread 400g", "Quantity": 50, "Rate": 32.00, "DeliveryDate": "2026-10-05"}]'::jsonb),
      ('po_03', 'PO-2026-00047', 'vnd_03', 'Royal Agro Commodities Pvt Ltd', 'store_mum_01', 'Sent', 9500.00, '[{"ProductId": "prd_04", "ProductName": "Royal Basmati Rice 1kg", "Quantity": 100, "Rate": 95.00, "DeliveryDate": "2026-10-08"}]'::jsonb);
    `);

    // Material Inward
    await pool.query(`
      INSERT INTO material_inward (id, purchase_order_id, vendor_id, vendor_name, is_po_available, items) VALUES
      ('inw_01', 'po_01', 'vnd_01', 'Fresh Dairy Co-operative Ltd', true, '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "OrderedQty": 100, "ReceivedQty": 100, "Rate": 26.00, "ExpiryDate": "2026-10-07", "Barcode": "200100101001"}]'::jsonb);
    `);

    // Material Returns
    await pool.query(`
      INSERT INTO material_returns (id, document_number, vendor_id, vendor_name, store_id, material_return_id, return_reason, total_return_amount, status, items) VALUES
      ('mrn_01', 'MRN-2026-00012', 'vnd_01', 'Fresh Dairy Co-operative Ltd', 'store_mum_01', 'ret_01', 'Expired Goods', 780.00, 'Dispatched to Supplier', '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "BatchBarcode": "200100101001", "Quantity": 30, "Rate": 26.00, "Total": 780.00}]'::jsonb),
      ('mrn_02', 'MRN-2026-00013', 'vnd_02', 'Golden Crust Bakers LLP', 'store_mum_01', 'ret_02', 'Damaged Packaging / Seal Broken', 480.00, 'Credit Note Pending', '[{"ProductId": "prd_02", "ProductName": "Whole Wheat Bread 400g", "BatchBarcode": "200100102002", "Quantity": 15, "Rate": 32.00, "Total": 480.00}]'::jsonb);
    `);

    // Invoices
    await pool.query(`
      INSERT INTO invoices (id, document_number, customer_id, customer_name, mobile_number, store_id, store_name, subtotal, cgst, sgst, igst, round_off, amount, mode_of_payment, is_payment_received, is_share_receipt_through_sms, items) VALUES
      ('inv_101', 'INV-2627-000101', 'cust_01', 'Jay Sharma', '9876543210', 'store_mum_01', 'DailyMart Express', 145.00, 4.88, 4.88, 0.00, 0.24, 155.00, 1, true, true, '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "Quantity": 2, "Rate": 30.00, "Cgst": 1.50, "Sgst": 1.50, "Total": 63.00}, {"ProductId": "prd_03", "ProductName": "Cold Coffee 200ml", "Quantity": 2, "Rate": 45.00, "Cgst": 4.05, "Sgst": 4.05, "Total": 98.10}]'::jsonb),
      ('inv_102', 'INV-2627-000102', 'cust_02', 'Priya Patel', '9820011223', 'store_mum_01', 'DailyMart Express', 350.00, 31.50, 31.50, 0.00, 0.00, 413.00, 0, true, false, '[{"ProductId": "prd_05", "ProductName": "Dark Chocolate Cake 500g", "Quantity": 1, "Rate": 350.00, "Cgst": 31.50, "Sgst": 31.50, "Total": 413.00}]'::jsonb);
    `);

    // Users
    await pool.query(`
      INSERT INTO users (id, name, email, role, store, status, last_login) VALUES
      ('user_01', 'Jay Sharma', 'admin@dailymart.in', 'Admin', 'DailyMart Express (Mumbai)', 'Active', '2026-10-04, 07:45 PM'),
      ('user_02', 'Pooja Nair', 'cashier1@dailymart.in', 'Cashier', 'DailyMart Express (Mumbai)', 'Active', '2026-10-04, 06:12 PM'),
      ('user_03', 'Vikram Singh', 'inventory@dailymart.in', 'Inventory Manager', 'DailyMart Express (Mumbai)', 'Active', '2026-10-04, 05:30 PM');
    `);

    // Permissions Matrix
    const initialMatrix = [
      { module: 'Dashboard', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
      { module: 'POS Billing Terminal', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: true, edit: true, delete: false, export: true }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
      { module: 'Invoices & Receipts', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: true, edit: false, delete: false, export: true }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
      { module: 'Product Catalog', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: true, export: true } },
      { module: 'Vendors Directory', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
      { module: 'Purchase Orders', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
      { module: 'Material Inward & Barcoding', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
      { module: 'Vendor Material Returns', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: true, edit: true, delete: false, export: true } },
      { module: 'Customer Directory', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: true, create: true, edit: true, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
      { module: 'Reports & Analytics', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: true, create: false, edit: false, delete: false, export: true } },
      { module: 'Settings & Tax Slabs', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } },
      { module: 'User Management & Roles', admin: { view: true, create: true, edit: true, delete: true, export: true }, cashier: { view: false, create: false, edit: false, delete: false, export: false }, inventory: { view: false, create: false, edit: false, delete: false, export: false } }
    ];

    for (const item of initialMatrix) {
      await pool.query(
        'INSERT INTO permissions_matrix (module, admin_perm, cashier_perm, inventory_perm) VALUES ($1, $2, $3, $4)',
        [item.module, JSON.stringify(item.admin), JSON.stringify(item.cashier), JSON.stringify(item.inventory)]
      );
    }

    console.log('[PostgreSQL] Seed data insertion completed.');
  }
}
