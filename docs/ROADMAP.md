# Product Roadmap & Milestone Execution Plan: POS & Billing System

## Overview
This roadmap establishes an incremental, milestone-driven build plan for the POS & Billing System. Each milestone defines a discrete, end-to-end slice with strict dependencies, acceptance criteria, and a definition of done.

---

## Milestone Breakdown

### Milestone 1: Project Setup, Firebase Config, Env, Theme & Routing (M1)
- **Goal:** Establish repo structure, initialize Mantis/MUI design system tokens, configure React Router v6, and connect Firebase SDK initialization.
- **Tasks:**
  - Setup React 18 base with MUI theme matching `#3B5BDB` primary and Inter typography.
  - Setup `.env` parsing with validation for Firebase and OpenWA endpoints.
  - Configure root route layout with collapsible sidebar and app shell.
- **Dependencies:** None.
- **Definition of Done:** App builds cleanly; routes navigate; Firebase connects without errors.

### Milestone 2: Authentication & RBAC Baseline (M2)
- **Goal:** Implement Google OAuth and Email/Password authentication with role-based routing.
- **Tasks:**
  - Implement `AuthContext` with `onAuthStateChanged`.
  - Create Login/Signup screens with Formik + Yup.
  - Setup initial Firestore Security Rules protecting collections by role.
- **Dependencies:** M1.
- **Definition of Done:** Admin, Cashier, and Inventory Manager users log in; unauthorized routes show 403.

### Milestone 3: Store Masters, Tax Rates, Settings & Categories (M3)
- **Goal:** Manage core administrative configuration records.
- **Tasks:**
  - Implement `Stores` profile editor (GSTIN, FSSAI, Address).
  - Implement `TaxRates` master (CGST/SGST/IGST slabs: 0%, 5%, 12%, 18%, 28%).
  - Implement `ProductCategory` CRUD dialogs with soft-delete.
- **Dependencies:** M2.
- **Definition of Done:** Admin can create and update store settings, tax slabs, and categories.

### Milestone 4: Product Catalog Management (M4)
- **Goal:** Comprehensive product catalog management with shelf-life attributes.
- **Tasks:**
  - Build paginated `Products` table with category filters and search.
  - Build Add/Edit drawer with Formik + Yup (Cost, Ingredients, `IsExpDate`, `Days`).
  - Implement soft delete (`RecordStatus: 1`) and restore.
- **Dependencies:** M3.
- **Definition of Done:** Products created and listed with correct tax rate association.

### Milestone 5: Vendors & Purchase Orders (M5)
- **Goal:** Manage external suppliers and create procurement orders.
- **Tasks:**
  - Build `Vendors` directory with unique `VendorCode`.
  - Build `PurchaseOrderHeader` and `Details` flow with line items, rates, and target dates.
- **Dependencies:** M4.
- **Definition of Done:** POs can be drafted, viewed, and exported to PDF.

### Milestone 6: Material Inward, Barcode Generation & Stock Derivation (M6)
- **Goal:** Inward stock batches against PO or ad-hoc, generate batch barcodes with expiry.
- **Tasks:**
  - Build Material Inward stepper (with PO / without PO).
  - Calculate batch expiry based on product shelf life.
  - Generate unique barcodes in `MaterialInwardBarcodes` and printable preview labels.
- **Dependencies:** M5.
- **Definition of Done:** Stock batches saved with generated barcodes printable on thermal labels.

### Milestone 7: Customer Directory (M7)
- **Goal:** Manage retail and B2B customers with mobile lookup.
- **Tasks:**
  - Build `Customers` list with mobile search.
  - Build Customer creation drawer with GSTIN and State selection.
- **Dependencies:** M3.
- **Definition of Done:** Customer lookup by 10-digit mobile number functions in < 100ms.

### Milestone 8: POS Terminal & Bucket Staging (M8)
- **Goal:** High-velocity checkout interface with barcode scanning and held carts.
- **Tasks:**
  - Build split 60/40 POS terminal layout (`/apps/bucket`).
  - Barcode scanner auto-focus and keyboard-wedge listener.
  - Real-time cart staging in `BucketHeader` and `BucketDetails`.
  - Tabbed held bucket switching (F8 shortcut).
- **Dependencies:** M4, M6, M7.
- **Definition of Done:** Cashier scans barcode, item adds to cart in < 100ms; carts hold and resume cleanly.

### Milestone 9: Invoice Generation, GST Engine & Payments (M9)
- **Goal:** Atomic conversion of bucket to sales invoice with GST calculation.
- **Tasks:**
  - Transactional invoice counter increment (`DocumentNumber`).
  - Client-side GST engine splitting CGST/SGST vs IGST based on State.
  - Payment mode toggle: Cash (with change calc) vs UPI (with QR code).
  - Atomic commit writing `InvoiceHeader`/`Details` and closing `Bucket`.
- **Dependencies:** M8.
- **Definition of Done:** Concurrency-safe invoice created; financial math verified to 2 decimal places.

### Milestone 10: Invoice History, PDF & Soft Cancellation (M10)
- **Goal:** Invoice management, thermal/A4 printing, and managerial soft cancellation.
- **Tasks:**
  - Build paginated Invoice list with date/status filters.
  - Implement `@react-pdf/renderer` invoice template (FSSAI, GSTIN, line taxes).
  - Implement Cancel Invoice modal requiring mandatory cancellation reason.
- **Dependencies:** M9.
- **Definition of Done:** Invoice PDFs render accurately; cancelled invoices display red watermark.

### Milestone 11: Digital WhatsApp Receipts via OpenWA (M11)
- **Goal:** Automated and on-demand dispatch of structured text receipts via WhatsApp.
- **Tasks:**
  - Connect OpenWA HTTP client to port 2785.
  - Format invoice summary message template with items, totals, and license numbers.
  - Implement post-invoice send dialog with retry and failure degradation.
- **Dependencies:** M9, M10.
- **Definition of Done:** Receipts successfully delivered to customer WhatsApp with retry options.

### Milestone 12: Vendor Material Returns (M12)
- **Goal:** Outward return notes for damaged or expired inventory.
- **Tasks:**
  - Build `MaterialReturns` reasons master.
  - Build `MaterialReturnNoteHeader` and `Details` workflow.
- **Dependencies:** M5, M6.
- **Definition of Done:** Damaged/expired goods documented and linked to vendor debit records.

### Milestone 13: Dashboard & Analytics Reports (M13)
- **Goal:** Financial KPI dashboard and operational reports with CSV export.
- **Tasks:**
  - Build Admin Dashboard KPI cards and ApexCharts.
  - Build Daily Sales, Vendor-wise Sales, and Expired Stock reports.
  - Implement client-side CSV streaming export.
- **Dependencies:** M9, M10, M12.
- **Definition of Done:** Reports render correct aggregated totals and export clean CSVs.

### Milestone 14: Hardening, Security Audit & Production Deployment (M14)
- **Goal:** Security rules verification, index deployment, emulator test suite, and CI/CD hosting.
- **Tasks:**
  - Run full test suite on Firestore Emulator.
  - Deploy composite indexes and locked-down `firestore.rules`.
  - Document production hosting configuration and OpenWA persistent service.
- **Dependencies:** M1 to M13.
- **Definition of Done:** Passes 100% of Production Readiness and Final Audit checklists.
