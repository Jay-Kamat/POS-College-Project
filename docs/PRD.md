# Product Requirements Document (PRD): POS & Billing System

## 1. Executive Summary & Vision
The **POS & Billing System** is an enterprise-grade, India-focused (GST-compliant) Point of Sale, inventory, and billing application designed for retail outlets, cafes, and supermarkets. It bridges rapid, scan-to-cart cashier operations with backend inventory management, supplier tracking, and multi-channel customer receipt delivery via WhatsApp.

Built with a direct-to-cloud architecture utilizing React 18 (Material UI / Mantis Admin template) and Cloud Firestore, backed by Firebase Authentication and a dedicated NestJS WhatsApp gateway (`OpenWA`), the system delivers sub-second POS checkout responsiveness, resilient offline read capabilities, and end-to-end auditability.

---

## 2. Stakeholders & Personas
In accordance with system design constraints, there are strictly **four (4) stakeholders**. No other user personas or roles exist.

| Stakeholder | Type | Authentication / Login | Primary Responsibilities & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | Internal System Role | **Yes** (Firebase Auth) | System-wide governance: User and role configuration, store profile, tax rates, master settings, product categories, full inventory oversight, invoice cancellation approvals, and financial reports. |
| **Cashier** | Internal System Role | **Yes** (Firebase Auth) | Frontline POS terminal: Customer lookup, barcode scanning, cart staging (Buckets), Cash/UPI invoice generation, invoice reprint, WhatsApp receipt dispatch. Strictly restricted from purchasing, vendor records, system settings, or cost data. |
| **Inventory Manager** | Internal System Role | **Yes** (Firebase Auth) | Supply chain execution: Vendor directory maintenance, Purchase Order (PO) creation, Material Inward processing (PO and non-PO), batch barcode printing, expiry tracking, vendor Material Return Notes, and stock analytics. |
| **Vendor** | External Business Entity | **No** (Record entity only) | External counterparty: Supplier of goods receiving Purchase Orders, delivering inventory batches, and receiving Material Return Notes. Has **no login access** to POSUI. |

---

## 3. Product Scope & Functional Modules

### 3.1 Authentication & RBAC Module
- Multi-provider authentication via Firebase Auth: Google Sign-In and Email/Password.
- Strict Role-Based Access Control (`RolesAndPermissions` collection) enforced at UI route guards and Firestore Security Rules.
- Automatic session hydration and token refresh via `onAuthStateChanged`.

### 3.2 Master Data & Store Configuration
- **Store Profile (`Stores`):** Multi-tenant ready schema supporting Store Name, Long Name, Address, Contact details, Food License Number (FSSAI), and GSTIN.
- **Tax Configuration (`TaxRates`):** Dual split rates supporting CGST + SGST (Intra-state) and IGST (Inter-state) for Indian standard slabs (0%, 5%, 12%, 18%, 28%).
- **Product Catalog (`Products`, `ProductCategory`):** Product SKU/Number, Name, Category reference, Cost price, Ingredients, Usage notes, Shelf-life tracking (`IsExpDate`, `Days`), and linked `TaxRateId`.

### 3.3 Purchasing & Supply Inward
- **Vendor Directory (`Vendors`):** Master vendor profiles, address, contact persons, tax/PIN identifiers, and unique `VendorCode`.
- **Purchase Orders (`PurchaseOrderHeader`, `PurchaseOrderDetails`):** Draft, issue, and manage POs with line-item rates, delivery targets, and store routing.
- **Material Inward (`MaterialInwardHeader`, `MaterialInwardDetails`):** Goods inward entry against POs or ad-hoc non-PO receipts, recording received quantity, cost rate, and dynamic batch expiry dates.
- **Barcode Generation (`MaterialInwardBarcodes`, `BarcodePost`):** Generation of unique batch barcodes combining product, date, and inward reference for thermal label printing.

### 3.4 POS Terminal & Staged Billing (Buckets)
- **High-Velocity POS Terminal:** Barcode scanner keyboard-wedge support with sub-100ms cart addition, keyboard shortcuts (F2 search, F8 hold bucket, F9 pay).
- **Cart Staging (`BucketHeader`, `BucketDetails`):** Persistent or held carts allowing cashiers to juggle multiple customer queues simultaneously without losing cart state.
- **Customer Lookup (`Customers`):** Real-time lookup by mobile number, automatic customer profile creation, and GSTIN capture for B2B billing.

