# REST API v1 Specification: POS & Billing System

## 1. Global API Conventions

The POS backend exposes a structured, predictable, and hardened REST API adhering to RFC 7807 problem details and strict JSON formatting conventions.

| Standard | Specification |
| :--- | :--- |
| **Base URL** | `/api/v1` (e.g., `http://localhost:4000/api/v1`). Configured via `REACT_APP_API_URL`. |
| **Authentication** | `Authorization: Bearer <accessToken>` (15-minute TTL). |
| **Session Refresh**| Refresh token stored in an `httpOnly`, `Secure`, `SameSite=Lax/Strict` cookie (7-day TTL). **Rotated on every refresh**. Reuse of an old token revokes the entire token family. |
| **Payload Format** | Request and response JSON keys are strictly **camelCase**. Dates are ISO 8601 strings. |
| **Financial Values**| Monetary figures are represented as **strings with exactly 2 decimal places** (e.g., `"1250.00"`) to prevent IEEE 754 float precision corruption. Quantities are strings with up to 3 decimals (e.g., `"2.500"`). |
| **Idempotency** | `POST /invoices` requires header `Idempotency-Key: <UUID>`. Retrying with the same key returns the previously created invoice without duplicate records. |
| **Distributed Tracing**| Every response includes `X-Request-Id: <UUID>` generated per incoming request. |

---

## 2. Standard Response Envelopes

### 2.1 Success Envelope
For single entities:
```json
{
  "data": { ... }
}
```

For paginated lists:
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

### 2.2 Error Envelope
All error responses consistently return HTTP status codes >= 400 with this standard structure:
```json
{
  "error": {
    "code": "STOCK_INSUFFICIENT",
    "message": "Only 2.000 units of Cow Milk 500ml are currently available.",
    "details": [
      {
        "field": "items[0].quantity",
        "issue": "Requested quantity exceeds available batch stock"
      }
    ],
    "requestId": "5c6b61df-7b56-4cf3-a79a-cbb105e6b7d5"
  }
}
```

### Standard Error Codes
| Code | HTTP Status | Description |
| :--- | :---: | :--- |
| `VALIDATION_ERROR` | 400 | Request body failed DTO class-validator rules. |
| `UNAUTHENTICATED` | 401 | Missing, malformed, or invalid access token. |
| `TOKEN_EXPIRED` | 401 | Access token expired; triggers client-side refresh retry. |
| `FORBIDDEN` | 403 | Authenticated role lacks required module/action permission or store access. |
| `NOT_FOUND` | 404 | Targeted resource identifier does not exist or is soft-deleted. |
| `CONFLICT` / `DUPLICATE` | 409 | Unique constraint violated (e.g., duplicate barcode or GSTIN). |
| `STOCK_INSUFFICIENT` | 409 | Insufficient unexpired stock batch quantities available for checkout. |
| `BATCH_EXPIRED` | 409 | Scanned product batch has passed its shelf-life expiry date. |
| `INVALID_STATE` | 409 | Lifecycle transition rejected (e.g., cancelling an already-cancelled invoice). |
| `RATE_LIMITED` | 429 | Request rate exceeded throttler quota. |
| `INTERNAL` | 500 | Unhandled server exception. Raw stack traces and SQL queries are redacted. |

---

## 3. Query Parameter Conventions for Lists
All collection endpoints (`GET /...`) accept standardized query parameters:
- `page`: Page number (integer, default: 1).
- `pageSize`: Items per page (integer, default: 25, **maximum: 100**).
- `sort`: Sorting field and order (e.g., `createdAt:desc`, `name:asc`).
- `search`: Trigram or prefix text search string.
- `status`: Lifecycle filter (e.g., `status=ACTIVE`).
- `from`, `to`: ISO date range filters (inclusive).
- `includeDeleted`: Boolean flag (`true` allows querying `record_status = 1`, restricted to `ADMIN` only).

---

## 4. Endpoints Specification (Grouped by Module)

