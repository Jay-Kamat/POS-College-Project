import { pool, query } from './postgres.js';

// Convert PostgreSQL snake_case row to PascalCase / CamelCase object matching frontend schema
function mapProduct(row) {
  if (!row) return null;
  return {
    Id: row.id,
    ProductNumber: row.product_number,
    Name: row.name,
    Cost: parseFloat(row.cost),
    Ingredients: row.ingredients || '',
    Notes: row.notes || '',
    IsExpDate: Boolean(row.is_exp_date),
    Days: row.days,
    CategoryId: row.category_id,
    TaxRateId: row.tax_rate_id,
    TaxPercent: parseFloat(row.tax_percent || 0),
    StockQuantity: parseInt(row.stock_quantity || 0, 10),
    RecordStatus: row.record_status,
    Created: row.created_at,
    Updated: row.updated_at,
    CreatedId: row.created_id,
    UpdatedId: row.updated_id
  };
}

function mapStore(row) {
  if (!row) return null;
  return {
    Id: row.id,
    Name: row.name,
    LongName: row.long_name,
    Address: row.address,
    MobileNumber: row.mobile_number,
    PhoneNumber: row.phone_number,
    Email: row.email,
    FoodLicenseNumber: row.food_license_number,
    GstNumber: row.gst_number,
    Country: row.country,
    State: row.state,
    InvoicePrefix: row.invoice_prefix,
    ReceiptFooterText: row.receipt_footer_text,
    PaperSize: row.paper_size,
    EnableWhatsAppReceipt: row.enable_whatsapp_receipt,
    RecordStatus: row.record_status,
    Created: row.created_at,
    Updated: row.updated_at
  };
}

function mapCustomer(row) {
  if (!row) return null;
  return {
    Id: row.id,
    Name: row.name,
    MobileNumber: row.mobile_number,
    GstNumber: row.gst_number || '',
    State: row.state,
    Country: row.country,
    TotalVisits: parseInt(row.total_visits || 1, 10),
    TotalSpend: parseFloat(row.total_spend || 0),
    RecordStatus: row.record_status,
    Created: row.created_at,
    Updated: row.updated_at
  };
}

function mapVendor(row) {
  if (!row) return null;
  return {
    Id: row.id,
    VendorCode: row.vendor_code,
    Name: row.name,
    Address: row.address,
    City: row.city,
    Pin: row.pin,
    Email: row.email,
    MobileNumber: row.mobile_number,
    Note: row.note,
    RecordStatus: row.record_status,
    Created: row.created_at,
    Updated: row.updated_at
  };
}

function mapInvoice(row) {
  if (!row) return null;
  return {
    Id: row.id,
    DocumentNumber: row.document_number,
    Date: row.date,
    CustomerId: row.customer_id,
    CustomerName: row.customer_name,
    MobileNumber: row.mobile_number,
    StoreId: row.store_id,
    StoreName: row.store_name,
    Subtotal: parseFloat(row.subtotal),
    Cgst: parseFloat(row.cgst || 0),
    Sgst: parseFloat(row.sgst || 0),
    Igst: parseFloat(row.igst || 0),
    RoundOff: parseFloat(row.round_off || 0),
    Amount: parseFloat(row.amount),
    ModeOfPayment: parseInt(row.mode_of_payment, 10),
    IsPaymentReceived: Boolean(row.is_payment_received),
    IsShareReceiptThroughSms: Boolean(row.is_share_receipt_through_sms),
    CancellationReason: row.cancellation_reason,
    Items: Array.isArray(row.items) ? row.items : JSON.parse(row.items || '[]'),
    RecordStatus: row.record_status,
    Created: row.created_at,
    Updated: row.updated_at
  };
}

