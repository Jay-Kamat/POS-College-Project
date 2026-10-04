# **MASTER PROMPT: POS & BILLING SYSTEM (DOCUMENTATION FIRST, THEN MILESTONE BUILD)**

**You are a senior full-stack engineer, solution architect, QA lead and technical writer. We are going to build the "POS & Billing System": an enterprise-grade, India-focused (GST) Point of Sale and inventory application for retail outlets, cafes and supermarkets. The product is already defined by the PRD summary below. Treat it as the source of truth. Follow every instruction exactly.**

---

## **PHASE 0: SOURCE OF TRUTH (PRODUCT + STACK, DO NOT DEVIATE)**

### **0.1 Product scope**
- **User authentication, roles and permission control**
- **Product catalog, categories, store-specific configuration**
- **Vendor directory, Purchase Orders (PO), Material Inward tracking**
- **Barcode generation and scan-based checkout**
- **Billing staging (Buckets) and Invoice generation**
- **Cash and UPI payment support, digital WhatsApp receipts**
- **Dashboard analytics and sales/stock/expiry reporting**

### **0.2 Fixed technology stack**
- **Frontend (`POSUI`):** React 18, Material UI (Mantis Admin Template), Redux Toolkit (app state + cart), Formik + Yup (validation), React Table (sticky-column paginated tables), react-intl (translations), ApexCharts (charts), `@react-pdf/renderer` (invoice PDFs). Runs on **port 3000**.
- **Auth:** **Firebase Authentication** (Google Sign-In + Email/Password), session via `onAuthStateChanged`.
- **Database:** **Cloud Firestore** (NoSQL), accessed directly from the React app through the Firebase Web SDK, wrapped in a `src/_api/` service layer.
- **WhatsApp gateway (`OpenWA`):** NestJS HTTP gateway wrapping `whatsapp-web.js` / `@whiskeysockets/baileys`. **API port 2785**, dashboard **port 2886**. Used to send receipts.
- **Local runner:** `run-all.ps1` starts OpenWA and POSUI together.
- **Do NOT add a new backend, ORM, or extra databases unless I approve it through `CHANGE_REQUESTS.md`.**

### **0.3 Repository layout**
```text
pos-system/
├── OpenWA/        # NestJS WhatsApp gateway
├── POSUI/         # React frontend (talks directly to Firebase)
│   ├── src/_api/      # Firestore query methods
│   ├── src/contexts/  # React contexts incl. Firebase Auth provider
│   └── .env           # Firebase + OpenWA config
├── run-all.ps1
└── PRD.md
```

### **0.4 Firestore collections (all docs carry audit fields)**
**Global fields on every document:** `Id`, `Created`, `Updated`, `RecordStatus` (**0 = Active, 1 = Deleted, soft delete only**), `CreatedId`, `UpdatedId`.

| Collection | Core fields |
| :--- | :--- |
| **Stores** | Name, Address, MobileNumber, LongName, PhoneNumber, FoodLicenseNumber, Email, GstNumber (nullable), Country, State |
| **ProductCategory** | Name |
| **Products** | Name, Cost, Ingredients, Notes, IsExpDate, Days, CategoryId, ProductNumber, TaxRateId |
| **TaxRates** | Name, IGST, CGST, SGST |
| **Vendors** | Name, Address, City, Pin, Email, MobileNumber, Note, VendorCode |
| **PurchaseOrderHeader / Details** | Header: Date, VendorId, StoreId, DocumentNumber. Details: PurchaseOrderHeaderId, ProductId, Quantity, Rate, DeliveryDate |
| **MaterialInwardHeader / Details** | Header: PurchaseOrderId, VendorId, Date, IsPoAvailable. Details: MaterialInwardHeaderId, ProductId, Quantity, Rate, ExpiryDate |
| **MaterialInwardBarcodes** | RefId, VendorId, ProductId, Date, ExpiryDate, Barcode |
| **BarcodePost** | RefId, Quantity, BarcodeNumber, ItemRefId (nullable) |
| **Customers** | Name, MobileNumber, GstNumber, Country, State |
| **BucketHeader / BucketDetails** | Header: CustomerId (nullable), Date, MobileNumber, BucketNumber. Details: BucketHeaderId, ProductId, Quantity, Rate, Amount, ExpiryDate |
| **InvoiceHeader / InvoiceDetails** | Header: Date, CustomerId (nullable), StoreId, Amount, DocumentNumber, ModeOfPayment (**0 = Cash, 1 = UPI/Card**), BucketId (nullable), MobileNumber (nullable), IsShareReceiptThroughSms, IsPaymentReceived. Details: InvoiceHeaderId, ProductId, Quantity, Rate, IGST, CGST, SGST, TaxRateId (nullable) |
| **MaterialReturnNoteHeader / Details** | Header: VendorId, Date, StoreId, MaterialReturnId. Details: MaterialReturnNoteHeaderId, ProductId, Quantity |
| **MaterialReturns** | Name (return reasons master) |
| **Settings** | SettingType, InputType, SettingValue |
| **RolesAndPermissions** | Role, Permissions, HasPermission |

