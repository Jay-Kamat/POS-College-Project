# Business Rules Specification: POS & Billing System

## 1. Catalog & Master Data Rules
- **BR-CAT-001 (Unique Product Code):** Every `ProductNumber` must be unique across the entire organization. Duplicates are rejected at creation and edit time.
- **BR-CAT-002 (Shelf Life Invariance):** If a product has `IsExpDate = true`, the `Days` (shelf life in days) field is mandatory and must be an integer strictly greater than zero (`Days >= 1`).
- **BR-CAT-003 (Soft Delete Invariant):** Master records (`Products`, `ProductCategory`, `Vendors`, `Stores`) are never physically removed from Firestore. Deletion sets `RecordStatus = 1`. Soft-deleted items must not appear in active POS drop-downs.
- **BR-CAT-004 (Tax Slab Assignment):** Every product must be linked to a valid `TaxRateId`. If a product is non-taxable, it must link to a 0% GST tax record.

---

## 2. Procurement & Inward Rules
- **BR-INW-001 (PO and Inward Matching):** When an inward is created against a PO, the received quantity per line item cannot exceed 120% of the ordered quantity without managerial override.
- **BR-INW-002 (Non-PO Inward):** Inward without PO (`IsPoAvailable = false`) is permitted but requires explicit vendor selection and captures current purchase rate.
- **BR-INW-003 (Batch Expiry Derivation):** For products with `IsExpDate = true`, the batch expiry date is automatically calculated as:
  $$\text{ExpiryDate} = \text{InwardDate} + (\text{Product.Days} \times 86400000\text{ ms})$$
  The manager may manually pull back the expiry date if the supplier invoice reflects a shorter shelf life, but cannot extend it past the derived ceiling.
- **BR-INW-004 (Barcode Uniqueness):** Each generated `MaterialInwardBarcodes.Barcode` must be globally unique across all batches and time.

---

## 3. POS Terminal & Bucket Staging Rules
- **BR-POS-001 (Scanner Focus):** On the POS terminal (`/apps/bucket`), the barcode input must automatically retain focus after every item scan, cart adjustment, or modal dismissal.
- **BR-POS-002 (Expired Stock Rejection):** If a scanned barcode has an `ExpiryDate < CurrentTimestamp`, the POS terminal MUST reject the addition, emit an audible alert, and display an error toast. Expired goods cannot be added to any cart.
- **BR-POS-003 (Quantity Stepping):** Cart quantities must be positive integers (`Quantity >= 1`). Decrementing below 1 triggers item removal confirmation. Decimal quantities are prohibited in Phase 1.
- **BR-POS-004 (Bucket Holding Limit):** A cashier may hold a maximum of 5 concurrent buckets (`BKT-01` to `BKT-05`) per terminal to prevent resource exhaustion and inventory locking.
- **BR-POS-005 (Discounts Policy):** In Phase 1 MVP, arbitrary manual line-item discounts are out of scope. Products are sold at established selling rates.

---

## 4. Taxation & GST Calculation Rules
- **BR-TAX-001 (State Matching for Intra-state GST):**
  - If `Customer.State == Store.State`, apply Intra-state taxation:
    $$\text{CGST} = \text{LineTaxableAmount} \times \left(\frac{\text{CGST Rate}}{100}\right)$$
    $$\text{SGST} = \text{LineTaxableAmount} \times \left(\frac{\text{SGST Rate}}{100}\right)$$
    $$\text{IGST} = 0.00$$
- **BR-TAX-002 (Inter-state IGST):**
  - If `Customer.State != Store.State` and customer state is provided, apply Inter-state taxation:
    $$\text{IGST} = \text{LineTaxableAmount} \times \left(\frac{\text{IGST Rate}}{100}\right)$$
    $$\text{CGST} = 0.00, \quad \text{SGST} = 0.00$$
- **BR-TAX-003 (B2C Fallback):** For anonymous or unregistered walk-in customers where customer state is unknown, default to Intra-state GST (CGST + SGST).
- **BR-TAX-004 (Currency Round-off):** The grand total is rounded off to the nearest integer rupee using half-up rounding. The difference is explicitly documented in `RoundOff` on the receipt.

---

## 5. Payments & Invoicing Rules
- **BR-PAY-001 (Payment Modality):** `ModeOfPayment` must be either `0` (Cash) or `1` (UPI / Card).
- **BR-PAY-002 (Cash Tender Validation):** For cash transactions, `AmountReceived` must be greater than or equal to the Grand Total. Change due is calculated and displayed:
  $$\text{ChangeDue} = \text{AmountReceived} - \text{GrandTotal}$$
- **BR-PAY-003 (Sequential Invoice Numbering):** Invoice `DocumentNumber` must follow a strict consecutive sequence per financial year (e.g., `INV-2627-000001`). Gaps or duplicates are forbidden. Generated inside a Firestore atomic transaction.
- **BR-PAY-004 (Invoice Finality & Immutability):** Finalized invoices can never be edited or altered. Pricing, quantities, and taxes are permanently locked.

---

## 6. Cancellations & Returns Rules
- **BR-CAN-001 (Admin Exclusive Cancellation):** Only users with role `Admin` are authorized to cancel finalized invoices.
- **BR-CAN-002 (Mandatory Cancellation Reason):** Cancellation requires an explanatory text reason of at least 10 characters stored in `CancellationReason`.
- **BR-CAN-003 (No Sequence Re-use):** Cancelled invoices retain their `DocumentNumber` and are marked with `RecordStatus = 1`. The cancelled number is NEVER reassigned to a subsequent transaction.
- **BR-RET-001 (Vendor Return Justification):** Every `MaterialReturnNoteHeader` must link to a valid reason ID from `MaterialReturns`.
