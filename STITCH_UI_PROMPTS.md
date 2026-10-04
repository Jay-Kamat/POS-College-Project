# **GOOGLE STITCH UI PROMPTS: POS & BILLING SYSTEM**

**How to use:** Paste **Prompt 0 (Design System)** first and generate it. Then paste each screen prompt **one at a time** in the same project so Stitch keeps the look consistent. Generate desktop first, then use the **tablet/mobile variants** where noted. Edit the brand name and colors in Prompt 0 if you want something different.

---

## **PROMPT 0: DESIGN SYSTEM (PASTE FIRST)**

```text
Design a modern, clean, enterprise-grade web app UI for a "POS & Billing System" used by retail outlets, cafes and supermarkets in India. It has three internal roles: Admin, Cashier and Inventory Manager.

STYLE
- Look and feel similar to Material UI / Mantis admin dashboards: clean, airy, professional, fast to scan.
- Primary color: indigo blue #3B5BDB. Secondary: teal #12B886. Success #2F9E44, Warning #F59F00, Error #E03131, Info #1C7ED6.
- Neutrals: page background #F5F7FB, card background #FFFFFF, borders #E3E8EF, text #1F2937, muted text #6B7280.
- Font: Inter (or Public Sans). Sizes: page title 24px semibold, section title 18px, body 14px, table text 13px, big POS totals 32px bold.
- 8px spacing grid, 10px rounded corners on cards and inputs, subtle shadows, 1px borders.
- Light theme as default, with a matching dark theme.

LAYOUT
- Left collapsible sidebar (logo, nav groups: Dashboard, Billing, Products, Purchasing, Inventory, Reports, Settings), top bar with store selector, global search, language switcher, notifications, and user avatar menu showing role.
- Content area with page title, breadcrumbs, primary action button on the right, filters row, then data.

COMPONENTS
- Buttons: primary (filled), secondary (outlined), danger, icon buttons. Large touch-friendly sizes for POS.
- Data tables: sticky header, sticky first and last columns, pagination, sortable columns, row actions menu, status chips, search and filter bar, export to CSV button.
- Forms: labeled inputs, helper and error text, dropdowns, date pickers, toggles, side-drawer or dialog forms.
- Feedback: toast notifications, confirmation dialogs, loading skeletons, empty states with an illustration and a call-to-action, inline error banners.
- Status chips: Active (green), Deleted (grey), Cancelled (red), Paid (green), Pending (amber), Expiring soon (amber), Expired (red).

RULES
- Currency is Indian Rupee (₹) with Indian digit grouping (e.g., ₹1,25,000.50). Dates in DD/MM/YYYY.
- Every list screen must show loading, empty and error states.
- High contrast (WCAG AA), visible focus rings, minimum 44px touch targets.
- Use realistic sample data: products like Milk 500ml, Cold Coffee, Chocolate Cake, Basmati Rice 1kg; vendors like Fresh Dairy Pvt Ltd; GST rates 5%, 12%, 18%.
```

---

## **PROMPT 1: LOGIN AND SIGN UP**

```text
Design the Login screen for the POS & Billing System. Split layout: left side brand panel with logo, tagline "Fast billing. Smart inventory." and a subtle retail illustration; right side a centered card with:
- "Sign in with Google" button (with Google icon)
- Divider "or"
- Email and password fields with show/hide password, "Forgot password?" link
- Primary "Sign in" button
- Link "Create an account" that switches to a Sign Up form (name, email, password, confirm password)
- Inline validation error states and a loading state on the button
Also show a small footer with language switcher and privacy/terms links. Provide a mobile version.
```

---

## **PROMPT 2: ADMIN DASHBOARD**

```text
Design the Admin Dashboard. Top: date range filter and store selector. Row of 4 KPI cards: Today's Sales (₹), Invoices Today, Items Sold, Low/Expiring Stock Alerts, each with a small trend indicator versus yesterday.
Below: a large line/area chart "Sales over time" (daily/weekly/monthly toggle), a donut chart "Payment mode split (Cash vs UPI)", a bar chart "Top 5 selling products", and a bar chart "Sales by category".
Bottom: two tables side by side: "Recent invoices" (invoice no., customer, amount, mode, status) and "Batches expiring in 7 days" (product, batch barcode, expiry date, quantity, vendor).
Include a loading skeleton state and an empty state for a new store with no data.
```

