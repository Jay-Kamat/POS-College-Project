# Responsive Design & Multi-Device Breakpoints: POS & Billing System

## 1. Supported Viewports & Breakpoints
The application accommodates four primary device form factors:
- **Desktop / High-Res POS (1440px+):** Multi-pane layouts, sticky data tables, split POS view.
- **Laptop / Standard Terminal (1024px – 1439px):** Standard cashier touch terminals.
- **Tablet Landscape & Portrait (768px – 1023px):** Mobile manager tablets and handheld billing devices.
- **Mobile (320px – 767px):** Manager status checks, supervisor invoice approvals, and responsive fallback.

---

## 2. POS Terminal Responsive Adaptations

### 2.1 Desktop & Laptop Viewports ($\ge 1024\text{px}$)
- **Split Layout:** 60% Left pane (Search, category chips, scrollable product grid) and 40% Right pane (Customer details, sticky cart line items, tax summary, big totals, and payment actions).
- **Collapsible Rail:** Sidebar auto-collapses to an icon-only slim rail to maximize cashier terminal screen real estate.

### 2.2 Tablet Landscape Viewports ($768\text{px} - 1023\text{px}$)
- **Balanced Split:** 50% Product catalog and 50% Cart.
- **Touch-Friendly Controls:** Stepper buttons expand to $48\text{px}$, category chips support horizontal touch swiping.
- **Virtual Keypad:** Floating touch numpad available for rapid manual quantity and price overrides.

### 2.3 Mobile & Small Handheld Viewports ($< 768\text{px}$)
- **Single Column with Persistent Bottom Sheet:**
  - Full screen shows product catalog and barcode scanner.
  - Floating sticky bottom pill displays: `Cart: 4 Items | ₹315.00 [View Cart]`.
  - Tapping opens a swipeable bottom sheet drawer revealing customer info, cart items, and payment buttons.

---

## 3. Data Table Responsive Behavior
- **Desktop/Tablet:** Full sticky-column paginated table with horizontal scroll for extra columns.
- **Mobile:** Data tables transform automatically into stacked card lists:
  - Each invoice or product displays as a card with key badges (Status, Amount, Date) and a 3-dot dropdown menu for actions (View, PDF, Cancel).
