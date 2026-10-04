# Production Readiness Checklist: POS & Billing System

## 1. Security & Access Governance
- [ ] **Firestore Security Rules Deployed:** `firestore.rules` deployed to production project (`pos-billing-prod`).
- [ ] **Rules Unit Tests Passing:** 100% pass rate on `@firebase/rules-unit-testing` emulator test suite.
- [ ] **Authorized Domains Restricted:** `localhost` removed from production Firebase Auth settings; restricted strictly to live store domain.
- [ ] **Firebase App Check Enabled:** reCAPTCHA v3 or Play Integrity enabled to prevent automated bot access to Firestore.
- [ ] **Secret Hygiene:** Verified zero hardcoded credentials, service account JSONs, or OpenWA tokens in client bundles.
- [ ] **Role Isolation:** Verified Cashier cannot access vendor or PO collections; Inventory Manager cannot view invoice financials.

---

## 2. Database & Data Integrity
- [ ] **Composite Indexes Deployed:** All indexes in `firestore.indexes.json` deployed without errors.
- [ ] **Audit Trail Enforced:** All write operations verified to populate `Created`, `Updated`, `RecordStatus`, `CreatedId`, `UpdatedId`.
- [ ] **Atomic Transactions:** Invoice counter increment and bucket conversion verified under concurrent simulated load.
- [ ] **Automated Backups Enabled:** Daily Firestore export scheduled to Google Cloud Storage (`gs://pos-billing-prod-backups/`).
- [ ] **Point-in-Time Recovery (PITR):** PITR enabled in Google Cloud Console.

---

## 3. Financial, GST & Invoicing Compliance
- [ ] **GST Splitting Accuracy:** Mathematical verification of CGST/SGST (intra-state) and IGST (inter-state) across all tax slabs.
- [ ] **Legal Metadata Rendering:** Validated store GSTIN, Food License Number (FSSAI), and address render on all thermal receipts and PDFs.
- [ ] **Sequential Numbering:** Concurrency test verifies zero skipped or duplicate `DocumentNumber` sequences.
- [ ] **Cancellation Immutability:** Cancelled invoices verified to retain sequential number with red CANCELLED stamp; original records immutable.

---

## 4. UI/UX, Performance & Accessibility
- [ ] **Sub-100ms Barcode Scan:** Barcode scan-to-cart latency verified $< 80\text{ms}$.
- [ ] **Keyboard Shortcuts Verified:** `F2` (search focus), `F8` (hold bucket), `F9` (checkout) operational on all terminal browsers.
- [ ] **Loading & Empty States:** Verified skeleton loaders and empty illustrations render across all modules.
- [ ] **WCAG AA Compliance:** Axe-core scan reports zero high-priority contrast or ARIA issues.
- [ ] **Responsive Breakpoints:** Layouts verified across 1080p desktop, 768p tablet touch screen, and mobile viewport.

---

## 5. Infrastructure & External Gateways
- [ ] **OpenWA Persistent Daemon:** OpenWA service configured under PM2 or Docker with automated restart on failure.
- [ ] **Session Persistence:** `auth_info_baileys/` volume backed up; QR pairing successful.
- [ ] **Graceful Degradation:** Verified POS terminal functions normally even if OpenWA service is completely down.
- [ ] **Production Build Check:** Production bundle builds cleanly; dead code and debug logs stripped.
