# Data Access & Integration API Specification: POS & Billing System

## 1. Overview
The POS application communicates with two distinct layers:
1. **Firestore Client Service Layer (`src/_api/`):** A set of modular asynchronous JavaScript services encapsulating Cloud Firestore SDK operations. All calls enforce soft-deletion filtering (`RecordStatus == 0`) and inject global audit fields.
2. **OpenWA WhatsApp Gateway REST API:** A local NestJS HTTP service exposing endpoints on port 2785 for sending WhatsApp transaction receipts.

---

## 2. Firestore Service Layer (`src/_api`)

### 2.1 Common Parameter & Query Convention
All query methods accept standard options:
- `pageLimit` (number, default: 25): Document query batch size.
- `lastVisible` (QueryDocumentSnapshot, optional): Cursor for pagination.
- `storeId` (string, optional): Multi-store boundary filter.

### 2.2 `authService.js`
- **`loginWithEmail(email, password)`**
  - *Returns:* `{ user, token, role }`
  - *Throws:* `auth/wrong-password`, `auth/user-not-found`
- **`loginWithGoogle()`**
  - *Returns:* `{ user, token, role }`
- **`logout()`**
  - *Returns:* `void`

### 2.3 `productService.js`
- **`getProducts({ categoryId, searchTerm, pageLimit, lastVisible })`**
  - *Query:* `where("RecordStatus", "==", 0)`, optionally filtered by category.
  - *Returns:* `{ items: Product[], lastVisible: QueryDocumentSnapshot }`
- **`getProductByNumber(productNumber)`**
  - *Returns:* `Product | null`
- **`createProduct(productData)`**
  - *Validates & Injects:* `Created`, `Updated`, `RecordStatus: 0`, `CreatedId`.
  - *Returns:* `{ id: string }`
- **`updateProduct(id, productData)`**
  - *Updates:* `Updated`, `UpdatedId`, and changed attributes.
  - *Returns:* `void`
- **`softDeleteProduct(id)`**
  - *Updates:* `RecordStatus: 1`, `Updated`, `UpdatedId`.
  - *Returns:* `void`

### 2.4 `bucketService.js`
- **`getActiveBuckets()`**
  - *Query:* Real-time subscription (`onSnapshot`) where `RecordStatus == 0`.
  - *Returns:* `UnsubscribeFunction`
- **`saveBucket({ bucketId, customerId, mobileNumber, items })`**
  - *Description:* Writes `BucketHeader` and replaces/updates `BucketDetails`.
  - *Returns:* `{ bucketId: string }`
- **`deleteBucket(bucketId)`**
  - *Soft-deletes:* Sets `RecordStatus: 1` on header and details.

### 2.5 `invoiceService.js`
- **`createInvoiceFromBucket({ bucketId, paymentMode, amountReceived, customerInfo })`**
  - *Execution:* Uses Firestore `runTransaction()`.
  - *Steps:*
    1. Read and lock `Counters/Store_{StoreId}_FY_{Year}` to increment and generate `DocumentNumber`.
    2. Write `InvoiceHeader`.
    3. Batch insert `InvoiceDetails` with denormalized product names and line GST splits.
    4. Mark `BucketHeader.RecordStatus = 1`.
  - *Returns:* `{ invoiceId: string, documentNumber: string }`
- **`getInvoices({ startDate, endDate, storeId, pageLimit, lastVisible })`**
  - *Query:* `where("StoreId", "==", storeId)`, `where("RecordStatus", "==", 0)`, ordered by `Date DESC`.
  - *Returns:* `{ items: InvoiceHeader[], lastVisible }`
- **`getInvoiceById(invoiceId)`**
  - *Returns:* `{ header: InvoiceHeader, details: InvoiceDetails[], store: Store, customer: Customer }`
- **`cancelInvoice(invoiceId, reason)`**
  - *Execution:* Sets `RecordStatus: 1`, `CancellationReason: reason`, `Updated`, `UpdatedId`.
  - *Constraint:* Never re-uses or deletes the `DocumentNumber`.

### 2.6 `materialInwardService.js`
- **`saveMaterialInward({ purchaseOrderId, vendorId, isPoAvailable, items })`**
  - *Creates:* `MaterialInwardHeader`, `MaterialInwardDetails`, and generates barcodes in `MaterialInwardBarcodes`.
  - *Returns:* `{ inwardId: string, generatedBarcodes: string[] }`
- **`getBarcodesByInwardDetail(detailId)`**
  - *Returns:* `MaterialInwardBarcodes[]`

---

## 3. OpenWA WhatsApp Gateway REST Contract

### 3.1 Network & Port Configuration
- **Base URL:** `http://localhost:2785/api/v1`
- **Dashboard / QR Link UI:** `http://localhost:2886`
- **Auth Header:** `Authorization: Bearer <OPENWA_API_KEY>`

### 3.2 Endpoint: Send Digital WhatsApp Receipt
- **Method:** `POST`
- **Path:** `/messages/send-text`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer test_openwa_secret_token`
- **Request Payload:**
```json
{
  "to": "+919876543210",
  "message": "*DailyMart Express*\nPlot 12, MG Road, Mumbai\nGSTIN: 27AABCU9603R1ZM | FSSAI: 11522001000123\n--------------------------------\n*INVOICE: INV-2627-001042*\nDate: 04/10/2026, 07:45 PM\nCustomer: Jay Sharma (+919876543210)\nPayment Mode: UPI (Paid)\n--------------------------------\n1. Basmati Rice 1kg x 2 = ₹160.00\n2. Cow Milk 500ml x 3 = ₹90.00\n3. Cold Coffee 200ml x 1 = ₹45.00\n--------------------------------\nSubtotal: ₹250.00\nCGST (4.5%): ₹11.25\nSGST (4.5%): ₹11.25\nRound-off: +₹0.50\n*GRAND TOTAL: ₹295.00*\n--------------------------------\nThank you for shopping with us!\nVisit again."
}
```
- **Success Response (200 OK):**
```json
{
  "status": "success",
  "messageId": "wamid.HBgMOTExOTg3NjU0MzIxMBUCABEYEkRFMEExMkY0MTU0MTMy",
  "timestamp": 1791124500
}
```
- **Error Response (400 / 500 / 503):**
```json
{
  "status": "error",
  "errorCode": "SESSION_DISCONNECTED",
  "message": "WhatsApp Web session is not currently paired. Please scan the QR code at port 2886."
}
```

### 3.3 Endpoint: Gateway Health & Pairing Status
- **Method:** `GET`
- **Path:** `/session/status`
- **Response (200 OK):**
```json
{
  "isReady": true,
  "authenticated": true,
  "phoneConnected": true,
  "batteryPercent": 88
}
```
