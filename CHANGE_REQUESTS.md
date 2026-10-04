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
- **Firestore Schema Impact:** [Collections, attributes, or indexing changes]
- **Security Rules Impact:** [Permissions or rule logic updates]
- **UI / UX Impact:** [Screens, dialogs, or workflow modifications]
- **Testing & Verification Requirements:** [Required tests before merging]
```

---

## 2. Pre-Seeded Change Requests

### CR-001: Toolchain Modernization: Migrate from `react-scripts` to Vite
- **Status:** **Proposed (Target: Milestone 14)**
- **Reason & Context:** Current React build toolchain relies on `react-scripts` (Webpack 5) requiring `NODE_OPTIONS=--openssl-legacy-provider` on modern Node.js versions (v18, v20, v22).
- **Technical Scope & Impact:** Replace `react-scripts` with `vite` and `@vitejs/plugin-react`. Update `package.json` scripts and environment variable prefixing (`VITE_` instead of `REACT_APP_`).
- **Firestore / Rules Impact:** None.
- **UI / UX Impact:** Vastly improved developer HMR speed ($< 200\text{ms}$) and smaller production bundle footprint.
- **Testing Requirements:** Verify production build compiles without legacy OpenSSL flags; verify environment variables load correctly.

---

### CR-002: Transition Core Financial Logic to Firebase Cloud Functions
- **Status:** **Proposed (Phase 2 Hardening)**
- **Reason & Context:** Direct client-to-Firestore execution of atomic invoice numbering and tax math introduces residual vulnerability if client code is manipulated.
- **Technical Scope & Impact:** Deploy Node.js 20 Cloud Functions (`createInvoiceFromBucket`, `cancelInvoice`) acting as trusted serverless endpoints.
- **Firestore / Rules Impact:** Restrict write permissions on `InvoiceHeader` and `InvoiceDetails` strictly to Cloud Functions admin context.
- **UI / UX Impact:** None. Front-end service layer redirects call to HTTPS callable function.
- **Testing Requirements:** Concurrency load tests simulating 100 simultaneous checkouts.

---

### CR-003: Dedicated Real-Time Stock Ledger Collection (`StockLedger`)
- **Status:** **Approved for Implementation in M6 / M8**
- **Reason & Context:** Calculating stock-on-hand on the fly by scanning historical inwards, invoices, and returns consumes excessive Firestore reads.
- **Technical Scope & Impact:** Introduce `/ProductStock/{storeId_productId}` maintaining an atomic integer `QuantityOnHand`.
- **Firestore / Rules Impact:** Add new collection with security rules allowing read to all staff, and write during inward/invoicing transactions.
- **UI / UX Impact:** POS terminal displays live stock counter badges on product cards.
- **Testing Requirements:** Verify increment on inward and decrement on checkout.

---

### CR-004: Retail Customer Sales Returns & Refund Processing
- **Status:** **Proposed (Phase 2 Extension)**
- **Reason & Context:** Phase 1 PRD supports vendor material returns only. Retail customers cannot currently return purchased items for cash/store credit.
- **Technical Scope & Impact:** Create `CustomerSalesReturnHeader` and `Details` collections with credit note generation.
- **Firestore / Rules Impact:** New collections and security rules.
- **UI / UX Impact:** New "Sales Returns" screen under Billing module.
- **Testing Requirements:** Verify stock reinstatement and refund voucher printing.

---

### CR-005: Cash Register Management & Cashier Shift Handover
- **Status:** **Proposed (Phase 2 Extension)**
- **Reason & Context:** Store cashiers currently record cash sales without opening/closing drawer balances or shift reconciliation.
- **Technical Scope & Impact:** Introduce `CashierShifts` collection capturing Opening Float, Cash In/Out, and Expected vs Actual Cash at shift end.
- **Firestore / Rules Impact:** Add `CashierShifts` collection.
- **UI / UX Impact:** "Open Register" prompt at login; "End Shift & Reconcile" drawer report.
- **Testing Requirements:** Verify difference calculation and shift summary PDF printout.

---

### CR-006: Official Meta WhatsApp Business Cloud API Integration
- **Status:** **Proposed (Phase 2 Enterprise Stability)**
- **Reason & Context:** Unofficial WhatsApp Web libraries (`@whiskeysockets/baileys`) present session disconnection risks and potential anti-spam phone number bans.
- **Technical Scope & Impact:** Integrate official Meta Graph API v20+ for transactional template receipt delivery.
- **Firestore / Rules Impact:** Store Meta API access token in Firebase Secret Manager.
- **UI / UX Impact:** Guaranteed 99.9% uptime for receipt delivery.
- **Testing Requirements:** Verify template delivery via Meta webhook test harness.
