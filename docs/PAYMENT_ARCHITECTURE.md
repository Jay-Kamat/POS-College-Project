# Payment Architecture & Reconciliation Specification: POS & Billing System

## 1. Supported Payment Modalities
The system natively supports two payment modalities recorded in `InvoiceHeader.ModeOfPayment`:
- **`0` = Cash Payment**
- **`1` = UPI / Card Electronic Transfer**

---

## 2. Payment Modality Lifecycles

### 2.1 Mode 0: Cash Payment Flow
1. Cashier selects the "Cash" button on the terminal.
2. System computes and displays the rounded `GrandTotal`.
3. Cashier inputs the customer's tendered cash in `AmountReceived`.
4. The system validates: $\text{AmountReceived} \ge \text{GrandTotal}$.
5. The terminal calculates and displays change due in large green typography:
   $$\text{ChangeDue} = \text{AmountReceived} - \text{GrandTotal}$$
6. Cashier tenders the change and presses `F9` (Generate Invoice).
7. `IsPaymentReceived` is marked `true` immediately upon creation.

### 2.2 Mode 1: UPI / Electronic Transfer (Architecture Decision)
- **Architectural Decision: Manual Cashier Confirmation vs Gateway Sync**
  - **Phase 1 Decision:** The system generates a standard India BharatQR / UPI Intent QR string displayed on the cashier screen:
    ```text
    upi://pay?pa=storevpa@bank&pn=DailyMartExpress&am=623.00&tr=INV2627000101&cu=INR
    ```
  - The customer scans the QR with any standard UPI app (Google Pay, PhonePe, Paytm).
  - Cashier confirms visual verification on their store UPI soundbox or mobile notification.
  - Cashier toggles **"Mark payment received"** (`IsPaymentReceived = true`).
  - *Phase 2 Recommendation:* Direct webhooks from Razorpay POS or PineLabs EDC terminal for automated status flipping.

---

## 3. Split Payments & Policies
- **Split Payments Policy:** In Phase 1 MVP, split payments (e.g., paying ₹300 in cash and ₹323 in UPI for a ₹623 bill) are **Out of Scope** to keep checkout transactions simple and fast. An invoice is settled via a single chosen modality.

---

## 4. Pending & Failed Payment Handling
- **Held State:** If a UPI transfer is pending confirmation, the cashier uses `F8` to hold the bucket. The cart remains staged under `BucketHeader` without creating an invoice.
- **Abandoned Transactions:** If a customer payment fails and the customer departs, the staged bucket is cleared or soft-deleted (`RecordStatus = 1`). No invoice sequence number is burned.

---

## 5. Daily Payment Reconciliation
At the end of each operational shift, the Admin or Cashier runs the **Daily Sales Report** (`/apps/dailySales`):
- Total Cash Collections:
  $$\text{CashCollected} = \sum \text{InvoiceHeader.Amount} \quad [\text{where } \text{ModeOfPayment} == 0 \text{ and } \text{RecordStatus} == 0]$$
- Total UPI Collections:
  $$\text{UPICollected} = \sum \text{InvoiceHeader.Amount} \quad [\text{where } \text{ModeOfPayment} == 1 \text{ and } \text{RecordStatus} == 0]$$
- Cashiers reconcile physical register cash against `CashCollected` and verify the UPI bank account statement against `UPICollected`.
