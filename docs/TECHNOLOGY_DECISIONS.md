9# Architecture & Technology Decisions Record (ADR): POS & Billing System

## 1. Stack Evaluation & Rationale

| Layer / Technology | Choice | Alternatives Evaluated | Rationale for Choice | Known Trade-offs |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React 18** | Next.js, Vue 3, Angular | Broad ecosystem, Mantis Admin UI compatibility, robust Formik + Yup support. | Client-side bundle size; requires openssl-legacy flag in legacy toolchain. |
| **UI Component Library** | **Mantis Admin (MUI v5)** | Ant Design, Tailwind CSS, Chakra UI | Enterprise styling, rich accessible components, built-in dark mode, customizable theme. | Heavy styling runtime; requires disciplined component usage. |
| **State Management** | **Redux Toolkit (RTK)** | Zustand, Recoil, React Context | Deterministic state transitions, Redux DevTools for checkout debugging, multi-tab bucket state. | Minor boilerplate compared to lightweight hooks. |
| **Form Management** | **Formik + Yup** | React Hook Form, Zod | Declarative schema validation, built-in touched/error tracking, seamless MUI integration. | Slightly higher re-render frequency on massive forms. |
| **Data Tables** | **React Table (TanStack)** | Material-UI DataGrid, AG Grid | Lightweight, sticky column support, custom renderers, client-side pagination and CSV streaming. | Requires custom markup bindings. |
| **Visual Charts** | **ApexCharts** | Chart.js, Recharts | Rich interactive time-series charts, donut payment splits, built-in responsive controls. | SVG render overhead on large datasets. |
| **Invoice PDF Engine** | **`@react-pdf/renderer`**| jsPDF, html2canvas | Native client-side PDF vector rendering, pixel-perfect A4 GST tax invoice formatting. | Node stream polyfills required in browser. |
| **Database & Auth** | **Cloud Firestore & Firebase Auth** | Supabase, PostgreSQL, MongoDB | Sub-second WebSocket listeners, native offline IndexedDB sync, serverless scale. | **No SQL JOINs; document read pricing; reporting aggregation constraints.** |
| **WhatsApp Gateway** | **OpenWA (NestJS + Baileys)** | Official Cloud API, Twilio | Zero per-message fee for local Indian store SIM; direct QR code linking. | High risk of session disconnection; potential Meta anti-spam ban. |

---

## 2. Deep Dive: Cloud Firestore Trade-offs & Mitigations
- **Challenge 1: Lack of Relational Joins:** Firestore cannot join `Products` and `TaxRates` during an invoice query.
  - *Mitigation:* Denormalization. Product name and calculated taxes are stored directly on `InvoiceDetails` line items.
- **Challenge 2: Aggregated Reporting Costs:** Summing 50,000 invoices for a daily report costs 50,000 document reads.
  - *Mitigation:* Daily summary aggregation documents (or pre-filtered date queries constrained by composite indexes).
- **Challenge 3: Atomic Sequences:** Firestore lacks an `AUTO_INCREMENT` column.
  - *Mitigation:* Concurrency-safe Firestore transactions operating on dedicated `Counters` documents.

---

## 3. Cloud Functions Recommendation
**Recommendation:** Migrate core financial transactions from direct-client to Firebase Cloud Functions:
- **Scope:** Bucket conversion to Invoice, stock decrements, and invoice cancellation.
- **Benefits:** Guaranteed security boundary, tamper-proof tax calculation, and private logging.
- **Status:** Documented and proposed for Phase 2 implementation following user approval.

---

## 4. Strict Dependency Approval Policy
To prevent security bloat and dependency vulnerabilities:
1. **Zero Unapproved Packages:** No engineer or agent may run `npm install <new-package>` without documenting the requirement in `CHANGE_REQUESTS.md`.
2. **Review Criteria:** Assess bundle size (via bundlephobia.com), maintenance velocity, open vulnerabilities, and license compatibility (MIT/Apache 2.0).
