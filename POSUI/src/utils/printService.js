/**
 * Universal POS Printing Service
 * Conforms to Indian GST compliance and thermal/A4 printing specifications in docs/INVOICE_RECEIPT_SPEC.md.
 * 
 * Supports:
 *  1. printThermalReceipt(invoice, options) - 80mm / 58mm POS thermal receipt rolls
 *  2. printA4Invoice(invoice, options)      - Formal GST Tax Invoice on A4 paper
 *  3. printBarcodeLabels(items, options)    - Shelf/product barcode stickers
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
 * 3. Shelf Barcode Labels Printing (Material Inward)
 */
export function printBarcodeLabels(items, options = {}) {
  if (!items || items.length === 0) return;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Shelf Labels</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    body {
      font-family: sans-serif;
      margin: 0;
      padding: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .label-card {
      border: 1.5px solid #000;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
      page-break-inside: avoid;
    }
    .prod-name {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .barcode-art {
      font-family: monospace;
      letter-spacing: 4px;
      font-size: 18px;
      font-weight: 700;
      margin: 4px 0;
    }
    .barcode-num {
      font-family: monospace;
      font-size: 11px;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      font-weight: 600;
      border-top: 1px dashed #666;
      padding-top: 4px;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="grid">
    ${items.map(item => `
      <div class="label-card">
        <div class="prod-name">${item.ProductName}</div>
        <div class="barcode-art">||| | || |||| | |||</div>
        <div class="barcode-num">${item.Barcode || item.ProductNumber || '200100000000'}</div>
        <div class="footer-row">
          <span>Exp: ${item.ExpiryDate || 'N/A'}</span>
          <span>MRP: ₹${(Number(item.Rate || 0) * 1.3).toFixed(2)}</span>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
`;

  return printHtmlViaIframe(html, 'Barcode_Labels');
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
