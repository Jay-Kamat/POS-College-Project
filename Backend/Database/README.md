# PostgreSQL Database Migrations & Schema

This directory contains the database migration scripts and schema definitions for the **POS & Billing System** targeting **PostgreSQL** (`pos_billing_db`).

---

## 📁 File Locations

| File | Path | Description |
| :--- | :--- | :--- |
| **Migration 001** | [`Backend/Database/Migrations/001_initial_schema.sql`](file:///d:/Pos%20Clg%20Project/Backend/Database/Migrations/001_initial_schema.sql) | Creates all 13 relational tables, primary keys, foreign keys, and indexes (`stores`, `categories`, `tax_rates`, `products`, `customers`, `vendors`, `purchase_orders`, `material_inward`, `return_reasons`, `material_returns`, `staged_buckets`, `invoices`, `users`, `permissions_matrix`). |
| **Migration 002** | [`Backend/Database/Migrations/002_seed_data.sql`](file:///d:/Pos%20Clg%20Project/Backend/Database/Migrations/002_seed_data.sql) | Seeds initial master data (Store profile, categories, GST slabs, products & starting stock, customers, vendors, return reasons, purchase orders, material inwards, invoices, default accounts, and 12-module permissions matrix). |
| **Consolidated SQL** | [`Backend/Database/schema_full.sql`](file:///d:/Pos%20Clg%20Project/Backend/Database/schema_full.sql) | All-in-one script containing the complete DDL schema + initial seed data. Ideal for one-click manual import via pgAdmin, DBeaver, or `psql`. |
| **Migrator Service** | [`Backend/Database/DatabaseMigrator.cs`](file:///d:/Pos%20Clg%20Project/Backend/Database/DatabaseMigrator.cs) | C# automated runner registered in `Program.cs`. Discovers `.sql` files and executes unapplied migrations on `dotnet run`. |

---

## 🚀 How Migrations Are Executed

### 1. Automatic Execution (Default)
When you start the backend:
```powershell
cd Backend
dotnet run
```
The [`DatabaseMigrator`](file:///d:/Pos%20Clg%20Project/Backend/Database/DatabaseMigrator.cs) automatically:
1. Connects to PostgreSQL and verifies if `pos_billing_db` exists; creates it if missing.
2. Checks the `__migrations_history` table in PostgreSQL.
3. Automatically executes any unapplied `.sql` migration files in chronological order inside a transaction.
4. Logs progress directly to the console:
   ```text
   info: PosBackend.Database.DatabaseMigrator[0]
         [DatabaseMigrator] Database 'pos_billing_db' is available and ready.
   info: PosBackend.Database.DatabaseMigrator[0]
         [DatabaseMigrator] Executing migration: 001_initial_schema.sql
   info: PosBackend.Database.DatabaseMigrator[0]
         [DatabaseMigrator] Successfully applied migration: 001_initial_schema.sql
   info: PosBackend.Database.DatabaseMigrator[0]
         [DatabaseMigrator] Database schema and migrations are completely up to date.
   ```

---

### 2. Manual Execution via psql CLI
If you prefer running the scripts manually using the PostgreSQL command line:

```powershell
# 1. Connect to PostgreSQL and create database (if not exists)
psql -U postgres -c "CREATE DATABASE pos_billing_db;"

# 2. Run initial schema migration
psql -U postgres -d pos_billing_db -f "Backend/Database/Migrations/001_initial_schema.sql"

# 3. Run seed data migration
psql -U postgres -d pos_billing_db -f "Backend/Database/Migrations/002_seed_data.sql"
```

Or run the combined script in one command:
```powershell
psql -U postgres -d pos_billing_db -f "Backend/Database/schema_full.sql"
```

---

### 3. Manual Execution via pgAdmin / DBeaver
1. Open pgAdmin or DBeaver and connect to `localhost:5432`.
2. Select database `pos_billing_db`.
3. Open Query Tool / SQL Editor.
4. Open and execute [`Backend/Database/schema_full.sql`](file:///d:/Pos%20Clg%20Project/Backend/Database/schema_full.sql).
