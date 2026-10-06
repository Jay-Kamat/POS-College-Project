# Product Roadmap & Milestone Execution Plan: POS & Billing System

## Overview
This roadmap establishes a strict milestone-driven execution plan for the NestJS + PostgreSQL 16 backend and its integration with the React frontend (`POSUI`). Each milestone is isolated, test-driven, and governed by a **Verification Gate** that must fully pass before proceeding to the subsequent milestone.

---

## Backend Milestone Breakdown (B0 – B16)

### Milestone B0: Documentation & Architectural Governance (B0)
- **Scope:** Update all 11 core architecture and specification documents; log approved `CR-001` in `CHANGE_REQUESTS.md`; update `CHANGELOG.md` and `PROGRESS.md`.
- **Verification Gate:** Formal user review and approval.

---

### Milestone B1: Project Scaffold & Infrastructure Baseline (B1)
- **Scope:** Initialize `backend/` with NestJS (TypeScript strict mode), Prisma ORM, Docker Compose for PostgreSQL 16, startup config validation (`class-validator`), structured logging (`nestjs-pino`), global HTTP filters, `ValidationPipe`, Swagger at `/api/docs`, and `/health` endpoints.
- **Verification Gate:** `docker compose up` boots successfully; `/health/ready` returns HTTP 200 OK; backend refuses to boot if required environment variables are missing; `npm run lint` and `tsc --noEmit` pass with zero errors.

---

### Milestone B2: Database Schema, Migrations & Seed Engine (B2)
- **Scope:** Complete `prisma/schema.prisma` across all 21 tables; apply initial raw SQL migrations for CHECK constraints, triggers, and GIN trigram indexes; develop deterministic development seed script (`prisma/seed.ts`).
- **Verification Gate:** `npx prisma migrate reset` succeeds cleanly from an empty database; `npm run seed` executes without error; automated constraint tests confirm invalid GSTINs, mismatching tax rates (`igst != cgst + sgst`), and duplicate barcodes fail as expected.

---

### Milestone B3: Authentication, RBAC & Audit System (B3)
- **Scope:** Implement argon2id password hashing, JWT access token issuing, httpOnly refresh token cookie rotation with reuse detection, account lockout (5 failed attempts for 15 minutes), Google OAuth ID token verification, and `@RequirePermission` guard.
- **Verification Gate:** Unit and integration tests pass for login, refresh rotation, token family revocation upon reuse, and account lockout; automated route scan verifies protected endpoints return 401 without tokens and 403 without permissions.

---

### Milestone B4: Master Data Administration (B4)
- **Scope:** CRUD, validation, soft-deletion (`record_status: 1`), and restoration for Stores, Tax Rates, System Settings, and Product Categories.
- **Verification Gate:** Integration tests verify creation, updating, soft-delete, and restoration across all master collections with strict DTO validation.

---

### Milestone B5: Products, Customers, Vendors & Search (B5)
- **Scope:** Product catalog with shelf-life attributes (`IsExpDate`, `Days`); PostgreSQL GIN trigram index search; product lookup by barcode; customer 10-digit mobile lookup; vendor directory.
- **Verification Gate:** Product text search responds in $< 50\text{ms}$ over 100,000 seeded items; `EXPLAIN ANALYZE` confirms GIN index scan; barcode and customer mobile resolution tests pass.

---

### Milestone B6: Purchase Orders (B6)
- **Scope:** PO header and line items CRUD; document numbering per store; lifecycle status state machine (`DRAFT` → `SENT` → `PARTIALLY_RECEIVED` → `RECEIVED` → `CANCELLED`); printable PDF data endpoint.
- **Verification Gate:** PO status transition tests succeed; invalid status transitions rejected.

---

### Milestone B7: Material Inward, Batches & Inventory Ledger (B7)
- **Scope:** Material Inward docket processing; atomic creation of `stock_batches` with unique 13-digit thermal barcodes; auto-calculation of shelf-life expiry dates; append-only `stock_ledger` `INWARD` entries; stock query endpoints (`/stock/on-hand`, `/stock/batches`, `/stock/ledger`).
- **Verification Gate:** Core inventory invariant test passes: `SUM(stock_ledger.quantity_delta) == SUM(stock_batches.quantity_available)` for every SKU and store; parallel inward creations generate strictly collision-safe unique barcodes.

---

