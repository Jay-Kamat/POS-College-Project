# API & Schema Versioning Strategy Specification: POS & Billing System

## 1. OpenWA Gateway API Versioning
All REST endpoints exposed by the NestJS WhatsApp gateway enforce explicit semantic URL path versioning:
```text
http://localhost:2785/api/v1/...
```
- **Breaking Changes:** Breaking modifications to payload schemas or response structures require publishing a new route prefix (`/api/v2/`). Deprecated endpoints remain supported for a minimum of one migration release cycle.

---

## 2. Cloud Firestore Schema Versioning (`SchemaVersion`)
Because Firestore is schema-less, schema evolution across active client versions requires proactive version stamping.

### 2.1 The `SchemaVersion` Field Invariant
Every document in every collection carries a root-level version attribute:
```json
{
  "SchemaVersion": 1,
  "Id": "INV-2627-000101",
  "Amount": 315.00
}
```

### 2.2 Backward Compatibility Rules
1. **Additive Changes:** New attributes added to collections must be optional or provide explicit fallback defaults in client code:
   ```javascript
   const customerGst = invoiceDoc.CustomerGst || null;
   ```
2. **Field Deprecations:** Fields are never immediately removed from documents. They are marked deprecated in `docs/DATABASE_SCHEMA.md` and retained as read-only.
3. **Renaming Fields:** Renaming a field requires dual-writing during the transition window:
   ```javascript
   const data = {
     StoreId: storeId,
     BranchId: storeId // Dual-write legacy alias during migration
   };
   ```

---

## 3. Data Migration Procedures
For major structural shifts (e.g., migrating from `SchemaVersion: 1` to `SchemaVersion: 2`):
- A standalone administrative migration script iterates through documents in batches of 500 using `runTransaction()` or batched writes:
```javascript
const q = query(collection(db, "Products"), where("SchemaVersion", "==", 1), limit(500));
const snapshot = await getDocs(q);
const batch = writeBatch(db);
snapshot.docs.forEach((doc) => {
  batch.update(doc.ref, {
    SchemaVersion: 2,
    NewAttribute: "DefaultValue",
    Updated: serverTimestamp()
  });
});
await batch.commit();
```
- Migration runs out of operational store hours with a rollback snapshot created prior to execution.