### **0.5 Frontend pages (inside `POSUI/src/pages/apps`)**
**Dashboard** `/dashboard` · **Product** `/apps/product` · **Bucket** `/apps/bucket` and `/apps/newbucket` (POS terminal) · **Invoice** `/apps/invoice` (list, detail, PDF, Share via WhatsApp) · **Vendor / Purchase Order** `/apps/vendor`, `/apps/purchaseOrder` (vendors, POs, inward batches, material returns) · **Reports** `/apps/dailySales`, `/apps/vendorWiseSale`, `/apps/vendorWiseExpiredStock` (grid + export to CSV).

### **0.6 Key flows to preserve**
- **Billing:** cashier enters customer mobile → scans/selects products → staged in a **Bucket** → converted to **Invoice** (Cash or UPI) → client-side GST split on each line → optional **WhatsApp receipt** via OpenWA (store name, invoice no. and date, customer, payment method, itemized list, total).
- **Invoices:** filter by date range, **soft cancellation** (never hard delete).
- **Inventory:** PO → Material Inward (with or without PO) → batch barcodes → POS scan → expiry tracking and expired-stock reports.
- **Returns:** Material Return Notes to vendors using a reasons master.

### **0.7 Stakeholders (the ONLY four; do not invent others)**

| Stakeholder | Type | Login? | Main responsibilities |
| :--- | :--- | :--- | :--- |
| **Admin** | Internal, system role | **Yes** | Full control: users and roles, stores, settings, tax rates, products and categories, vendors, all reports, invoice cancellation, approvals, audit review |
| **Cashier** | Internal, system role | **Yes** | POS terminal: customer lookup, barcode scan, Buckets, invoice creation (Cash/UPI), WhatsApp receipt sharing, reprint. **No access** to purchasing, vendor data, settings or cost-sensitive reports |
| **Inventory Manager** | Internal, system role | **Yes** | Purchase Orders, Material Inward, batch barcodes, expiry tracking, vendor material returns, stock and expiry reports, product stock-related maintenance |
| **Vendor** | **External** supplier | **No (default)** | Appears as a record in the `Vendors` collection. Receives POs, delivers stock, and is the counterparty on Material Returns. **Does not log in to the system unless I approve a vendor portal in `CHANGE_REQUESTS.md`** |

**Rules for stakeholders:**
- **Only Admin, Cashier and Inventory Manager are roles in `RolesAndPermissions` and Firebase Auth.** Vendor is a business entity, not a user role.
- **Every doc (user stories, flows, permissions matrix, test cases, security rules, seed data) must use these exact names.**
- **Do not create Manager, Accountant, Owner or any other role.** If one seems needed, log it in `CHANGE_REQUESTS.md`.

---

## **PHASE 1: IMPORTANT RULES (READ FIRST, OBEY ALWAYS)**

**1. Documentation before code.** Create ALL files in Phase 2 BEFORE touching the application code. **Do NOT start building until the docs are complete and I approve them.**

**2. Understand first.** Document requirements, architecture, data model, data-access layer, UI/UX, business rules, security, privacy, testing, deployment and production needs. Put assumptions in the relevant file.

**3. Do not invent features.** Where the PRD is silent, **do not silently add functionality.** List it under **"Gaps and Open Decisions"** in `PRD.md` with a recommendation (MVP / Phase 2 / out of scope) and wait for my decision. Known gaps to address explicitly:
- **No stock-on-hand collection exists.** Decide how stock is derived (inward minus sales minus vendor returns) or whether to add a `StockLedger` collection.
- **No customer sales returns/refunds**, only vendor material returns.
- **No cash register / shifts** and no payment gateway (cash and UPI are recorded manually).
- **GST splitting is client-side**, with no defined intra-state vs inter-state rule.
- **Invoice numbering** has no defined concurrency-safe strategy.
- **Roles** are stored in Firestore with no enforcement spec.
- **Vendor access:** Vendor is an external stakeholder with no login by default. Decide whether a vendor portal (view POs, confirm deliveries) is ever needed.

