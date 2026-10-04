# Cookie & Local Storage Policy: POS & Billing System

## 1. Overview
The POS & Billing System (`POSUI`) is an enterprise operational tool. It does not employ advertising cookies, cross-site behavioral tracking beacons, or third-party marketing trackers. It strictly utilizes browser **Local Storage**, **Session Storage**, and **IndexedDB** for core application functionality.

---

## 2. Storage Technologies Employed

| Storage Type | Mechanism | Lifetime | Categorization | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Firebase Auth Session** | `IndexedDB` / `localStorage` | Persistent across browser restarts | **Strictly Necessary** | Preserves secure login authentication token (`onAuthStateChanged`) to prevent cashier lockout during active store shifts. |
| **Firestore Offline Cache** | `IndexedDB` (`firestore/[DEFAULT]/...`) | Persistent local cache | **Strictly Necessary** | Caches product catalog, tax rates, and active store settings to enable offline read capabilities and instant barcode search. |
| **POS Terminal Staged Cart** | `localStorage` / Redux Rehydrate | Session / Persistent | **Functional** | Protects current active terminal bucket state against accidental browser tab refresh or power interruption. |
| **UI Theme & Localization** | `localStorage` (`theme_mode`, `locale`) | Persistent | **Preferences** | Remembers cashier's light/dark mode preference and chosen display language (`en`, `hi`). |

---

## 3. Consent & Administrative Display
Because all local storage items are classified as **Strictly Necessary** or **Functional Operational Data** essential for point-of-sale terminal execution, external consumer tracking cookie banners are not required. An internal notification banner informs staff of local storage utilization for offline capability and security session retention.
