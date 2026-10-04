# User Stories Specification: POS & Billing System

## 1. Stakeholder Personas
The system acknowledges strictly four stakeholders:
- **Admin (System User):** Full administrative, operational, audit, and financial oversight.
- **Cashier (System User):** Terminal sales, customer lookup, staging buckets, cash/UPI invoicing, WhatsApp receipts.
- **Inventory Manager (System User):** Vendor relationships, PO issuance, material inward, batch barcode printing, expiry control, vendor material returns.
- **Vendor (External Entity - No System Login):** Counterparty receiving purchase orders and return notes, delivering physical goods.

---

## 2. Admin User Stories

### US-ADM-01: Store Profile & Tax Configuration
- **As an** Admin,
- **I want to** configure store metadata (GSTIN, FSSAI License, Address, State) and define tax slabs (0%, 5%, 12%, 18%, 28%),
- **So that** all generated sales invoices comply with statutory GST guidelines and legal requirements.
- **Main Flow:**
  1. Admin logs in and opens Settings (`/apps/settings`).
  2. Updates store name, address, 15-digit GSTIN, and FSSAI license number.
  3. Navigates to Tax Rates tab and creates or verifies CGST, SGST, and IGST percentages.
  4. Clicks "Save Settings".
- **Alternative Flow:** Formik detects invalid GSTIN format; inline error displays "Invalid GSTIN format (e.g., 27AABCU9603R1ZM)".
- **Expected Result:** Settings and tax records are saved in Firestore and applied immediately across all terminals.

### US-ADM-02: User Role Governance & Invitations
- **As an** Admin,
- **I want to** invite new staff members and assign them explicit roles (`Cashier`, `Inventory Manager`, `Admin`),
- **So that** staff only access modules authorized for their duties.
- **Main Flow:**
  1. Admin navigates to User Management (`/apps/users`).
  2. Clicks "Invite User", enters staff email, full name, and selects role from dropdown.
  3. Clicks "Send Invite".
- **Expected Result:** User record is generated in `RolesAndPermissions` with appropriate permissions.

### US-ADM-03: Soft Invoice Cancellation
- **As an** Admin,
- **I want to** soft-cancel a disputed or erroneously generated sales invoice with a mandatory reason,
- **So that** accounting records remain clean while retaining an unbroken audit trail.
- **Main Flow:**
  1. Admin opens `/apps/invoice`, selects invoice `INV-2627-000101`, and clicks "Cancel Invoice".
  2. Dialog prompts for mandatory reason; Admin enters "Customer card debited twice; invoice reissued".
  3. Confirms cancellation.
- **Expected Result:** `InvoiceHeader.RecordStatus` becomes `1`, cancellation watermark appears, and document number is never deleted or reused.

---

## 3. Cashier User Stories

### US-CSH-01: High-Speed Barcode Checkout & Bucket Staging
- **As a** Cashier,
- **I want to** scan product barcodes directly into a bucket,
- **So that** customer checkout is rapid and free from manual typing errors.
- **Main Flow:**
  1. Cashier opens POS Terminal (`/apps/bucket`). Scanner input is focused by default.
  2. Cashier scans item barcode `BC-890103001`.
  3. System matches barcode in `MaterialInwardBarcodes` / `Products` and appends item to cart in < 100ms.
  4. Cashier scans same barcode again; quantity increments to `2`.
- **Alternative Flow (Expired Product):** The scanned barcode belongs to an expired inward batch. The system rejects item addition, emits an alert tone, and flashes an amber/red toast.
- **Expected Result:** Bucket cart recalculates subtotal, taxes, and grand total in real time.

### US-CSH-02: Multi-Queue Bucket Holding
- **As a** Cashier,
- **I want to** hold an incomplete customer cart and serve the next customer,
- **So that** queue flow is not stalled while a customer retrieves an extra item.
- **Main Flow:**
  1. Cashier presses `F8` or clicks "Hold Bucket".
  2. Current cart is saved as a held tab `BKT-01`.
  3. Terminal initializes a blank cart (`BKT-02`) for the waiting customer.
  4. When the first customer returns, cashier clicks `BKT-01` tab to resume cart.
- **Expected Result:** Staged buckets persist safely in Firestore without data loss.

### US-CSH-03: Split Mode Payment & WhatsApp Receipt
- **As a** Cashier,
- **I want to** collect cash or display a UPI payment QR, finalize the invoice, and send a WhatsApp receipt,
- **So that** the customer receives instant proof of purchase on their mobile device.
- **Main Flow:**
  1. Cashier enters customer mobile number (`9876543210`).
  2. Selects "UPI", shows QR code or confirms payment received.
  3. Clicks "Generate Invoice (F9)".
  4. Success modal opens with a green checkmark, invoice number `INV-2627-000125`, and "Share via WhatsApp" pre-checked.
  5. OpenWA transmits receipt to customer.
- **Expected Result:** Transaction finalizes atomically; customer receives WhatsApp text message.

---

## 4. Inventory Manager User Stories

### US-INV-01: Purchase Order Creation
- **As an** Inventory Manager,
- **I want to** create a formal Purchase Order for a supplier,
- **So that** inventory procurement is documented with expected unit rates and delivery dates.
- **Main Flow:**
  1. Manager navigates to `/apps/purchaseOrder` and clicks "New Purchase Order".
  2. Selects vendor ("Fresh Dairy Pvt Ltd") and store.
  3. Adds items ("Cow Milk 500ml", Qty: 100, Rate: ₹26.00).
  4. Saves PO and downloads formal PDF.
- **Expected Result:** `PurchaseOrderHeader` and `Details` documents are saved with status "Sent".

### US-INV-02: Material Inward & Batch Barcode Generation
- **As an** Inventory Manager,
- **I want to** receive delivered goods against a PO and print batch barcode labels with expiry dates,
- **So that** products on store shelves carry verifiable barcode tags.
- **Main Flow:**
  1. Manager opens `/apps/materialInward` and selects PO `PO-2026-00045`.
  2. Verifies 100 units received; system computes expiry date based on 3-day shelf life.
  3. Manager clicks "Generate Barcodes".
  4. System generates 100 barcode records and renders printable thermal label previews.
- **Expected Result:** Barcodes saved in `MaterialInwardBarcodes`; manager prints labels for shelf placement.

### US-INV-03: Vendor Material Return Note
- **As an** Inventory Manager,
- **I want to** document the return of damaged or expired goods back to a vendor,
- **So that** our store accounts can claim credit notes.
- **Main Flow:**
  1. Manager opens `/apps/materialReturn` and clicks "New Return Note".
  2. Selects vendor and return reason from master ("Damaged in Transit").
  3. Enters item and return quantity.
  4. Finalizes Material Return Note.
- **Expected Result:** `MaterialReturnNoteHeader` and `Details` are recorded with audit logging.

---

## 5. Vendor Role Definition (External Entity)
- **Actor Properties:** The vendor is an external counterparty entity represented exclusively as records in the `Vendors` collection.
- **Access Rule:** Vendors have **NO login credentials** and cannot access the POSUI application.
- **Interaction Model:** Vendors receive outward communications (Purchase Order PDFs and Material Return Note PDFs) generated and dispatched by store staff.
