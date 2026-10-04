# Backup, Disaster Recovery & Business Continuity Specification: POS & Billing System

## 1. Disaster Recovery Objectives (RPO & RTO)
- **Recovery Point Objective (RPO):** Maximum acceptable data loss window is **$< 15\text{ minutes}$**.
- **Recovery Time Objective (RTO):** Maximum allowable system downtime to resume basic retail POS billing is **$< 30\text{ minutes}$**.

---

## 2. Cloud Firestore Backup Strategy

### 2.1 Point-in-Time Recovery (PITR)
- **Google Cloud PITR:** Enabled in Firebase project settings. Retains continuous transaction logs allowing restoration of Firestore state to any specific second over the preceding **7 days**.

### 2.2 Scheduled Daily Exports to Google Cloud Storage (GCS)
- **Execution:** Automated Cloud Scheduler job triggering Cloud Function to export all collections to a cold-line GCS bucket (`gs://pos-billing-prod-backups/`).
- **Schedule:** Every 24 hours at 02:00 AM IST.
- **Retention:** Daily backups retained for 90 days; monthly compliance archives retained for 6 years (72 months for Indian GST audit compliance).
- **CLI Export Command:**
  ```bash
  gcloud firestore export gs://pos-billing-prod-backups/$(date +%Y%m%d) \
    --project=pos-billing-prod
  ```

---

## 3. Restoration Runbook

### 3.1 Restoring Firestore from GCS Export
In the event of accidental database corruption or malicious deletion:
```bash
# Import database snapshot to a staging recovery database first
gcloud firestore import gs://pos-billing-prod-backups/20261004/ \
  --project=pos-billing-prod
```

### 3.2 Firebase Auth User Account Backup & Restoration
- Export all user accounts, password hashes, and provider UIDs:
  ```bash
  firebase auth:export users_backup.json --format=json --project=pos-billing-prod
  ```
- Re-import users to a fresh or restored project:
  ```bash
  firebase auth:import users_backup.json --hash-algo=SCRYPT ...
  ```

---

## 4. OpenWA Local Session Disaster Recovery
If the local machine hosting OpenWA experiences a disk failure or corrupts the WhatsApp session:
1. Re-install OpenWA dependencies: `npm install`.
2. Delete the corrupt `auth_info_baileys/` folder.
3. Start OpenWA: `npm run start:prod`.
4. Store manager navigates to `http://localhost:2886`.
5. Re-scan the generated QR code using the store WhatsApp phone (*Linked Devices -> Link a Device*).
6. Gateway resumes live messaging operations immediately.

---

## 5. Annual Disaster Recovery Drill
- Every 6 months, the technical team performs a restoration drill in the staging environment (`pos-billing-stage`), verifying that historical invoices, tax totals, and customer records can be restored from cold storage in under 30 minutes without data loss.
