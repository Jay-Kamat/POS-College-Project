# Design System & UI/UX Guidelines: POS & Billing System

## 1. Design Philosophy & Foundations
The design system builds upon Material UI (MUI v5) and the Mantis Admin Dashboard aesthetic. It is engineered specifically for fast-paced retail and supermarket checkout environments: high contrast, zero cognitive clutter, tactile touch controls, and sub-second visual scanning.

### 1.1 Color Tokens
- **Brand Primary:** `#3B5BDB` (Indigo Blue - Primary actions, active nav, primary buttons)
- **Brand Secondary:** `#12B886` (Teal - Badges, accents, highlights)
- **Success:** `#2F9E44` (Forest Green - Completed transactions, Paid status, active badges)
- **Warning:** `#F59F00` (Amber - Expiring batches, pending payments, hold cart tabs)
- **Error / Danger:** `#E03131` (Crimson - Expired stock, cancelled invoices, delete actions)
- **Info:** `#1C7ED6` (Sky Blue - Information callouts, notifications)
- **Backgrounds:**
  - Page Canvas: `#F5F7FB`
  - Card & Container Surface: `#FFFFFF`
  - Table Header Fill: `#F8FAFC`
- **Borders & Dividers:** `#E3E8EF` (1px subtle border rule)
- **Typography Colors:**
  - Primary Text: `#1F2937`
  - Muted / Secondary Text: `#6B7280`
  - Inverted / Button Text: `#FFFFFF`

### 1.2 Typography
- **Font Family:** `Inter`, `Public Sans`, sans-serif
- **Scale:**
  - Page Titles: `24px` semibold (`600`), line height `1.25`
  - Section Titles: `18px` semibold (`600`)
  - Body Text: `14px` regular (`400`), line height `1.5`
  - Table & Data Grid Text: `13px` regular (`400`)
  - POS Grand Totals: `32px` bold (`700`) (High-visibility for cashier/customer)
  - Badge / Chip Text: `11px` uppercase bold (`700`)

### 1.3 Spacing & Elevation Grid
- Base unit: `8px` grid.
- Border Radii: `10px` for cards, dialogs, inputs, and button containers; `6px` for small status chips.
- Elevation: Flat aesthetic with subtle elevation: `box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.04)`.

---

## 2. Component Design Specifications

### 2.1 Status Chips
| State | Background | Text Color | Example Usage |
| :--- | :--- | :--- | :--- |
| **Active / Paid** | `#EBFBEE` | `#2F9E44` | Normal Products, Paid Invoices |
| **Deleted / Cancelled**| `#FFF5F5` | `#E03131` | Soft-deleted records, Cancelled Invoices |
| **Pending / Hold** | `#FFF9DB` | `#F59F00` | Unsettled UPI, Held Buckets |
| **Expiring Soon** | `#FFF9DB` | `#D9480F` | Shelf life remaining < 7 days |
| **Expired** | `#FFE3E3` | `#C92A2A` | Past expiry batches (Blocked from checkout) |

### 2.2 Tables & Data Grids
- Sticky headers (`top: 0`, `z-index: 2`, background `#F8FAFC`).
- Sticky first column (Entity ID/Name) and sticky last column (Action buttons).
- Alternating row hover: `#F1F5F9`.
- Integrated pagination: 10, 25, 50, 100 rows per page.
- Export to CSV button integrated in the table filter header bar.

---

## 3. High-Priority Screen: The POS Terminal (Bucket)
The POS Terminal (`/apps/bucket` and `/apps/newbucket`) is the core operational hub.

```text
+----------------------------------------------------------------------------------------------------+
| STORE: DailyMart Express | Cashier: Jay (Admin) | BKT-01 [Held Tabs: BKT-02 | BKT-03] | [New Bucket] |
+---------------------------------------------------+------------------------------------------------+
| LEFT PANEL (60%): PRODUCT DISCOVERY               | RIGHT PANEL (40%): CART & BILLING              |
| [ Barcode / Search Input (Auto-focused - F2)    ] | [ Customer Mobile [9876543210]  Lookup: Jay S. ]
| [ All ] [ Beverages ] [ Bakery ] [ Dairy ] [...]  +------------------------------------------------+
| +-----------------------------------------------+ | CART ITEMS:                                    |
| | [Card: Milk 500ml]  ₹30.00  Stock: 45         | | 1. Milk 500ml      [-] 2 [+]  ₹30.00   ₹60.00 [x]|
| | [Card: Cold Coffee] ₹45.00  Stock: 12         | | 2. Cold Coffee     [-] 1 [+]  ₹45.00   ₹45.00 [x]|
| | [Card: Basmati 1kg] ₹80.00  Stock: 80         | +------------------------------------------------+
| | [Card: Bread Loaf]  ₹40.00  Stock: 10         | | Subtotal: ₹105.00                              |
| +-----------------------------------------------+ | CGST (2.5%): ₹2.63  | SGST (2.5%): ₹2.63        |
|                                                   | Round-off: -₹0.26                              |
|                                                   | GRAND TOTAL: ₹110.00                           |
|                                                   +------------------------------------------------+
|                                                   | PAYMENT MODE: [ CASH ]  [  UPI  ]              |
|                                                   | Cash Received: [ ₹200.00 ] Change Due: ₹90.00  |
|                                                   | [ Hold (F8) ] [ Clear ] [ GENERATE INVOICE F9 ]|
+---------------------------------------------------+------------------------------------------------+
```

### Key Keyboard Shortcuts
- **`F2`**: Focus barcode scanner / product search input.
- **`F8`**: Hold current bucket and open fresh tab.
- **`F9`**: Trigger final invoice checkout and payment confirmation.
- **`Escape`**: Dismiss modal dialogs or clear scanner buffer.

---

## 4. UI States Pattern: Loading, Empty, and Error
Every data-driven page and widget implements three explicit states:
1. **Loading State:** Shimmering skeleton loaders (`MUI Skeleton`) matching the expected card or table rows. Never show a blank screen or plain spinner.
2. **Empty State:** Curated SVG illustration, friendly title (e.g., "No Invoices Found"), explanatory subtitle, and a primary CTA button (e.g., "Create New Bill").
3. **Error State:** In-place banner alert (`MUI Alert severity="error"`) with error message and a "Retry Action" button.

---

## 5. Localization & Formatting (`react-intl`)
All user-facing numeric and monetary strings adhere strictly to Indian standards:
- **Currency:** Indian Rupee symbol `₹`, formatted with the Indian numbering grouping system (`₹1,25,000.50` instead of Western `₹125,000.50`).
- **Dates & Times:** `DD/MM/YYYY, hh:mm A` (e.g., `04/10/2026, 07:45 PM`).
- **Translations:** All text wrapped in `<FormattedMessage id="..." />` with locale resource bundles in `src/locales/en.json` (expandable to Hindi, Marathi, etc.).
