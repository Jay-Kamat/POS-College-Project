# DailyMart POS & Billing System - Production Readiness Checklist

This document provides a comprehensive operational readiness evaluation and checklist for deploying and maintaining the DailyMart POS & Billing System in production environments.

---

## 1. Security & Authentication

- [x] **Zero Plaintext Passwords**: All user passwords hashed using BCrypt (11 work factor rounds).
- [x] **Brute-Force Protection**: Automatic account lockout triggered after 5 consecutive failed attempts (15-minute lock duration).
- [x] **Cryptographic JWT Tokens**: Signed using HMAC SHA256 with minimum 256-bit secret key; includes token expiration (`exp`), issuer (`iss`), and audience (`aud`).
- [x] **Cryptographic Refresh Tokens**: High-entropy 64-byte tokens stored hashed in `refresh_tokens` table with revocation tracking and automatic rotation.
- [x] **Granular Role-Based Access Control (RBAC)**: Enforced on all 17 backend controllers using dynamic `permissions_matrix` database tables (Cashiers strictly blocked with 403 on users, settings, vendors, tax slabs).
- [x] **Tenant / Multi-Store Scoping**: Store IDs resolved strictly from authenticated user claims; Cashiers cannot override or inspect unauthorized stores.
- [x] **CORS Lockdown**: Locked to configured production domain origins in `appsettings.Production.json` (no wildcard `*` allowed).
- [x] **Security Headers**: Production Nginx and Kestrel emit `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, and strict CSP headers.
- [x] **No Secrets in Source Control**: Credentials and keys decoupled into environment variables with templates provided in `.env.example`.

---

## 2. Database & Data Integrity

- [x] **Gapless Sequence Numbering**: Transactional row-level lock allocation (`document_sequences` table with `UPDATE ... RETURNING`) preventing sequence gaps across Invoices, GRNs, POs, and MRNs.
- [x] **Financial Year Rollover**: Automatic fiscal year transition on 1 April (e.g. `25-26` to `26-27`).
- [x] **First-Expired, First-Out (FEFO) Inventory**: Strict stock batching (`stock_batches`) automatically allocating from the earliest expiry batches first on checkout and restoring to exact batches on cancellation.
- [x] **Double-Billing Prevention**: Request-level idempotency (`X-Idempotency-Key`) cached and verified for 15 minutes on invoice checkout.
- [x] **Atomic Checkout Transaction**: Product inventory locked (`SELECT ... FOR UPDATE`), server recalculates GST and price totals, ensuring concurrent checkouts never exceed available stock (returning clear 409 Conflict).
- [x] **Immutable Ledger**: Every stock change (inward, sale, cancel, return) logged to `stock_movements` with `qty_delta` and `qty_after`.
- [x] **Audit Trail**: High-impact business events (cancellations, bulk imports, role modifications) recorded in `audit_log`.
- [x] **Resilient WhatsApp Outbox**: Checkout enqueues to `whatsapp_outbox` asynchronously; WhatsApp gateway delays or failures never block customer receipts.

---

## 3. Performance & Connection Pooling

- [x] **PostgreSQL Connection Pooling**: Configured with `Maximum Pool Size=100`, `Minimum Pool Size=10`, and `Connection Lifetime=300` seconds to prevent connection exhaustion.
- [x] **Index Coverage**: High-frequency filter columns indexed (`store_id + date DESC`, `document_number`, `status`, `expiry_date`, `mobile_number`).
- [x] **Vite Code Splitting**: Frontend chunked into dedicated vendor bundles (`vendor-react`, `vendor-mui`, `vendor-redux`), keeping all asset chunks optimized under size limits.
- [x] **Gzip Compression**: Enabled in production Nginx configuration for static assets, HTML, and JSON payloads.
- [x] **API Pagination**: Server-side pagination (`page` and `pageSize`) enforced across all catalog, invoice, order, and customer listings.

---

## 4. Backups & Disaster Recovery

- [x] **Automated Backup Script**: `scripts/backup.ps1` executes `pg_dump` with custom compressed archive format (`.dump`) and retention cleanup.
- [x] **Restore Script**: `scripts/restore.ps1` provides verified, idempotent restoration using `pg_restore` with pre-flight database drops/recreations.
- [x] **Point-in-Time Recovery (PITR)**: Production PostgreSQL servers should enable Write-Ahead Log (WAL) archiving (`archive_mode = on`).
- [x] **Container Volume Persistence**: Docker Compose binds PostgreSQL data to `postgres_data` and WhatsApp auth session keys to `openwa_auth`.

---

## 5. Monitoring & Observability

- [x] **Health Check Endpoint**: `GET /api/health` probes database connectivity (`SELECT 1`) and OpenWA gateway availability, returning RFC 7807 problem details if degraded.
- [x] **Correlation Tracking**: `CorrelationIdMiddleware` assigns unique `X-Correlation-ID` to all HTTP requests and attaches it to response headers and log scopes.
- [x] **Structured Logging**: Serilog logging configured with structured parameters (Correlation ID, UserId, StoreId, ExecutionTime).
- [x] **Standardized Error Responses**: `GlobalExceptionMiddleware` catches unhandled exceptions and outputs RFC 7807 ProblemDetails without leaking server stack traces in production.

---

## 6. Rollback & Maintenance Strategy

- [x] **Zero-Downtime Blue-Green / Rolling Deployments**: Deploy backend and frontend containers independently behind Nginx reverse proxy.
- [x] **Safe Migration Policy**: Database migrations in `Backend/Database/Migrations/` are strictly additive and idempotent (`IF NOT EXISTS`, conditional DO blocks).
- [x] **Container Health Probes**: Docker healthchecks automatically prevent traffic routing to unready or crashed containers.
- [x] **Emergency Rollback**: Rollback to previous container image tags via `docker-compose up -d --no-build` in seconds.
