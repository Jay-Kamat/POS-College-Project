# DailyMart POS & GST Billing System

A high-performance, enterprise-grade Point of Sale (POS) and inventory management platform tailored for Indian retail supermarkets, grocery chains, and department stores.

Built with **React 18 + Vite + Material UI (MUI)**, **ASP.NET Core .NET 10 + Dapper + Npgsql**, **PostgreSQL 16/18**, and **OpenWA (Node.js + Baileys)**.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │    DailyMart POS UI (React 18)       │
                      │  Port 3000 / Nginx Reverse Proxy     │
                      └──────────────────┬───────────────────┘
                                         │ Bearer JWT / REST
                                         ▼
                      ┌──────────────────────────────────────┐
                      │    PosBackend (.NET 10 ASP.NET Core) │
                      │  Dapper ORM + Npgsql + BCrypt Auth   │
                      │  Port 5000                           │
                      └──────────┬───────────────────┬───────┘
                                 │                   │
                 SQL Transactions│                   │ WhatsApp Outbox
                 (FEFO / RowLock)│                   │ Webhooks
                                 ▼                   ▼
      ┌─────────────────────────────────┐   ┌────────────────────────────────┐
      │   PostgreSQL (pos_billing_db)   │   │  OpenWA Gateway (Baileys)      │
      │   Port 5432                     │   │  Multi-device WebSocket        │
      │   - Gapless document sequences  │   │  Port 2785                     │
      │   - FEFO stock batch ledger     │   └────────────────────────────────┘
      │   - Immutable stock movements   │
      │   - Audit logs & Outbox queue   │
      └─────────────────────────────────┘
```

---

## Key Features

1. **Transactional Checkout & Concurrency Safety**:
   - Stock rows locked during checkout (`SELECT ... FOR UPDATE`).
   - Server-side tax and discount recalculation (never trusts client rates).
   - Instant HTTP 409 Conflict if stock is insufficient or concurrent checkouts compete for the last unit.
2. **Gapless Document Numbering**:
   - Atomic sequence allocation (`document_sequences` table with `UPDATE ... RETURNING`).
   - Automatic financial year rollover on 1 April (`INV-2627-000001`, `GRN-2627-000001`, `MRN-2627-000001`).
3. **FEFO Inventory & Stock Batches**:
   - First-Expired, First-Out automatic batch deduction on checkout.
   - Exact batch restoration on invoice cancellation.
   - Comprehensive expired and near-expiry stock reporting.
4. **Production Authentication & Granular RBAC**:
   - BCrypt hashed passwords with 11 work factor rounds.
   - Brute-force account lockout (15 minutes after 5 consecutive failed attempts).
   - Cryptographic JWT access tokens and rotatable refresh tokens.
   - Dynamic permissions matrix table scoping endpoints by role and store tenant.
5. **Resilient WhatsApp Outbox**:
   - WhatsApp message queue table ensures receipt sharing never blocks checkout.

---

## Default Seed Credentials

| Role | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@dailymart.in` | `Admin@Pass123` | Full access across all stores and modules |
| **Manager** | `manager.mumbai@dailymart.in` | `Manager@Pass123` | Store-level reports, inventory, and staff |
| **Cashier** | `cashier1@dailymart.in` | `Cashier@Pass123` | POS Billing Terminal and Customer Search |
| **Inventory** | `inventory@dailymart.in` | `Inventory@Pass123` | Inwarding (GRN), POs, and Vendor Returns |

---

## Local Setup & Quick Start

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+ / 22+](https://nodejs.org/)
- [PostgreSQL 16+ or 18](https://www.postgresql.org/download/)

### 1. Database Initialization
Create database and apply migrations:
```powershell
# In PostgreSQL
CREATE DATABASE pos_billing_db;

# Apply full base schema and migrations
psql -U postgres -d pos_billing_db -f Backend/Database/schema_full.sql
psql -U postgres -d pos_billing_db -f Backend/Database/Migrations/005_production_schema_and_fefo.sql
```

### 2. Launch All Services (Local Development)
Run the automated launcher script from the repository root:
```powershell
.\run-all.ps1
```
This concurrently boots:
- **Backend API**: `http://localhost:5000` (Swagger UI at `/swagger`)
- **POSUI Frontend**: `http://localhost:3000`
- **OpenWA Gateway**: `http://localhost:2785`

---

## Docker Deployment (Production)

To run the complete production stack with Docker Compose:

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Build and launch all containerized services
docker-compose up -d --build

# 3. Verify health status
docker-compose ps
```

Container endpoints:
- **POSUI Application**: `http://localhost:3000`
- **Backend Web API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`
- **OpenWA Gateway**: `http://localhost:2785`

---

## Backup & Disaster Recovery

### Create Scheduled Backup
Execute the automated backup PowerShell script:
```powershell
.\scripts\backup.ps1
```
Backups are saved to `backups/pos_billing_backup_YYYYMMDD_HHmmss.dump`.

### Restore from Backup
To restore a snapshot:
```powershell
.\scripts\restore.ps1 -BackupFile "backups\pos_billing_backup_20261020_210000.dump"
```

---

## Automated Test Suites

### 1. Backend Unit & Integration Tests (xUnit)
Runs GST slab calculations, financial year sequence rollovers, FEFO sorting, and real PostgreSQL concurrent checkout race condition tests:
```powershell
dotnet test Backend.Tests/Backend.Tests.csproj --logger "console;verbosity=normal"
```

### 2. Frontend Unit Tests (Node native test runner)
Tests pure cart calculation, item discounts, intra/inter-state tax splitting, and roundoff:
```powershell
cd POSUI
npm test
```

### 3. End-to-End Test Suite (Playwright)
Executes full user login, Cashier RBAC blocking, POS terminal carting, Hold/Resume bucket, Cash checkout, UPI checkout, Cancel invoice with stock restoration, PO -> GRN -> MRN, and Reports sales verification:
```powershell
cd POSUI
npm run test:e2e
```

### 4. Continuous Integration (GitHub Actions)
All automated tests run on every push and pull request via `.github/workflows/ci.yml`.
