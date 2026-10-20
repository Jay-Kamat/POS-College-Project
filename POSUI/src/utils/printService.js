import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

/**
 * Universal POS Printing Service
 * Conforms to Indian GST compliance and thermal/A4 printing specifications in docs/INVOICE_RECEIPT_SPEC.md.
 * 
 * Supports:
 *  1. printThermalReceipt(invoice, options) - 80mm / 58mm POS thermal receipt rolls
 *  2. printA4Invoice(invoice, options)      - Formal GST Tax Invoice on A4 paper
 *  3. printBarcodeLabels(items, options)    - Shelf/product barcode stickers (Unit QR & Barcode)
 *  4. printDebitNote(note, options)         - Vendor Material Return Debit Note
 */

/**
 * Converts numeric amount to Indian Rupee Words (e.g. 315 -> Three Hundred and Fifteen Rupees Only)
 */
export function numberToWordsINR(amount) {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }

  return inWords(num).trim() + ' Rupees Only';
}

/**
 * Executes print via a hidden iframe to prevent modifying or distorting the active React DOM.
 */
function printHtmlViaIframe(htmlContent, title = 'POS Print') {
  return new Promise((resolve) => {
    let iframe = document.getElementById('pos_print_iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'pos_print_iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow || iframe.contentDocument;
    const iframeDoc = doc.document || doc;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Allow styles, fonts, and images to settle before triggering print
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        resolve(true);
      } catch (err) {
        console.error('Error invoking iframe print:', err);
        // Fallback to opening a print window if iframe printing is blocked
        const printWin = window.open('', '_blank', 'width=800,height=600');
        if (printWin) {
          printWin.document.write(htmlContent);
          printWin.document.close();
          printWin.focus();
          printWin.print();
          printWin.close();
        }
        resolve(false);
      }
    }, 250);
  });
}

/**
 * 1. Thermal POS Receipt (80mm / 58mm standard)
 */
