# System Architecture Specification: POS & Billing System

## 1. High-Level Architecture Overview
The system employs a client-centric single-page application (SPA) architecture integrating directly with Google Cloud Firestore and Firebase Authentication via the Firebase Web SDK v9/v10 modular API. Outbound WhatsApp communication is decoupled via a local microservice gateway (`OpenWA`).

```mermaid
graph TB
    subgraph Client_Tier [Client Tier: POSUI - Port 3000]
        UI[React 18 Mantis UI Components]
        ReduxStore[Redux Toolkit Store\nCart, Session, UI State]
        ServiceLayer[Service Layer\nsrc/_api Firestore SDK]
        WAClient[OpenWA HTTP Client\nAxios / Fetch]
        PDFGen[@react-pdf/renderer\nClient Invoice PDF]
    end

    subgraph Firebase_Cloud [Google Firebase & Cloud Firestore]
        FirebaseAuth[Firebase Authentication\nGoogle OAuth & Email/Pass]
        SecurityRules[Firestore Security Rules\nCollection & Field Level RBAC]
        FirestoreDB[(Cloud Firestore\nNoSQL Database)]
    end

    subgraph WhatsApp_Gateway [Local WhatsApp Gateway - OpenWA]
        NestServer[NestJS HTTP Server\nAPI Port 2785 / Dashboard Port 2886]
        BaileysCore[WhatsApp Engine\nwhiskeysockets/baileys / whatsapp-web.js]
    end

    subgraph External_Network [Customer & Store Peripherals]
        BarcodeScanner[HID Keyboard-Wedge Scanner]
        ThermalPrinter[USB / ESC-POS Thermal Printer]
        CustomerPhone[Customer WhatsApp App]
    end

    %% Interactions
    BarcodeScanner -.->|Keystroke Stream| UI
    UI --> ReduxStore
    UI --> ServiceLayer
    UI --> WAClient
    UI --> PDFGen
    PDFGen --> ThermalPrinter

    ServiceLayer -->|Auth Tokens / Sessions| FirebaseAuth
    ServiceLayer -->|Modular Reads/Writes via TLS| SecurityRules
    SecurityRules --> FirestoreDB

    WAClient -->|POST /send-message JSON| NestServer
    NestServer --> BaileysCore
    BaileysCore -->|Encrypted Protocol| CustomerPhone
```

---

## 2. Request and Data Lifecycle

### 2.1 Direct-to-Firestore Data Flow
1. **User Interaction:** Cashier actions (e.g., scanning a product barcode) dispatch Redux actions or trigger view-model hooks.
2. **API Service Abstraction (`src/_api/`):** View components never import `firebase/firestore` directly. All operations route through dedicated modular service modules (e.g., `src/_api/invoiceService.js`, `src/_api/productService.js`).
3. **Firestore Security Verification:** Each read/write is evaluated against `firestore.rules` using the authenticated user's Firebase token claims (`request.auth.uid`, role verification document lookups).
4. **Optimistic Updates & Cache:** The Firestore SDK handles local client indexing and offline caching. Changes sync automatically when a connection is active.

### 2.2 OpenWA Communication Flow
1. Upon successful creation of an invoice in Firestore, `POSUI` checks `InvoiceHeader.IsShareReceiptThroughSms` and customer mobile number.
2. An asynchronous HTTP POST request is dispatched to `http://localhost:2785/api/v1/messages/send-text` with an authentication bearer token.
3. The NestJS gateway handles format validation, international phone formatting (`+91` prefixing), and transmits the payload over the active socket session.
4. If OpenWA is unreachable, the UI traps the network exception gracefully, flags the invoice receipt dispatch as failed in local state, and prompts the cashier with a "Retry WhatsApp" button without interrupting the billing flow.

---

## 3. Real-Time Listeners vs. One-Time Reads
To balance operational responsiveness with Firestore quota and cost controls:

