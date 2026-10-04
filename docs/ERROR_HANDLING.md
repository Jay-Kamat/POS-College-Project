# Error Handling & Fault Tolerance Specification: POS & Billing System

## 1. Unified Error Handling Architecture
All service layer calls (`src/_api/`) normalize underlying platform exceptions into standardized application errors mapped to user-friendly localization keys.

---

## 2. Error Category Mapping Matrix

| Platform Error Code | Cause / Trigger | User-Friendly Message (`react-intl`) | System Recovery Action |
| :--- | :--- | :--- | :--- |
| **`auth/wrong-password`** | Incorrect password entered. | `error.auth.invalid_credentials` ("Invalid email or password.") | Clear password field; retain email. |
| **`auth/user-not-found`** | Unregistered account. | `error.auth.user_not_found` ("Account not found.") | Prompt user to verify email address. |
| **`permission-denied`** | Blocked by `firestore.rules`. | `error.rbac.denied` ("You do not have permission to perform this action.") | Log security audit event; redirect to 403 screen. |
| **`unavailable`** | Cloud Firestore service offline. | `error.db.unavailable` ("Cloud database temporarily unreachable. Working offline.") | Activate IndexedDB offline fallback queue. |
| **`resource-exhausted`** | Firestore quota exceeded. | `error.db.quota` ("System traffic limit reached. Please contact support.") | Display error alert banner; alert Admin. |
| **`failed-precondition`** | Missing composite index. | `error.db.index_missing` ("Query requires index optimization.") | Log missing index URL to dev console for deployment. |
| **`aborted` / Transaction Conflict** | Concurrent invoice creation collision. | `error.tx.retry` ("Transaction collision detected. Retrying...") | Automatic SDK retry (up to 5 attempts); re-read counter. |
| **OpenWA `ECONNREFUSED`** | Gateway daemon not running on :2785. | `warning.wa.unreachable` ("WhatsApp service offline. Receipt saved for manual sharing.") | Display amber warning toast; offer retry button. |
| **OpenWA `SESSION_DISCONNECTED`** | WhatsApp web session unpaired. | `warning.wa.disconnected` ("WhatsApp disconnected. Scan QR code in Settings.") | Flag receipt status as unsent; continue billing. |
| **Network `OFFLINE`** | Browser loses internet connectivity. | `warning.network.offline` ("Network connection lost. Changes cached locally.") | Display ambient top bar warning banner. |

---

## 3. Transaction Resilience & Retry Protocol
When executing atomic invoice creation:
```javascript
import { runTransaction } from "firebase/firestore";

export const executeInvoiceTransaction = async (txOperations) => {
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    try {
      return await runTransaction(db, async (transaction) => {
        return await txOperations(transaction);
      });
    } catch (err) {
      attempts++;
      if (err.code === "aborted" || err.code === "failed-precondition") {
        console.warn(`Transaction contention attempt ${attempts}, retrying...`);
        await new Promise((res) => setTimeout(res, 200 * attempts));
      } else {
        throw err;
      }
    }
  }
  throw new Error("ERR_TX_CONCURRENCY_TIMEOUT");
};
```

---

## 4. UI Error Presentation Patterns
1. **Form Input Errors:** Inline red helper text positioned directly below the offending input (`MUI FormHelperText error`).
2. **Actionable Toast Errors:** Floating top-right snackbar (`MUI Snackbar`) featuring auto-dismiss after 6 seconds with an explicit "Dismiss" button.
3. **Fatal / Blocking Errors:** Full-page error boundary card with illustration, diagnostic reference ID, and a "Reload System" button.
