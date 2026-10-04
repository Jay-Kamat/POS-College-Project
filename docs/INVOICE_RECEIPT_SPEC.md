# Invoice & Receipt Template Specification: POS & Billing System

## 1. Concurrency-Safe Invoice Numbering (`DocumentNumber`)
In accordance with Indian GST compliance, sales tax invoices must bear an unbroken, consecutive sequential number unique to the store and financial year (FY).

### Numbering Schema
```text
INV / {FY} / {StoreCode} / {6-digit Serial}
Example: INV/26-27/MUM01/000142
```

### Atomic Sequence Generation
Sequences are generated inside a Firestore transaction reading the document:
`/Counters/Store_{StoreId}_FY_{Year}`
1. The transaction reads the current counter value `lastNumber`.
2. Increments `nextNumber = lastNumber + 1`.
3. Sets `DocumentNumber = format(nextNumber)`.
4. Writes the counter and the `InvoiceHeader` document simultaneously.
5. In case of network contention between multiple terminals, Firestore automatically retries the transaction.

---

## 2. Thermal Receipt Layout (80mm / 58mm POS Printer)

```text
================================================
              DAILYMART EXPRESS
          Plot 12, MG Road, Mumbai
       GSTIN: 27AABCU9603R1ZM  
       FSSAI Lic No: 11522001000123
       Phone: +91 98765 43210
================================================
INVOICE NO: INV/26-27/MUM01/000142
DATE: 04/10/2026 07:45 PM    CASHIER: Jay (Admin)
CUSTOMER: Jay Sharma (+91 98765 43210)
PAYMENT: UPI (Received)
------------------------------------------------
ITEM               QTY   RATE   TAX%      TOTAL
------------------------------------------------
Basmati Rice 1kg     2  80.00    5%      168.00
Cow Milk 500ml       3  30.00    5%       94.50
Cold Coffee 200ml    1  45.00   18%       53.10
------------------------------------------------
TAXABLE VALUE:                           ₹285.00
CGST:                                     ₹15.30
SGST:                                     ₹15.30
ROUND OFF:                                -₹0.60
================================================
GRAND TOTAL:                             ₹315.00
================================================
TAX SUMMARY:
Rate        Taxable       CGST       SGST
5%          ₹250.00      ₹6.25      ₹6.25
18%          ₹45.00      ₹4.05      ₹4.05
------------------------------------------------
        Thank You For Shopping With Us!
           No Exchange After 7 Days.
================================================
```

---

## 3. Formal A4 PDF Layout (`@react-pdf/renderer`)
Rendered for B2B commercial buyers or on-demand customer downloads:
- **Header:** Store Logo, Full Registered Legal Name, Address, GSTIN, FSSAI Number, State & State Code.
- **Bill To:** Customer Legal Name, Billing Address, Customer GSTIN, Customer Phone, State & State Code.
- **Document Meta:** Invoice Number, Invoice Date, Mode of Payment, Place of Supply.
- **Line Items Grid:** S.No, Description of Goods, HSN Code, Quantity, Unit, Rate (₹), Taxable Value, CGST (Rate & Amt), SGST (Rate & Amt) or IGST (Rate & Amt), Total (₹).
- **Tax Breakdown Table:** Slabs summary, Total Tax in Words.
- **Amount in Words:** Indian English currency words (e.g., "Three Hundred and Fifteen Rupees Only").
- **Footer:** Authorized Signatory stamp box, Terms & Conditions, and system audit timestamp.

---

## 4. WhatsApp Digital Text Receipt Format
Dispatched via OpenWA HTTP endpoint:
```text
*DailyMart Express*
Plot 12, MG Road, Mumbai
GSTIN: 27AABCU9603R1ZM | FSSAI: 11522001000123
--------------------------------
*INVOICE: INV/26-27/MUM01/000142*
Date: 04/10/2026, 07:45 PM
Customer: Jay Sharma (+919876543210)
Payment Mode: UPI (Paid)
--------------------------------
1. Basmati Rice 1kg x 2 = ₹168.00
2. Cow Milk 500ml x 3 = ₹94.50
3. Cold Coffee 200ml x 1 = ₹53.10
--------------------------------
Taxable Value: ₹285.00
CGST: ₹15.30
SGST: ₹15.30
Round-off: -₹0.60
*GRAND TOTAL: ₹315.00*
--------------------------------
Thank you for shopping with us!
Visit again: https://dailymart.in
```

---

## 5. Cancelled Invoice Protocol
When an Admin cancels an invoice:
- Thermal and PDF reprints render a bold diagonal **`CANCELLED`** watermark across the document.
- The cancellation reason and Admin timestamp appear under the document header:
  `STATUS: CANCELLED ON 04/10/2026 - REASON: Customer returned items at counter.`
- The original invoice number `INV/26-27/MUM01/000142` is permanently sealed and never reused.
