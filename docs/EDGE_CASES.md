# Edge Cases & Failure Mode Protocols: POS & Billing System

## 1. Concurrency & High-Velocity Contention

### EC-CONC-01: Two Cashiers Billing the Last Unit Simultaneously
- **Scenario:** Item SKU `PRD-102` has exactly 1 unit remaining in stock. Cashier A and Cashier B scan the item at the exact same moment on two separate terminals.
- **Handling:**
  - In a fast retail grocery environment, stopping a cashier from scanning creates queue friction.
  - The system permits both cashiers to complete billing. The stock ledger decrements to `-1` (flagged in the negative inventory audit report).
  - Physical goods were evidently on the store shelf (supplier delivery was likely physically placed before the receiving clerk entered the inward docket).

### EC-CONC-02: Simultaneous Invoice Counter Increment Collision
- **Scenario:** Two terminals trigger "Generate Invoice" at the exact same millisecond for the same store and financial year.
- **Handling:**
  - Handled via Firestore `runTransaction()`. Terminal A acquires document lock on `/Counters/Store_01_FY_2627` and increments to `000105`.
  - Terminal B's transaction aborts with a contention error, automatically re-reads the updated counter (`000105`), increments to `000106`, and commits cleanly. No duplicate invoice numbers can ever be created.

---

## 2. Product Catalog & Barcode Anomalies

### EC-CAT-01: Duplicate Barcode Assigned Across Different Batches
- **Scenario:** An operator accidentally attempts to map an existing barcode string to a new inward batch.
- **Handling:** The inward service executes a uniqueness query against `MaterialInwardBarcodes` where `Barcode == newBarcode`. If found, creation is blocked with: "Barcode already assigned to Batch RefId: XYZ".

### EC-CAT-02: Product Rate Changes While Staged in a Bucket
- **Scenario:** Cashier holds a bucket with an item at ₹100. Admin updates the product catalog price to ₹120. Cashier resumes the held bucket 30 minutes later.
- **Handling:** When converting the Bucket to an Invoice, the transaction snapshots the price currently in the bucket. The price agreed upon when the customer queued is honored. The audit log stamps the transaction.

### EC-CAT-03: Soft-Deleted Product Referenced by Historical Invoices
- **Scenario:** A product is discontinued and soft-deleted (`RecordStatus = 1`). A customer requests an A4 PDF reprint of an invoice from 6 months ago containing that product.
- **Handling:** The PDF renders completely without errors because `InvoiceDetails` contains denormalized snapshots of `ProductName`, `Rate`, and tax values. The query reads from `InvoiceDetails` and does NOT require fetching the active product document.

---

## 3. Peripheral & Network Disconnections

### EC-NET-01: Internet Drop During Multi-Item Checkout
- **Scenario:** Store WAN connection cuts out while a cashier has 10 items in the cart.
- **Handling:**
  - Firestore IndexedDB offline persistence retains the catalog. Cashier continues scanning items.
  - An ambient amber notification warns: "Offline Mode Active - Final Invoice Generation Blocked Until Connection Restored".
  - Sequential invoice generation requires live server communication to guarantee sequential integrity.

### EC-WA-01: OpenWA Phone Loses Battery or Unpairs
- **Scenario:** Store WhatsApp phone dies; cashier generates an invoice with "Share WhatsApp" checked.
- **Handling:**
  - The HTTP POST to OpenWA times out after 3.0 seconds.
  - The UI does NOT hang or fail the invoice. The invoice modal completes successfully with a warning chip: "WhatsApp Offline - Receipt Staged for Retry".
  - Cashier prints standard thermal slip.

### EC-VAL-01: Invalid Customer Mobile Number (e.g., 9 digits instead of 10)
- **Scenario:** Cashier enters `987654321` into the mobile number field.
- **Handling:** Yup schema regex validation (`/^[6-9]\d{9}$/`) blocks submission with: "Mobile number must be a valid 10-digit Indian phone number".