### 3.5 Invoicing & Payment Processing
- **Invoice Generation (`InvoiceHeader`, `InvoiceDetails`):** Atomic conversion of Buckets to Invoices using Firestore transactions. Concurrency-safe sequential invoice numbering (`DocumentNumber`).
- **GST Splitting Engine:** Automatic derivation of CGST/SGST vs IGST based on Store State and Customer State.
- **Payment Handling:** Manual recording of `ModeOfPayment` (0 = Cash, 1 = UPI/Card) with change calculation for cash and QR generation for UPI.
- **Invoice Cancellation:** Soft cancellation only (`RecordStatus = 1` or status flag) requiring mandatory audit reason and preventing invoice number re-use.

### 3.6 Receipts & Digital Distribution
- **Thermal & A4 Printing:** Formatted printing for 58mm/80mm thermal receipt printers and standard A4 invoice layouts using `@react-pdf/renderer`.
- **WhatsApp Receipts (`OpenWA`):** Automated delivery of structured text receipts with line items, tax breakdown, and store license info to the customer's phone number via the local NestJS gateway.

### 3.7 Vendor Returns & Wastage Tracking
- **Material Return Notes (`MaterialReturnNoteHeader`, `MaterialReturnNoteDetails`):** Outward dispatch notes for damaged, expired, or rejected goods returned to vendors.
- **Return Reason Master (`MaterialReturns`):** Standardized return categorization.

### 3.8 Analytics & Reporting
- **Daily Sales Report:** Aggregated transaction counts, Cash vs UPI splits, collected taxes, and gross revenues.
- **Vendor-wise Sales Report:** Sales volume and gross value broken down by supplying vendor.
- **Vendor-wise Expired Stock Report:** Immediate identification of batches nearing or past expiry with cost-value impact.
- **CSV Export:** Client-side streaming export for all tabular reporting data.

---

## 4. Out of Scope (Phase 1 MVP)
1. **Self-service Vendor Portal:** External vendors do not log in.
2. **Automated Payment Gateway Terminal Integration:** Razorpay/PineLabs POS machine SDK sync is deferred; payment status is cashier-confirmed.
3. **Customer Sales Returns / Refunds:** Cash refunds and item returns from retail customers are out of scope for Phase 1.
4. **Physical Cash Drawer Triggers & Shift Reconciliations:** Hardware kick-out drawers and cashier float shifts are Phase 2.
5. **Multi-currency Support:** System is hard-coded to Indian Rupee (₹, INR).

---

## 5. Gaps and Open Decisions (Explicit Decisions Required)

| Item | Architectural / Functional Gap | Recommendation | Proposed Phase |
| :--- | :--- | :--- | :--- |
| **GAP-01** | **Stock-on-Hand Ledger:** The PRD schema contains no real-time stock quantity field on `Products`. | **Adopt a Hybrid Stock Ledger Collection (`StockLedger` / `ProductStock`):** Deriving stock dynamically by summing all inwards, subtracting all invoice lines and return notes will exhaust Firestore read quotas. Introduce a transactional stock counter per store-product. | MVP Approval Needed |
| **GAP-02** | **Invoice Concurrency & Sequence:** Firestore lacks native autoincrement sequences for `DocumentNumber`. | **Use a dedicated `Counters` collection** inside a Firestore transaction to increment financial-year sequence numbers atomically per store (e.g., `INV/2026-27/000123`). | MVP Approval Needed |
| **GAP-03** | **GST Determination:** Inward and invoice schemas do not formally validate state codes. | **Implement State Code Matching Rule:** If `Customer.State == Store.State`, split tax into CGST (50%) + SGST (50%). If different or customer state is empty B2C, default to Intra-state unless marked Inter-state (IGST 100%). | MVP Approved Pattern |
| **GAP-04** | **Cloud Functions Offload:** Running critical calculations purely client-side introduces tampering risks if Firestore security rules are imperfect. | **Deploy Firebase Cloud Functions for Atomic Checkout:** Offload Bucket-to-Invoice conversion, stock decrements, and sequential invoice counter updates to Cloud Functions. | Recommended Phase 2 / Transition |
| **GAP-05** | **OpenWA Unofficial Session Reliability:** `whatsapp-web.js` / `@whiskeysockets/baileys` sessions can disconnect if the WhatsApp phone drops offline. | **Queueing & Graceful Degradation:** Failed WhatsApp dispatches must never block invoice creation. The UI marks WhatsApp status as `Pending` or `Failed` with a manual retry button. | MVP Approved Pattern |

---

## 6. Assumptions
1. All client hardware running `POSUI` has a modern Chromium-based browser supporting modern JavaScript and Web Workers.
2. Barcode scanners operate in standard HID Keyboard Wedge mode terminating scans with an Enter/Return key event.
3. The store operates under Indian GST regulations with prices entered as **Tax Exclusive** by default (with client calculation adding taxes).
4. Material Inward batches are tracked on a **First-Expiry-First-Out (FEFO)** basis during barcode lookup and checkout.
