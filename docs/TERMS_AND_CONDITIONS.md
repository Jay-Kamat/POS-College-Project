# Terms and Conditions of System Use (Template - Subject to Legal Review)
**Effective Date:** October 2026  
**Product:** POS & Billing System

> **DISCLAIMER:** This document is an operational terms template governing software usage within retail environments. It must be reviewed and tailored by legal counsel to ensure alignment with local commercial laws and operational contracts.

---

## 1. Acceptance of Terms
By accessing, operating, or configuring the POS & Billing System ("the Application"), store administrators, cashiers, and inventory managers ("Authorized Users") agree to be bound by these operational terms.

---

## 2. Authorized Use & Account Security
1. **Role Delegation:** Users are assigned specific roles (`Admin`, `Cashier`, `Inventory Manager`). Users must strictly operate within their authorized boundaries and must not attempt privilege escalation.
2. **Credential Confidentiality:** Users are responsible for maintaining the confidentiality of their Firebase Authentication credentials. Sharing cashier or manager credentials to perform overrides or cancellations is strictly prohibited.
3. **Audit Trail Accountability:** All system mutations (product updates, invoice creations, invoice cancellations) are stamped with the authenticated user's identifier (`CreatedId`, `UpdatedId`). Users are personally accountable for operations performed under their authenticated session.

---

## 3. Financial & Tax Integrity
1. **GST Compliance:** The business entity operating the store is solely responsible for entering accurate tax slabs (`TaxRates`), correct store GSTIN, and appropriate FSSAI food license registrations.
2. **Invoice Numbering:** Invoices finalized within the system represent immutable fiscal records. Sequential document numbers must not be manipulated or artificially bypassed.
3. **Cancellation Protocol:** Invoices may only be soft-cancelled by authorized Admin users accompanied by a valid business rationale recorded in the system audit log.

---

## 4. Hardware and Connectivity Requirements
1. **Peripherals:** The application is designed to interface with standard HID barcode scanners, USB/LAN thermal receipt printers, and local network gateways. Proper calibration and maintenance of peripherals are the operator's responsibility.
2. **Network Resilience:** The system leverages Firestore offline caching; however, continuous multi-terminal checkout and real-time WhatsApp receipt delivery require stable internet connectivity.

---

## 5. Intellectual Property & Data Ownership
1. **Proprietary Code:** The POSUI front-end application code, OpenWA gateway scripts, database schemas, and documentation are proprietary assets.
2. **Store Data Ownership:** The retail operator maintains 100% exclusive ownership of all customer data, inventory counts, pricing structures, and transaction records stored within their Cloud Firestore tenant.

---

## 6. Limitation of Liability
To the maximum extent permitted by applicable law, the software authors and providers shall not be held liable for commercial losses, inventory discrepancies, hardware malfunctions, WhatsApp API carrier blocks, or regulatory tax penalties arising from incorrect operational usage or third-party cloud service interruptions.
