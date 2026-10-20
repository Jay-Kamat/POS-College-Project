import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure cart calculation utilities matching POS terminal business logic
 */
function calculateLineItem({ rate, quantity = 1, taxPercent = 0, discountPercent = 0 }) {
  const gross = rate * quantity;
  const discountAmount = Math.round((gross * (discountPercent / 100)) * 100) / 100;
  const taxable = Math.max(0, gross - discountAmount);
  const taxAmount = Math.round((taxable * (taxPercent / 100)) * 100) / 100;
  const lineTotal = taxable + taxAmount;
  return { gross, discountAmount, taxable, taxAmount, lineTotal };
}

function calculateCartTotals(items = [], isInterState = false) {
  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const line = calculateLineItem(item);
    subtotal += line.taxable;
    totalTax += line.taxAmount;
  }

  const rawTotal = subtotal + totalTax;
  const finalGrandTotal = Math.round(rawTotal);
  const roundOff = Math.round((finalGrandTotal - rawTotal) * 100) / 100;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = Math.round(totalTax * 100) / 100;
  } else {
    cgst = Math.round((totalTax / 2) * 100) / 100;
    sgst = Math.round((totalTax - cgst) * 100) / 100;
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cgst,
    sgst,
    igst,
    totalTax: Math.round(totalTax * 100) / 100,
    roundOff,
    grandTotal: finalGrandTotal
  };
}

describe('Cart Calculation Tests', () => {
  test('Single line item calculation without tax and discount', () => {
    const line = calculateLineItem({ rate: 100, quantity: 2, taxPercent: 0, discountPercent: 0 });
    assert.equal(line.gross, 200);
    assert.equal(line.taxable, 200);
    assert.equal(line.taxAmount, 0);
    assert.equal(line.lineTotal, 200);
  });

  test('Single line item calculation with 18% GST slab', () => {
    const line = calculateLineItem({ rate: 100, quantity: 1, taxPercent: 18, discountPercent: 0 });
    assert.equal(line.taxable, 100);
    assert.equal(line.taxAmount, 18);
    assert.equal(line.lineTotal, 118);
  });

  test('Single line item calculation with 10% discount and 5% GST', () => {
    const line = calculateLineItem({ rate: 200, quantity: 1, taxPercent: 5, discountPercent: 10 });
    assert.equal(line.discountAmount, 20);
    assert.equal(line.taxable, 180);
    assert.equal(line.taxAmount, 9);
    assert.equal(line.lineTotal, 189);
  });

  test('Intra-state cart totals splits tax equally into CGST and SGST', () => {
    const items = [
      { rate: 100, quantity: 1, taxPercent: 18, discountPercent: 0 },
      { rate: 50, quantity: 2, taxPercent: 12, discountPercent: 0 }
    ];
    // Line 1: taxable 100, tax 18
    // Line 2: taxable 100, tax 12
    // Total taxable: 200, Total tax: 30
    const totals = calculateCartTotals(items, false);
    assert.equal(totals.subtotal, 200);
    assert.equal(totals.totalTax, 30);
    assert.equal(totals.cgst, 15);
    assert.equal(totals.sgst, 15);
    assert.equal(totals.igst, 0);
    assert.equal(totals.grandTotal, 230);
    assert.equal(totals.roundOff, 0);
  });

  test('Inter-state cart totals assigns full tax to IGST', () => {
    const items = [
      { rate: 100, quantity: 1, taxPercent: 18, discountPercent: 0 }
    ];
    const totals = calculateCartTotals(items, true);
    assert.equal(totals.cgst, 0);
    assert.equal(totals.sgst, 0);
    assert.equal(totals.igst, 18);
    assert.equal(totals.grandTotal, 118);
  });

  test('Round-off rounds to nearest rupee correctly', () => {
    // 100 + 5.85 tax = 105.85 => GrandTotal 106, RoundOff +0.15
    const items = [
      { rate: 117, quantity: 1, taxPercent: 5, discountPercent: 0 } // taxable 117, tax 5.85, total 122.85
    ];
    const totals = calculateCartTotals(items, false);
    assert.equal(totals.grandTotal, 123);
    assert.equal(totals.roundOff, 0.15);
  });
});
