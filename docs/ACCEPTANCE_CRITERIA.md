# Acceptance Criteria (Given / When / Then): POS & Billing System

## Overview
This document specifies formal Given/When/Then acceptance criteria for all modules across the project lifecycle, mapped to Roadmap Milestones M1 through M14.

---

### Milestone 1 & 2: Authentication & Role Enforcement
- **AC-AUTH-01 (Cashier Login):**
  - **Given** an active Cashier account (`cashier@store.in`) with role `Cashier`.
  - **When** the cashier submits valid credentials on the Login screen.
  - **Then** the system authenticates the user, stores the session in IndexedDB, and redirects directly to `/apps/bucket` (POS Terminal), hiding Admin and Inventory Manager navigation tabs.
- **AC-AUTH-02 (Unauthorized Access Defense):**
  - **Given** an authenticated Cashier session.
  - **When** the cashier enters `/apps/settings` or `/apps/vendor` directly in the browser address bar.
  - **Then** the application route guard blocks navigation, displaying the dedicated 403 Forbidden screen.

---

### Milestone 3 & 4: Store Setup & Product Catalog
- **AC-PROD-01 (Product Creation with Expiry):**
  - **Given** an authenticated Admin or Inventory Manager on `/apps/product`.
  - **When** the user clicks "Add Product", enters Name ("Cow Milk 500ml"), Cost (₹30.00), Tax Slab ("GST 5%"), checks "Has expiry date" with 3 days shelf life, and submits.
  - **Then** Formik validates all required fields, a new document is written to `Products` with `RecordStatus: 0`, and the item appears in the product table within 500ms.
- **AC-PROD-02 (Soft Delete Invariance):**
  - **Given** an existing active product.
  - **When** an Admin confirms deletion in the delete dialog.
  - **Then** the document is updated with `RecordStatus: 1`; it disappears from the active catalog view but remains accessible to historical invoice reports.

---

### Milestone 5 & 6: Purchasing, Material Inward & Barcoding
- **AC-INW-01 (Material Inward against PO):**
  - **Given** an existing Purchase Order with 50 units of "Milk 500ml".
  - **When** the Inventory Manager selects the PO in the Inward Stepper, enters 50 units received, and proceeds.
  - **Then** the system writes `MaterialInwardHeader` and `MaterialInwardDetails`, computes batch expiry date (`Date + 3 days`), and automatically generates 50 unique barcode records in `MaterialInwardBarcodes`.
- **AC-INW-02 (Thermal Barcode Label Generation):**
  - **Given** generated inward barcodes.
  - **When** the manager clicks "Print Labels".
  - **Then** the UI displays formatted barcode labels containing Product Name, SKU, Barcode graphic, Expiry Date, and Price.

---

### Milestone 8: POS Terminal & Bucket Staging
- **AC-POS-01 (High-Velocity Barcode Scan):**
  - **Given** an active POS terminal with cursor auto-focused in the barcode scanner field.
  - **When** an HID scanner sends an item barcode terminated with an Enter keystroke.
  - **Then** the item is matched and appended to the current cart (`BucketDetails`) within 100ms, incrementing quantity if already present.
- **AC-POS-02 (Expired Batch Rejection):**
  - **Given** a barcode corresponding to a batch whose expiry timestamp is in the past.
  - **When** scanned at the POS terminal.
  - **Then** the cart rejects the addition, audio alert sounds, and an error toast reads: "Blocked: Scanned batch expired on DD/MM/YYYY".
- **AC-POS-03 (Multi-Cart Holding):**
  - **Given** an in-progress cart with 4 items.
  - **When** the cashier presses `F8` ("Hold Bucket").
  - **Then** the current cart is parked as a tab (e.g., `BKT-01`), and a clean cart (`BKT-02`) opens immediately.

---

### Milestone 9: Invoicing, GST Engine & Payments
- **AC-INV-01 (Intra-state GST Split):**
  - **Given** Store State is "Maharashtra" and Customer State is "Maharashtra".
  - **When** checking out a bucket containing items with 18% GST totaling ₹1,000 base.
  - **Then** the system calculates CGST @ 9% (₹90.00), SGST @ 9% (₹90.00), IGST @ 0% (₹0.00), and displays Grand Total ₹1,180.00.
- **AC-INV-02 (Inter-state IGST Calculation):**
  - **Given** Store State is "Maharashtra" and Customer State is "Gujarat".
  - **When** checking out.
  - **Then** CGST = ₹0.00, SGST = ₹0.00, and IGST @ 18% (₹180.00) is charged.
- **AC-INV-03 (Cash Payment & Change Due):**
  - **Given** a grand total of ₹345.00.
  - **When** the cashier selects "Cash" and types ₹500.00 in Amount Received.
  - **Then** the UI displays Change Due: ₹155.00 in bold green text.
- **AC-INV-04 (Atomic Invoice Creation):**
  - **When** the cashier confirms invoice generation.
  - **Then** a Firestore transaction increments the store FY sequence, creates `InvoiceHeader` (e.g., `INV-2627-000101`), saves `InvoiceDetails`, and marks the origin `BucketHeader` soft-deleted in one atomic commit.

---

### Milestone 10: Invoice Management & Soft Cancellation
- **AC-CAN-01 (Managerial Cancellation):**
  - **Given** an existing invoice and an authenticated Admin user.
  - **When** Admin clicks "Cancel Invoice", types reason "Customer returned entire bill due to payment dispute", and confirms.
  - **Then** `InvoiceHeader.RecordStatus` is updated to `1`, `CancellationReason` is saved, the document status displays a red CANCELLED chip, and its sequential number is never deleted or reused.

---

### Milestone 11: WhatsApp Digital Receipts (OpenWA)
- **AC-WA-01 (Successful Receipt Transmission):**
  - **Given** an invoice finalized with customer mobile number `9876543210`.
  - **When** `IsShareReceiptThroughSms` is toggled or user clicks "Share via WhatsApp".
  - **Then** an HTTP POST is sent to `http://localhost:2785/api/v1/messages/send-text` with formatted receipt text, and a success toast appears when OpenWA returns 200 OK.
- **AC-WA-02 (Graceful Degradation on OpenWA Offline):**
  - **Given** OpenWA gateway is offline or unpaired.
  - **When** WhatsApp share is triggered.
  - **Then** invoice creation remains completely unaffected; the UI displays a warning banner "WhatsApp service unreachable. Receipt ready for manual reprint or retry."