---

## **PROMPT 3: POS TERMINAL (BUCKET): MOST IMPORTANT SCREEN**

```text
Design the Cashier POS terminal screen, optimized for speed, barcode scanners and touch. Full-screen layout without a sidebar clutter (collapsed rail only), top bar with store name, cashier name, bucket number, and a "New Bucket" button.

LEFT (60%): 
- Large search bar with barcode icon, auto-focused, placeholder "Scan barcode or search product (F2)".
- Category chips row (All, Beverages, Bakery, Dairy, Snacks...).
- Product grid of cards: product name, price (₹), stock indicator, expiry badge. Tapping a card adds it to the cart.

RIGHT (40%): the cart/bucket panel:
- Customer section: mobile number input with lookup, shows customer name once found, "Add new customer" link.
- Line items list: product name, expiry date, quantity stepper (- 1 +), rate, line amount, remove icon.
- Summary: Subtotal, CGST, SGST (or IGST), Round-off, and a big Grand Total (₹) in 32px bold.
- Payment mode selector as large toggle buttons: Cash / UPI.
- For Cash: amount received input and change due. For UPI: show a QR code placeholder and a "Mark payment received" toggle.
- Big primary button "Generate Invoice" and secondary "Hold Bucket" and "Clear".
Show a row of held buckets as tabs at the top of the cart. Show error toasts for an expired product scanned and an out-of-stock product. Show keyboard shortcut hints (F2 search, F8 hold, F9 pay). Provide a tablet landscape variant and a mobile variant with the cart as a bottom sheet.
```

---

## **PROMPT 4: INVOICE SUCCESS AND WHATSAPP SHARE**

```text
Design the post-payment success screen/dialog: green check animation, "Invoice INV-2026-000123 created", amount paid, payment mode. Show a receipt preview card (store name, address, GSTIN, FSSAI/food license number, invoice number and date, customer, itemized list with qty, rate, amount, CGST/SGST split, total). Action buttons: "Print Receipt", "Download PDF", "Share via WhatsApp" (with the customer's mobile number prefilled and editable), and "New Bill". Show success, sending, and failed states for the WhatsApp send with a retry button.
```

---

## **PROMPT 5: INVOICE LIST AND INVOICE DETAIL**

```text
Design the Invoice list page: filter bar (date range, payment mode, status, customer search, store), data table with columns: Invoice No., Date, Customer, Mobile, Amount, Mode (Cash/UPI chip), Payment status chip, Status (Active/Cancelled), and a row action menu (View, Print, Download PDF, Share WhatsApp, Cancel). Add summary totals above the table and an Export CSV button.
Then design the Invoice Detail page: a printable A4 invoice layout (store header with GSTIN, bill-to customer, itemized table with HSN, qty, rate, tax columns, tax summary, grand total in words, footer terms) plus a side panel with actions and an audit timeline. Include a "Cancel Invoice" dialog that requires a reason and shows a red CANCELLED watermark when cancelled.
```

---

## **PROMPT 6: PRODUCTS AND CATEGORIES**

```text
Design the Product management page: search, category filter, status filter (Active/Deleted), "Add Product" primary button. Paginated table with columns: Product No., Name, Category, Cost (₹), Tax rate, Expiry tracking (Yes/No with days), Status, actions (Edit, Delete, Restore).
Design the "Add/Edit Product" side drawer with fields: Name, Category (dropdown with add-new), Cost, Tax rate (dropdown: 0%, 5%, 12%, 18%, 28% showing CGST/SGST split), Ingredients, Notes, a toggle "Has expiry date" that reveals "Shelf life in days". Include validation errors, a soft-delete confirmation dialog, and an empty state "No products yet".
Also design a small Categories management dialog (list, add, rename, delete).
```

---

## **PROMPT 7: VENDORS AND PURCHASE ORDERS**

```text
Design the Vendor list page (table: Vendor Code, Name, City, Mobile, Email, actions) with an Add Vendor drawer (Name, Address, City, PIN, Email, Mobile, Note).
Design the Purchase Order list (PO number, date, vendor, store, total, status chips: Draft, Sent, Partially Received, Received) and the "Create Purchase Order" page: select vendor and store, date, then an editable line-items table (product search, quantity, rate, delivery date, line total) with "Add item", running total, and "Save PO" / "Download PO PDF" buttons.
```

