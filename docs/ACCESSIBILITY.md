# Accessibility & Keyboard-First Architecture: POS & Billing System

## 1. Compliance Standard: WCAG 2.1 Level AA
The application is designed for rapid retail workflows where cashiers operate primarily using physical keyboards, numeric keypads, and barcode scanners, alongside tablet touchscreens.

---

## 2. Keyboard-First POS Terminal Architecture

### 2.1 Scanner Focus Trap & Key Event Interceptor
- **Focus Invariant:** The barcode input (`#pos-barcode-search`) is auto-focused on initial page render and immediately regains focus after modal closures, cart updates, or customer selects.
- **Scanner Event Discrimination:** The system distinguishes between manual human keyboard entry and automated barcode laser scanner bursts by evaluating inter-keystroke intervals ($< 45\text{ ms}$ between sequential keydown events signifies a hardware scanner).

### 2.2 Global Keyboard Shortcuts Matrix
| Key Binding | Scope | Action |
| :--- | :--- | :--- |
| **`F2`** | Global / Terminal | Instantly jumps focus to Barcode Search Input. |
| **`F4`** | Terminal | Focuses Customer Mobile Lookup input. |
| **`F8`** | Terminal | Holds current active bucket and switches to next queue tab. |
| **`F9`** | Terminal | Triggers Payment Confirmation & Invoice Generation. |
| **`Esc`** | Global | Closes open dialogs, drawers, or clears search buffer. |
| **`+` / `-`** | Cart Grid | Increments or decrements quantity of the currently focused line item. |
| **`Del`** | Cart Grid | Removes the focused line item from the cart. |

---

## 3. Visual & Tactile Accessibility Standards
- **Color Contrast:** All text tokens adhere strictly to WCAG AA minimum contrast ratio of `4.5:1` against their backgrounds (`#1F2937` against `#FFFFFF` yields `13.5:1`; primary button `#3B5BDB` against white yields `5.2:1`).
- **Focus Rings:** Visible, high-contrast focus rings: `outline: 2px solid #3B5BDB; outline-offset: 2px;`. Focus outlines are never globally suppressed.
- **Touch Target Sizing:** In accordance with mobile and tablet touch standards, all interactive buttons, steppers, and product cards feature a minimum touch target size of **$44 \times 44\text{ px}$**.
- **ARIA Semantics:**
  - Cart line items are marked with `role="listitem"` and dynamic live announcements `aria-live="polite"` when items are scanned into the cart.
  - Dialogs implement `role="dialog"`, `aria-modal="true"`, and enforce focus traps while open.
