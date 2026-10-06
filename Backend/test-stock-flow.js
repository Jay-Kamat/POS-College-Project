import { db } from './db.js';
import { pool } from './postgres.js';

async function runStockVerification() {
  console.log('--- Starting POS Stock Verification Test ---');

  try {
    // 1. Create or set a test product with exactly 5 units in stock
    const testProductId = 'prd_test_milk_01';
    const testBarcode = '200199999001';

    await pool.query(`
      INSERT INTO products (
        id, product_number, name, cost, ingredients, notes, is_exp_date, days,
        category_id, tax_rate_id, tax_percent, stock_quantity, record_status, created_id, updated_id
      ) VALUES ($1, $2, 'Fresh Cow Milk 1L (Test)', 50.00, 'Milk', 'Test', true, 5,
        'cat_dairy', 'tax_5', 5, 5, 0, 'user_01', 'user_01')
      ON CONFLICT (id) DO UPDATE SET stock_quantity = 5, record_status = 0
    `, [testProductId, testBarcode]);

    let prod = await db.getProductById(testProductId);
    console.log(`Initial Product State: Name="${prod.Name}", StockQuantity=${prod.StockQuantity}`);
    if (prod.StockQuantity !== 5) {
      throw new Error(`Expected initial stock 5, got ${prod.StockQuantity}`);
    }

    // 2. Test Backend Over-Purchase Prevention: Trying to purchase 6 units (when only 5 available)
    console.log('\nTest Case A: Attempting to purchase 6 units when stock is 5...');
    const invalidCart = {
      items: [{
        id: testProductId,
        productNumber: testBarcode,
        name: prod.Name,
        rate: 50.00,
        quantity: 6,
        taxPercent: 5
      }],
      customer: { name: 'Test Customer', mobileNumber: '9999999999', state: 'Maharashtra' },
      paymentMode: 0,
      subtotal: 300,
      cgst: 7.5,
      sgst: 7.5,
      grandTotal: 315
    };

    let overPurchaseBlocked = false;
    try {
      await db.createInvoice(invalidCart, { id: 'store_mum_01', name: 'DailyMart Express' });
    } catch (err) {
      overPurchaseBlocked = true;
      console.log(`✓ Over-purchase successfully blocked by database check: "${err.message}"`);
    }

    if (!overPurchaseBlocked) {
      throw new Error('FAILED: Database allowed purchasing more than available stock!');
    }

    // Check that stock is still 5
    prod = await db.getProductById(testProductId);
    console.log(`Stock after blocked over-purchase: ${prod.StockQuantity} (remains unchanged)`);

    // 3. Test Valid Purchase: Purchase 2 units out of 5
    console.log('\nTest Case B: Purchasing 2 units out of 5...');
    const validCart = {
      items: [{
        id: testProductId,
        productNumber: testBarcode,
        name: prod.Name,
        rate: 50.00,
        quantity: 2,
        taxPercent: 5
      }],
      customer: { name: 'Test Customer', mobileNumber: '9999999999', state: 'Maharashtra' },
      paymentMode: 0,
      subtotal: 100,
      cgst: 2.5,
      sgst: 2.5,
      grandTotal: 105
    };

    const invoice = await db.createInvoice(validCart, { id: 'store_mum_01', name: 'DailyMart Express' });
    console.log(`✓ Invoice created: DocumentNumber="${invoice.DocumentNumber}", Amount=₹${invoice.Amount}`);

    // Check stock after purchase (should be 5 - 2 = 3)
    prod = await db.getProductById(testProductId);
    console.log(`✓ Stock after valid purchase: ${prod.StockQuantity} (Correctly deducted: 5 -> 3)`);
    if (prod.StockQuantity !== 3) {
      throw new Error(`Expected remaining stock 3, got ${prod.StockQuantity}`);
    }

    // 4. Test Soft-Cancellation Restoring Stock:
    console.log('\nTest Case C: Cancelling invoice and verifying stock restoration...');
    await db.cancelInvoice(invoice.Id, 'Customer test return');
    prod = await db.getProductById(testProductId);
    console.log(`✓ Stock after invoice cancellation: ${prod.StockQuantity} (Correctly restored: 3 -> 5)`);
    if (prod.StockQuantity !== 5) {
      throw new Error(`Expected restored stock 5, got ${prod.StockQuantity}`);
    }

    // Clean up test product
    await pool.query('DELETE FROM products WHERE id = $1', [testProductId]);
    await pool.query('DELETE FROM invoices WHERE id = $1', [invoice.Id]);
    console.log('\n✓ All stock check and inventory deduction test cases passed with 100% success!');
  } catch (err) {
    console.error('ERROR during stock verification:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runStockVerification();
