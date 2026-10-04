# External Hardware & Services Integration Specification: POS & Billing System

## 1. Firebase Ecosystem Integration
- **Authentication:** Firebase Auth Web SDK v9 modular interface. Manages JWT bearer tokens with automatic client token refresh every 60 minutes.
- **Cloud Firestore:** Direct TLS connection using WebSockets (`webchannel`). Manages real-time data sync, transaction locking, and local IndexedDB offline cache.

---

## 2. WhatsApp Gateway (`OpenWA`) & Risk Analysis

### 2.1 Technical Integration Topology
- **Service:** NestJS backend wrapping `@whiskeysockets/baileys` or `whatsapp-web.js`.
- **API Port:** `2785` (REST endpoints for sending text messages).
- **Dashboard Port:** `2886` (Web UI for rendering QR pairing code and monitoring session state).
- **Session Persistence:** Auth keys and credentials are saved locally in the `auth_info_baileys/` directory.

### 2.2 Unofficial Library vs. WhatsApp Business Cloud API Risk Analysis
| Dimension | OpenWA (Unofficial Baileys / Web) | Meta Official Cloud API (Phase 2 Recommendation) |
| :--- | :--- | :--- |
| **Cost** | Zero message fee (Uses regular SIM phone plan) | Per-conversation messaging charge |
| **Setup** | Immediate QR code scan via store smartphone | Requires Meta Business Verification, WABA setup |
| **Account Ban Risk** | **High** if message velocity exceeds anti-spam rate limits | **Zero** ban risk for legitimate transactional receipts |
| **Session Stability** | Can disconnect if host phone turns off or loses internet | 99.9% Cloud SLA directly hosted by Meta |

### 2.3 Downtime & Rate Limiting Fallback Strategy
1. **Rate Throttling:** OpenWA enforces an artificial inter-message delay of 1,500ms to avoid automated spam triggers.
2. **Asynchronous Non-Blocking Execution:** Sending a WhatsApp receipt is executed strictly as a post-invoice background action. If OpenWA is unreachable, the invoice transaction commits normally in Firestore, and the UI displays a non-intrusive warning with a "Retry WhatsApp" button.

---

## 3. Hardware Peripheral Integrations

### 3.1 Barcode Scanners (HID Keyboard Wedge)
- **Interface:** USB or Bluetooth HID (Human Interface Device).
- **Protocol:** Scanners emulate high-speed keyboard typing terminating with an `Enter` (KeyCode 13 / `\n`) character.
- **Client Listener:** `POSUI` maintains a global key listener on the POS terminal. Barcode scan strings entered under 50ms are recognized as hardware scans and processed immediately without requiring manual mouse clicks into the search box.

### 3.2 Thermal Receipt Printers (58mm & 80mm)
- **Supported Standards:** ESC/POS command emulation.
- **Printing Pipeline:**
  - *Browser Direct Print:* `@react-pdf/renderer` or native window printing formatted with CSS media queries `@media print { width: 80mm; }`.
  - *USB Thermal Print:* Silent raw print dispatched via browser WebUSB API or local print daemon.

### 3.3 Barcode Label Printers
- **Standard:** TSC / Zebra (ZPL/EPL) or standard Windows GDI label printer (e.g., 50mm x 25mm 2-up sticker rolls).
- **Output:** Generated printable vector sheets from `MaterialInwardBarcodes` during inward processing.

---

## 4. Future Integrations (Phase 2 Roadmap)
- **Payment Terminals (EDC):** Direct API integration with PineLabs or Mosambic for auto-pushing billing totals to card swipe machines.
- **Tally / Zoho Books Export:** Daily CSV export summarizing GSTR-1 outward supplies for one-click ingestion into store accounting software.