**4. Small milestones, one at a time.** **Never build everything at once.**

**5. Test before moving on.** Fully test and verify the current milestone before starting the next.

**6. Update `PROGRESS.md` after EVERY milestone**: **Completed · In progress · Pending · Known issues · Next step.**

**7. No hardcoded secrets.** Use environment variables only. Provide `.env.example` with placeholders. **Note: Firebase web config values are public identifiers, NOT security. Security comes from Firestore Security Rules and Auth. Never commit service-account keys, OpenWA tokens or any admin credentials.**

**8. Keep the codebase clean.** No unnecessary dependencies, duplicate components, unused files/variables, dead code, or placeholder functionality.

**9. Every feature must be connected end to end:**
**UI component → `src/_api` service → business logic (validated, ideally in a shared utility or transaction) → Firestore, protected by Security Rules**
and must include **validation (Formik + Yup), authorization, error handling, loading states and empty states.**

**10. Because there is no custom backend, the following MUST be solved by design and documented:**
- **Authorization lives in Firestore Security Rules** (client-side route guards are only UX, never security).
- **Atomic operations** (invoice number generation, stock changes, bucket → invoice conversion) must use **Firestore transactions / batched writes**.
- **Sensitive or trusted logic** (tax totals, invoice numbering, role assignment) must be evaluated for **Cloud Functions**. Recommend it in `ARCHITECTURE.md` and `TECHNOLOGY_DECISIONS.md`, but **add it only after my approval.**
- **Firestore composite indexes and query limits** must be planned for reports and large catalogs.

**11. Known technical debt to document (not silently fix):** the frontend needs `NODE_OPTIONS=--openssl-legacy-provider`, which signals an outdated build toolchain. Record it in `ARCHITECTURE.md` and `CHANGE_REQUESTS.md` with an upgrade recommendation.

**12. Consistency.** Collection names, field names, role names and terminology must match across all docs. If one doc changes, update every affected doc and log it in `CHANGELOG.md`.

**13. The final goal** is a **fully functional, secure, scalable, maintainable and production-ready POS & Billing System, NOT just a UI prototype.**

---

## **PHASE 2: CREATE THESE 43 FILES (in `/docs` unless stated otherwise)**

Each file must be specific to THIS product (the Firebase/React/OpenWA stack and the collections above), not generic.

### **A. CORE PLANNING**

**1. `docs/PRD.md`.** Product goals, **stakeholders exactly as defined in section 0.7 (Admin, Cashier, Inventory Manager, Vendor), no others**, module features, **out of scope**, assumptions, **Gaps and Open Decisions** (see rule 3), MVP vs Phase 2. Embed the executive summary from Phase 0.

**2. `docs/ARCHITECTURE.md`.** The Mermaid diagram (React UI → Firebase Auth, Firestore; React UI → OpenWA :2785), request/data lifecycle, real-time Firestore listeners vs one-time reads, Redux state design, `_api` layer pattern, where business logic lives, transactions, Cloud Functions recommendation, WhatsApp failure behavior, offline/network behavior, scalability limits of direct-client Firestore.

**3. `docs/DATABASE_SCHEMA.md`.** Full Firestore model: every collection and field with type, required/optional, default, allowed values and example document. **Header/Details relationships, reference-field rules, soft-delete (`RecordStatus`) query conventions, denormalization decisions** (e.g., storing product name/rate snapshot on invoice lines), composite indexes, document ID strategy, the stock-derivation decision, and data migration/versioning notes. Include a Mermaid ER diagram.

**4. `docs/API_SPEC.md`.** Since the frontend talks to Firestore directly, define the **data-access API**: every `src/_api` function (name, collection, params, return shape, errors, pagination/query constraints). **Also specify the OpenWA REST contract** (endpoint, payload, auth, response, errors, retry) and the receipt message template. If Cloud Functions are approved later, add their endpoints here.

**5. `docs/DESIGN_GUIDELINES.md`.** Build on the Mantis/MUI theme: colors with hex, typography, spacing, components, tables, dialogs, toasts, the POS terminal layout, and every page in Phase 0.5 with its states (loading, empty, error). react-intl rules for all user-facing text.

