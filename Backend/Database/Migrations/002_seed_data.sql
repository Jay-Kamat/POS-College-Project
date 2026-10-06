-- =============================================================================
-- Migration: 002_seed_data.sql
-- Description: Seeds initial store, categories, tax slabs, products, and default accounts
-- Target Database: PostgreSQL (pos_billing_db)
-- =============================================================================

-- 1. Default Store Profile
INSERT INTO stores (id, name, long_name, address, mobile_number, phone_number, email, food_license_number, gst_number, state)
VALUES ('store_mum_01', 'DailyMart Express', 'DailyMart Retail Private Limited', 'Plot 12, Commercial Hub, MG Road, Mumbai', '+91 98765 43210', '022-28765432', 'mumbai01@dailymart.in', '11522001000123', '27AABCU9603R1ZM', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- 2. Master Categories
INSERT INTO categories (id, name) VALUES
('cat_all', 'All Items'),
('cat_dairy', 'Dairy'),
('cat_bakery', 'Bakery'),
('cat_bev', 'Beverages'),
('cat_staples', 'Staples'),
('cat_snacks', 'Snacks')
ON CONFLICT (id) DO NOTHING;

-- 3. Tax Rates (GST Slabs)
INSERT INTO tax_rates (id, name, igst, cgst, sgst) VALUES
('tax_0', 'GST 0% (Exempt)', 0.0, 0.0, 0.0),
('tax_5', 'GST 5% Standard', 5.0, 2.5, 2.5),
('tax_12', 'GST 12% Standard', 12.0, 6.0, 6.0),
('tax_18', 'GST 18% Standard', 18.0, 9.0, 9.0),
('tax_28', 'GST 28% Luxury', 28.0, 14.0, 14.0)
ON CONFLICT (id) DO NOTHING;

-- 4. Sample Products & Starting Stock
INSERT INTO products (id, product_number, name, cost, ingredients, notes, is_exp_date, days, category_id, tax_rate_id, tax_percent, stock_quantity) VALUES
('prd_01', '200100101001', 'Cow Milk 500ml', 30.00, 'Pasteurized Cow Milk', 'Keep refrigerated below 4°C', true, 3, 'cat_dairy', 'tax_5', 5, 45),
('prd_02', '200100102002', 'Whole Wheat Bread 400g', 40.00, 'Whole wheat flour, yeast, water', 'Fresh daily bake', true, 5, 'cat_bakery', 'tax_0', 0, 28),
('prd_03', '200100103003', 'Cold Coffee 200ml', 45.00, 'Milk, Arabica coffee beans, sugar', 'Ready to drink chilled', true, 30, 'cat_bev', 'tax_18', 18, 19),
('prd_04', '200100104004', 'Royal Basmati Rice 1kg', 110.00, 'Aged Long Grain Basmati', 'Grade A premium rice', false, NULL, 'cat_staples', 'tax_5', 5, 60),
('prd_05', '200100105005', 'Dark Chocolate Cake 500g', 350.00, 'Cocoa, dark chocolate, flour, sugar', 'Eggless celebration cake', true, 2, 'cat_bakery', 'tax_18', 18, 12),
('prd_06', '200100106006', 'Masala Potato Chips 100g', 20.00, 'Potatoes, edible oil, spices', 'Crispy fried snack', true, 60, 'cat_snacks', 'tax_12', 12, 50),
('prd_07', '200100107007', 'Fresh Butter 200g', 65.00, 'Cream, salt', 'Store refrigerated', true, 45, 'cat_dairy', 'tax_12', 12, 34),
('prd_08', '200100108008', 'Green Tea Bags 25s', 140.00, 'Natural green tea leaves', 'Antioxidant rich', true, 180, 'cat_bev', 'tax_5', 5, 22)
ON CONFLICT (id) DO NOTHING;

-- 5. Default Customers
INSERT INTO customers (id, name, mobile_number, gst_number, state, country, total_visits, total_spend) VALUES
('cust_01', 'Jay Sharma', '9876543210', '', 'Maharashtra', 'India', 14, 4250.00),
('cust_02', 'Priya Patel', '9820011223', '27AABCZ1234P1ZR', 'Maharashtra', 'India', 6, 8900.00),
('cust_03', 'Rahul Verma', '9819988776', '', 'Gujarat', 'India', 2, 620.00)
ON CONFLICT (id) DO NOTHING;

-- 6. Vendors
INSERT INTO vendors (id, vendor_code, name, address, city, pin, email, mobile_number, note) VALUES
('vnd_01', 'VND-101', 'Fresh Dairy Co-operative Ltd', 'Sector 4, MIDC Industrial Area', 'Pune', '411001', 'orders@freshdairy.com', '+91 98220 12345', 'Net 15 days payment terms'),
('vnd_02', 'VND-102', 'Golden Crust Bakers LLP', 'Plot 88, Andheri West', 'Mumbai', '400053', 'dispatch@goldencrust.in', '+91 98210 98765', 'Daily morning delivery by 7 AM'),
('vnd_03', 'VND-103', 'Royal Agro Commodities Pvt Ltd', 'Grain Market Yard', 'Nagpur', '440008', 'sales@royalagro.com', '+91 98230 45678', 'Bulk staples supplier')
ON CONFLICT (id) DO NOTHING;

-- 7. Return Reasons
INSERT INTO return_reasons (id, name) VALUES
('ret_01', 'Expired Goods'),
('ret_02', 'Damaged Packaging / Seal Broken'),
('ret_03', 'Quality Defect / Discoloration'),
('ret_04', 'Excess Delivery Beyond PO'),
('ret_05', 'Short Shelf-Life Delivered')
ON CONFLICT (id) DO NOTHING;

-- 8. Purchase Orders
INSERT INTO purchase_orders (id, document_number, vendor_id, vendor_name, store_id, status, total_amount, items) VALUES
('po_01', 'PO-2026-00045', 'vnd_01', 'Fresh Dairy Co-operative Ltd', 'store_mum_01', 'Received', 2600.00, '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "Quantity": 100, "Rate": 26.00, "DeliveryDate": "2026-10-04"}]'::jsonb),
('po_02', 'PO-2026-00046', 'vnd_02', 'Golden Crust Bakers LLP', 'store_mum_01', 'Partially Received', 1800.00, '[{"ProductId": "prd_02", "ProductName": "Whole Wheat Bread 400g", "Quantity": 50, "Rate": 32.00, "DeliveryDate": "2026-10-05"}]'::jsonb),
('po_03', 'PO-2026-00047', 'vnd_03', 'Royal Agro Commodities Pvt Ltd', 'store_mum_01', 'Sent', 9500.00, '[{"ProductId": "prd_04", "ProductName": "Royal Basmati Rice 1kg", "Quantity": 100, "Rate": 95.00, "DeliveryDate": "2026-10-08"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 9. Material Inward
INSERT INTO material_inward (id, purchase_order_id, vendor_id, vendor_name, is_po_available, items) VALUES
('inw_01', 'po_01', 'vnd_01', 'Fresh Dairy Co-operative Ltd', true, '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "OrderedQty": 100, "ReceivedQty": 100, "Rate": 26.00, "ExpiryDate": "2026-10-07", "Barcode": "200100101001"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 10. Material Returns
INSERT INTO material_returns (id, document_number, vendor_id, vendor_name, store_id, material_return_id, return_reason, total_return_amount, status, items) VALUES
('mrn_01', 'MRN-2026-00012', 'vnd_01', 'Fresh Dairy Co-operative Ltd', 'store_mum_01', 'ret_01', 'Expired Goods', 780.00, 'Dispatched to Supplier', '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "BatchBarcode": "200100101001", "Quantity": 30, "Rate": 26.00, "Total": 780.00}]'::jsonb),
('mrn_02', 'MRN-2026-00013', 'vnd_02', 'Golden Crust Bakers LLP', 'store_mum_01', 'ret_02', 'Damaged Packaging / Seal Broken', 480.00, 'Credit Note Pending', '[{"ProductId": "prd_02", "ProductName": "Whole Wheat Bread 400g", "BatchBarcode": "200100102002", "Quantity": 15, "Rate": 32.00, "Total": 480.00}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 11. Initial Invoices
INSERT INTO invoices (id, document_number, customer_id, customer_name, mobile_number, store_id, store_name, subtotal, cgst, sgst, igst, round_off, amount, mode_of_payment, is_payment_received, is_share_receipt_through_sms, items) VALUES
('inv_101', 'INV-2627-000101', 'cust_01', 'Jay Sharma', '9876543210', 'store_mum_01', 'DailyMart Express', 145.00, 4.88, 4.88, 0.00, 0.24, 155.00, 1, true, true, '[{"ProductId": "prd_01", "ProductName": "Cow Milk 500ml", "Quantity": 2, "Rate": 30.00, "Cgst": 1.50, "Sgst": 1.50, "Total": 63.00}, {"ProductId": "prd_03", "ProductName": "Cold Coffee 200ml", "Quantity": 2, "Rate": 45.00, "Cgst": 4.05, "Sgst": 4.05, "Total": 98.10}]'::jsonb),
('inv_102', 'INV-2627-000102', 'cust_02', 'Priya Patel', '9820011223', 'store_mum_01', 'DailyMart Express', 350.00, 31.50, 31.50, 0.00, 0.00, 413.00, 0, true, false, '[{"ProductId": "prd_05", "ProductName": "Dark Chocolate Cake 500g", "Quantity": 1, "Rate": 350.00, "Cgst": 31.50, "Sgst": 31.50, "Total": 413.00}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 12. Default Users
INSERT INTO users (id, name, email, role, store, status, last_login) VALUES
('user_01', 'Jay Sharma', 'admin@dailymart.in', 'Admin', 'DailyMart Express (Mumbai)', 'Active', '2026-10-04, 07:45 PM'),
('user_02', 'Pooja Nair', 'cashier1@dailymart.in', 'Cashier', 'DailyMart Express (Mumbai)', 'Active', '2026-10-04, 06:12 PM'),
('user_03', 'Vikram Singh', 'inventory@dailymart.in', 'Inventory Manager', 'DailyMart Express (Mumbai)', 'Active', '2026-10-04, 05:30 PM')
ON CONFLICT (id) DO NOTHING;

-- 13. Permissions Matrix
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_matrix_module ON permissions_matrix(module);

INSERT INTO permissions_matrix (module, admin_perm, cashier_perm, inventory_perm) VALUES
('Dashboard', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}'),
('POS Billing Terminal', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": true, "create": true, "edit": true, "delete": false, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}'),
('Invoices & Receipts', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": true, "create": true, "edit": false, "delete": false, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}'),
('Product Catalog', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": true, "create": false, "edit": false, "delete": false, "export": false}', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}'),
('Vendors Directory', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": true, "create": true, "edit": true, "delete": false, "export": true}'),
('Purchase Orders', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": true, "create": true, "edit": true, "delete": false, "export": true}'),
('Material Inward & Barcoding', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": true, "create": true, "edit": true, "delete": false, "export": true}'),
('Vendor Material Returns', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": true, "create": true, "edit": true, "delete": false, "export": true}'),
('Customer Directory', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": true, "create": true, "edit": true, "delete": false, "export": false}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}'),
('Reports & Analytics', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": true, "create": false, "edit": false, "delete": false, "export": true}'),
('Settings & Tax Slabs', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}'),
('User Management & Roles', '{"view": true, "create": true, "edit": true, "delete": true, "export": true}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}', '{"view": false, "create": false, "edit": false, "delete": false, "export": false}')
ON CONFLICT (module) DO NOTHING;
