# Backup, Disaster Recovery & Business Continuity Specification: POS & Billing System

## 1. Disaster Recovery Objectives (RPO & RTO)
- **Recovery Point Objective (RPO):** Maximum acceptable transactional data loss is **$< 15\text{ minutes}$**.
- **Recovery Time Objective (RTO):** Maximum allowable downtime to restore store billing operations is **$< 30\text{ minutes}$**.

---

## 2. PostgreSQL Backup Strategy

### 2.1 Automated Daily Snapshots (`pg_dump`)
- **Schedule:** Automated cron/scheduled task runs daily at 02:00 AM IST.
- **Format:** Custom directory/compressed binary format (`-F c`) with maximum compression.
- **Execution Command:**
  ```bash
  pg_dump -h localhost -p 5432 -U postgres -F c -b -v \
    -f "/backups/pos_billing_$(date +%Y%m%d_%H%M%S).dump" pos_billing_db
  ```
- **Storage & Encryption:** Backup dumps are encrypted using AES-256 and synchronized to secure off-site object storage (S3/GCS bucket).
- **Retention Schedule:**
  - Daily snapshots retained for **30 days**.
  - Monthly financial snapshots retained for **6 years (72 months)** to comply with Indian GST legal audit regulations.

### 2.2 Continuous Write-Ahead Log (WAL) Archiving & PITR
- In production, PostgreSQL WAL archiving (`archive_mode = on`, `archive_command`) is enabled.
- Allows Point-in-Time Recovery to any specific second within the last 7 days, eliminating catastrophic transaction loss.

---

## 3. Restoration Runbook

### 3.1 Restoring Database from `pg_dump` to Scratch Database
In the event of database corruption, data loss, or routine disaster recovery testing:

```bash
# 1. Create isolated scratch database
createdb -h localhost -p 5432 -U postgres pos_billing_scratch

# 2. Restore schema and data using pg_restore
pg_restore -h localhost -p 5432 -U postgres -d pos_billing_scratch -v \
  "/backups/pos_billing_latest.dump"

# 3. Execute integrity verification checks
psql -h localhost -p 5432 -U postgres -d pos_billing_scratch -c \
  "SELECT count(*) AS total_invoices, sum(amount) AS gross_sales FROM invoices WHERE record_status = 0;"
psql -h localhost -p 5432 -U postgres -d pos_billing_scratch -c \
  "SELECT count(*) AS total_batches, sum(quantity_available) AS total_stock FROM stock_batches;"

# 4. Swap database or point backend connection pool to restored instance
```

---

## 4. OpenWA Local Session Disaster Recovery
The OpenWA gateway maintains WhatsApp authentication socket tokens inside a persistent Docker volume (`openwa_session` mapped to `/app/auth_info_baileys`).
1. **Volume Backup:** The `openwa_session` directory is backed up weekly.
2. **Session Desynchronization Recovery:**
   - If WhatsApp Web drops session or the phone is unlinked:
   - Navigate to the local pairing dashboard at `http://localhost:2886`.
   - Scan the rendered QR code with the store phone (*Linked Devices -> Link a Device*).
   - The gateway automatically re-authenticates and drains pending receipts from the backend `whatsapp_outbox` queue.

---

## 5. Routine Disaster Recovery Drill
Every 6 months, the engineering team executes a blind restore drill into a staging scratch database, asserting:
1. Restoration completes within the 30-minute RTO.
2. Checksums of financial amounts match pre-backup values.
3. Inventory ledger invariant holds: `SUM(stock_ledger.quantity_delta) == SUM(stock_batches.quantity_available)`.