**6. `CLAUDE.md` (root).** Short, strict rules: folder conventions (`_api`, `contexts`, `pages/apps`), naming, **always go through `_api`**, **soft-delete only**, **always filter `RecordStatus == 0`**, Formik + Yup on every form, no secrets, no new dependencies without approval, update `PROGRESS.md`, no dead code.

**7. `docs/ROADMAP.md`.** Small milestones, each with goal, tasks, dependencies, acceptance criteria and definition of done. Suggested order: **M1** project setup, Firebase config, env, theme and routing · **M2** auth (Google + Email/Password), `RolesAndPermissions`, Security Rules baseline · **M3** Stores, TaxRates, Settings, Categories · **M4** Products · **M5** Vendors and Purchase Orders · **M6** Material Inward + barcodes + stock derivation · **M7** Customers · **M8** Bucket (POS terminal) with barcode scan · **M9** Invoice creation, GST split, Cash/UPI · **M10** Invoice list, PDF, soft cancellation · **M11** WhatsApp receipts via OpenWA · **M12** Material Returns · **M13** Dashboard and Reports (CSV export) · **M14** hardening, testing, deployment.

**8. `docs/SECURITY.md`.** **Firestore Security Rules design (rules per collection and role, field validation, `RecordStatus` protections, immutability of finalized invoices)**, Firebase Auth hardening (authorized domains, email verification, password policy, provider config), role assignment safety (users must not self-escalate), OpenWA protection (auth token, localhost-only/network restrictions, no public exposure), env var handling, input validation, XSS protection, dependency scanning, rate limiting/abuse controls (Firebase App Check recommendation), audit trail.

**9. `docs/PRIVACY_POLICY.md`.** Data collected (staff accounts, customer name/mobile/GST, transactions, WhatsApp messages), why, storage in Firebase/Google Cloud, third-party processors, retention, rights. Reference **India's DPDP Act**. Mark as a template needing legal review.

**10. `docs/TERMS_AND_CONDITIONS.md`.** Usage rules, liability, data ownership, account termination. Template needing legal review.

**11. `docs/COOKIE_POLICY.md`.** Cookie/local-storage types (Firebase Auth persistence = essential; analytics/ads only if used), consent banner behavior.

**12. `docs/DEPLOYMENT.md`.** Firebase Hosting (or chosen host) for POSUI, **where OpenWA runs in production** (it needs a persistent server and a linked WhatsApp session), domain/SSL, **separate Firebase projects for dev/staging/prod**, Security Rules and index deployment, CI/CD, rollback.

**13. `docs/ACCEPTANCE_CRITERIA.md`.** Given/when/then per feature, tied to milestones.

**14. `PROGRESS.md` (root).** Template: Completed, In Progress, Pending, Known Issues, Next Step, dated log.

### **B. PRODUCT AND BUSINESS LOGIC**

**15. `docs/USER_STORIES.md`.** **Admin, Cashier, Inventory Manager and Vendor only (Vendor as an external actor with no login)**, their goals, actions, permissions, **main flows, alternative flows, expected results**, with acceptance criteria.

**16. `docs/USER_FLOWS.md`.** Mermaid flows for: **login/signup (Google and Email), POS billing (Bucket → Invoice), product management, purchase order → material inward → barcode printing, sales and invoice cancellation, vendor material return, payments (Cash/UPI), customers, vendors, reports, user and role management, WhatsApp receipt sharing.** Include error and cancel paths.

**17. `docs/BUSINESS_RULES.md`.** Numbered rules (BR-001…) for billing, buckets, invoices, discounts (state if supported), taxes, payments, cancellations, PO and inward matching (with and without PO), expiry (`IsExpDate`, `Days`), barcode uniqueness, returns, soft delete and restore.

**18. `docs/ROLES_PERMISSIONS_MATRIX.md`.** **Columns: Admin, Cashier, Inventory Manager. Add a separate note for Vendor stating it has no system access.** Every role vs every page/module: **view, create, edit, delete (soft), approve, export, manage.** Map directly to `RolesAndPermissions` fields and to Security Rules.

**19. `docs/INVENTORY_RULES.md`.** Stock in (Material Inward), stock out (invoices), vendor returns, adjustments and damaged stock (if in scope), batch/expiry handling (FEFO recommended), low-stock alerts, **negative stock policy**, barcode lifecycle (`MaterialInwardBarcodes` → `BarcodePost` → sold), inventory history, and the **stock derivation decision**.

