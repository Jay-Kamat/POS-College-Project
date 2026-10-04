# Seed Data & Database Initialization Specification: POS & Billing System

## 1. Overview & Development Guidelines
This dataset is designed strictly for local development and Firestore Emulator testing (`pos-billing-dev`). **NEVER execute this seed script against production (`pos-billing-prod`).**

---

## 2. Seed Data Schema & Entities

### 2.1 Stores (`/Stores`)
- **Document ID:** `store_mum_01`
  ```json
  {
    "Id": "store_mum_01",
    "Name": "DailyMart Express",
    "LongName": "DailyMart Retail Private Limited",
    "Address": "Plot 12, Commercial Hub, MG Road, Mumbai",
    "MobileNumber": "+919876543210",
    "PhoneNumber": "022-28765432",
    "Email": "mumbai01@dailymart.in",
    "FoodLicenseNumber": "11522001000123",
    "GstNumber": "27AABCU9603R1ZM",
    "Country": "India",
    "State": "Maharashtra",
    "RecordStatus": 0,
    "Created": "2026-10-01T00:00:00Z",
    "Updated": "2026-10-01T00:00:00Z",
    "CreatedId": "system_seed",
    "UpdatedId": "system_seed"
  }
  ```

### 2.2 Roles and Staff Accounts (`/RolesAndPermissions`)
- `user_admin_01`: `Role: "Admin"`, Email: `admin@dailymart.in`
- `user_cashier_01`: `Role: "Cashier"`, Email: `cashier1@dailymart.in`
- `user_inv_01`: `Role: "Inventory Manager"`, Email: `inventory@dailymart.in`

### 2.3 Tax Rates (`/TaxRates`)
1. `tax_0`: Name: "GST 0%", IGST: 0.0, CGST: 0.0, SGST: 0.0
2. `tax_5`: Name: "GST 5%", IGST: 5.0, CGST: 2.5, SGST: 2.5
3. `tax_12`: Name: "GST 12%", IGST: 12.0, CGST: 6.0, SGST: 6.0
4. `tax_18`: Name: "GST 18%", IGST: 18.0, CGST: 9.0, SGST: 9.0
5. `tax_28`: Name: "GST 28%", IGST: 28.0, CGST: 14.0, SGST: 14.0

### 2.4 Categories (`/ProductCategory`)
1. `cat_dairy`: Name: "Dairy & Eggs"
2. `cat_bakery`: Name: "Bakery & Confectionery"
3. `cat_bev`: Name: "Beverages & Cold Drinks"
4. `cat_grains`: Name: "Staples & Grains"
5. `cat_snacks`: Name: "Packaged Snacks"

### 2.5 Products (`/Products`)
1. `prd_milk_500`:
   - Name: "Cow Milk 500ml", ProductNumber: "PRD-101", Cost: 26.0, TaxRateId: "tax_5", CategoryId: "cat_dairy", IsExpDate: true, Days: 3
2. `prd_bread_loaf`:
   - Name: "Whole Wheat Bread 400g", ProductNumber: "PRD-102", Cost: 32.0, TaxRateId: "tax_0", CategoryId: "cat_bakery", IsExpDate: true, Days: 5
3. `prd_cold_coffee`:
   - Name: "Cold Coffee Bottle 200ml", ProductNumber: "PRD-103", Cost: 35.0, TaxRateId: "tax_18", CategoryId: "cat_bev", IsExpDate: true, Days: 30
4. `prd_basmati_1kg`:
   - Name: "Royal Basmati Rice 1kg", ProductNumber: "PRD-104", Cost: 95.0, TaxRateId: "tax_5", CategoryId: "cat_grains", IsExpDate: false, Days: null

### 2.6 Vendors (`/Vendors`)
- `vnd_fresh_dairy`:
  - VendorCode: "VND-101", Name: "Fresh Dairy Co-operative Ltd", City: "Pune", Pin: "411001", MobileNumber: "+919822012345", Email: "orders@freshdairy.com"
- `vnd_baker_treats`:
  - VendorCode: "VND-102", Name: "Golden Crust Bakers LLP", City: "Mumbai", Pin: "400050", MobileNumber: "+919821098765", Email: "dispatch@goldencrust.in"

### 2.7 Customers (`/Customers`)
- `cust_01`: Name: "Jay Sharma", MobileNumber: "9876543210", State: "Maharashtra", GstNumber: null
- `cust_02_b2b`: Name: "Zenith Cafe LLP", MobileNumber: "9820011223", State: "Maharashtra", GstNumber: "27AABCZ1234P1ZR"

---

## 3. Seed Execution Script (`scripts/seed-emulator.js`)
A Node.js initialization script executed against the local Firestore Emulator:
```bash
# Run seed script against emulator
export FIRESTORE_EMULATOR_HOST="localhost:8080"
node scripts/seed-emulator.js
```
The script writes documents using batched writes, sets `RecordStatus: 0`, and initializes the starting invoice sequence counter `/Counters/Store_store_mum_01_FY_2627` with `lastNumber: 100`.
