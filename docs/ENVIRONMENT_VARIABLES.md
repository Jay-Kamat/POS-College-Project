# Environment Variables Specification: POS & Billing System

## 1. Overview & Validation Protocol
The POS & Billing System enforces strict environment variable separation across its operational services. Under no circumstances should production credentials, JWT secrets, or database connection strings be committed to git.

### Startup Validation (Fail-Fast)
The NestJS backend implements strict schema validation on boot (`src/config/env.validation.ts` using `class-validator`).
- If any required variable is missing, malformed, or contains default placeholders (such as `change-me`) in a `production` environment, **the server refuses to boot and immediately exits with code 1**.

---

## 2. Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default / Sample | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `development` | Runtime environment (`development`, `test`, `production`). |
| `PORT` | **Yes** | `4000` | HTTP port on which the NestJS backend listens. |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:root@localhost:5432/pos_billing_db?schema=public` | PostgreSQL 16 primary connection pool URL. |
| `TEST_DATABASE_URL` | No | `postgresql://postgres:root@localhost:5433/pos_test?schema=public` | Isolated database instance used during integration & concurrency tests. |
| `JWT_ACCESS_SECRET` | **Yes** | *(min 32 random chars)* | Cryptographic HMAC secret for signing short-lived access tokens. |
| `JWT_REFRESH_SECRET`| **Yes** | *(min 32 random chars)* | Separate cryptographic secret for signing refresh tokens. |
| `JWT_ACCESS_TTL` | No | `15m` | Lifetime of access tokens (`15m`). |
| `JWT_REFRESH_TTL` | No | `7d` | Lifetime of refresh token cookies (`7d`). |
| `COOKIE_DOMAIN` | No | `localhost` | Domain scope for refresh token cookie. |
| `COOKIE_SECURE` | No | `false` | Set to `true` in production to enforce HTTPS-only cookies. |
| `CORS_ORIGINS` | **Yes** | `http://localhost:3000` | Comma-delimited list of permitted frontend origins. |
| `GOOGLE_CLIENT_ID` | No | `your-google-oauth-client-id` | Google Identity OAuth 2.0 Web Client ID. |
| `ALLOW_SELF_SIGNUP` | No | `false` | Controls whether uninvited Google users can self-register. |
| `OPENWA_API_URL` | **Yes** | `http://localhost:2785` | URL of the local OpenWA WhatsApp gateway. |
| `OPENWA_API_KEY` | **Yes** | `sample_openwa_server_secret_key` | Shared secret bearer token passed to OpenWA. |
| `OPENWA_SESSION_ID`| No | `pos_whatsapp_session` | Multi-session identifier for WhatsApp client. |
| `THROTTLE_TTL_SECONDS`| No | `60` | Time window for rate limiter. |
| `THROTTLE_LIMIT` | No | `100` | Maximum requests permitted per window per IP. |
| `LOG_LEVEL` | No | `info` | Logging verbosity (`fatal`, `error`, `warn`, `info`, `debug`, `trace`). |
| `APP_TIMEZONE` | No | `Asia/Kolkata` | Business timezone for invoice dates and fiscal year cuts. |
| `FY_START_MONTH` | No | `4` | Indian fiscal year start month (`4` for April). |
| `SEED_ADMIN_PASSWORD` | No | `Admin@Pass123` | Initial seeded password for Admin account. |
| `SEED_CASHIER_PASSWORD`| No | `Cashier@Pass123` | Initial seeded password for Cashier account. |
| `SEED_INVENTORY_PASSWORD`| No| `Inventory@Pass123` | Initial seeded password for Inventory Manager account. |

---

## 3. POSUI Frontend Configuration (`POSUI/.env`)

| Variable Name | Required | Default / Sample | Description |
| :--- | :---: | :--- | :--- |
| `REACT_APP_API_URL` | **Yes** | `http://localhost:4000/api/v1` | Base REST API URL consumed by `src/_api/httpClient.js`. |
| `REACT_APP_GOOGLE_CLIENT_ID` | No | `your-google-oauth-client-id` | Google Identity Services client ID for Web OAuth. |
| `PORT` | No | `3000` | Local development port. |

*(Note: All `REACT_APP_FIREBASE_*` and `REACT_APP_OPENWA_*` variables are removed from the frontend).*

---

## 4. OpenWA Microservice Gateway Configuration (`OpenWA/.env`)

| Variable Name | Required | Default / Sample | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | **Yes** | `2785` | NestJS HTTP REST API listening port. |
| `DASHBOARD_PORT` | **Yes** | `2886` | Web pairing QR code dashboard port. |
| `OPENWA_API_SECRET` | **Yes** | `sample_openwa_server_secret_key` | Shared secret key validated by OpenWA auth guard. |
| `WHATSAPP_SESSION_NAME` | **Yes** | `pos_whatsapp_session` | Directory path storing Baileys authentication tokens. |
| `RATE_LIMIT_DELAY_MS` | No | `1500` | Minimum throttle delay between WhatsApp messages. |