**20. `docs/TAX_GST_RULES.md`.** CGST/SGST vs IGST using Store State vs Customer State, `TaxRates` usage, tax-inclusive vs exclusive pricing (**decide and document**), rounding, per-line and invoice-level formulas with worked examples, GST reporting summaries, B2B (customer GSTIN) vs B2C invoices, behavior when `Stores.GstNumber` is null.

**21. `docs/PAYMENT_ARCHITECTURE.md`.** Cash and UPI (`ModeOfPayment` 0/1), `IsPaymentReceived` semantics, how UPI is confirmed (manual vs gateway, **decision needed**), split payments (in scope or not), failed/pending payments, cancellation and refund handling, reconciliation in reports.

**22. `docs/INVOICE_RECEIPT_SPEC.md`.** Invoice and receipt layout, **FoodLicenseNumber and GST details**, **concurrency-safe sequential numbering per store/financial year** (`DocumentNumber`), PDF via `@react-pdf/renderer`, browser/thermal printing (58/80 mm), reprint, **cancelled invoices (soft cancel with reason, number never reused)**, and the WhatsApp text receipt format.

**23. `docs/INTEGRATIONS.md`.** Firebase Auth and Firestore, **OpenWA** (QR linking, session persistence, WhatsApp ban/rate-limit risk, downtime fallback such as skipping or queueing the send, and the risk of unofficial WhatsApp libraries versus the official WhatsApp Business API), barcode scanners (keyboard-wedge), barcode label printers, thermal printers, optional payment gateway, optional accounting export.

### **C. TECHNICAL SPECS**

**24. `docs/ENVIRONMENT_VARIABLES.md` + `.env.example`.** Include `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`, `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`, `REACT_APP_FIREBASE_APP_ID`, `REACT_APP_OPENWA_API_URL`, plus OpenWA-side variables. **Placeholders only, never real values.** Confirm `.env` is git-ignored.

**25. `docs/FOLDER_STRUCTURE.md`.** Complete tree for `POSUI` (`_api`, `contexts`, `pages/apps`, `components`, `store` (Redux), `utils`, `hooks`, `routes`, `locales`, `themes`, tests) and `OpenWA`, plus `firestore.rules`, `firestore.indexes.json` and `firebase.json`. One-line purpose per folder.

**26. `docs/TECHNOLOGY_DECISIONS.md`.** Why each stack choice (React, MUI/Mantis, RTK, Firebase, Formik/Yup, react-table, ApexCharts, OpenWA), alternatives considered, trade-offs (Firestore reporting limits, no joins, cost per read), the **Cloud Functions recommendation**, and **why unnecessary dependencies must not be added**, with a dependency approval process.

**27. `docs/ACCESSIBILITY.md`.** Keyboard-first POS terminal (shortcuts, scanner focus handling), focus states, ARIA, contrast (WCAG AA), accessible forms/tables/dialogs, touch targets.

**28. `docs/RESPONSIVE_DESIGN.md`.** Desktop, laptop, tablet, mobile, with **special focus on the Bucket/POS terminal** (split product and cart panes, touch-friendly on tablets).

**29. `docs/PERFORMANCE.md`.** Targets for page load, POS product search, **barcode scan-to-cart time**, Firestore read counts and cost control, pagination (cursor-based), listener cleanup, caching, indexes, large catalogs, report query strategy (pre-aggregated daily summaries if needed), code splitting, image optimization.

**30. `docs/ERROR_HANDLING.md`.** Firebase Auth errors, Firestore errors (permission-denied, unavailable, quota), transaction conflicts, OpenWA failures, validation errors, network loss, unauthorized access, with a mapping to user-friendly messages (react-intl).

**31. `docs/LOGGING_MONITORING.md`.** Frontend error tracking, **audit logs** (who changed what, using `CreatedId`/`UpdatedId` plus a dedicated audit approach for invoices, cancellations, role changes), OpenWA logs, Firebase usage/quota monitoring, uptime, security alerts, PII redaction.

**32. `docs/BACKUP_RECOVERY.md`.** **Firestore scheduled exports / point-in-time recovery**, frequency, retention, restore steps, disaster recovery (RPO/RTO), Auth user export, OpenWA session recovery (re-scan QR), restore drills.

### **D. TESTING AND QUALITY**

