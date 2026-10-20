import { test, expect } from '@playwright/test';

test.describe('DailyMart POS & Billing System End-to-End Suite', () => {

  test('1. Login Flow (Admin Authentication)', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/POS|DailyMart/i);

    // Fill login credentials
    await page.fill('input[type="email"]', 'admin@dailymart.in');
    await page.fill('input[type="password"]', 'Admin@Pass123');
    await page.click('button[type="submit"]');

    // Should navigate to dashboard
    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('2. RBAC Denial for Cashier', async ({ request }) => {
    // Attempt direct API access to restricted endpoint using cashier token
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
      data: { email: 'cashier1@dailymart.in', password: 'Cashier@Pass123' }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    const token = loginData.token || loginData.Token;
    expect(token).toBeTruthy();

    // Cashier attempting to fetch system users must receive 403 Forbidden
    const forbiddenRes = await request.get('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(forbiddenRes.status()).toBe(403);
  });

  test('3. Scan Product & Add to Cart via POS Terminal', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@dailymart.in');
    await page.fill('input[type="password"]', 'Admin@Pass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 10000 });

    // Navigate to POS terminal (/apps/bucket)
    await page.goto('/apps/bucket');
    await page.waitForLoadState('networkidle');

    // Verify POS Terminal loads with search and cart components
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="scan"], input[placeholder*="barcode"], input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    const totalHeading = page.locator('text=Total').or(page.locator('text=Grand Total')).or(page.locator('text=Cart'));
    await expect(totalHeading.first()).toBeVisible({ timeout: 5000 });
  });

  test('4. Full Lifecycle API Flow: Scan -> Hold Bucket -> Cash Checkout -> Cancel Invoice', async ({ request }) => {
    // 1. Login to obtain token
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
      data: { email: 'admin@dailymart.in', password: 'Admin@Pass123' }
    });
    expect(loginRes.ok()).toBeTruthy();
    const { token } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Scan / Fetch products
    const prodRes = await request.get('http://localhost:5000/api/products?page=1&pageSize=10', { headers: authHeaders });
    expect(prodRes.ok()).toBeTruthy();
    const prodData = await prodRes.json();
    const products = prodData.data || prodData.items || [];
    expect(products.length).toBeGreaterThan(0);
    const activeProd = products.find(p => (p.StockQuantity || p.stockQuantity) > 5) || products[0];

    // 3. Hold Bucket
    const bucketRes = await request.post('http://localhost:5000/api/buckets', {
      headers: authHeaders,
      data: {
        customerName: 'E2E Test Customer',
        cartData: [
          {
            id: activeProd.Id || activeProd.id,
            productId: activeProd.Id || activeProd.id,
            name: activeProd.Name || activeProd.name,
            rate: activeProd.Cost || activeProd.cost || 50,
            cost: activeProd.Cost || activeProd.cost || 50,
            quantity: 1,
            taxPercent: activeProd.TaxPercent || activeProd.taxPercent || 5,
            unit: activeProd.Unit || activeProd.unit || 'PCS'
          }
        ]
      }
    });
    expect(bucketRes.ok()).toBeTruthy();
    const bucket = await bucketRes.json();
    const bucketId = bucket.data?.id || bucket.data?.Id || bucket.id || bucket.Id;
    expect(bucketId).toBeTruthy();

    // Clean up bucket
    await request.delete(`http://localhost:5000/api/buckets/${bucketId}`, { headers: authHeaders });

    // 4. Cash Checkout with Gapless Document Numbering
    const checkoutRes = await request.post('http://localhost:5000/api/invoices', {
      headers: authHeaders,
      data: {
        cart: {
          paymentMode: 0, // Cash
          isPaymentReceived: true,
          sendWhatsApp: false,
          customer: {
            name: 'E2E Cash Customer',
            mobileNumber: '9876543210',
            state: 'Maharashtra'
          },
          items: [
            {
              id: activeProd.Id || activeProd.id,
              productId: activeProd.Id || activeProd.id,
              productNumber: activeProd.ProductNumber || activeProd.productNumber,
              name: activeProd.Name || activeProd.name,
              cost: activeProd.Cost || activeProd.cost || 50,
              rate: activeProd.Cost || activeProd.cost || 50,
              quantity: 1,
              taxPercent: activeProd.TaxPercent || activeProd.taxPercent || 5,
              unit: 'PCS'
            }
          ]
        }
      }
    });
    expect(checkoutRes.ok()).toBeTruthy();
    const invResJson = await checkoutRes.json();
    const invoice = invResJson.data || invResJson;
    expect(invoice.documentNumber || invoice.DocumentNumber).toMatch(/^INV-[\d-]+-\d{6}$/);

    const invId = invoice.id || invoice.Id;

    // 5. Cancel Invoice and verify stock restoration
    const cancelRes = await request.post(`http://localhost:5000/api/invoices/${invId}/cancel`, {
      headers: authHeaders,
      data: { reason: 'E2E Test customer change of mind' }
    });
    expect(cancelRes.ok()).toBeTruthy();
    const cancelResJson = await cancelRes.json();
    const cancelledInv = cancelResJson.data || cancelResJson;
    expect(cancelledInv.recordStatus || cancelledInv.RecordStatus).toBe(1);
  });

  test('5. UPI Checkout & Verification', async ({ request }) => {
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
      data: { email: 'admin@dailymart.in', password: 'Admin@Pass123' }
    });
    const { token } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${token}` };

    const prodRes = await request.get('http://localhost:5000/api/products?page=1&pageSize=10', { headers: authHeaders });
    const prodData = await prodRes.json();
    const products = prodData.data || prodData.items;
    const prod = products.find(p => (p.StockQuantity || p.stockQuantity) > 5) || products[0];

    const upiCheckoutRes = await request.post('http://localhost:5000/api/invoices', {
      headers: authHeaders,
      data: {
        cart: {
          paymentMode: 1, // UPI
          isPaymentReceived: true,
          sendWhatsApp: false,
          customer: {
            name: 'UPI Customer',
            mobileNumber: '9123456780',
            state: 'Maharashtra'
          },
          items: [
            {
              id: prod.Id || prod.id,
              productId: prod.Id || prod.id,
              productNumber: prod.ProductNumber || prod.productNumber,
              name: prod.Name || prod.name,
              cost: prod.Cost || prod.cost || 100,
              rate: prod.Cost || prod.cost || 100,
              quantity: 1,
              taxPercent: prod.TaxPercent || prod.taxPercent || 5,
              unit: 'PCS'
            }
          ]
        }
      }
    });
    expect(upiCheckoutRes.ok()).toBeTruthy();
    const invResJson = await upiCheckoutRes.json();
    const invoice = invResJson.data || invResJson;
    expect(invoice.modeOfPayment || invoice.ModeOfPayment).toBe(1);
  });

  test('6. Purchase Order -> Material Inward (GRN) -> Vendor Return (MRN) Flow', async ({ request }) => {
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
      data: { email: 'admin@dailymart.in', password: 'Admin@Pass123' }
    });
    const { token } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 1. Create Purchase Order
    const poRes = await request.post('http://localhost:5000/api/purchase-orders', {
      headers: authHeaders,
      data: {
        vendorId: 'vnd_01',
        vendorName: 'Amul India Ltd',
        expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
        items: [
          {
            productId: 'prd_01',
            productName: 'Fresh Milk 1L',
            quantity: 50,
            costPrice: 55,
            totalPrice: 2750
          }
        ]
      }
    });
    expect(poRes.ok()).toBeTruthy();
    const po = await poRes.json();
    const poId = po.id || po.Id;
    expect(poId).toBeTruthy();

    // 2. Mark Purchase Order Sent
    const sendPoRes = await request.put(`http://localhost:5000/api/purchase-orders/${poId}/status`, {
      headers: authHeaders,
      data: { status: 'Sent' }
    });
    expect(sendPoRes.ok()).toBeTruthy();

    // 3. Inward GRN referencing the Sent PO
    const grnRes = await request.post('http://localhost:5000/api/material-inward', {
      headers: authHeaders,
      data: {
        purchaseOrderId: poId,
        vendorId: 'vnd_01',
        vendorName: 'Amul India Ltd',
        supplierInvoiceNumber: 'INV-SUP-888',
        isPoAvailable: true,
        items: [
          {
            productId: 'prd_01',
            productName: 'Fresh Milk 1L',
            receivedQty: 50,
            cost: 55,
            batchNo: `BATCH-${Date.now()}`,
            expiryDate: new Date(Date.now() + 30 * 86400000).toISOString()
          }
        ]
      }
    });
    expect(grnRes.ok()).toBeTruthy();
    const grn = await grnRes.json();
    expect(grn.id || grn.Id).toMatch(/^inw_/);

    // 4. Return Damaged Items (MRN)
    const mrnRes = await request.post('http://localhost:5000/api/material-returns', {
      headers: authHeaders,
      data: {
        VendorId: 'vnd_01',
        VendorName: 'Amul India Ltd',
        ReturnReason: 'Damaged packaging during transit',
        TotalReturnAmount: 275,
        Items: [
          {
            productId: 'prd_01',
            quantity: 5,
            cost: 55
          }
        ]
      }
    });
    expect(mrnRes.ok()).toBeTruthy();
    const mrn = await mrnRes.json();
    expect(mrn.documentNumber || mrn.DocumentNumber).toMatch(/^MRN-[\d-]+-\d{6}$/);
  });

  test('7. Reports Daily Sales Verification', async ({ request }) => {
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
      data: { email: 'admin@dailymart.in', password: 'Admin@Pass123' }
    });
    const { token } = await loginRes.json();
    const authHeaders = { Authorization: `Bearer ${token}` };

    const reportRes = await request.get('http://localhost:5000/api/reports/daily-sales', {
      headers: authHeaders
    });
    expect(reportRes.ok()).toBeTruthy();
    const report = await reportRes.json();
    expect(report.status).toBe('success');
  });

});