### 4.1 Authentication & Profile (`/auth`)
- `POST /auth/register` `[Public / Admin]` — Register staff user account (controlled by `ALLOW_SELF_SIGNUP`).
- `POST /auth/login` `[Public]` — Login with email/password; returns user profile, permissions, access token, and sets refresh cookie.
- `POST /auth/google` `[Public]` — Verify Google Identity ID token; matches `google_sub` or pre-created email; returns session tokens.
- `POST /auth/refresh` `[Public]` — Reads refresh cookie, rotates token family, returns new access token and new cookie.
- `POST /auth/logout` `[Authenticated]` — Revokes current refresh token family and clears cookie.
- `GET /auth/me` `[Authenticated]` — Returns current user, assigned role, permission matrix, and accessible store IDs.
- `POST /auth/change-password` `[Authenticated]` — Updates password with current password verification and argon2id hashing.

### 4.2 Users & Permissions (`/users`, `/roles`, `/permissions`)
- `GET /users` `[USERS:VIEW]` — Paginated staff user accounts list.
- `POST /users` `[USERS:CREATE]` — Create new staff user and assign role.
- `GET /users/:id` `[USERS:VIEW]` — Retrieve user details.
- `PATCH /users/:id` `[USERS:EDIT]` — Update user profile details.
- `PATCH /users/:id/status` `[USERS:EDIT]` — Activate or deactivate user (deactivating revokes all refresh tokens).
- `PUT /users/:id/stores` `[USERS:EDIT]` — Assign accessible store branches to user.
- `GET /roles` `[ROLES:VIEW]` — List system roles (`ADMIN`, `CASHIER`, `INVENTORY_MANAGER`).
- `GET /permissions` `[ROLES:VIEW]` — List all system permission modules and actions.
- `PUT /roles/:id/permissions` `[ROLES:EDIT]` — Update role permission assignments (cannot remove the last Admin's permissions).

### 4.3 Master Data
Applicable to: `/stores`, `/tax-rates`, `/settings`, `/categories`, `/products`, `/customers`, `/vendors`, `/material-return-reasons`.
- `GET /:resource` `[MODULE:VIEW]` — Paginated active master records.
- `GET /:resource/:id` `[MODULE:VIEW]` — Single record by UUID.
- `POST /:resource` `[MODULE:CREATE]` — Create new master record with DTO validation.
- `PATCH /:resource/:id` `[MODULE:EDIT]` — Update master record.
- `DELETE /:resource/:id` `[MODULE:DELETE]` — Soft delete record (`record_status = 1`).
- `POST /:resource/:id/restore` `[MODULE:EDIT]` — Restore soft-deleted record (`record_status = 0`).
- **Specialized Product Lookups:**
  - `GET /products/search?q=` `[PRODUCTS:VIEW]` — Fast trigram search (<50ms).
  - `GET /products/by-barcode/:barcode` `[PRODUCTS:VIEW]` — Resolves product by batch barcode or product number.
- **Specialized Customer Lookups:**
  - `GET /customers/lookup?mobile=` `[CUSTOMERS:VIEW]` — Fast 10-digit mobile number lookup.

### 4.4 Purchasing & Inward (`/purchase-orders`, `/material-inwards`, `/material-returns`)
- `GET /purchase-orders` `[PURCHASE_ORDERS:VIEW]` — List POs with status and vendor filters.
- `POST /purchase-orders` `[PURCHASE_ORDERS:CREATE]` — Create PO with line items and rates.
- `GET /purchase-orders/:id` `[PURCHASE_ORDERS:VIEW]` — Retrieve PO details.
- `PATCH /purchase-orders/:id/status` `[PURCHASE_ORDERS:EDIT]` — Update PO status (`SENT`, `CANCELLED`).
- `GET /purchase-orders/:id/pdf-data` `[PURCHASE_ORDERS:VIEW]` — Formatted PO printable data.
- `POST /material-inwards` `[MATERIAL_INWARD:CREATE]` — Atomically records inward goods, generates unique 13-digit thermal barcodes, updates PO received quantities, and writes `INWARD` rows to `stock_ledger`.
- `GET /material-inwards/:id/barcodes` `[MATERIAL_INWARD:VIEW]` — Thermal printable barcode label list.
- `POST /material-returns` `[MATERIAL_RETURNS:CREATE]` — Validates available batch stock, decrements inventory, and creates `VENDOR_RETURN` ledger rows.

### 4.5 Inventory & Stock (`/stock`)
- `GET /stock/on-hand?productId=&storeId=` `[STOCK:VIEW]` — Real-time quantity on hand.
- `GET /stock/batches?expiringWithinDays=` `[STOCK:VIEW]` — Batches nearing shelf-life expiry.
- `GET /stock/ledger?productId=&storeId=` `[STOCK:VIEW]` — Paginated immutable ledger movements.
- `POST /stock/adjustments` `[STOCK:EDIT]` — Stock adjustment (shrinkage/damage/found) with required audit reason.

### 4.6 POS Billing & Invoicing (`/buckets`, `/invoices`)
- `POST /buckets` `[BILLING:CREATE]` — Initialize or stage POS cart basket.
- `GET /buckets?status=HELD` `[BILLING:VIEW]` — List held customer baskets (`BKT-01`, `BKT-02`).
- `GET /buckets/:id` `[BILLING:VIEW]` — Retrieve held bucket items and customer details.
- `PUT /buckets/:id/items` `[BILLING:EDIT]` — Update staged bucket items.
- `POST /buckets/:id/hold` `[BILLING:EDIT]` — Mark bucket as `HELD`.
- `DELETE /buckets/:id` `[BILLING:DELETE]` — Clear or discard bucket (`CLEARED`).
- `POST /invoices/preview` `[BILLING:VIEW]` — **Server-side calculation engine:** computes line-item taxable values, CGST/SGST/IGST splits, round-offs, and grand total for client cart preview without committing to the database.
- `POST /invoices` `[BILLING:CREATE]` — **Atomic Checkout:** validates `Idempotency-Key`, locks and allocates unexpired batches (FEFO), locks sequence and derives gapless invoice number, inserts invoice + items + payment, decrements batches, writes `SALE` ledger rows, enqueues WhatsApp outbox, marks bucket `CONVERTED`.
- `GET /invoices` `[INVOICES:VIEW]` — Paginated invoice list with date, customer, payment mode, and status filters.
- `GET /invoices/:id` `[INVOICES:VIEW]` — Full invoice details with snapshots and payment settlement.
- `POST /invoices/:id/cancel` `[INVOICES:APPROVE]` — Soft-cancel invoice: locks row, marks `CANCELLED`, restores allocated batch quantities, writes `SALE_CANCEL` ledger rows, refunds payment, audits action.
- `GET /invoices/:id/pdf-data` `[INVOICES:VIEW]` — Complete formatted payload for rendering client-side A4 GST Tax Invoice.
- `POST /invoices/:id/share-whatsapp` `[INVOICES:VIEW]` — Re-enqueues invoice receipt into `whatsapp_outbox` for delivery.

### 4.7 Reports & Analytics (`/reports`, `/dashboard`)
- `GET /dashboard/summary` `[DASHBOARD:VIEW]` — Today's revenue, invoice count, active SKUs, expiring batches, payment-mode splits.
- `GET /reports/daily-sales?from=&to=&storeId=&format=json|csv` `[REPORTS:VIEW]` — Daily invoice aggregates, cash/UPI splits, tax collected. (CSV streamed directly).
- `GET /reports/vendor-wise-sales?from=&to=&storeId=&format=json|csv` `[REPORTS:VIEW]` — Units sold, sales revenue, and margins grouped by vendor.
- `GET /reports/vendor-wise-expired-stock?storeId=&format=json|csv` `[REPORTS:VIEW]` — Expired batch stock quantities, days overdue, and financial cost loss.

### 4.8 System & Diagnostics
- `GET /health` `[Public]` — Liveness probe (HTTP 200).
- `GET /health/ready` `[Public]` — Readiness probe; asserts PostgreSQL connection pool and OpenWA connectivity.
- `GET /api/docs` `[Admin in Production]` — OpenAPI/Swagger interactive UI (disabled by default in production).
