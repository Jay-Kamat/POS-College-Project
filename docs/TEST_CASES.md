# Comprehensive Test Cases Specification: POS & Billing System

## 1. Authentication & RBAC

| Test ID | Module | Type | Description / Input | Expected Result |
| :--- | :--- | :---: | :--- | :--- |
| **TC-AUTH-01** | Auth | Positive | Valid Cashier email and password login. | Successfully authenticated; redirects to `/apps/bucket`. |
| **TC-AUTH-02** | Auth | Negative | Valid email with incorrect password. | Error alert: "Invalid email or password." |
| **TC-AUTH-03** | Auth | Negative | Unregistered user logs in via Google OAuth. | 403 Forbidden: "User role not provisioned by Admin." |
| **TC-RBAC-01** | RBAC | Negative | Cashier tries to open `/apps/vendor` directly. | Route guard triggers redirect to 403 page. |
| **TC-RBAC-02** | RBAC | Negative | Inventory Manager attempts to cancel invoice. | "Cancel Invoice" button hidden; API write blocked. |

---

## 2. Master Data: Stores, Tax Rates & Products

| Test ID | Module | Type | Description / Input | Expected Result |
| :--- | :--- | :---: | :--- | :--- |
| **TC-MST-01** | Store | Positive | Update Store with valid 15-char GSTIN. | Store profile updated; reflected on receipts. |
| **TC-MST-02** | Store | Negative | Enter 12-character invalid GSTIN. | Formik validation error: "Invalid GSTIN format." |
| **TC-PRD-01** | Products | Positive | Create product with `IsExpDate = true` and `Days = 7`. | Product saved with shelf life; listed in catalog. |
| **TC-PRD-02** | Products | Negative | Create product with `IsExpDate = true` and `Days = 0`. | Yup error: "Shelf life must be at least 1 day." |
| **TC-PRD-03** | Products | Positive | Soft-delete product. | `RecordStatus = 1`; item hidden from POS terminal. |

---

## 3. Procurement, Inward & Barcoding

| Test ID | Module | Type | Description / Input | Expected Result |
| :--- | :--- | :---: | :--- | :--- |
| **TC-INW-01** | Inward | Positive | Inward 50 units against PO with 5-day shelf life. | Saves inward; generates 50 unique barcode records. |
| **TC-INW-02** | Inward | Negative | Inward without PO missing vendor selection. | Blocked: "Vendor selection is mandatory." |
| **TC-BAR-01** | Barcode | Positive | Print thermal barcode labels. | Print layout shows Product Name, Price, Barcode, Expiry. |

---

## 4. POS Terminal, Buckets & Checkout

| Test ID | Module | Type | Description / Input | Expected Result |
| :--- | :--- | :---: | :--- | :--- |
| **TC-POS-01** | POS | Positive | Scan valid barcode `2001001020045`. | Item appended to cart within 100ms; subtotal recalculated. |
| **TC-POS-02** | POS | Negative | Scan barcode of expired batch. | Rejected; audio beep; error toast: "Batch Expired". |
| **TC-POS-03** | POS | Positive | Press `F8` with 3 items in cart. | Cart saved as `BKT-01` tab; blank `BKT-02` opened. |
| **TC-POS-04** | POS | Positive | Decrement item quantity from 1 to 0. | Prompts: "Remove item from cart?"; item removed on OK. |

---

## 5. Invoicing, Taxes & Payments

| Test ID | Module | Type | Description / Input | Expected Result |
| :--- | :--- | :---: | :--- | :--- |
| **TC-TAX-01** | GST | Positive | Store = MH, Customer = MH; ₹100 @ 18% GST. | CGST = ₹9.00, SGST = ₹9.00, IGST = ₹0.00, Total = ₹118.00. |
| **TC-TAX-02** | GST | Positive | Store = MH, Customer = KA; ₹100 @ 18% GST. | CGST = ₹0.00, SGST = ₹0.00, IGST = ₹18.00, Total = ₹118.00. |
| **TC-PAY-01** | Payment | Positive | Cash bill ₹280; Cashier enters ₹500. | Displays Change Due: ₹220.00 in large green font. |
| **TC-PAY-02** | Payment | Negative | Cash bill ₹280; Cashier enters ₹200. | Blocked: "Amount tendered cannot be less than Grand Total." |
| **TC-PAY-03** | Payment | Positive | UPI payment; Cashier marks received. | Generates invoice; sets `IsPaymentReceived = true`. |

---

## 6. Cancellations, WhatsApp & Reports

| Test ID | Module | Type | Description / Input | Expected Result |
| :--- | :--- | :---: | :--- | :--- |
| **TC-CAN-01** | Cancel | Positive | Admin cancels invoice with 25-char reason. | `RecordStatus = 1`; document displays CANCELLED stamp. |
| **TC-CAN-02** | Cancel | Negative | Admin cancels invoice with empty reason. | Blocked: "Cancellation reason must be >= 10 characters." |
| **TC-WA-01** | WhatsApp| Positive | OpenWA online; share receipt triggered. | POST returns 200 OK; toast: "WhatsApp receipt sent." |
| **TC-WA-02** | WhatsApp| Negative | OpenWA offline (`ECONNREFUSED`). | Invoice created normally; toast: "WhatsApp offline - Retry." |
| **TC-REP-01** | Reports | Positive | Filter Daily Sales by date range and export CSV. | Downloads CSV with correct matching line totals. |
