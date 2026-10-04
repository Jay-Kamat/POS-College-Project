# Environment Variables Specification: POS & Billing System

## 1. Overview & Security Protocols
The POS application strictly segregates configuration from code using environment variables. Under no circumstances should production API keys, service accounts, or private bearer tokens be committed to source control.

### Security Invariant
- **Git Ignore Verification:** The root `.gitignore` and `POSUI/.gitignore` must explicitly include `.env`, `.env.local`, and `*.key`.
- **Public vs. Private Variables:** Variables prefixed with `REACT_APP_` are bundled into client-side JavaScript. They are **public identifiers** (like Firebase Project ID and Web API Key) and do NOT provide security isolation. Real authorization is enforced via **Firestore Security Rules**.

---

## 2. POSUI Frontend Environment Configuration (`POSUI/.env`)

| Variable Name | Required | Default / Sample Placeholder | Description |
| :--- | :---: | :--- | :--- |
| `REACT_APP_FIREBASE_API_KEY` | **Yes** | `AIzaSyYourFirebaseWebApiKeyPlaceholder` | Firebase Web API Client Identifier |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | **Yes** | `pos-billing-prod.firebaseapp.com` | Firebase Auth Domain for OAuth redirect |
| `REACT_APP_FIREBASE_PROJECT_ID` | **Yes** | `pos-billing-prod` | Target Google Cloud Project ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET`| **Yes** | `pos-billing-prod.appspot.com` | Google Cloud Storage Bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`| **Yes** | `102938475610` | Firebase Cloud Messaging Sender ID |
| `REACT_APP_FIREBASE_APP_ID` | **Yes** | `1:102938475610:web:abcdef123456` | Firebase Web Application ID |
| `REACT_APP_FIREBASE_MEASUREMENT_ID` | No | `G-MEASUREMENTID` | Google Analytics 4 Stream ID (Optional) |
| `REACT_APP_OPENWA_API_URL` | **Yes** | `http://localhost:2785/api/v1` | URL for local OpenWA WhatsApp gateway |
| `REACT_APP_OPENWA_API_KEY` | **Yes** | `sample_openwa_client_token` | Client Bearer token sent to OpenWA |
| `PORT` | No | `3000` | Port for the React development server |

---

## 3. OpenWA Gateway Environment Configuration (`OpenWA/.env`)

| Variable Name | Required | Default / Sample Placeholder | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | **Yes** | `2785` | NestJS HTTP REST API listening port |
| `DASHBOARD_PORT` | **Yes** | `2886` | Web pairing QR code dashboard port |
| `OPENWA_API_SECRET` | **Yes** | `sample_openwa_server_secret_key` | Secret key verified by NestJS auth guard |
| `WHATSAPP_SESSION_NAME` | **Yes** | `pos_whatsapp_session` | Directory name for Baileys auth tokens |
| `RATE_LIMIT_DELAY_MS` | No | `1500` | Minimum throttle delay between messages |
