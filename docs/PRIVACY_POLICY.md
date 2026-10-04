# Privacy Policy (Template - Subject to Legal Review)
**Reference Framework:** Digital Personal Data Protection Act, 2023 (India) (DPDP Act)  
**Effective Date:** October 2026  
**Application:** POS & Billing System

> **DISCLAIMER:** This document is an architectural privacy template detailing technical data collection mechanisms. It must undergo formal review and customization by qualified legal counsel prior to commercial retail deployment.

---

## 1. Data Collected
The POS & Billing System collects and processes personal and business data strictly necessary for retail point-of-sale operations, tax compliance, and receipt delivery:

### 1.1 Staff & Operator Data
- **Identifiers:** Staff full name, corporate email address, Firebase Auth UID, assigned role (`Admin`, `Cashier`, `Inventory Manager`).
- **Audit Logs:** Timestamps of system access, record creation, invoice cancellations, and modification history (`CreatedId`, `UpdatedId`).

### 1.2 Customer Data
- **Billing Details:** Customer full name, 10-digit mobile phone number, State/Province.
- **Tax Identifiers:** Goods and Services Tax Identification Number (GSTIN) for B2B commercial tax invoices.
- **Transaction History:** Itemized records of purchased goods, transaction amounts, payment modalities (Cash/UPI), and timestamped invoice copies.

### 1.3 Communication Data
- Digital WhatsApp receipt transmission logs, delivery status receipts, and customer contact phone numbers.

---

## 2. Purpose of Data Processing
Personal and commercial transaction data is processed exclusively for:
1. Generating legally valid GST tax invoices pursuant to the Central Goods and Services Tax (CGST) Act, 2017.
2. Delivering electronic purchase receipts via WhatsApp upon customer request (`IsShareReceiptThroughSms`).
3. Internal audit logging and prevention of cashier fraud or unauthorized inventory shrinkage.
4. Facilitating customer support, warranty verification, and store product recall operations.

---

## 3. Data Storage, Hosting, and Security
- **Cloud Infrastructure:** All database documents and transactional records are securely stored within **Google Cloud Firestore** (multi-region or Asia-South1 / Mumbai data residency configuration).
- **Encryption:** Data in transit is protected using Transport Layer Security (TLS 1.3). Data at rest is encrypted using AES-256 via Google Cloud standard key management.
- **Local Gateway:** The WhatsApp messaging engine (`OpenWA`) runs within the local store network environment and does not transmit customer data to third-party marketing brokers.

---

## 4. Third-Party Data Processors
The system interfaces with the following service providers:
- **Google Cloud Platform / Firebase:** Identity authentication and database hosting.
- **Meta / WhatsApp Platform:** Protocol carrier for the delivery of requested digital receipts.

---

## 5. Retention Period
- **Tax Compliance Records:** In accordance with Indian statutory requirements under the GST Act, sales invoice records and associated customer tax data are retained for a minimum mandatory statutory period of **72 months (6 years)** from the due date of filing the relevant annual return.
- **Staged Carts (Buckets):** Unconverted or discarded carts are soft-deleted or cleared periodically.

---

## 6. Rights of Data Principals (Under DPDP Act 2023)
Data principals (customers and internal operators) retain the right to:
1. Request confirmation of data processing and access a summary of personal information held.
2. Request correction or completion of inaccurate customer profile data (e.g., updated mobile number or corrected GSTIN).
3. Lodge grievances with the designated Store Data Protection Officer.
