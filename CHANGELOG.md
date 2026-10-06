# Changelog & Version History: POS & Billing System

All notable changes to the POS & Billing System are documented in this file in adherence with Semantic Versioning.

---

## [2.0.0-dev] - 2026-10-06 (Architecture Pivot: Node.js + NestJS + PostgreSQL 16)

### Added
- **Architecture Migration Specification (CR-001):**
  - Pivot from client-side direct Firebase (Auth + Firestore) to a production-grade backend service built with Node.js 22 LTS, TypeScript (strict mode), NestJS, and PostgreSQL 16 with Prisma ORM.
  - Server-authoritative business logic: server derives pricing, GST splits (CGST/SGST vs IGST), grand totals, and round-offs using `decimal.js`.
  - Concurrency-safe gapless invoice numbering with `SELECT ... FOR UPDATE` row locking.
  - First-Expiry, First-Out (FEFO) batch allocation with expired-batch prevention.
  - Append-only `stock_ledger` table with database triggers preventing UPDATE and DELETE.
  - Transactional WhatsApp delivery using the `whatsapp_outbox` pattern and background worker communicating server-to-server with OpenWA.
  - Backend JWT authentication with argon2id hashing, rotated httpOnly refresh token cookies, and server-side Google OAuth ID token verification.
  - Comprehensive documentation overhaul across all 11 core architectural and testing specifications in `docs/`.

---

## [1.0.0] - 2026-10-04 (Working UI System & OpenWA Gateway)

### Added
- **Complete Application Suite (All 14 UI Roadmap Milestones & STITCH UI Prompts):**
  - **POS Terminal (`/apps/bucket`):** High-velocity 60/40 checkout interface, `F2` barcode focus, category chips, cart quantity steppers, live GST split, 32px Grand Total, Cash change due, UPI QR preview, `F8` held bucket tabs, and `F9` atomic checkout.
  - **Invoicing & PDF (`/apps/invoice` & `/apps/invoice/:id`):** Post-payment success dialog with 1-click WhatsApp receipt dispatch; paginated invoice list with Active/Cancelled filters and soft-cancellation modal; printable A4 GST Tax Invoice layout with HSN breakdown, tax summary, amount in words, and CANCELLED watermark stamp.
  - **Reports & Analytics Hub (`/apps/reports`):**
    - Daily Sales Report (`/apps/dailySales`) with KPI summary strip and CSV streaming export.
    - Vendor-Wise Sales Performance (`/apps/vendorWiseSale`) with units sold and gross sales value.
    - Vendor-Wise Expired Stock Audit (`/apps/vendorWiseExpiredStock`) with overdue alerts and cost loss value.
    - Generic client-side CSV streaming utility (`src/utils/exportCsv.js`).
  - **Vendor Material Returns (`/apps/returns`):** Material Return Notes workflow with outward debit notes linked to `MaterialReturns` reasons master.
  - **Product Catalog (`/apps/product`):** Catalog table with search, category filtering, shelf-life expiry tracking toggle (`IsExpDate`, `Days`), and Formik + Yup Add/Edit side drawer.
  - **Supply Chain Inward (`/apps/materialInward` & `/apps/purchaseOrder`):** 3-step inward stepper (with/without PO), auto-calculated batch expiry dates, and printable 13-digit thermal barcode labels (`200100XXXXXX`). Purchase Order generation and management.
  - **Directory Management (`/apps/vendor` & `/apps/customer`):** Vendor directory with unique `VendorCode`; Customer directory with 10-digit mobile lookup and B2B GSTIN profiles.
  - **Store Configuration & Tax Slabs (`/apps/settings`):** Store Profile (GSTIN, FSSAI, Address), GST Tax Slabs (0%, 5%, 12%, 18%, 28%) with add-slab modal, receipt printing preferences (58mm, 80mm, A4), and OpenWA gateway connection manager.
  - **User Governance & RBAC Matrix (`/apps/users`):** Staff accounts list, invite user dialog, visual module permissions matrix across Admin, Cashier, and Inventory Manager with live change detection.
  - **Executive Dashboard (`/dashboard`):** 4 KPI summary cards (Today's Revenue, Invoices Today, Active SKUs, Expiring Batches), recent invoices table, and FEFO expiring batches monitor.
- **WhatsApp Microservice Gateway (`OpenWA`):**
  - Node.js/Express service on **Port 2785** (REST API) and **Port 2886** (QR pairing dashboard).
  - Health endpoint `GET /api/v1/session/status` and `POST /api/v1/messages/send-text` with retry logic.
- **Build & Quality Assurance:**
  - Production build compiled with Vite 5.

---

## [0.6.0-beta] - 2026-10-04 (UI System Build Completed)
- Implemented Milestones 1 through 9.

---

## [0.1.0-alpha] - 2026-10-04 (Documentation & Architecture Foundation)
- Initial specifications across Core Planning, Business Logic, Technical Specs, Testing, and Project Management.
