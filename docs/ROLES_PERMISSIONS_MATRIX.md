# Roles & Permissions Matrix: POS & Billing System

## 1. System Roles Overview
The system authorizes strictly three (3) internal system roles. External vendors have zero system access.

| Role | Classification | Description & Scope |
| :--- | :--- | :--- |
| **Admin** | Internal Staff | Executive system oversight: configuration, user RBAC, catalog, full financial reports, and invoice cancellations. |
| **Cashier** | Internal Staff | Frontline terminal cashier: customer management, cart staging, billing, payment recording, and receipt printing/dispatch. |
| **Inventory Manager** | Internal Staff | Warehouse and stock logistics: supplier directory, purchase orders, material inward, barcode printing, and vendor returns. |
| **Vendor** | External Entity | **NO SYSTEM ACCESS.** Stored strictly as business records in the `Vendors` collection. Cannot log in or view the application. |

---

## 2. Granular Permissions Matrix

| Module / Page | Capability | Admin | Cashier | Inventory Manager |
| :--- | :--- | :---: | :---: | :---: |
| **Dashboard** (`/dashboard`) | View KPIs & Financial Charts | ✅ Yes | ❌ No | ❌ No |
| | Export Dashboard Data | ✅ Yes | ❌ No | ❌ No |
| **POS Terminal** (`/apps/bucket`) | View Terminal & Cart | ✅ Yes | ✅ Yes | ❌ No |
| | Scan & Stage Items in Bucket | ✅ Yes | ✅ Yes | ❌ No |
| | Hold & Switch Buckets | ✅ Yes | ✅ Yes | ❌ No |
| | Finalize Invoice (Cash/UPI) | ✅ Yes | ✅ Yes | ❌ No |
| **Invoices** (`/apps/invoice`) | View Invoices List | ✅ Yes | ✅ Yes | ❌ No |
| | View Invoice Detail & PDF | ✅ Yes | ✅ Yes | ❌ No |
| | Share via WhatsApp | ✅ Yes | ✅ Yes | ❌ No |
| | Cancel Invoice (Soft-Delete) | ✅ Yes | ❌ No | ❌ No |
| | Export Invoices to CSV | ✅ Yes | ❌ No | ❌ No |
| **Products** (`/apps/product`) | View Product Catalog | ✅ Yes | ✅ Yes (Read-only) | ✅ Yes |
| | Create New Product | ✅ Yes | ❌ No | ✅ Yes |
| | Edit Product Details/Tax | ✅ Yes | ❌ No | ✅ Yes |
| | Soft Delete / Restore Product | ✅ Yes | ❌ No | ✅ Yes |
| **Categories** (`/apps/category`) | Manage Categories | ✅ Yes | ❌ No | ✅ Yes |
| **Vendors** (`/apps/vendor`) | View Vendors Directory | ✅ Yes | ❌ No | ✅ Yes |
| | Create / Edit Vendors | ✅ Yes | ❌ No | ✅ Yes |
| **Purchase Orders** (`/apps/purchaseOrder`) | View Purchase Orders | ✅ Yes | ❌ No | ✅ Yes |
| | Create / Issue POs | ✅ Yes | ❌ No | ✅ Yes |
| | Export PO to PDF | ✅ Yes | ❌ No | ✅ Yes |
| **Material Inward** (`/apps/materialInward`) | View Inward History | ✅ Yes | ❌ No | ✅ Yes |
| | Process Inward (PO & non-PO) | ✅ Yes | ❌ No | ✅ Yes |
| | Generate & Print Barcodes | ✅ Yes | ❌ No | ✅ Yes |
| **Material Returns** (`/apps/materialReturn`) | View Return Notes | ✅ Yes | ❌ No | ✅ Yes |
| | Create Vendor Return Note | ✅ Yes | ❌ No | ✅ Yes |
| **Customers** (`/apps/customer`) | View Customer Directory | ✅ Yes | ✅ Yes | ❌ No |
| | Create / Edit Customers | ✅ Yes | ✅ Yes | ❌ No |
| **Reports** (`/apps/reports/*`) | View Daily Sales Report | ✅ Yes | ❌ No | ❌ No |
| | View Vendor-Wise Sales | ✅ Yes | ❌ No | ✅ Yes |
| | View Expired Stock Report | ✅ Yes | ❌ No | ✅ Yes |
| | Export Reports to CSV | ✅ Yes | ❌ No | ✅ Yes (Stock only) |
| **Settings** (`/apps/settings`) | Manage Store Profile & GSTIN | ✅ Yes | ❌ No | ❌ No |
| | Manage Tax Slabs (`TaxRates`) | ✅ Yes | ❌ No | ❌ No |
| | Configure OpenWA Gateway | ✅ Yes | ❌ No | ❌ No |
| **User Management** (`/apps/users`) | View User Accounts | ✅ Yes | ❌ No | ❌ No |
| | Invite / Assign Roles | ✅ Yes | ❌ No | ❌ No |

---

## 3. Firestore Security Rules Mapping
Each permission maps directly to collection match rules in `firestore.rules`:
- Cashier restricted paths: `Vendors`, `PurchaseOrderHeader`, `PurchaseOrderDetails`, `MaterialInwardHeader`, `MaterialReturnNoteHeader`, `Settings`, `RolesAndPermissions` are completely blocked from read and write.
- Inventory Manager restricted paths: `InvoiceHeader`, `InvoiceDetails`, `BucketHeader`, `Settings`, `Customers` are blocked.
- Admin maintains write access across configuration and soft-cancellation paths.