export function printThermalReceipt(invoice, options = {}) {
  if (!invoice) return;

  const paperWidth = options.paperWidth || '80mm';
  const widthPx = paperWidth === '58mm' ? '200px' : '290px';
  const isCancelled = invoice.RecordStatus === 1;

  // Derive tax slabs summary
  const taxSlabs = {};
  (invoice.Items || []).forEach(item => {
    const rate = Number(item.TaxPercent || 0);
    const key = `${rate}%`;
    const lineBase = Number(item.Rate || 0) * Number(item.Quantity || 1);
    const cgst = Number(item.Cgst || 0);
    const sgst = Number(item.Sgst || 0);
    const igst = Number(item.Igst || 0);

    if (!taxSlabs[key]) {
      taxSlabs[key] = { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    }
    taxSlabs[key].taxable += lineBase;
    taxSlabs[key].cgst += cgst;
    taxSlabs[key].sgst += sgst;
    taxSlabs[key].igst += igst;
  });

  const formattedDate = invoice.Date ? new Date(invoice.Date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const formattedTime = invoice.Date ? new Date(invoice.Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const paymentModeStr = invoice.ModeOfPayment === 0 ? 'Cash' : (invoice.ModeOfPayment === 1 ? 'UPI' : 'Card');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${invoice.DocumentNumber || 'POS'}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0mm;
    }
    body {
      margin: 0;
      padding: 6px 8px;
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      width: ${widthPx};
      max-width: ${widthPx};
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
    .store-name {
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .store-info {
      font-size: 10px;
      line-height: 1.2;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .items-table th {
      border-bottom: 1px dashed #000;
      padding: 3px 0;
      font-size: 10px;
      text-align: left;
    }
    .items-table td {
      padding: 2px 0;
      font-size: 10.5px;
      vertical-align: top;
    }
    .tax-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-top: 3px;
    }
    .tax-table th, .tax-table td {
      padding: 1px 0;
      text-align: right;
    }
    .tax-table th:first-child, .tax-table td:first-child {
      text-align: left;
    }
    .grand-total {
      font-size: 14px;
      font-weight: 800;
      margin: 4px 0;
    }
    .cancelled-badge {
      border: 2px solid #000;
      text-align: center;
      font-weight: 800;
      font-size: 14px;
      padding: 3px;
      margin: 6px 0;
      letter-spacing: 2px;
    }
    .footer-note {
      font-size: 9.5px;
      text-align: center;
      margin-top: 6px;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  ${isCancelled ? '<div class="cancelled-badge">*** CANCELLED ***</div>' : ''}

  <div class="text-center">
    <div class="store-name">${invoice.StoreName || 'DailyMart Express'}</div>
    <div class="store-info">${invoice.StoreAddress || 'Plot 12, Commercial Hub, MG Road, Mumbai'}</div>
    <div class="store-info">GSTIN: ${invoice.StoreGst || '27AABCU9603R1ZM'}</div>
    <div class="store-info">FSSAI: ${invoice.StoreFssai || '11522001000123'}</div>
    <div class="store-info">Phone: +91 98765 43210</div>
  </div>

  <div class="double-divider"></div>

  <div class="flex-row">
    <span>INV NO: <strong>${invoice.DocumentNumber || 'INV-0001'}</strong></span>
  </div>
  <div class="flex-row">
    <span>DATE: ${formattedDate} ${formattedTime}</span>
    <span>PAY: <strong>${paymentModeStr}</strong></span>
  </div>
  <div class="flex-row">
    <span>CUST: ${(invoice.CustomerName || 'Walk-in Customer').slice(0, 20)}</span>
  </div>
  ${invoice.MobileNumber ? `<div class="flex-row"><span>MOB: +91 ${invoice.MobileNumber}</span></div>` : ''}

  <div class="divider"></div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 44%;">ITEM</th>
        <th style="width: 18%; text-align: center;">QTY/UNIT</th>
        <th style="width: 18%; text-align: right;">RATE</th>
        <th style="width: 20%; text-align: right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${(invoice.Items || []).map(item => {
        const u = (item.Unit || item.unit || '').toUpperCase();
        const q = Number(item.Quantity || 1);
        const qStr = q % 1 === 0 ? q : q.toFixed(3);
        return `
        <tr>
          <td>${item.ProductName}</td>
          <td style="text-align: center;">${qStr} ${u ? `<span style="font-size: 8.5px;">${u}</span>` : ''}</td>
          <td style="text-align: right;">${Number(item.Rate || 0).toFixed(2)}</td>
          <td style="text-align: right;" class="bold">${Number(item.Total || 0).toFixed(2)}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="flex-row">
    <span>TAXABLE VALUE:</span>
    <span>₹${Number(invoice.Subtotal || 0).toFixed(2)}</span>
  </div>
  <div class="flex-row">
    <span>CGST:</span>
    <span>₹${Number(invoice.Cgst || 0).toFixed(2)}</span>
  </div>
  <div class="flex-row">
    <span>SGST:</span>
    <span>₹${Number(invoice.Sgst || 0).toFixed(2)}</span>
  </div>
  ${invoice.Igst > 0 ? `
  <div class="flex-row">
    <span>IGST:</span>
    <span>₹${Number(invoice.Igst || 0).toFixed(2)}</span>
  </div>` : ''}
  ${Number(invoice.RoundOff || 0) !== 0 ? `
  <div class="flex-row">
    <span>ROUND OFF:</span>
    <span>${Number(invoice.RoundOff) > 0 ? '+' : ''}₹${Number(invoice.RoundOff).toFixed(2)}</span>
  </div>` : ''}

  <div class="double-divider"></div>

  <div class="flex-row grand-total">
    <span>GRAND TOTAL:</span>
    <span>₹${Number(invoice.Amount || 0).toFixed(2)}</span>
  </div>

  <div class="double-divider"></div>

  <div class="bold" style="font-size: 10px; margin-top: 4px;">TAX SUMMARY:</div>
  <table class="tax-table">
    <thead>
      <tr>
        <th>Rate</th>
        <th>Taxable</th>
        <th>CGST</th>
        <th>SGST</th>
      </tr>
    </thead>
    <tbody>
      ${Object.keys(taxSlabs).map(k => `
        <tr>
          <td>${k}</td>
          <td>₹${taxSlabs[k].taxable.toFixed(2)}</td>
          <td>₹${taxSlabs[k].cgst.toFixed(2)}</td>
          <td>₹${taxSlabs[k].sgst.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="footer-note">
    <strong>Thank You For Shopping With Us!</strong><br />
    No Exchange After 7 Days.<br />
    Computer Generated Tax Invoice
  </div>
</body>
</html>
`;

  return printHtmlViaIframe(html, `Receipt_${invoice.DocumentNumber}`);
}

/**
 * 2. Formal A4 Tax Invoice (GST Compliant)
 */
export function printA4Invoice(invoice, options = {}) {
  if (!invoice) return;

  const isCancelled = invoice.RecordStatus === 1;
  const formattedDate = invoice.Date ? new Date(invoice.Date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const amountWords = numberToWordsINR(invoice.Amount);
  const paymentModeStr = invoice.ModeOfPayment === 0 ? 'Cash' : (invoice.ModeOfPayment === 1 ? 'UPI' : 'Card');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tax Invoice - ${invoice.DocumentNumber || 'INV'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #1F2937;
      background: #fff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-card {
      width: 100%;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #3B5BDB;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: top;
    }
    .store-brand {
      font-size: 24px;
      font-weight: 800;
      color: #1F2937;
      margin-bottom: 3px;
    }
    .store-address {
      font-size: 11px;
      color: #4B5563;
      line-height: 1.35;
    }
    .invoice-title {
      font-size: 22px;
      font-weight: 800;
      color: #3B5BDB;
      text-align: right;
      letter-spacing: 0.5px;
    }
    .invoice-meta {
      font-size: 12px;
      text-align: right;
      margin-top: 4px;
    }
    .meta-box {
      width: 100%;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      margin-bottom: 16px;
      background: #F8FAFC;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
    }
    .meta-table td {
      padding: 8px 12px;
      vertical-align: top;
      width: 50%;
      font-size: 11.5px;
    }
    .meta-table td:first-child {
      border-right: 1px solid #E2E8F0;
    }
    .meta-title {
      font-size: 10.5px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .items-table th {
      background: #F1F5F9;
      color: #334155;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      padding: 8px 6px;
      border: 1px solid #CBD5E1;
      text-align: right;
    }
    .items-table th:first-child, .items-table th:nth-child(2) {
      text-align: left;
    }
    .items-table td {
      padding: 7px 6px;
      border: 1px solid #E2E8F0;
      font-size: 11.5px;
      text-align: right;
    }
    .items-table td:first-child, .items-table td:nth-child(2) {
      text-align: left;
    }
    .items-table tbody tr:nth-child(even) {
      background: #FAFAFA;
    }
    .totals-wrapper {
      width: 100%;
      margin-bottom: 16px;
    }
    .totals-table {
      width: 320px;
      float: right;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 4px 8px;
      font-size: 12px;
    }
    .totals-table tr.grand-row td {
      font-size: 15px;
      font-weight: 800;
      color: #1F2937;
      border-top: 2px solid #3B5BDB;
      border-bottom: 2px solid #3B5BDB;
      padding: 6px 8px;
    }
    .words-box {
      clear: both;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 11.5px;
    }
    .footer-table {
      width: 100%;
      margin-top: 24px;
      border-top: 1px solid #CBD5E1;
      padding-top: 12px;
    }
    .footer-table td {
      vertical-align: top;
      font-size: 10.5px;
      color: #4B5563;
    }
    .sign-box {
      text-align: center;
      width: 180px;
      float: right;
      border-top: 1px solid #94A3B8;
      padding-top: 4px;
      margin-top: 40px;
      font-weight: 700;
    }
    .watermark-cancelled {
      position: absolute;
      top: 35%;
      left: 15%;
      font-size: 80px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.12);
      transform: rotate(-30deg);
      border: 6px solid rgba(220, 38, 38, 0.12);
      padding: 10px 40px;
      border-radius: 12px;
      letter-spacing: 8px;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    ${isCancelled ? '<div class="watermark-cancelled">CANCELLED</div>' : ''}

    <table class="header-table">
      <tr>
        <td style="width: 60%;">
          <div class="store-brand">${invoice.StoreName || 'DailyMart Express'}</div>
          <div class="store-address">${invoice.StoreAddress || 'Plot 12, Commercial Hub, MG Road, Mumbai, Maharashtra 400001'}</div>
          <div class="store-address"><strong>GSTIN:</strong> ${invoice.StoreGst || '27AABCU9603R1ZM'} | <strong>FSSAI:</strong> ${invoice.StoreFssai || '11522001000123'}</div>
          <div class="store-address">State: Maharashtra (Code: 27) | Phone: +91 98765 43210</div>
        </td>
        <td style="width: 40%;">
          <div class="invoice-title">TAX INVOICE</div>
          <div class="invoice-meta"><strong>Invoice No:</strong> ${invoice.DocumentNumber}</div>
          <div class="invoice-meta"><strong>Date:</strong> ${formattedDate}</div>
          <div class="invoice-meta"><strong>Payment Mode:</strong> ${paymentModeStr}</div>
          ${isCancelled ? '<div class="invoice-meta" style="color: #DC2626; font-weight: bold;">STATUS: CANCELLED</div>' : ''}
        </td>
      </tr>
    </table>

    <div class="meta-box">
      <table class="meta-table">
        <tr>
          <td>
            <div class="meta-title">Bill To (Customer Details)</div>
            <div style="font-size: 13px; font-weight: 700;">${invoice.CustomerName || 'Walk-in Customer'}</div>
            ${invoice.MobileNumber ? `<div>Phone: +91 ${invoice.MobileNumber}</div>` : ''}
            ${invoice.CustomerGst ? `<div><strong>Customer GSTIN:</strong> ${invoice.CustomerGst}</div>` : ''}
            <div>State: ${invoice.CustomerState || 'Maharashtra'} (Code: 27)</div>
          </td>
          <td>
            <div class="meta-title">Invoice & Dispatch Details</div>
            <div><strong>Place of Supply:</strong> Maharashtra (27)</div>
            <div><strong>Reverse Charge:</strong> No</div>
            <div><strong>Terminal:</strong> POS Terminal 01</div>
            <div><strong>Cashier:</strong> Jay (Admin)</div>
          </td>
        </tr>
      </table>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 35%;">Description of Goods</th>
          <th style="width: 12%; text-align: center;">Qty & Unit</th>
          <th style="width: 12%;">Rate (₹)</th>
          <th style="width: 12%;">Taxable (₹)</th>
          <th style="width: 10%;">GST (%)</th>
          <th style="width: 14%;">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.Items || []).map((item, idx) => {
          const u = (item.Unit || item.unit || 'PCS').toUpperCase();
          const q = Number(item.Quantity || 1);
          const qStr = q % 1 === 0 ? q : q.toFixed(3);
          return `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${item.ProductName}</strong></td>
            <td style="text-align: center;"><strong>${qStr}</strong> <span style="font-size: 11px; color: #555;">${u}</span></td>
            <td>${Number(item.Rate || 0).toFixed(2)}</td>
            <td>${(Number(item.Rate || 0) * q).toFixed(2)}</td>
            <td>${item.TaxPercent || 5}%</td>
            <td><strong>${Number(item.Total || 0).toFixed(2)}</strong></td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="totals-wrapper">
      <table class="totals-table">
        <tr>
          <td>Taxable Subtotal:</td>
          <td style="text-align: right; font-weight: 600;">₹${Number(invoice.Subtotal || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Total CGST:</td>
          <td style="text-align: right; font-weight: 600;">₹${Number(invoice.Cgst || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td>Total SGST:</td>
          <td style="text-align: right; font-weight: 600;">₹${Number(invoice.Sgst || 0).toFixed(2)}</td>
        </tr>
        ${Number(invoice.Igst || 0) > 0 ? `
        <tr>
          <td>Total IGST:</td>
          <td style="text-align: right; font-weight: 600;">₹${Number(invoice.Igst || 0).toFixed(2)}</td>
        </tr>` : ''}
        ${Number(invoice.RoundOff || 0) !== 0 ? `
        <tr>
          <td>Round Off:</td>
          <td style="text-align: right; font-weight: 600;">${Number(invoice.RoundOff) > 0 ? '+' : ''}₹${Number(invoice.RoundOff).toFixed(2)}</td>
        </tr>` : ''}
        <tr class="grand-row">
          <td>GRAND TOTAL:</td>
          <td style="text-align: right; color: #3B5BDB;">₹${Number(invoice.Amount || 0).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="words-box">
      <strong>Amount in Words:</strong> ${amountWords}
    </div>

    ${isCancelled && invoice.CancellationReason ? `
    <div style="background: #FEF2F2; border: 1px solid #F87171; padding: 8px 12px; border-radius: 4px; color: #991B1B; margin-bottom: 16px; font-size: 11.5px;">
      <strong>Cancellation Notice:</strong> Cancelled on ${new Date(invoice.CancelledAt || invoice.Updated || Date.now()).toLocaleString('en-IN')}. Reason: ${invoice.CancellationReason}
    </div>` : ''}

    <table class="footer-table">
      <tr>
        <td style="width: 65%;">
          <div style="font-weight: 700; margin-bottom: 2px;">Terms & Conditions:</div>
          <div>1. Goods once sold can be exchanged within 7 days against original invoice.</div>
          <div>2. Perishable items and cut bakery goods are non-returnable.</div>
          <div>3. Subject to Mumbai Jurisdiction.</div>
        </td>
        <td style="width: 35%;">
          <div class="sign-box">
            Authorized Signatory<br />
            <span style="font-size: 9.5px; font-weight: normal; color: #64748B;">For ${invoice.StoreName || 'DailyMart Express'}</span>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

  return printHtmlViaIframe(html, `Invoice_${invoice.DocumentNumber}`);
}

/**
 * 3. Unique Unit QR & Barcode Labels Printing (Material Inward)
 * Supports multi-unit packet serialization (e.g. 7 milk packets -> 7 unique stickers),
 * rendered with vector SVG QR codes and Code 128 barcodes, printable in one PDF document.
 */
export async function printBarcodeLabels(itemsOrUnits, options = {}) {
  if (!itemsOrUnits || itemsOrUnits.length === 0) return;

  const storeName = options.storeName || 'POS Supermarket';
  const layout = options.layout || 'sheet'; // 'sheet' (A4 Multi-label PDF) | 'thermal' (Individual roll)
  const paperWidth = options.paperWidth || '80mm';

  // Sizing parameters for thermal roll printing:
  // - 80mm roll (Standard POS Counter Thermal Roll): 76mm width, 44mm QR, 14px bold title, 13px serial
  // - 58mm roll (Compact POS Thermal Roll): 54mm width, 34mm QR, 12px title, 11px serial
  // - 50mm roll (Compact Sticker Roll): 48mm width, 30mm QR, 11px title, 10px serial
  const isThermal = layout === 'thermal';
  const is58mm = paperWidth === '58mm';
  const is50mm = paperWidth === '50mm';

  const cardWidth = is58mm ? '54mm' : (is50mm ? '48mm' : '76mm');
  const cardPadding = is58mm ? '3mm 4mm 5mm 4mm' : (is50mm ? '2.5mm 3mm 4mm 3mm' : '4mm 5mm 6mm 5mm');
  const qrBoxSize = is58mm ? '34mm' : (is50mm ? '30mm' : '44mm');
  const storeTagSize = is58mm ? '10px' : (is50mm ? '9px' : '11.5px');
  const badgeSize = is58mm ? '9.5px' : (is50mm ? '8.5px' : '10.5px');
  const titleSize = is58mm ? '12px' : (is50mm ? '11px' : '14px');
  const serialSize = is58mm ? '11px' : (is50mm ? '10px' : '13px');
  const footerSize = is58mm ? '10px' : (is50mm ? '9.5px' : '11.5px');
  const mrpSize = is58mm ? '12px' : (is50mm ? '11px' : '14px');

  // 1. Expand items into individual unit labels
  const unitLabels = [];
  (itemsOrUnits || []).forEach((item, itemIdx) => {
    if (item.Serial && (item.UnitIndex !== undefined || item.QrPayload)) {
      // Already a unit-level label object
      unitLabels.push(item);
    } else if (Array.isArray(item.UnitBarcodes) && item.UnitBarcodes.length > 0) {
      // Line item containing precomputed UnitBarcodes
      item.UnitBarcodes.forEach(u => unitLabels.push(u));
    } else {
      // Line item without UnitBarcodes - expand according to ReceivedQty
      const baseBarcode = item.Barcode || item.ProductNumber || `200100${String(Date.now()).slice(-4)}${String(itemIdx + 1).padStart(2, '0')}`;
      const qty = Math.max(1, Math.round(Number(item.ReceivedQty || item.Quantity || 1)));
      const padLen = qty >= 100 ? 3 : 2;
      for (let i = 1; i <= qty; i++) {
        const serial = `${baseBarcode}-${String(i).padStart(padLen, '0')}`;
        const qrPayload = JSON.stringify({
          barcode: baseBarcode,
          serial: serial,
          id: item.ProductId,
          name: item.ProductName,
          unit: `${i}/${qty}`,
          exp: item.ExpiryDate || '',
          mrp: Number((Number(item.Rate || 0) * 1.3).toFixed(2))
        });
        unitLabels.push({
          UnitIndex: i,
          TotalUnits: qty,
          Serial: serial,
          Barcode: baseBarcode,
          QrPayload: qrPayload,
          ProductName: item.ProductName,
          ProductId: item.ProductId,
          ExpiryDate: item.ExpiryDate || 'N/A',
          Rate: Number(item.Rate || 0),
          Mrp: Number((Number(item.Rate || 0) * 1.3).toFixed(2)),
          Unit: item.Unit || 'PCS'
        });
      }
    }
  });

  if (unitLabels.length === 0) return;

  // 2. Generate vector / high-res QR code for each unit's exact product payload
  const cardsHtml = await Promise.all(unitLabels.map(async (unit) => {
    let qrElement = '';
    const qrData = unit.QrPayload || unit.Serial || unit.Barcode;

    try {
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 480,
        color: { dark: '#000000', light: '#ffffff' }
      });
      qrElement = `<img src="${qrDataUrl}" class="qr-img" alt="QR Code" />`;
    } catch (e) {
      try {
        const qrSvg = await QRCode.toString(qrData, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' }
        });
        qrElement = `<div class="qr-svg-wrap">${qrSvg}</div>`;
      } catch (err2) {
        qrElement = `<div class="qr-err">QR Code Error</div>`;
      }
    }

    const mrp = unit.Mrp ? Number(unit.Mrp).toFixed(2) : (Number(unit.Rate || 0) * 1.3).toFixed(2);
    const unitBadge = unit.TotalUnits ? `Packet ${unit.UnitIndex} of ${unit.TotalUnits}` : 'Unit 1';
    const serial = unit.Serial || unit.Barcode || '';

    return `
      <div class="label-card">
        <div class="card-header">
          <span class="store-tag">${storeName}</span>
          <span class="pkt-badge">${unitBadge}</span>
        </div>

        <div class="prod-title" title="${unit.ProductName}">${unit.ProductName}</div>

        <div class="qr-center-box">
          ${qrElement}
        </div>

        <div class="serial-text">${serial}</div>

        <div class="card-footer">
          <span class="exp-date">Exp: <strong>${unit.ExpiryDate || 'N/A'}</strong></span>
          <span class="mrp-price">MRP: <strong>₹${mrp}</strong></span>
        </div>
      </div>
    `;
  }));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Material Inward Unit QR Labels (${unitLabels.length} Packets)</title>
  <style>
    @page {
      size: ${isThermal ? (paperWidth + ' auto') : 'A4 portrait'};
      margin: ${isThermal ? '0mm' : '8mm'};
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    ${isThermal ? `
      .grid {
        display: block;
        padding: 0;
        margin: 0;
      }
      .label-card {
        width: ${cardWidth};
        max-width: ${cardWidth};
        margin: 0 auto;
        padding: ${cardPadding};
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        text-align: center;
        page-break-after: always;
        break-after: page;
        page-break-inside: avoid;
        break-inside: avoid;
        background: #ffffff;
        border-bottom: 2px dashed #000000;
        margin-bottom: 4mm;
        box-sizing: border-box;
      }
      .card-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1.5px solid #000000;
        padding-bottom: 2px;
        margin-bottom: 2px;
      }
      .store-tag {
        font-size: ${storeTagSize};
        font-weight: 900;
        letter-spacing: 0.8px;
        color: #000000;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 65%;
      }
      .pkt-badge {
        font-size: ${badgeSize};
        font-weight: 800;
        background: #000000;
        color: #ffffff;
        padding: 1.5px 6px;
        border-radius: 3px;
        letter-spacing: 0.4px;
      }
      .prod-title {
        width: 100%;
        font-size: ${titleSize};
        font-weight: 800;
        color: #000000;
        line-height: 1.25;
        margin: 3px 0;
        word-break: break-word;
      }
      .qr-center-box {
        width: ${qrBoxSize};
        height: ${qrBoxSize};
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 2mm auto;
      }
      .qr-center-box img, .qr-center-box svg {
        width: ${qrBoxSize} !important;
        height: ${qrBoxSize} !important;
        object-fit: contain;
        display: block;
      }
      .serial-text {
        font-family: 'Courier New', Courier, monospace;
        font-size: ${serialSize};
        font-weight: 900;
        letter-spacing: 1.5px;
        color: #000000;
        margin: 2px 0 3px 0;
        line-height: 1.2;
      }
      .card-footer {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1.5px dashed #000000;
        padding-top: 3px;
        font-size: ${footerSize};
        color: #000000;
      }
      .exp-date strong {
        color: #000000;
        font-weight: 800;
      }
      .mrp-price strong {
        color: #000000;
        font-size: ${mrpSize};
        font-weight: 900;
      }
    ` : `
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 5mm;
      }
      .label-card {
        border: 1.5px solid #cbd5e1;
        border-radius: 6px;
        padding: 4mm 5mm;
        background: #ffffff;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        text-align: center;
        page-break-inside: avoid;
        break-inside: avoid;
        height: 56mm;
        overflow: hidden;
      }
      .card-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 2px;
      }
      .store-tag {
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.8px;
        color: #475569;
        text-transform: uppercase;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 65%;
      }
      .pkt-badge {
        font-size: 8px;
        font-weight: 800;
        background: #0f172a;
        color: #ffffff;
        padding: 1px 6px;
        border-radius: 3px;
      }
      .prod-title {
        width: 100%;
        font-size: 11px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.25;
        margin: 2px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .qr-center-box {
        width: 28mm;
        height: 28mm;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 1mm auto;
        background: #f8fafc;
        border-radius: 4px;
        padding: 1mm;
      }
      .qr-center-box img, .qr-center-box svg {
        width: 26mm !important;
        height: 26mm !important;
        object-fit: contain;
        display: block;
      }
      .serial-text {
        font-family: 'Courier New', Courier, monospace;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.2px;
        color: #0f172a;
        margin-top: 1px;
      }
      .card-footer {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px dashed #cbd5e1;
        padding-top: 3px;
        font-size: 9px;
        color: #475569;
      }
      .exp-date strong {
        color: #d97706;
      }
      .mrp-price strong {
        color: #0f172a;
        font-size: 10.5px;
      }
    `}
  </style>
</head>
<body>
  <div class="grid">
    ${cardsHtml.join('')}
  </div>
</body>
</html>
`;

  return printHtmlViaIframe(html, `Unit_QR_Labels_${unitLabels.length}_Packets`);
}

/**
 * 4. Material Return Debit Note Printing
 */
export function printDebitNote(note, options = {}) {
  if (!note) return;

  const formattedDate = note.Date ? new Date(note.Date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
  const amountWords = numberToWordsINR(note.TotalReturnAmount || 0);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Debit Note - ${note.ReturnNoteNumber || 'MRN'}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #1F2937;
      margin: 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #E03131;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      color: #E03131;
    }
    .box {
      border: 1px solid #CBD5E1;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 16px;
      background: #F8FAFC;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th, td {
      border: 1px solid #CBD5E1;
      padding: 8px;
    }
    th {
      background: #F1F5F9;
      text-align: left;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
    }
    .sign-item {
      width: 200px;
      border-top: 1px solid #000;
      text-align: center;
      padding-top: 4px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2 style="margin: 0;">DailyMart Express</h2>
      <div style="font-size: 11px; color: #4B5563;">Plot 12, Commercial Hub, MG Road, Mumbai</div>
      <div style="font-size: 11px;">GSTIN: 27AABCU9603R1ZM</div>
    </div>
    <div style="text-align: right;">
      <div class="title">DEBIT NOTE</div>
      <div><strong>Note No:</strong> ${note.DocumentNumber || note.ReturnNoteNumber || 'MRN-2026-00000'}</div>
      <div><strong>Date:</strong> ${formattedDate}</div>
    </div>
  </div>

  <div class="box">
    <strong>DEBIT TO VENDOR:</strong><br />
    <span style="font-size: 14px; font-weight: 700;">${note.VendorName || 'Supplier'}</span><br />
    Reason for Return: <strong>${note.ReturnReason || 'Damaged goods'}</strong><br />
    Status: <strong>${note.Status || 'Credit Note Pending'}</strong>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 8%;">#</th>
        <th style="width: 47%;">Item Description</th>
        <th style="width: 15%; text-align: center;">Returned Qty</th>
        <th style="width: 15%; text-align: right;">Rate (₹)</th>
        <th style="width: 15%; text-align: right;">Debit Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${Array.isArray(note.Items) && note.Items.length > 0
        ? note.Items.map((itm, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>
              <strong>${itm.ProductName || 'Item'}</strong>
              ${itm.ProductId ? `<br><small style="color:#6B7280;">SKU: ${itm.ProductId}</small>` : ''}
              ${itm.BatchBarcode ? `<br><small style="color:#6B7280;">Batch: ${itm.BatchBarcode}</small>` : ''}
            </td>
            <td style="text-align: center;">${itm.Quantity || itm.ReturnQty || 1}</td>
            <td style="text-align: right;">₹${Number(itm.Rate || 0).toFixed(2)}</td>
            <td style="text-align: right; font-weight: 700;">₹${Number(itm.Total || (itm.Quantity * itm.Rate) || 0).toFixed(2)}</td>
          </tr>
        `).join('')
        : `
          <tr>
            <td>1</td>
            <td>Stock Return against ${note.ReturnReason || 'Damage / Expiry'}</td>
            <td style="text-align: center;">1 Lot</td>
            <td style="text-align: right;">₹${Number(note.TotalReturnAmount || 0).toFixed(2)}</td>
            <td style="text-align: right; font-weight: 700;">₹${Number(note.TotalReturnAmount || 0).toFixed(2)}</td>
          </tr>
        `
      }
    </tbody>
  </table>

  <div style="text-align: right; font-size: 16px; font-weight: 800; margin-bottom: 12px; color: #E03131;">
    TOTAL DEBIT AMOUNT: ₹${Number(note.TotalReturnAmount || 0).toFixed(2)}
  </div>

  <div class="box">
    <strong>Amount in Words:</strong> ${amountWords}
  </div>

  <div class="sign-row">
    <div class="sign-item">Vendor Representative Sign</div>
    <div class="sign-item">Store Manager Sign</div>
  </div>
</body>
</html>
`;

  return printHtmlViaIframe(html, `DebitNote_${note.DocumentNumber || note.ReturnNoteNumber || 'MRN'}`);
}

export default {
  printThermalReceipt,
  printA4Invoice,
  printBarcodeLabels,
  printDebitNote,
  numberToWordsINR
};
