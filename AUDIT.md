# System Audit Report: POS & Billing System (DailyMart)

**Date:** 2026-10-20  
**Auditor:** Senior Full-Stack Engineer & PostgreSQL DBA  
**Scope:** Full-stack codebase audit across Database (PostgreSQL `pos_billing_db`), Backend (ASP.NET Core .NET 10 + Dapper), Frontend (React 18 + Vite + MUI), WhatsApp Microservice (OpenWA), and DevOps configuration.

---

## 1. Executive Summary
The system has a rich, functional UI and working basic backend CRUD endpoints. However, it currently relies on demo authentication, mock tokens, client-side fallback data in localStorage, unconstrained database tables without batch tracking or sequence locking, and zero endpoint authorization. To achieve production readiness, the codebase requires structural hardening across database integrity, server-authoritative security, transactional FEFO inventory, and frontend API binding.

---

## 2. Database Audit (`schema_full.sql` & Migrations)

| Area | Current Implementation | Identified Problem | Production Requirement |
| :--- | :--- | :--- | :--- |
| **Authentication & Users** | `users` table lacks `password_hash`, `store_id`, `failed_attempts`, `locked_until`. | Passwords are not hashed; demo auth uses mock user IDs. No refresh tokens. | Add `password_hash` (BCrypt), `store_id` (FK to stores), `failed_attempts`, `locked_until`. Create `refresh_tokens` table. |
| **Invoice Numbering** | `SELECT COUNT(*) FROM invoices WHERE store_id = @StoreId` | High race-condition risk. Duplicate numbers or gaps occur during concurrent billing or cancellation. | Create `document_sequences` table with `UPDATE ... RETURNING` row lock for gapless numbering per financial year (April 1 rollover). |
| **Batch Inventory & FEFO** | Perishable fields (`is_exp_date`, `days`) exist on `products`, but no batch table exists. | Cannot track distinct inward consignments, batch numbers, or batch-specific remaining quantities. FEFO is impossible. | Create `stock_batches` table (`id`, `product_id`, `store_id`, `grn_id`, `batch_no`, `expiry_date`, `qty_received`, `qty_remaining`). Deduct sales using FEFO. |
| **Stock Ledger & Audit** | Updates overwrite `products.stock_quantity` directly without a log. | No audit trail for inventory variance, shrinkage, or audit inspection. | Create immutable `stock_movements` ledger table and `audit_log` table for cancellations, price modifications, and role reassignments. |
| **Constraints & Foreign Keys** | Missing check constraints and several loose foreign keys (`invoices.store_id`, `staged_buckets.store_id`). | Negative stock quantities possible; invalid GSTIN or amounts can be stored. | Add CHECK constraints (`stock_quantity >= 0`, `cost >= 0`, `amount >= 0`, valid statuses). Add NOT NULL & FK constraints. |
| **Indexing** | Basic primary keys and store indexes exist. | Missing composite indexes for high-frequency queries like `(store_id, date DESC)` and `(store_id, status)`. | Add targeted composite B-Tree indexes for all report and listing filter criteria. |
| **Customers Store Scoping** | `customers` table lacks `store_id` or consistent scoping policy. | Ambiguous whether customer mobile lookup is global across chains or store-specific. | Enforce `customers` as global across outlets with default branch association and indexing on `mobile_number`. |

---

## 3. Backend Audit (ASP.NET Core .NET 10 + Dapper)

| Area | Current Implementation | Identified Problem | Production Requirement |
| :--- | :--- | :--- | :--- |
| **Authentication** | `AuthController.cs` returns hardcoded `jwt_mock_token_for_college_pos_demo`. | Any login attempt succeeds without credential verification. | Implement real JWT authentication with short-lived access tokens (15m) + rotated refresh tokens (7d), password hashing via BCrypt, and account lockout. |
| **Authorization & RBAC** | Zero `[Authorize]` attributes on ANY controller. All endpoints are public. | Cashiers can delete products, view cost prices, modify stores, and alter staff roles. | Enforce `[Authorize]` across all controllers with role/permission policies mapped to `permissions_matrix`. Derive `store_id` from JWT claims. |
| **Transactional Checkout** | `CreateInvoiceAsync` performs stock check in a separate query before update. | Concurrency vulnerability: two cashiers selling the last unit concurrently can cause stock drift. | Enforce row-level locks (`SELECT ... FOR UPDATE`) or atomic `UPDATE products SET stock_quantity = stock_quantity - @Qty WHERE stock_quantity >= @Qty`. Return HTTP 409 Conflict if stock is insufficient. |
| **Idempotency** | No idempotency validation on `POST /api/invoices`. | Network retries can duplicate invoice issuance and double-bill customers. | Add `Idempotency-Key` header handling with cached response verification. |
| **Input Validation** | Ad-hoc manual `if` checks in controllers. | Missing structured validation for email, GSTIN, phone format, and numeric bounds. | Implement server-side validation with clean standard error responses. |
| **Error Handling** | Unhandled exceptions bubble up as 500 with stack traces in development. | Inconsistent error responses; security risk in production. | Global exception handler returning standard RFC 7807 `ProblemDetails` JSON. |
| **Health Checks** | `HealthController.cs` only inspects GC memory and uptime. | Does not verify database connectivity or OpenWA microservice health. | Implement comprehensive health check testing PostgreSQL connection pool and OpenWA ping. |
| **CORS & Security Headers** | `AllowAnyOrigin()`, `AllowAnyMethod()`, `AllowAnyHeader()`. | Cross-Site Scripting (XSS) and CSRF exposure in production. | Restrict CORS to configured client origin; add HSTS, `X-Content-Type-Options: nosniff`, and frame protection. |
| **WhatsApp Resilience** | Synchronous HTTP call to OpenWA with 2-second timeout and silent catch. | If OpenWA is restarting or phone is offline, message is permanently lost. | Implement `whatsapp_outbox` table in database. If direct send fails, queue message for background retry and expose retry button in UI. |

