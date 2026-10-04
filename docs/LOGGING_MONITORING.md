# Logging, Telemetry & Audit Monitoring Specification: POS & Billing System

## 1. Audit Trail Architecture
Every mutation in the system carries the six standard audit fields. In addition, high-risk security and fiscal operations generate explicit audit log records stored in the `/AuditLogs` collection.

### Dedicated `/AuditLogs` Collection
- **Path:** `/AuditLogs/{logId}`
- **Fields:**
  - `Id` (string): Unique log key.
  - `Timestamp` (timestamp): UTC timestamp of event.
  - `UserId` (string): Firebase Auth UID of actor.
  - `UserRole` (string): Active role at event time (`Admin`, `Cashier`, `Inventory Manager`).
  - `ActionType` (string):
    - `INVOICE_CREATED`
    - `INVOICE_CANCELLED`
    - `ROLE_ASSIGNED`
    - `PRICE_OVERRIDDEN`
    - `STOCK_ADJUSTED`
  - `TargetEntityId` (string): Ref to affected Document ID (e.g., `INV-2627-000101`).
  - `Details` (map): JSON snapshot of state changes, cancellation reason, or old/new role.
  - `IpAddress` (string, optional/client-derived): Network client identifier.

---

## 2. Privacy & PII Redaction Rules
To comply with the DPDP Act (India), logs must redact sensitive personal and payment data:
- **Mobile Numbers:** Redacted in standard logs: `+91 98765*****`.
- **Passwords & Keys:** Strictly scrubbed from all logger pipelines.
- **Card / UPI Data:** Only transaction reference IDs and payment modes (0/1) are logged; customer bank account numbers or VPA handles are never stored.

---

## 3. Client-Side Error Tracking
- **Unhandled Exceptions:** React 18 `<ErrorBoundary>` wraps the application root. Uncaught runtime errors log to the browser console with stack trace and trigger an asynchronous telemetric payload.
- **Console Hygiene:** In production builds, `console.debug` and verbose `console.log` calls are stripped via Terser plugin configuration.

---

## 4. OpenWA Microservice Logging
OpenWA writes structured JSON logs using NestJS `Winston` or `Pino` loggers:
- **Log Levels:**
  - `INFO`: Message dispatch attempts, QR code generation, session state updates.
  - `WARN`: Disconnect events, message re-queueing, phone battery warnings.
  - `ERROR`: Socket timeout, WhatsApp protocol handshake failures.
- **Log Retention:** Local log files rotate daily (`winston-daily-rotate-file`) with a 14-day retention cap.

---

## 5. Cloud Quota & Uptime Monitoring
- **Firebase Console Alerts:** Configured in Google Cloud Console for:
  - Firestore Daily Read/Write Quota: Warning alert at 80% threshold.
  - Firebase Auth API Rate Limits.
- **Gateway Heartbeat:** The POSUI app pings `GET /api/v1/session/status` on OpenWA every 30 seconds. A top-bar indicator displays green (Connected), amber (Re-connecting), or red (Offline).
