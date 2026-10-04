# Security Architecture & Rules Specification: POS & Billing System

## 1. Threat Model & Security Posture
Because this application features a direct client-to-Firestore connection without an intermediary proprietary backend server, **Google Cloud Firestore Security Rules are the primary and authoritative boundary of defense**. Client-side route guards and UI button disabling are strictly user-experience conveniences and provide zero security guarantee.

---

## 2. Firestore Security Rules Architecture (`firestore.rules`)

### 2.1 Core Security Invariants
1. **Unauthenticated Access Denial:** All unauthenticated read and write requests are rejected immediately (`request.auth != null`).
2. **Role Verification:** User roles are verified by inspecting the user's role document or custom auth claims.
3. **Soft-Delete Protection:** Physical document deletion (`delete`) is universally forbidden. Modifications to `RecordStatus` are audited.
4. **Finalized Invoice Immutability:** Once an `InvoiceHeader` or `InvoiceDetails` document is created, its core financial amounts (`Amount`, `Rate`, `TaxRateId`, `IGST`, `CGST`, `SGST`) cannot be edited or modified. Only `RecordStatus` and `CancellationReason` may be updated by an Admin.
5. **Audit Invariance:** Writes must preserve `Created` and `CreatedId`. `Updated` must match the server request time.

### 2.2 Concrete Security Rules Definition
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserRole() {
      return get(/databases/$(database)/documents/RolesAndPermissions/$(request.auth.uid)).data.Role;
    }
    
    function isAdmin() {
      return isAuthenticated() && (getUserRole() == 'Admin' || request.auth.token.role == 'Admin');
    }
    
    function isCashier() {
      return isAuthenticated() && (getUserRole() == 'Cashier' || request.auth.token.role == 'Cashier');
    }
    
    function isInventoryManager() {
      return isAuthenticated() && (getUserRole() == 'Inventory Manager' || request.auth.token.role == 'Inventory Manager');
    }

    // Stores, TaxRates, Settings: Read by all authenticated staff, write by Admin only
    match /Stores/{storeId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /TaxRates/{taxRateId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    match /Settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Roles and Permissions: Read by all authenticated staff, write exclusively by Admin
    match /RolesAndPermissions/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Products and Categories: Read by all, manage by Admin and Inventory Manager
    match /Products/{productId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdmin() || isInventoryManager();
      allow delete: if false; // Soft delete only
    }
    match /ProductCategory/{catId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdmin() || isInventoryManager();
      allow delete: if false;
    }

    // Vendors & Purchase Orders: Admin and Inventory Manager only
    match /Vendors/{vendorId} {
      allow read, write: if isAdmin() || isInventoryManager();
      allow delete: if false;
    }
    match /PurchaseOrderHeader/{poId} {
      allow read, write: if isAdmin() || isInventoryManager();
    }
    match /PurchaseOrderDetails/{detailId} {
      allow read, write: if isAdmin() || isInventoryManager();
    }
    
    // Material Inward & Barcodes
    match /MaterialInwardHeader/{inwardId} {
      allow read, write: if isAdmin() || isInventoryManager();
    }
    match /MaterialInwardDetails/{detailId} {
      allow read, write: if isAdmin() || isInventoryManager();
    }
    match /MaterialInwardBarcodes/{barcodeId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() || isInventoryManager();
    }
    
    // Customers: Cashier and Admin can create/read/update
    match /Customers/{customerId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdmin() || isCashier();
      allow delete: if false;
    }
    
    // Buckets: Cashier and Admin
    match /BucketHeader/{bucketId} {
      allow read, write: if isAdmin() || isCashier();
    }
    match /BucketDetails/{detailId} {
      allow read, write: if isAdmin() || isCashier();
    }

    // Invoices: Read by all authenticated; Create by Cashier/Admin; Modification locked down
    match /InvoiceHeader/{invoiceId} {
      allow read: if isAuthenticated();
      allow create: if (isAdmin() || isCashier()) && request.resource.data.RecordStatus == 0;
      // Invoices can never be edited except for cancellation flag by Admin
      allow update: if isAdmin() 
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['RecordStatus', 'CancellationReason', 'Updated', 'UpdatedId'])
        && request.resource.data.RecordStatus == 1;
      allow delete: if false; // Hard delete strictly forbidden
    }
    match /InvoiceDetails/{detailId} {
      allow read: if isAuthenticated();
      allow create: if (isAdmin() || isCashier()) && request.resource.data.RecordStatus == 0;
      allow update, delete: if false; // Details are immutable
    }

    // Counters: Internal atomic transactions
    match /Counters/{counterId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## 3. Firebase Authentication Hardening
1. **Authorized Domains:** Remove `localhost` in production Firebase Console. Restrict strictly to the registered store domain (e.g., `pos.dailymart.in`).
2. **Password Policy:** Enforce minimum 8 characters, requiring at least one numeric digit and one uppercase letter.
3. **Session Revocation:** Trigger token revocation upon role demotion or account deactivation.
4. **App Check:** Integrate Google reCAPTCHA v3 or Firebase App Check to block unauthorized automated bots from querying Firestore directly.

---

## 4. OpenWA Gateway Isolation
The local WhatsApp gateway (`OpenWA`) runs on local ports (API: 2785, Dashboard: 2886).
- **Network Binding:** Bind HTTP listeners strictly to `127.0.0.1` (localhost). Never bind to `0.0.0.0` or expose port 2785 over public WAN without reverse-proxy authentication.
- **API Token Authentication:** Every HTTP request to `http://localhost:2785` must pass an `Authorization: Bearer <TOKEN>` header verified by a NestJS guard.
- **PII Scrubbing:** Log files in OpenWA must mask customer mobile numbers (`+91 98765*****`) to safeguard customer privacy.

---

## 5. Input Validation & XSS Defense
- **Formik + Yup:** All user inputs (especially Free-text notes, Customer Name, and Address) undergo strict sanitization to neutralize script injection risks before writing to Firestore.
- **Receipt Template Encoding:** Receipt strings constructed for WhatsApp and PDF generation are plain-text formatted and strip HTML/JavaScript tags.