| Data Type / Collection | Read Pattern | Rationale |
| :--- | :--- | :--- |
| **Auth State (`onAuthStateChanged`)** | Real-time Listener | Essential for immediate session invalidation and role change synchronization. |
| **Active Buckets (`BucketHeader`, `Details`)** | Real-time Listener (`onSnapshot`) | Enables multi-terminal visibility or instant recovery if cashier refreshes terminal. |
| **Product Catalog (`Products`)** | One-Time Read (`getDocs`) with Redux Caching | High frequency reads; catalog changes infrequently during billing shifts. |
| **Invoices List (`InvoiceHeader`)** | Paginated One-Time Queries (`startAfter`, `limit`) | Prevents runaway document read costs over large transaction sets. |
| **Inventory / Stock Batches** | Targeted One-Time Queries | Query by `BarcodeNumber` or `ProductId` on demand. |

---

## 4. State Management Architecture (Redux Toolkit)
The client state is structured into distinct functional slices:
- **`authSlice`:** Stores authenticated user profile, Firebase ID token, active store selection, and mapped system role (`Admin`, `Cashier`, `Inventory Manager`).
- **`posTerminalSlice`:** Holds current active bucket, staged cart line items, customer mobile and name, selected payment mode, tax breakdown summary, and keyboard shortcut focus state.
- **`heldBucketsSlice`:** Tracks held customer queues for multi-tasking cashiers.
- **`masterDataSlice`:** In-memory cached categories, active tax rates, and store metadata to ensure zero-latency POS lookups.
- **`uiSlice`:** Global drawer states, toast notifications, active network status, and dialog modals.

---

## 5. Atomicity, Transactions, and Concurrency
Because there is no traditional backend middleware, strict ACID guarantees in Firestore are implemented using **Firestore Transactions (`runTransaction`)**:

1. **Bucket-to-Invoice Conversion:**
   - Step 1: Read active `BucketHeader` and `BucketDetails`.
   - Step 2: Read current sequential invoice counter from `Counters/Store_{StoreId}_FY_{Year}`.
   - Step 3: Increment counter and format `DocumentNumber` (e.g., `INV-2627-001042`).
   - Step 4: Write `InvoiceHeader` and batch-insert `InvoiceDetails`.
   - Step 5: Mark `BucketHeader.RecordStatus = 1` (soft delete / closed).
   - Step 6: Atomic commit. If another cashier claimed the same sequential number concurrently, the transaction retries automatically up to 5 times.

2. **Stock Decrement (When Ledger is Approved):**
   - Stock counts are decremented inside the same atomic transaction or staged into a transactional append-only ledger (`StockLedger`).

---

## 6. Cloud Functions Recommendation
**Recommendation for Production Hardening:**
Direct client-to-Firestore architecture is viable for an internal local POS network, but writing sensitive fields (such as invoice numbers, tax sums, and payment confirmation flags) from the browser carries a residual risk of client-side script manipulation.
- **Phase 2 Migration Path:** Introduce Firebase Cloud Functions (Node.js 20 LTS) exposing callable HTTPS endpoints for:
  - `createInvoiceFromBucket` (secures invoice numbering and tax math on trusted backend).
  - `cancelInvoice` (enforces strict managerial cancellation and reversal).
  - `setUserRole` (prevents self-escalation of roles).

---

## 7. Offline & Resilience Strategy
- **IndexedDB Persistence:** Firestore offline persistence is enabled via `enableIndexedDbPersistence()`. If the internet drops during a peak store rush, cashiers can still query cached products and stage buckets.
- **Network Status Detection:** The `navigator.onLine` event triggers an ambient UI warning banner.
- **Offline Writes:** Writes queued while offline are synchronized automatically upon reconnection. (Note: Concurrency-dependent actions such as invoice sequence finalization are blocked until live connection is restored to prevent duplicate sequence conflicts).

---

## 8. Technical Debt & Build Toolchain Notice
- **Legacy OpenSSL Flag:** The React build toolchain uses `react-scripts` / Webpack 5 requiring `NODE_OPTIONS=--openssl-legacy-provider` on modern Node.js versions (v18, v20, v22).
- **Remediation Recommendation:** Plan migration of `POSUI` to modern **Vite + React 18 / 19** in Milestone 14 to eliminate the legacy OpenSSL provider requirement, improve HMR speeds, and cut production bundle size by over 40%.