---

## **PROMPT 8: MATERIAL INWARD AND BARCODES**

```text
Design the Material Inward screen for the Inventory Manager. Step 1: choose "Against a Purchase Order" (select PO, items prefill) or "Without PO" (select vendor, add items manually). Step 2: items table with ordered qty vs received qty, rate, and expiry date picker (auto-suggested from product shelf life). Step 3: "Generate Barcodes" which shows a preview grid of printable barcode labels (product name, barcode, expiry, price) with a "Print Labels" button and label size selector. Show a stepper at the top, validation for mismatched quantities, and a success summary.
```

---

## **PROMPT 9: VENDOR MATERIAL RETURNS**

```text
Design the Material Return Note page for returning goods to a vendor: choose vendor and store, date, return reason (dropdown from reasons master with add-new), then an items table (product, batch/expiry, available qty, return qty). Include a list page of past return notes with status and a printable return note view.
```

---

## **PROMPT 10: REPORTS**

```text
Design a Reports hub with cards linking to: Daily Sales, Vendor-wise Sales, and Vendor-wise Expired Stock. Then design each report page with: date range and store filters, summary KPI strip, a chart, and a paginated grid with column totals and an "Export CSV" button.
- Daily Sales: date, invoices count, cash total, UPI total, tax collected, grand total.
- Vendor-wise Sales: vendor, items sold, quantity, sales value.
- Vendor-wise Expired Stock: vendor, product, batch, expiry date, days overdue, quantity, value at cost, with red/amber highlighting.
Include loading, empty ("No data for selected dates") and error states.
```

---

## **PROMPT 11: USERS, ROLES AND PERMISSIONS (ADMIN ONLY)**

```text
Design the User Management page (table: name, email, role chip Admin/Cashier/Inventory Manager, store, status, last login, actions) with an "Invite user" dialog. Then design a Roles and Permissions matrix screen: rows are modules/pages (Dashboard, Billing, Invoices, Products, Vendors, Purchase Orders, Material Inward, Returns, Reports, Settings, Users), columns are the three roles, and each cell has checkboxes for View, Create, Edit, Delete, Export. Add a "Save changes" bar that appears when edits are made and a warning banner when changing Admin permissions. Add a note that Vendors are external and have no login.
```

---

## **PROMPT 12: SETTINGS, STORES AND TAX RATES**

```text
Design a Settings page with tabs: Store Profile (name, long name, address, mobile, phone, email, GSTIN, food license number, country, state, logo upload), Tax Rates (table of rate name with IGST, CGST, SGST and an add/edit dialog), Invoice & Receipt (numbering prefix, receipt footer text, paper size 58mm/80mm/A4, WhatsApp receipt toggle), WhatsApp Gateway (connection status, "Link device" QR code area, test message button), and Language. Include save bar, validation and success toast.
```

---

## **PROMPT 13: CUSTOMERS**

```text
Design the Customers page: search by name or mobile, table (Name, Mobile, GSTIN, State, total purchases, last visit, actions) and an Add/Edit Customer drawer (Name, Mobile, GSTIN optional, Country, State). Add a customer detail view with purchase history and a "Send WhatsApp message" shortcut.
```

---

## **PROMPT 14: SYSTEM STATES AND RESPONSIVE PACK**

```text
Using the same design system, create: (1) a 403 "You don't have permission" page, (2) a 404 page, (3) a session-expired dialog, (4) an offline/network-lost banner with "Retry", (5) a global loading skeleton for tables and dashboards, and (6) the mobile and tablet versions of the Dashboard, Product list and Invoice list (sidebar collapses into a hamburger drawer, tables become stacked cards).
```

---

## **TIPS FOR BETTER STITCH RESULTS**
- **One screen per prompt.** Long multi-screen prompts produce inconsistent results.
- **Keep the same project** so the Design System from Prompt 0 carries over.
- **Refine with short follow-ups**, for example: "Make the POS total larger", "Add a dark mode version", "Make the table denser".
- **Generate desktop first**, then ask for tablet and mobile variants.
- When happy, **export to Figma or copy the code**, and use the screens as the reference for `docs/DESIGN_GUIDELINES.md` in the master prompt.
