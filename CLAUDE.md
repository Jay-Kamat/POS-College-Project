# Development Rules & Architectural Constraints: POS & Billing System

## Strict Coding Guidelines for AI & Engineers

### 1. Architectural Integrity & Stack Rules
- **Backend Stack:** Node.js 22 LTS, TypeScript (strict mode, no `any`), NestJS, PostgreSQL 16, Prisma ORM, `decimal.js`, `class-validator`, `argon2id`, `nestjs-pino`.
- **Zero Arbitrary Dependencies:** Do not install any new npm libraries or frameworks without explicit prior logging and approval in `CHANGE_REQUESTS.md`.
- **Server is the Single Source of Truth:** Prices, taxes, line calculations, stock, invoice numbers, and permissions are determined exclusively on the server. Never trust client-submitted amounts or role flags.
- **Financial Math (`decimal.js`):** Never use standard JavaScript IEEE 754 floating point numbers for currency, GST splits, or unit pricing. Always use `decimal.js`.

### 2. Database & Transaction Invariants
- **Atomic Multi-Table Operations:** Every multi-table mutation (checkout, inward, cancellation, return) MUST execute within a single ACID PostgreSQL transaction.
- **Never Hard Delete:** Master records use soft-delete (`record_status: 1`). Partial indexes `WHERE record_status = 0` protect fast lookups.
- **Immutable Financial Records:** Finalized invoices cannot be modified or deleted, only cancelled (`status = CANCELLED`), reversing stock allocations.
- **Append-Only Stock Ledger:** The `stock_ledger` table is protected by a database trigger preventing `UPDATE` or `DELETE`. Stock on hand always equals `SUM(stock_batches.quantity_available)`.

### 3. API & Security Invariants
- **Standard Envelopes:** All endpoints return `{ data, meta }` on success and RFC-7807 standard `{ error: { code, message, details, requestId } }` on failure.
- **Validation:** Every request DTO must use `class-validator` with the global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`).
- **Authorization Guard:** Every protected endpoint requires `@RequirePermission(module, action)`. Missing decorators result in automatic denial.
- **No Secrets in Code:** All credentials load from environment variables validated at boot. Passwords hashed with argon2id. No user enumeration in error messages.
- **Structured Logging:** Use `nestjs-pino` with automated PII redaction (mobile numbers, emails, tokens). No raw `console.log`.

### 4. Frontend Integration Disciplines (`POSUI`)
- **Zero UI Rewrites:** Keep existing `POSUI/src/_api/*` function names and signatures identical.
- **Mappers Layer:** Use `POSUI/src/_api/mappers/*` to convert between API `camelCase` and UI `PascalCase` (`Id`, `Name`, `RecordStatus`, etc.).
- **HTTP Client:** All network requests route through `src/_api/httpClient.js` with automatic Bearer token injection and refresh interceptor.

### 5. Workflow Discipline
- **Docs First:** Never write application code before specs are approved.
- **One Milestone at a Time:** Build only the milestone in progress. Do not proceed until its Verification Gate passes.
- **Keep Logs Updated:** Update `PROGRESS.md` and `CHANGELOG.md` after every milestone.
- **No Dead Code:** Remove unused imports, variables, console logs, and stubbed placeholders before finalizing milestones.