---

## 4. Frontend Audit (React 18 + Vite + MUI)

| Area | Current Implementation | Identified Problem | Production Requirement |
| :--- | :--- | :--- | :--- |
| **Authentication Flow** | `Login.jsx` directly dispatches user object to Redux and navigates to `/dashboard`. | Never touches `/api/auth/login`; authentication is simulated in memory. | Wire `Login.jsx` to real `POST /api/auth/login`. Store JWT in secure storage, configure Axios/fetch request interceptor. |
| **API Client & Mock Data** | Every service file (`invoiceService.js`, `productService.js`, etc.) has fallback mock arrays in `localStorage`. | API errors are silently masked by mock data; developer/user cannot tell if backend failed. | Centralize API client in `apiClient.js` with Bearer auth header injection, 401 token refresh interceptor, and complete removal of all fallback mock arrays. |
| **Route Protection** | Hard-coded role checks in `MainLayout.jsx` sidebar items. | Disconnected from database `permissions_matrix`. UI may show actions the server rejects. | Drive navigation items and route guards dynamically from the authenticated user's permission matrix. |
| **Error Handling & UX** | Alerts and toasts are inconsistent across pages. No global error boundary. | Unhandled React rendering errors produce blank white screens. | Implement React Error Boundary, loading spinners, empty states, and standard toast notifications for API failures. |
| **POS Terminal Resilience** | Does not handle 409 Conflict (out-of-stock); missing checkout double-click prevention. | Cashiers can accidentally double-submit checkout or get uninformative failure messages. | Add disabled checkout state while submitting, visual out-of-stock badge on catalog cards, and 409 error dialog. |
| **Dependent Screen Sync** | Actions in POS terminal or Inward do not notify open reports or dashboard. | Stale data displayed until manual browser page refresh. | Dispatch data refresh events or invalidate cached state on write operations. |

---

## 5. DevOps & Deployment Audit

| Area | Current Implementation | Identified Problem | Production Requirement |
| :--- | :--- | :--- | :--- |
| **Containerization** | No `Dockerfile` or `docker-compose.yml` present in repository. | Inconsistent deployments across developer machines and servers. | Provide multi-stage Dockerfiles for Backend, POSUI (Nginx), and OpenWA, plus `docker-compose.yml`. |
| **Configuration** | Connection strings and OpenWA ports scattered across files. | Hard to configure in production environments. | Unify configuration in `.env.example` templates and production `appsettings.Production.json`. |
| **Testing** | Zero automated tests in solution. | Refactorings risk silent regressions. | Create `Backend.Tests` xUnit test suite (GST, numbering, FEFO, concurrent checkout) and Playwright E2E tests. |
| **Disaster Recovery** | No automated backup or restore scripts. | Risk of data loss in production. | Provide shell/PowerShell backup and restore scripts for PostgreSQL. |

---

## 6. Implementation Plan Summary

1. **Phase 1: Database (PostgreSQL)**
   - Create migration `005_production_schema_and_fefo.sql` adding `password_hash`, `refresh_tokens`, `document_sequences`, `stock_batches`, `stock_movements`, `audit_log`, `whatsapp_outbox`, CHECK constraints, and missing indexes.
   - Seed default Admin user with BCrypt hash and initialize document sequence counters.
2. **Phase 2: Backend (.NET 10)**
   - Add BCrypt.Net and JWT Bearer packages.
   - Implement real JWT auth controller, token refresh, lockout, and `[Authorize]` attributes with RBAC permission filter.
   - Rewrite `CreateInvoiceAsync` with row-lock FEFO batch deduction, gapless document sequence allocation, and 409 Conflict handling.
   - Implement ProblemDetails global exception handler, input validation, and enhanced health checks.
3. **Phase 3: Frontend (React)**
   - Upgrade `apiClient.js` with Bearer auth, token refresh, and remove all dummy fallback data across all services.
   - Wire `Login.jsx` to real auth API and bind route guards to permissions matrix.
   - Add error boundary, loading/empty states, out-of-stock handling in POS Terminal.
4. **Phase 4: Linking & Verification**
   - Create `docs/WIRING_MATRIX.md` verifying all 17 controllers, services, database tables, and UI screens.
5. **Phase 5: Automated Testing**
   - Build and run unit and integration tests (GST, numbering, FEFO, concurrency).
6. **Phase 6: Production Readiness**
   - Add Dockerfiles, docker-compose.yml, backup/restore scripts, and `PRODUCTION_CHECKLIST.md`.
