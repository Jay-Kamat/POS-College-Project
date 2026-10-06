# Change Requests & Architectural Modification Log: POS & Billing System

## 1. Change Request Governance & Template
Any structural, database schema, security rule, or dependency alteration to the POS & Billing System must be documented using the template below prior to code implementation.

```markdown
### CR-XXX: [Title of Change Request]
- **Date Proposed:** YYYY-MM-DD
- **Proposer:** [Name / Role]
- **Status:** [Proposed | Under Review | Approved | Rejected | Implemented]
- **Reason & Context:** [Why is this change necessary?]
- **Technical Scope & Impact:** [What code/services will change?]
- **Database & Schema Impact:** [Tables, constraints, indexes]
- **Security & Authorization Impact:** [Permissions or rule logic updates]
- **UI / UX & Integration Impact:** [Screens, dialogs, or workflow modifications]
- **Testing & Verification Requirements:** [Required tests before merging]
```

---

## 2. Active & Historical Change Requests

### CR-001: Migrate from Firebase (Auth + Firestore) to Node.js (NestJS) + PostgreSQL 16 + Prisma
- **Date Proposed:** 2026-10-06
- **Proposer:** System Architect & Master Backend Prompt
- **Status:** **Approved (Supersedes Master Prompt Architecture)**
- **Reason & Context:** 
  The original architecture relied on client-side React code communicating directly with Cloud Firestore and Firebase Authentication. This introduced critical risks and limitations:
  1. Business logic (GST calculation, line tax distribution, invoice totals, stock decrement) executed in the browser, vulnerable to manipulation.
  2. Sequential, gapless Indian GST invoice numbering required fragile Firestore document-counter transactions.
  3. No native relational JOINs or ACID row locking (`SELECT ... FOR UPDATE`), causing potential stock drift under concurrency.
  4. React called the OpenWA WhatsApp gateway directly, creating an external browser dependency and loss of delivery retryability.
  5. Reporting required scanning thousands of NoSQL documents with runaway read costs.
- **Technical Scope & Impact:**
  - Introduce new `backend/` service: Node.js 22 LTS, TypeScript (strict mode), NestJS framework.
  - Database: PostgreSQL 16 with extensions `pgcrypto`, `citext`, `pg_trgm`.
  - ORM & Migrations: Prisma with raw SQL migrations for CHECK constraints, triggers, and GIN trigram indexes.
  - Financial Math: `decimal.js` for zero floating-point error GST and round-off calculations.
  - Authentication: Backend JWT (access token 15 min + rotated httpOnly refresh token cookie 7 days) with argon2id password hashing and server-side Google ID token verification.
  - Authorization: NestJS Guards enforcing RBAC on every request (`Admin`, `Cashier`, `Inventory Manager`). Vendor entity remains strictly non-login.
  - WhatsApp: Decoupled via transactional `whatsapp_outbox` table and background worker calling OpenWA server-to-server.
  - Frontend Integration: `POSUI/src/_api` updated to call REST API `/api/v1` via Axios `httpClient.js` with bidirectional mappers preserving existing function signatures and PascalCase shapes.
  - Firebase Removal: Firebase SDK, `firestore.rules`, and `firebase.json` emulators removed once frontend integration passes.
- **Database & Schema Impact:**
  - 21 relational tables created with UUID primary keys, audit triggers, CHECK constraints, and partial indexes.
  - Append-only `stock_ledger` table with database triggers preventing UPDATE/DELETE.
  - Gapless `invoice_number_sequences` table locked via `SELECT ... FOR UPDATE`.
- **Security & Authorization Impact:**
  - Authorization shifted 100% to backend NestJS guards.
  - Rate limiting with `@nestjs/throttler`, security headers with `helmet`, strict CORS allowlist.
  - PII redaction via `nestjs-pino`.
- **UI / UX & Integration Impact:**
  - Zero UI page rewrites: `POSUI/src/_api/*` function names and parameters remain identical.
  - Cart preview calls `POST /invoices/preview` for server-authoritative GST totals.
  - Login page switched from Firebase Auth to backend JWT with session restoration on refresh.
- **Testing & Verification Requirements:**
  - Integration tests with real PostgreSQL via Docker/Testcontainers (no DB mocking).
  - Concurrency tests: 50 parallel invoices for gapless numbering, 2 cashiers competing for the last unit (FEFO), parallel idempotency retries.
  - Ledger invariant test: `SUM(stock_ledger.quantity_delta) == SUM(stock_batches.quantity_available)`.

---

### CR-002: Transition Core Financial Logic to Dedicated REST API (Superseded by CR-001)
- **Status:** **Superseded by CR-001**
- **Reason & Context:** Originally proposed deploying Firebase Cloud Functions. Fully absorbed and replaced by CR-001's dedicated NestJS + PostgreSQL backend.

---

### CR-003: Dedicated Real-Time Stock Ledger (Implemented in CR-001)
- **Status:** **Implemented via CR-001**
- **Reason & Context:** Implemented as relational append-only `stock_ledger` table and `stock_batches` table with FEFO picking.

---

### CR-004: Retail Customer Sales Returns & Refund Processing
- **Status:** **Proposed (Deferred to Post-v1)**
- **Reason & Context:** Phase 1 PRD supports vendor material returns only. Customer sales returns remain out of scope for v1.

---

### CR-005: Cash Register Management & Cashier Shift Handover
- **Status:** **Proposed (Deferred to Post-v1)**
- **Reason & Context:** Shift reconciliation remains out of scope for v1.

---

### CR-006: Official Meta WhatsApp Business Cloud API Integration
- **Status:** **Proposed (Enterprise Phase)**
- **Reason & Context:** Local OpenWA gateway remains the primary engine for v1, driven by the backend `whatsapp_outbox` worker.

---

### CR-007: Direct PostgreSQL Driver (`pg`) without Prisma ORM
- **Date Proposed:** 2026-10-06
- **Proposer:** User Directive ("Prisma dont use prisma use dotnet core / Keep Node.js / Express or NestJS backend with direct PostgreSQL driver instead of Prisma")
- **Status:** **Approved & Implemented**
- **Reason & Context:** The user explicitly directed not to use Prisma ORM and to use direct PostgreSQL connectivity instead.
- **Technical Scope & Impact:**
  - Database access implemented using the official native `pg` connection pool with parameterized queries and explicit client transactions (`pool.connect()`, `BEGIN`, `COMMIT`, `ROLLBACK`).
  - Schema creation, indexing, and seed data managed directly via SQL scripts in `Backend/postgres.js`.
  - Zero Prisma dependencies or binaries required.
  - Full compatibility with React frontend (`POSUI`) via REST API on Port 5000.