**33. `docs/TESTING_STRATEGY.md`.** Unit (Jest/RTL), Firestore **Emulator Suite** integration tests, **Security Rules tests**, UI, E2E, security, performance, responsive and accessibility testing, CI scope.

**34. `docs/TEST_CASES.md`.** **Positive and negative** cases for: login (Google/Email), roles, products, categories, tax rates, vendors, purchase orders, material inward, barcodes, buckets, invoices, taxes, Cash/UPI payments, cancellations, WhatsApp receipts, material returns, customers, reports, settings.

**35. `docs/EDGE_CASES.md`.** Duplicate barcode, duplicate product number/vendor code, expired product scanned at POS, out-of-stock sale, zero/negative/decimal quantity, rate changes between bucket and invoice, **two cashiers selling the last unit (concurrency)**, duplicate invoice numbers, OpenWA offline or session logged out, invalid mobile numbers, missing GST number, session expiry, soft-deleted product referenced by old invoices, Firestore offline writes, unauthorized access.

**36. `docs/SEED_DATA.md` + seed script plan.** Dummy stores, users per role, categories, products, tax rates (0/5/12/18/28%), vendors, customers, POs, inwards, barcodes, buckets and invoices. **Dev/emulator only, never production.**

**37. `docs/API_VERSIONING.md`.** Versioning for the OpenWA contract and any future Cloud Functions, **Firestore schema versioning** (`SchemaVersion` field), backward-compatible changes, migration approach for existing documents.

**38. `docs/CODE_QUALITY.md`.** Reusable components, type safety (PropTypes or TypeScript decision), linting/formatting, refactoring rules, documentation, dependency management, review checklist, plan for the legacy build toolchain.

### **E. PROJECT MANAGEMENT**

**39. `README.md` (root).** Overview, features, stack, prerequisites (Node 22+ for OpenWA), Firebase setup (Auth providers, Firestore), env setup, running OpenWA and POSUI (including `run-all.ps1`), linking WhatsApp via the dashboard QR, tests, build, deployment, structure.

**40. `CHANGELOG.md` (root).** Features, improvements, fixes, security fixes, breaking changes.

**41. `CHANGE_REQUESTS.md` (root).** Template and log: change, reason, impact, affected files, **Firestore/Rules/UI/security impact**, testing needs, status. **Pre-seed it with:** legacy OpenSSL build flag upgrade, Cloud Functions evaluation, stock ledger decision, customer returns, cash register/shifts, official WhatsApp Business API.

**42. `docs/PRODUCTION_READINESS_CHECKLIST.md`.** Checklist: **Security Rules deployed and tested**, indexes deployed, Auth providers and authorized domains locked down, App Check, validation, error handling, responsive and accessibility checks, backups enabled, monitoring and logging, env vars, OpenWA hosting and session persistence, legacy flags removed, unused code removed.

**43. `docs/FINAL_AUDIT_CHECKLIST.md`.** Pass/fail audit with evidence for functionality, UI/UX, security (Rules and Auth), Firestore data integrity, permissions, invoicing and GST accuracy, payments, inventory and expiry, WhatsApp delivery, reports, performance, testing and deployment.

---

## **PHASE 3: AFTER THE DOCS ARE CREATED**

**1.** Print a short summary: files created, **Gaps and Open Decisions**, and any assumptions.

**2.** **STOP and wait for my approval.** Do not write application code yet.

**3.** After approval, begin **Milestone 1 only**.

**4.** For every milestone, follow this loop:
- Re-read `CLAUDE.md`, the relevant docs and `PROGRESS.md`
- State a brief plan
- Implement only that milestone (UI → `_api` → logic → Firestore + Rules)
- Test it against `ACCEPTANCE_CRITERIA.md` and `TEST_CASES.md`, including Security Rules tests
- Remove unused code
- Update `PROGRESS.md` and `CHANGELOG.md`
- Report results and **wait for my go-ahead before the next milestone**

**5.** Any requirement change goes into `CHANGE_REQUESTS.md` first, then affected docs are updated, then code.

---

## **FINAL REMINDER**

**Docs first. Small milestones. Test everything. Update PROGRESS.md. No secrets in code. No unnecessary dependencies. Authorization lives in Firestore Security Rules, atomic operations use transactions, and every feature is wired end to end (UI → `_api` → logic → Firestore) with validation, error handling, loading and empty states. The target is a production-ready POS & Billing System, not a prototype.**