export const db = {
  // -------------------------------------------------------------
  // Stores
  // -------------------------------------------------------------
  getStoreProfile: async () => {
    const res = await query('SELECT * FROM stores WHERE record_status = 0 LIMIT 1');
    return mapStore(res.rows[0]);
  },

  updateStoreProfile: async (data) => {
    const res = await query(`
      UPDATE stores
      SET name = COALESCE($1, name),
          long_name = COALESCE($2, long_name),
          address = COALESCE($3, address),
          mobile_number = COALESCE($4, mobile_number),
          email = COALESCE($5, email),
          gst_number = COALESCE($6, gst_number),
          food_license_number = COALESCE($7, food_license_number),
          state = COALESCE($8, state),
          receipt_footer_text = COALESCE($9, receipt_footer_text),
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      data.Name, data.LongName, data.Address, data.MobileNumber,
      data.Email, data.GstNumber, data.FoodLicenseNumber, data.State,
      data.ReceiptFooterText, data.Id || 'store_mum_01'
    ]);
    return mapStore(res.rows[0]);
  },

  // -------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------
  getCategories: async () => {
    const res = await query('SELECT id as "Id", name as "Name", record_status as "RecordStatus" FROM categories WHERE record_status = 0 ORDER BY id');
    return res.rows;
  },

  createCategory: async (name) => {
    const id = `cat_${Date.now()}`;
    const res = await query('INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING id as "Id", name as "Name"', [id, name]);
    return res.rows[0];
  },

  // -------------------------------------------------------------
  // Tax Rates
  // -------------------------------------------------------------
  getTaxRates: async () => {
    const res = await query('SELECT id as "Id", name as "Name", igst as "IGST", cgst as "CGST", sgst as "SGST" FROM tax_rates WHERE record_status = 0 ORDER BY igst');
    return res.rows.map(r => ({
      Id: r.Id,
      Name: r.Name,
      IGST: parseFloat(r.IGST),
      CGST: parseFloat(r.CGST),
      SGST: parseFloat(r.SGST)
    }));
  },

  createTaxRate: async (data) => {
    const id = `tax_${Date.now()}`;
    const res = await query(
      'INSERT INTO tax_rates (id, name, igst, cgst, sgst) VALUES ($1, $2, $3, $4, $5) RETURNING id as "Id", name as "Name"',
      [id, data.Name, parseFloat(data.IGST || 0), parseFloat(data.CGST || 0), parseFloat(data.SGST || 0)]
    );
    return res.rows[0];
  },

  // -------------------------------------------------------------
  // Products
  // -------------------------------------------------------------
  getProducts: async ({ categoryId, searchTerm } = {}) => {
    let sql = 'SELECT * FROM products WHERE record_status = 0';
    const params = [];

    if (categoryId && categoryId !== 'cat_all') {
      params.push(categoryId);
      sql += ` AND category_id = $${params.length}`;
    }

    if (searchTerm && searchTerm.trim()) {
      params.push(`%${searchTerm.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(product_number) LIKE $${params.length} OR LOWER(COALESCE(ingredients, '')) LIKE $${params.length})`;
    }

    sql += ' ORDER BY created_at DESC';
    const res = await query(sql, params);
    return res.rows.map(mapProduct);
  },

  getProductById: async (id) => {
    const res = await query('SELECT * FROM products WHERE id = $1 AND record_status = 0', [id]);
    return mapProduct(res.rows[0]);
  },

  getProductByBarcode: async (barcode) => {
    let clean = String(barcode || '').trim();
    if (!clean) return null;

    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        clean = String(parsed.barcode || parsed.ProductNumber || parsed.id || parsed.Id || clean).trim();
      } catch (e) {}
    }

    if (clean.includes('/')) {
      const parts = clean.split('/');
      clean = parts[parts.length - 1];
    }

    const res = await query(
      'SELECT * FROM products WHERE (product_number = $1 OR id = $1 OR LOWER(product_number) = LOWER($1)) AND record_status = 0 LIMIT 1',
      [clean]
    );
    return mapProduct(res.rows[0]);
  },

  createProduct: async (data) => {
    const id = `prd_${Date.now()}`;
    const productNumber = data.ProductNumber || `200100${Date.now().toString().slice(-6)}`;
    const res = await query(`
      INSERT INTO products (
        id, product_number, name, cost, ingredients, notes, is_exp_date, days,
        category_id, tax_rate_id, tax_percent, stock_quantity, created_id, updated_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'user_01', 'user_01')
      RETURNING *
    `, [
      id,
      productNumber,
      data.Name,
      parseFloat(data.Cost),
      data.Ingredients || '',
      data.Notes || '',
      Boolean(data.IsExpDate),
      data.IsExpDate ? parseInt(data.Days, 10) : null,
      data.CategoryId || 'cat_dairy',
      data.TaxRateId || 'tax_5',
      parseFloat(data.TaxPercent || 5),
      parseInt(data.StockQuantity || 50, 10)
    ]);
    return mapProduct(res.rows[0]);
  },

  updateProduct: async (id, data) => {
    const res = await query(`
      UPDATE products
      SET name = COALESCE($1, name),
          cost = COALESCE($2, cost),
          ingredients = COALESCE($3, ingredients),
          notes = COALESCE($4, notes),
          is_exp_date = COALESCE($5, is_exp_date),
          days = COALESCE($6, days),
          category_id = COALESCE($7, category_id),
          tax_percent = COALESCE($8, tax_percent),
          stock_quantity = COALESCE($9, stock_quantity),
          updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      data.Name,
      data.Cost !== undefined ? parseFloat(data.Cost) : null,
      data.Ingredients,
      data.Notes,
      data.IsExpDate !== undefined ? Boolean(data.IsExpDate) : null,
      data.Days !== undefined ? parseInt(data.Days, 10) : null,
      data.CategoryId,
      data.TaxPercent !== undefined ? parseFloat(data.TaxPercent) : null,
      data.StockQuantity !== undefined ? parseInt(data.StockQuantity, 10) : null,
      id
    ]);
    return mapProduct(res.rows[0]);
  },

  softDeleteProduct: async (id) => {
    await query('UPDATE products SET record_status = 1, updated_at = NOW() WHERE id = $1', [id]);
    return true;
  },

  // -------------------------------------------------------------
  // Customers
  // -------------------------------------------------------------
  getCustomers: async (search = '') => {
    let sql = 'SELECT * FROM customers WHERE record_status = 0';
    const params = [];
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $1 OR mobile_number LIKE $1 OR LOWER(COALESCE(gst_number, '')) LIKE $1)`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await query(sql, params);
    return res.rows.map(mapCustomer);
  },

  getCustomerByMobile: async (mobile) => {
    const clean = mobile.replace(/[^0-9]/g, '');
    const res = await query('SELECT * FROM customers WHERE mobile_number = $1 AND record_status = 0 LIMIT 1', [clean]);
    return mapCustomer(res.rows[0]);
  },

  createCustomer: async (data) => {
    const id = `cust_${Date.now()}`;
    const cleanMobile = data.MobileNumber.replace(/[^0-9]/g, '');
    const res = await query(`
      INSERT INTO customers (id, name, mobile_number, gst_number, state, country)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, data.Name, cleanMobile, data.GstNumber || '', data.State || 'Maharashtra', data.Country || 'India']);
    return mapCustomer(res.rows[0]);
  },

  updateCustomer: async (id, data) => {
    const res = await query(`
      UPDATE customers
      SET name = COALESCE($1, name),
          mobile_number = COALESCE($2, mobile_number),
          gst_number = COALESCE($3, gst_number),
          state = COALESCE($4, state),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [data.Name, data.MobileNumber, data.GstNumber, data.State, id]);
    return mapCustomer(res.rows[0]);
  },

  deleteCustomer: async (id) => {
    await query('UPDATE customers SET record_status = 1, updated_at = NOW() WHERE id = $1', [id]);
    return true;
  },

  // -------------------------------------------------------------
  // Vendors
  // -------------------------------------------------------------
  getVendors: async (search = '') => {
    let sql = 'SELECT * FROM vendors WHERE record_status = 0';
    const params = [];
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $1 OR LOWER(vendor_code) LIKE $1 OR LOWER(COALESCE(city, '')) LIKE $1)`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await query(sql, params);
    return res.rows.map(mapVendor);
  },

  createVendor: async (data) => {
    const id = `vnd_${Date.now()}`;
    const countRes = await query('SELECT COUNT(*) FROM vendors');
    const vendorCode = data.VendorCode || `VND-${100 + parseInt(countRes.rows[0].count, 10) + 1}`;
    const res = await query(`
      INSERT INTO vendors (id, vendor_code, name, address, city, pin, email, mobile_number, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, vendorCode, data.Name, data.Address || '', data.City || '', data.Pin || '', data.Email || '', data.MobileNumber || '', data.Note || '']);
    return mapVendor(res.rows[0]);
  },

  updateVendor: async (id, data) => {
    const res = await query(`
      UPDATE vendors
      SET name = COALESCE($1, name),
          address = COALESCE($2, address),
          city = COALESCE($3, city),
          pin = COALESCE($4, pin),
          email = COALESCE($5, email),
          mobile_number = COALESCE($6, mobile_number),
          note = COALESCE($7, note),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [data.Name, data.Address, data.City, data.Pin, data.Email, data.MobileNumber, data.Note, id]);
    return mapVendor(res.rows[0]);
  },

  deleteVendor: async (id) => {
    await query('UPDATE vendors SET record_status = 1, updated_at = NOW() WHERE id = $1', [id]);
    return true;
  },

  // -------------------------------------------------------------
  // Purchase Orders
  // -------------------------------------------------------------
  getPurchaseOrders: async ({ status, vendorId } = {}) => {
    let sql = 'SELECT * FROM purchase_orders WHERE record_status = 0';
    const params = [];
    if (status && status !== 'All') {
      params.push(status);
      sql += ` AND LOWER(status) = LOWER($${params.length})`;
    }
    if (vendorId) {
      params.push(vendorId);
      sql += ` AND vendor_id = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const res = await query(sql, params);
    return res.rows.map(r => ({
      Id: r.id,
      DocumentNumber: r.document_number,
      VendorId: r.vendor_id,
      VendorName: r.vendor_name,
      StoreId: r.store_id,
      Date: r.date,
      Status: r.status,
      TotalAmount: parseFloat(r.total_amount),
      Items: Array.isArray(r.items) ? r.items : JSON.parse(r.items || '[]'),
      RecordStatus: r.record_status,
      Created: r.created_at
    }));
  },

  createPurchaseOrder: async (data) => {
    const id = `po_${Date.now()}`;
    const countRes = await query('SELECT COUNT(*) FROM purchase_orders');
    const docNum = `PO-2026-${String(parseInt(countRes.rows[0].count, 10) + 46).padStart(5, '0')}`;
    const total = data.TotalAmount !== undefined ? parseFloat(data.TotalAmount) : data.Items.reduce((sum, it) => sum + (it.Quantity * it.Rate), 0);

    const res = await query(`
      INSERT INTO purchase_orders (id, document_number, vendor_id, vendor_name, store_id, total_amount, items)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [id, docNum, data.VendorId, data.VendorName || 'Supplier', 'store_mum_01', total, JSON.stringify(data.Items)]);

    const r = res.rows[0];
    return {
      Id: r.id,
      DocumentNumber: r.document_number,
      VendorId: r.vendor_id,
      VendorName: r.vendor_name,
      Date: r.date,
      Status: r.status,
      TotalAmount: parseFloat(r.total_amount),
      Items: r.items,
      RecordStatus: r.record_status
    };
  },

  updatePurchaseOrderStatus: async (id, status) => {
    const res = await query('UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id]);
    const r = res.rows[0];
    return {
      Id: r.id,
      DocumentNumber: r.document_number,
      Status: r.status,
      TotalAmount: parseFloat(r.total_amount)
    };
  },

  // -------------------------------------------------------------
  // Material Inward
  // -------------------------------------------------------------
  getMaterialInward: async () => {
    const res = await query('SELECT * FROM material_inward WHERE record_status = 0 ORDER BY created_at DESC');
    return res.rows.map(r => ({
      Id: r.id,
      PurchaseOrderId: r.purchase_order_id,
      VendorId: r.vendor_id,
      VendorName: r.vendor_name,
      Date: r.date,
      IsPoAvailable: r.is_po_available,
      Items: Array.isArray(r.items) ? r.items : JSON.parse(r.items || '[]'),
      RecordStatus: r.record_status
    }));
  },

  createMaterialInward: async (data) => {
    const id = `inw_${Date.now()}`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const itemsWithBarcodes = [];
      for (let idx = 0; idx < data.Items.length; idx++) {
        const item = data.Items[idx];
        const barcode = item.Barcode || `200100${String(Date.now()).slice(-4)}${String(idx + 1).padStart(2, '0')}`;
        itemsWithBarcodes.push({ ...item, Barcode: barcode });

        // Update product stock
        await client.query(`
          UPDATE products
          SET stock_quantity = stock_quantity + $1, updated_at = NOW()
          WHERE id = $2 OR product_number = $3
        `, [parseInt(item.ReceivedQty || 0, 10), item.ProductId, item.Barcode || barcode]);
      }

      const res = await client.query(`
        INSERT INTO material_inward (id, purchase_order_id, vendor_id, vendor_name, is_po_available, items)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [id, data.PurchaseOrderId || null, data.VendorId, data.VendorName || 'Supplier', Boolean(data.IsPoAvailable), JSON.stringify(itemsWithBarcodes)]);

      await client.query('COMMIT');
      const r = res.rows[0];
      return {
        Id: r.id,
        PurchaseOrderId: r.purchase_order_id,
        VendorId: r.vendor_id,
        VendorName: r.vendor_name,
        Date: r.date,
        IsPoAvailable: r.is_po_available,
        Items: r.items,
        RecordStatus: r.record_status
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // -------------------------------------------------------------
  // Material Returns
  // -------------------------------------------------------------
  getReturnReasons: async () => {
    const res = await query('SELECT id as "Id", name as "Name" FROM return_reasons');
    return res.rows;
  },

  getMaterialReturns: async () => {
    const res = await query('SELECT * FROM material_returns WHERE record_status = 0 ORDER BY created_at DESC');
    return res.rows.map(r => ({
      Id: r.id,
      DocumentNumber: r.document_number,
      Date: r.date,
      VendorId: r.vendor_id,
      VendorName: r.vendor_name,
      StoreId: r.store_id,
      MaterialReturnId: r.material_return_id,
      ReturnReason: r.return_reason,
      TotalReturnAmount: parseFloat(r.total_return_amount),
      Status: r.status,
      Items: Array.isArray(r.items) ? r.items : JSON.parse(r.items || '[]'),
      RecordStatus: r.record_status
    }));
  },

  createMaterialReturn: async (data) => {
    const id = `mrn_${Date.now()}`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const countRes = await client.query('SELECT COUNT(*) FROM material_returns');
      const docNum = `MRN-2026-${String(parseInt(countRes.rows[0].count, 10) + 14).padStart(5, '0')}`;
      const total = data.TotalReturnAmount !== undefined ? parseFloat(data.TotalReturnAmount) : data.Items.reduce((sum, it) => sum + (it.Quantity * it.Rate), 0);

      // Decrement product stock
      for (const item of data.Items) {
        await client.query(`
          UPDATE products
          SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at = NOW()
          WHERE id = $2 OR product_number = $3
        `, [parseInt(item.Quantity || 0, 10), item.ProductId, item.BatchBarcode]);
      }

      const res = await client.query(`
        INSERT INTO material_returns (id, document_number, vendor_id, vendor_name, store_id, material_return_id, return_reason, total_return_amount, status, items)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [id, docNum, data.VendorId, data.VendorName || 'Supplier', 'store_mum_01', data.MaterialReturnId || 'ret_01', data.ReturnReason || 'Expired Goods', total, 'Credit Note Pending', JSON.stringify(data.Items)]);

      await client.query('COMMIT');
      const r = res.rows[0];
      return {
        Id: r.id,
        DocumentNumber: r.document_number,
        Date: r.date,
        VendorName: r.vendor_name,
        ReturnReason: r.return_reason,
        TotalReturnAmount: parseFloat(r.total_return_amount),
        Status: r.status,
        Items: r.items
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // -------------------------------------------------------------
  // Staged Buckets (Held Carts)
  // -------------------------------------------------------------
  getBuckets: async () => {
    const res = await query('SELECT * FROM staged_buckets WHERE record_status = 0 ORDER BY created_at DESC');
    return res.rows.map(r => ({
      id: r.id,
      bucketNumber: r.bucket_number,
      customerName: r.customer_name,
      itemsCount: r.items_count,
      total: parseFloat(r.total),
      cartData: r.cart_data,
      timestamp: r.timestamp
    }));
  },

  saveBucket: async (data) => {
    const id = data.id || `bkt_${Date.now()}`;
    const countRes = await query('SELECT COUNT(*) FROM staged_buckets');
    const bucketNum = data.bucketNumber || `BKT-${parseInt(countRes.rows[0].count, 10) + 1}`;
    const res = await query(`
      INSERT INTO staged_buckets (id, bucket_number, customer_name, items_count, total, cart_data, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      id, bucketNum, data.customerName || 'Walk-in',
      data.itemsCount || (data.cartData?.items?.length || 0),
      parseFloat(data.total || 0), JSON.stringify(data.cartData),
      data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      bucketNumber: r.bucket_number,
      customerName: r.customer_name,
      itemsCount: r.items_count,
      total: parseFloat(r.total),
      cartData: r.cart_data,
      timestamp: r.timestamp
    };
  },

  deleteBucket: async (id) => {
    await query('UPDATE staged_buckets SET record_status = 1 WHERE id = $1', [id]);
    return true;
  },

  // -------------------------------------------------------------
  // Invoices & Billing
  // -------------------------------------------------------------
  getInvoices: async ({ startDate, endDate, search, paymentMode } = {}) => {
    let sql = 'SELECT * FROM invoices WHERE record_status = 0';
    const params = [];

    if (startDate) {
      params.push(startDate);
      sql += ` AND date >= $${params.length}`;
    }
    if (endDate) {
      params.push(new Date(new Date(endDate).getTime() + 86400000).toISOString());
      sql += ` AND date <= $${params.length}`;
    }
    if (paymentMode !== undefined && paymentMode !== '' && paymentMode !== 'all') {
      params.push(parseInt(paymentMode, 10));
      sql += ` AND mode_of_payment = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(document_number) LIKE $${params.length} OR LOWER(COALESCE(customer_name, '')) LIKE $${params.length} OR COALESCE(mobile_number, '') LIKE $${params.length})`;
    }

    sql += ' ORDER BY date DESC';
    const res = await query(sql, params);
    return res.rows.map(mapInvoice);
  },

  getInvoiceById: async (id) => {
    const res = await query('SELECT * FROM invoices WHERE id = $1 LIMIT 1', [id]);
    if (!res.rows[0]) return null;
    const inv = mapInvoice(res.rows[0]);
    const storeRes = await query('SELECT * FROM stores LIMIT 1');
    return { ...inv, Store: mapStore(storeRes.rows[0]) };
  },

  createInvoice: async (cart, activeStore) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const countRes = await client.query('SELECT COUNT(*) FROM invoices');
      const sequence = 101 + parseInt(countRes.rows[0].count, 10);
      const documentNumber = `INV-2627-${String(sequence).padStart(6, '0')}`;
      const id = `inv_${Date.now()}`;

      // GST Intra vs Inter
      const storeState = (activeStore?.state || 'Maharashtra').toLowerCase();
      const customerState = (cart.customer?.state || 'Maharashtra').toLowerCase();
      const isInterState = storeState !== customerState;

      const invoiceItems = [];
      for (const item of cart.items) {
        const rate = parseFloat(item.cost);
        const qty = parseInt(item.quantity, 10);
        const taxPct = parseFloat(item.taxPercent || 0);
        const lineSubtotal = rate * qty;
        let cgst = 0, sgst = 0, igst = 0;

        if (isInterState) {
          igst = (lineSubtotal * taxPct) / 100;
        } else {
          cgst = (lineSubtotal * (taxPct / 2)) / 100;
          sgst = (lineSubtotal * (taxPct / 2)) / 100;
        }

        const lineTotal = lineSubtotal + cgst + sgst + igst;

        // Decrement stock in products table
        await client.query(`
          UPDATE products
          SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at = NOW()
          WHERE id = $2 OR product_number = $3
        `, [qty, item.id, item.productNumber]);

        invoiceItems.push({
          ProductId: item.id,
          ProductNumber: item.productNumber,
          ProductName: item.name,
          Quantity: qty,
          Rate: rate,
          TaxPercent: taxPct,
          Subtotal: Math.round(lineSubtotal * 100) / 100,
          Cgst: Math.round(cgst * 100) / 100,
          Sgst: Math.round(sgst * 100) / 100,
          Igst: Math.round(igst * 100) / 100,
          Total: Math.round(lineTotal * 100) / 100
        });
      }

      // Update customer profile
      if (cart.customer?.mobileNumber) {
        const cleanMobile = cart.customer.mobileNumber.replace(/[^0-9]/g, '');
        const custCheck = await client.query('SELECT id FROM customers WHERE mobile_number = $1', [cleanMobile]);
        if (custCheck.rowCount > 0) {
          await client.query(`
            UPDATE customers
            SET total_visits = total_visits + 1, total_spend = total_spend + $1, updated_at = NOW()
            WHERE mobile_number = $2
          `, [cart.grandTotal, cleanMobile]);
        } else if (cleanMobile.length === 10) {
          await client.query(`
            INSERT INTO customers (id, name, mobile_number, gst_number, state, country, total_visits, total_spend)
            VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
          `, [
            `cust_${Date.now()}`,
            cart.customer.name || 'Customer',
            cleanMobile,
            cart.customer.gstin || '',
            cart.customer.state || 'Maharashtra',
            'India',
            cart.grandTotal
          ]);
        }
      }

      // Insert invoice
      const res = await client.query(`
        INSERT INTO invoices (
          id, document_number, date, customer_id, customer_name, mobile_number,
          store_id, store_name, subtotal, cgst, sgst, igst, round_off, amount,
          mode_of_payment, is_payment_received, is_share_receipt_through_sms,
          items, created_id, updated_id
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'user_01', 'user_01')
        RETURNING *
      `, [
        id,
        documentNumber,
        cart.customer?.id || null,
        cart.customer?.name || 'Walk-in Customer',
        cart.customer?.mobileNumber || '',
        activeStore?.id || 'store_mum_01',
        activeStore?.name || 'DailyMart Express',
        cart.subtotal,
        cart.cgst,
        cart.sgst,
        cart.igst || 0,
        cart.roundOff,
        cart.grandTotal,
        cart.paymentMode,
        cart.isPaymentReceived,
        cart.sendWhatsApp,
        JSON.stringify(invoiceItems)
      ]);

      await client.query('COMMIT');
      return mapInvoice(res.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  cancelInvoice: async (id, reason) => {
    const res = await query(`
      UPDATE invoices
      SET record_status = 1, cancellation_reason = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [reason || 'Customer cancellation', id]);
    return mapInvoice(res.rows[0]);
  },

  // -------------------------------------------------------------
  // Reports & Analytics
  // -------------------------------------------------------------
  getDashboardKPIs: async () => {
    const invRes = await query('SELECT amount FROM invoices WHERE record_status = 0');
    const totalSales = invRes.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const invoiceCount = invRes.rowCount;

    const prodRes = await query('SELECT is_exp_date, days, stock_quantity FROM products WHERE record_status = 0');
    const lowStockCount = prodRes.rows.filter(p => p.stock_quantity < 20).length;
    const expiredCount = prodRes.rows.filter(p => p.is_exp_date && p.days <= 0).length;

    const recentInvoices = await query('SELECT * FROM invoices WHERE record_status = 0 ORDER BY date DESC LIMIT 5');

    return {
      totalSales,
      invoiceCount,
      lowStockCount,
      expiredCount,
      recentInvoices: recentInvoices.rows.map(mapInvoice)
    };
  },

  getDailySalesReport: async (targetDate) => {
    const dateStr = targetDate || new Date().toISOString().split('T')[0];
    const res = await query(`
      SELECT * FROM invoices
      WHERE record_status = 0 AND DATE(date) = $1
      ORDER BY date DESC
    `, [dateStr]);

    const invoices = res.rows.map(mapInvoice);
    let cashTotal = 0, upiTotal = 0, totalTax = 0;

    invoices.forEach(inv => {
      if (inv.ModeOfPayment === 0) cashTotal += inv.Amount;
      else upiTotal += inv.Amount;
      totalTax += (inv.Cgst || 0) + (inv.Sgst || 0) + (inv.Igst || 0);
    });

    return {
      date: dateStr,
      summary: {
        totalInvoices: invoices.length,
        grossSales: cashTotal + upiTotal,
        cashSales: cashTotal,
        upiSales: upiTotal,
        taxCollected: totalTax
      },
      invoices
    };
  },

  // -------------------------------------------------------------
  // Users & Roles
  // -------------------------------------------------------------
  getUsers: async () => {
    const res = await query('SELECT * FROM users WHERE record_status = 0 ORDER BY created_at');
    return res.rows.map(r => ({
      Id: r.id,
      Name: r.name,
      Email: r.email,
      Role: r.role,
      Store: r.store,
      Status: r.status,
      LastLogin: r.last_login
    }));
  },

  createUser: async (data) => {
    const id = `user_${Date.now()}`;
    const res = await query(`
      INSERT INTO users (id, name, email, role, store, status, last_login)
      VALUES ($1, $2, $3, $4, $5, 'Active', 'Never')
      RETURNING *
    `, [id, data.Name, data.Email, data.Role || 'Cashier', data.Store || 'DailyMart Express (Mumbai)']);
    const r = res.rows[0];
    return {
      Id: r.id,
      Name: r.name,
      Email: r.email,
      Role: r.role,
      Store: r.store,
      Status: r.status,
      LastLogin: r.last_login
    };
  },

  updateUserRole: async (id, role) => {
    const res = await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [role, id]);
    const r = res.rows[0];
    return {
      Id: r.id,
      Name: r.name,
      Email: r.email,
      Role: r.role
    };
  },

  deleteUser: async (id) => {
    await query('UPDATE users SET record_status = 1, updated_at = NOW() WHERE id = $1', [id]);
    return true;
  },

  getPermissionsMatrix: async () => {
    const res = await query('SELECT module, admin_perm, cashier_perm, inventory_perm FROM permissions_matrix ORDER BY id');
    return res.rows.map(r => ({
      module: r.module,
      admin: r.admin_perm,
      cashier: r.cashier_perm,
      inventory: r.inventory_perm
    }));
  },

  updatePermission: async (moduleIndex, roleKey, actionKey, value) => {
    const matrix = await db.getPermissionsMatrix();
    if (matrix[moduleIndex] && matrix[moduleIndex][roleKey]) {
      matrix[moduleIndex][roleKey][actionKey] = value;
      const target = matrix[moduleIndex];
      const colName = roleKey === 'admin' ? 'admin_perm' : roleKey === 'cashier' ? 'cashier_perm' : 'inventory_perm';
      await query(`UPDATE permissions_matrix SET ${colName} = $1 WHERE module = $2`, [JSON.stringify(target[roleKey]), target.module]);
    }
    return matrix;
  }
};

export default db;