### Milestone B8: POS Buckets & Cart Tax Preview (B8)
- **Scope:** Held buckets management (`BKT-01`, `BKT-02`); `POST /invoices/preview` server-side calculation engine implementing Indian GST rules with `decimal.js`.
- **Verification Gate:** Preview calculation totals match hand-calculated test cases in `TAX_GST_RULES.md` across intra-state (CGST+SGST), inter-state (IGST), tax-inclusive, tax-exclusive, and rounding configurations.

---

### Milestone B9: Atomic Invoice Checkout & Concurrency Controls (B9)
- **Scope:** Transactional checkout (`POST /invoices`); `Idempotency-Key` validation; First-Expiry, First-Out (**FEFO**) batch allocation; row-locked sequential gapless invoice numbering; payment recording; stock decrements; `SALE` ledger logging; outbox dispatch.
- **Verification Gate:** Concurrency tests pass: 50 parallel checkouts generate 50 unique, gapless, ordered invoice numbers without deadlocks; two cashiers racing for the final stock unit results in exactly one success and one `STOCK_INSUFFICIENT` 409 error; retry with identical `Idempotency-Key` returns original invoice.

---

### Milestone B10: Invoice Inquiries, Cancellation & A4 Tax PDF (B10)
- **Scope:** Paginated invoice queries with filters; `POST /invoices/:id/cancel` atomic reversal (restores stock batches, writes `SALE_CANCEL` ledger rows, refunds tender, records audit log); A4 Tax Invoice printable data generator.
- **Verification Gate:** Soft-cancellation restores stock batch counts to exact prior levels; double-cancellation rejected (`INVALID_STATE`); cancelled invoice numbers are never reused.

---

### Milestone B11: Asynchronous WhatsApp Outbox & OpenWA Integration (B11)
- **Scope:** Background polling worker processing `whatsapp_outbox` rows via `FOR UPDATE SKIP LOCKED`; server-to-server HTTP dispatch to OpenWA with exponential backoff (max 5 retries); failure isolation.
- **Verification Gate:** Simulating OpenWA gateway failure allows invoice creation to complete normally; outbox records retry up to 5 times and transition to `FAILED` with error log; gateway recovery successfully drains pending queue.

---

### Milestone B12: Material Returns & Inventory Adjustments (B12)
- **Scope:** Vendor return notes linked to return reasons; batch stock reduction; `VENDOR_RETURN` ledger rows; audited stock adjustments (`POST /stock/adjustments`) for shrinkage or spoilage.
- **Verification Gate:** Over-return beyond available batch quantity rejected; ledger invariant holds after returns and adjustments.

---

### Milestone B13: Executive Dashboard & Reporting Hub (B13)
- **Scope:** Aggregated dashboard summary; Daily Sales report (cash/UPI split, tax total); Vendor-Wise Sales performance; Vendor-Wise Expired Stock audit; streaming CSV generation.
- **Verification Gate:** Aggregated report outputs match direct raw SQL calculation sums over test databases; CSV streaming export completes cleanly.

---

### Milestone B14: React Frontend Integration (`POSUI` ↔ Backend) (B14)
- **Scope:** Deploy Axios `src/_api/httpClient.js` with automatic refresh token interceptor; build `src/_api/mappers/*` bidirectional data mappers; wire JWT session restoration in `AuthContext`; connect POS cart preview; route WhatsApp dispatch through backend; update `run-all.ps1`.
- **Verification Gate:** `npm run build` in `POSUI` completes with **zero errors and zero warnings**; zero remaining `firebase` imports; manual smoke test passes across all screens; token refresh works without logout loops; RBAC screen restrictions verified.

---

### Milestone B15: System Hardening, Disaster Recovery Drill & Audit (B15)
- **Scope:** Production readiness checklist; security audit; simulated database backup and recovery drill using `pg_dump` into a scratch database; documentation consistency check.
- **Verification Gate:** Final audit checklist achieves 100% PASS rating; database restore drill restores all transactions in $< 15\text{ minutes}$.

---

### Milestone B16: (Optional) Legacy Firestore-to-PostgreSQL Data Migration (B16)
- **Scope:** Standalone Node.js script extracting legacy Firestore JSON/collections and loading them into PostgreSQL with identifier mapping.
- **Verification Gate:** Row counts and monetary sales totals reconcile 100% between source and target datasets.
