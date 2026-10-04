# Performance Optimization & Quota Control Specification: POS & Billing System

## 1. Key Performance Indicators (KPI Targets)

| Operation | Performance Target (95th Percentile) | Measurement Mechanism |
| :--- | :--- | :--- |
| **Initial App Load (Warm)** | $< 1.2\text{ seconds}$ | Chrome Lighthouse / Performance Observer |
| **Barcode Scan-to-Cart Addition** | **$< 80\text{ milliseconds}$** | Redux middleware dispatch benchmark |
| **Product Search (In-Memory Filter)**| $< 50\text{ milliseconds}$ | Debounced keystroke input hook |
| **Bucket-to-Invoice Transaction**| $< 800\text{ milliseconds}$ | Firestore transaction roundtrip |
| **WhatsApp Receipt Dispatch** | $< 2.0\text{ seconds}$ | OpenWA HTTP response latency |

---

## 2. Firestore Read Optimization & Cost Controls

### 2.1 In-Memory Caching of Static Masters
Master collections (`TaxRates`, `ProductCategory`, `Stores`) are fetched once upon app initialization and cached in Redux. Subsequent page navigations consume zero Firestore reads.

### 2.2 Cursor-Based Pagination (`startAfter`)
All data tables (Invoices, Products, Inward History) utilize strict cursor-based pagination:
```javascript
const q = query(
  collection(db, "InvoiceHeader"),
  where("RecordStatus", "==", 0),
  orderBy("Date", "desc"),
  startAfter(lastVisibleDoc),
  limit(25)
);
```
Offset-based pagination (`skip`) is forbidden, as Firestore charges reads for skipped documents.

### 2.3 Real-Time Listener Cleanup
To prevent memory leaks and zombie reads, all `onSnapshot` listeners must return their cleanup unsubscribe function inside React `useEffect`:
```javascript
useEffect(() => {
  const unsubscribe = subscribeToActiveBuckets(storeId, (buckets) => {
    dispatch(setBuckets(buckets));
  });
  return () => unsubscribe(); // Critical cleanup
}, [storeId, dispatch]);
```

---

## 3. Reporting Query Optimization (Daily Aggregations)
- **Problem:** Aggregating thousands of individual `InvoiceHeader` and `InvoiceDetails` documents on the fly to render a monthly sales graph generates massive read volume.
- **Optimization Strategy:**
  - Create a lightweight rollup collection: `/DailySalesSummary/{storeId_YYYYMMDD}`
  - Schema: `Date`, `TotalInvoices`, `CashTotal`, `UpiTotal`, `TaxTotal`, `GrossTotal`.
  - When an invoice is created, update the daily summary rollup using an atomic increment (`increment(amount)`).
  - Reports query 30 rollup documents instead of 5,000 raw invoices, reducing read costs by 99.4%.

---

## 4. Code Splitting & Bundle Optimization
- **Route-Based Lazy Loading:** Heavy administrative modules (Reports, ApexCharts, `@react-pdf/renderer`) are dynamically imported via `React.lazy()`:
```javascript
const ReportsHub = React.lazy(() => import('../pages/apps/reports'));
const InvoicePdf = React.lazy(() => import('../components/InvoicePdf'));
```
- **Bundle Target:** Initial entry bundle size kept $< 350\text{ KB}$ gzipped.
