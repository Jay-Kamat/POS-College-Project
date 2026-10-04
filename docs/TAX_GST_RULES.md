# Indian GST Taxation Specification: POS & Billing System

## 1. Statutory Architecture & Pricing Model
The system is built specifically for compliance with the Indian Goods and Services Tax (GST) Act.

### Pricing Policy Decision: Tax-Exclusive Base Pricing
- **Decision:** Catalog `Products.Cost` represents the base cost. POS product selling rates entered into `BucketDetails.Rate` are **Tax-Exclusive**.
- **Rationale:** Transparent tax splitting: displaying base rate, calculated CGST, SGST, or IGST, and final grand total complies directly with Indian statutory B2B tax invoice requirements (GST Form GSTR-1).

---

## 2. Tax Splitting Rules (Intra-state vs. Inter-state)

### 2.1 State Determination Logic
1. **Intra-state Transaction:**
   - Condition: `Customer.State == Store.State` OR Customer is an anonymous walk-in retail buyer (B2C) without state identification.
   - Taxation: The statutory rate is split equally:
     $$\text{CGST Rate} = \frac{\text{TaxRate.IGST}}{2}, \quad \text{SGST Rate} = \frac{\text{TaxRate.IGST}}{2}$$
     $$\text{IGST Rate} = 0.00$$

2. **Inter-state Transaction:**
   - Condition: `Customer.State != Store.State` AND Customer State is explicitly recorded.
   - Taxation: Full statutory rate assessed as Integrated GST:
     $$\text{IGST Rate} = \text{TaxRate.IGST}$$
     $$\text{CGST Rate} = 0.00, \quad \text{SGST Rate} = 0.00$$

3. **Behavior When Store GSTIN is Null:**
   - If `Stores.GstNumber` is null or empty (store operates under GST composition scheme or below the ₹40 Lakh threshold), tax calculations are suppressed (`CGST = 0`, `SGST = 0`, `IGST = 0`), and the receipt is titled **"Bill of Supply"** instead of "Tax Invoice".

---

## 3. Mathematical Formulas & Worked Calculations

### Line-Item Calculation Formulas
For each line item $i$ in `InvoiceDetails`:
1. Line Taxable Value:
   $$\text{TaxableValue}_i = \text{Quantity}_i \times \text{Rate}_i$$
2. Intra-state Taxes:
   $$\text{CGST}_i = \text{round}\left(\text{TaxableValue}_i \times \frac{\text{CGST Rate}}{100}, 2\right)$$
   $$\text{SGST}_i = \text{round}\left(\text{TaxableValue}_i \times \frac{\text{SGST Rate}}{100}, 2\right)$$
3. Inter-state Taxes:
   $$\text{IGST}_i = \text{round}\left(\text{TaxableValue}_i \times \frac{\text{IGST Rate}}{100}, 2\right)$$
4. Line Total:
   $$\text{LineTotal}_i = \text{TaxableValue}_i + \text{CGST}_i + \text{SGST}_i + \text{IGST}_i$$

### Invoice-Level Consolidation & Round-Off
1. Gross Invoice Amount:
   $$\text{GrossTotal} = \sum_{i=1}^{n} \text{LineTotal}_i$$
2. Rounded Grand Total:
   $$\text{GrandTotal} = \text{round}(\text{GrossTotal})$$
3. Round-off Adjustment:
   $$\text{RoundOff} = \text{GrandTotal} - \text{GrossTotal}$$

---

## 4. Worked Numerical Example (Intra-state Maharashtra Store)
- **Store:** DailyMart Express (Mumbai, State: Maharashtra, GSTIN: `27AABCU9603R1ZM`)
- **Customer:** Jay Sharma (Pune, State: Maharashtra)
- **Items:**
  1. *Basmati Rice 1kg:* Qty = 2, Rate = ₹100.00, Tax Slab = 5% (CGST 2.5%, SGST 2.5%)
  2. *Chocolate Cake:* Qty = 1, Rate = ₹350.00, Tax Slab = 18% (CGST 9%, SGST 9%)

| Item | Qty | Rate (₹) | Taxable (₹) | CGST (₹) | SGST (₹) | IGST (₹) | Line Total (₹) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Basmati Rice | 2 | 100.00 | 200.00 | 5.00 | 5.00 | 0.00 | 210.00 |
| Chocolate Cake | 1 | 350.00 | 350.00 | 31.50 | 31.50 | 0.00 | 413.00 |
| **Totals** | - | - | **₹550.00** | **₹36.50** | **₹36.50** | **₹0.00** | **₹623.00** |

- **Gross Total:** ₹623.00
- **Round-off:** ₹0.00
- **Grand Total Payable:** **₹623.00**

---

## 5. B2B vs. B2C Categorization
- **B2B Invoice:** Activated when customer record contains a valid 15-character GSTIN. Displays customer legal name, address, and GSTIN to allow customer to claim Input Tax Credit (ITC).
- **B2C Invoice:** Walk-in retail shoppers. Requires customer mobile number for WhatsApp delivery. Customer GSTIN is omitted.
