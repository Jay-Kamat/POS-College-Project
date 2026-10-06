# Architecture & Technology Decisions Record (ADR): POS & Billing System

## 1. Core Stack Evaluation & Technical Rationale

| Layer / Technology | Choice | Alternatives Evaluated | Rationale for Choice | Known Trade-offs |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Runtime** | **Node.js 22 LTS** | Node.js 20, Go, Python | Native Fetch, performance improvements, long-term support window, full TypeScript compatibility. | Single-threaded event loop requires non-blocking IO discipline. |
| **Backend Framework** | **NestJS** | Express, Fastify, Koa | Architectural consistency with `OpenWA`; modular DI, decorators for RBAC guards, automatic Swagger generation. | Additional architectural boilerplate compared to bare Express. |
| **Primary Database** | **PostgreSQL 16** | Cloud Firestore, MySQL, MongoDB | Strict ACID guarantees, row-level locking (`SELECT ... FOR UPDATE`), GIN trigram indexing, `citext`, `pgcrypto`. | Requires dedicated database management and connection pool tuning. |
| **ORM & Migrations** | **Prisma** | TypeORM, Drizzle, Kysely | Type-safe query builder, declarative schema, automated migration generation, raw SQL escape hatch for DDL triggers. | Generated client adds minor build overhead; raw SQL required for complex constraints. |
| **Financial Arithmetic** | **`decimal.js`** | Native JS `Number`, `bignumber.js` | Absolute precision for Indian GST splits, tax-inclusive backward math, and round-offs; zero IEEE 754 rounding drift. | Requires explicit method chaining (`.plus()`, `.times()`, `.toFixed(2)`). |
| **Password Hashing** | **`argon2id`** | bcrypt, scrypt, PBKDF2 | Winner of Password Hashing Competition; maximum resistance against GPU and side-channel attacks. | Higher CPU/memory consumption per hash during login. |
| **Structured Logging** | **`nestjs-pino`** | Winston, Morgan, Bunyan | Extreme speed (low CPU overhead), JSON output, automated PII field redaction out of the box. | Logs in raw JSON format; requires formatting pipe for local terminal reading. |
| **Security Headers** | **`helmet`** | Manual middleware | Industry standard for injecting essential HTTP security headers (HSTS, CSP, X-Frame-Options). | Requires configuring CSP rules for Swagger UI. |
| **Rate Limiting** | **`@nestjs/throttler`** | `express-rate-limit` | Native NestJS guard integration, customizable per-route quotas (stricter on `/auth/*`). | In-memory storage by default; multi-instance requires Redis. |
| **Frontend Framework** | **React 18 + Vite 5** | Webpack 5, Next.js | Blazing fast HMR ($<200\text{ms}$), optimized tree-shaking, elimination of legacy OpenSSL flags. | Client-side rendering (CSR); SEO optimization requires pre-rendering if public. |
| **Frontend State** | **Redux Toolkit (RTK)** | Zustand, Context API | Predictable state container, time-travel debugging, atomic cart state transitions. | Boilerplate slices for large features. |
| **WhatsApp Integration** | **OpenWA via Outbox** | Direct client HTTP call, Cloud API | Server-to-server decoupling via `whatsapp_outbox` table ensures billing transactions never fail if WhatsApp drops. | Requires background worker process and local device pairing. |

---

## 2. Deep Dive: Architectural Shift from Firestore to PostgreSQL 16

### 2.1 The Case for Relational PostgreSQL
1. **Financial Concurrency & Row Locking:**
   - In Firestore, concurrent checkouts could collide on document counter updates.
   - In PostgreSQL, `SELECT ... FOR UPDATE` row locking on `stock_batches` and `invoice_number_sequences` guarantees deterministic serialization and prevents inventory overselling.
2. **First-Expiry, First-Out (FEFO) Inventory:**
   - PostgreSQL effortlessly handles multi-attribute ordering (`ORDER BY expiry_date NULLS LAST, id FOR UPDATE`) with partial indexes on unexpired stock (`WHERE quantity_available > 0`).
3. **Audit Immutability & Database Triggers:**
   - PostgreSQL triggers enforce that `stock_ledger` records can **never be updated or deleted**, establishing a tamper-proof audit trail for tax authorities.
4. **Fast Catalog Search:**
   - PostgreSQL's `pg_trgm` extension enables sub-50ms fuzzy text search on product names using GIN indexes, replacing expensive client-side filtering.

---

## 3. Strict Dependency Governance Policy
To maintain high security and code quality:
1. **Zero Unapproved Dependencies:** Any new npm package must be justified, evaluated for vulnerability history, and approved via `CHANGE_REQUESTS.md`.
2. **Evaluation Criteria:** License compatibility (MIT/Apache 2.0), active maintenance, bundle weight, and zero high/critical vulnerabilities on `npm audit`.
