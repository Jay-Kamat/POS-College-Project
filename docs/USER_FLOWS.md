# User Flows Specification & Diagrams: POS & Billing System

## 1. Authentication Flow (Google OAuth & Email/Password)

```mermaid
flowchart TD
    Start([User visits /login]) --> ChooseMethod{Sign-in Method}
    
    ChooseMethod -->|Google OAuth| GoogleAuth[Trigger Google Popup / Redirect]
    ChooseMethod -->|Email & Password| FormInput[Enter Email and Password]
    
    FormInput --> ValidateFields{Valid Format?}
    ValidateFields -->|No| ShowValidationError[Display Inline Formik Errors]
    ValidateFields -->|Yes| SubmitFirebase[Send to Firebase Auth SDK]
    
    GoogleAuth --> VerifyToken{Firebase Auth Success?}
    SubmitFirebase --> VerifyToken
    
    VerifyToken -->|Failure| ShowAuthError[Show Alert: Invalid Credentials / Account Disabled]
    VerifyToken -->|Success| FetchRole[Fetch RolesAndPermissions by UID]
    
    FetchRole --> CheckRole{Role Exists?}
    CheckRole -->|No| Show403[Redirect to 403 Forbidden: Contact Admin]
    CheckRole -->|Cashier| RoutePOS[Redirect to /apps/bucket POS Terminal]
    CheckRole -->|Inventory Manager| RouteInventory[Redirect to /apps/materialInward]
    CheckRole -->|Admin| RouteDashboard[Redirect to /dashboard Admin View]
```

---

## 2. POS Terminal Billing Flow (Bucket to Finalized Invoice)

```mermaid
flowchart TD
    EnterPOS([Cashier opens /apps/bucket]) --> FocusScanner[Auto-focus Barcode Input F2]
    
    FocusScanner --> Action{Cashier Action}
    Action -->|Scan Barcode| QueryBarcode[Lookup Barcode in Firestore Cache]
    Action -->|Manual Search| FilterCatalog[Filter Products by Category/Name]
    Action -->|Hold Bucket F8| HoldCart[Save active Bucket & open new Tab]
    Action -->|Resume Bucket| SwitchTab[Switch to selected held Bucket tab]
    
    QueryBarcode --> CheckExpiry{Is Batch Expired?}
    CheckExpiry -->|Yes| BlockItem[Audio Alert & Error Toast: Expired Batch]
    CheckExpiry -->|No| CheckStock{Stock Available?}
    CheckStock -->|No| OutOfStockWarning[Display Low/No Stock Toast]
    CheckStock -->|Yes| AddCart[Append Item to BucketDetails / Increment Qty]
    
    FilterCatalog --> AddCart
    AddCart --> CalcTaxes[Calculate CGST, SGST, IGST & Subtotal]
    
    CalcTaxes --> EnterCustomer[Enter Customer Mobile Number]
    EnterCustomer --> LookupCust{Customer Exists?}
    LookupCust -->|Yes| AutofillCustomer[Display Customer Name & State]
    LookupCust -->|No| QuickAdd[Open Quick-Add Customer Drawer]
    
    AutofillCustomer --> SelectPayment{Payment Mode}
    QuickAdd --> SelectPayment
    
    SelectPayment -->|Cash 0| CashFlow[Enter Cash Received -> Calc Change Due]
    SelectPayment -->|UPI 1| UPIFlow[Display Static/Dynamic UPI QR Code]
    
    CashFlow --> TriggerCheckout[Press F9 / Click Generate Invoice]
    UPIFlow --> ConfirmUPI[Mark Payment Received -> Press F9]
    
    TriggerCheckout --> RunTx[Run Firestore Transaction]
    ConfirmUPI --> RunTx
    
    RunTx --> LockCounter[Increment DocumentNumber Counter]
    LockCounter --> CreateInvoice[Write InvoiceHeader & InvoiceDetails]
    CreateInvoice --> SoftDeleteBucket[Set BucketHeader.RecordStatus = 1]
    
    SoftDeleteBucket --> TxSuccess{Transaction Committed?}
    TxSuccess -->|Conflict / Retry Failure| ShowTxError[Display Conflict Error -> Retry]
    TxSuccess -->|Success| ShowSuccessModal[Display Invoice Success Dialog]
    
    ShowSuccessModal --> WhatsAppShare{WhatsApp Share Requested?}
    WhatsAppShare -->|Yes| SendOpenWA[Dispatch POST to OpenWA Gateway :2785]
    WhatsAppShare -->|No| ThermalPrint[Trigger 80mm Thermal Print / A4 PDF]
    
    SendOpenWA --> CheckWA{OpenWA Success?}
    CheckWA -->|Success| WAToast[Show WhatsApp Sent Checkmark]
    CheckWA -->|Failed / Offline| WAFail[Show Warning: Gateway Offline - Retry Available]
    
    WAToast --> CloseBill[Click New Bill -> Reset Terminal]
    WAFail --> CloseBill
    ThermalPrint --> CloseBill
```

---

## 3. Procurement, Material Inward & Barcoding Flow

```mermaid
flowchart TD
    StartPO([Inventory Manager opens /apps/purchaseOrder]) --> CreatePO[Click New Purchase Order]
    CreatePO --> SelectVendorStore[Select Vendor and Target Store]
    SelectVendorStore --> AddLineItems[Add Products, Quantities, Unit Rates]
    AddLineItems --> SavePO[Save PurchaseOrderHeader & Details]
    
    SavePO --> GoodsArrive([Physical Goods Arrive at Store])
    GoodsArrive --> OpenInward[Open Material Inward Stepper]
    
    OpenInward --> ChooseMode{Receipt Mode}
    ChooseMode -->|Against PO| LinkPO[Select Existing PO -> Pre-fill Items]
    ChooseMode -->|Without PO| ManualInward[Select Vendor -> Manually Add Items]
    
    LinkPO --> VerifyQuantities[Enter Actual Received Qty & Verify Rates]
    ManualInward --> VerifyQuantities
    
    VerifyQuantities --> ShelfLifeLookup[Fetch Product Shelf Life in Days]
    ShelfLifeLookup --> ComputeExpiry[Auto-Calculate Batch Expiry Date]
    
    ComputeExpiry --> SaveInward[Commit MaterialInwardHeader & Details]
    SaveInward --> GenBarcodes[Generate Unique Barcodes in MaterialInwardBarcodes]
    
    GenBarcodes --> PrintDialog[Open Thermal Barcode Label Print Dialog]
    PrintDialog --> PrintLabels[Print Stickers & Affix to Product Packaging]
```

---

## 4. Invoice Cancellation Flow

```mermaid
flowchart TD
    StartCancel([Admin opens /apps/invoice]) --> SelectInvoice[Select Invoice Row]
    SelectInvoice --> ClickCancel[Click Cancel Invoice]
    
    ClickCancel --> CheckRole{Is Authenticated User Admin?}
    CheckRole -->|No| DenyCancel[Action Forbidden: Admin Role Required]
    CheckRole -->|Yes| OpenReasonModal[Prompt for Mandatory Cancellation Reason]
    
    OpenReasonModal --> EnterReason{Reason Length >= 10 chars?}
    EnterReason -->|No| ValidationErr[Show Validation Error: Detailed Reason Required]
    EnterReason -->|Yes| SubmitCancel[Execute Firestore Update]
    
    SubmitCancel --> UpdateAudit[Set RecordStatus = 1, CancellationReason, Updated, UpdatedId]
    UpdateAudit --> VerifyDocNum[DocumentNumber is Preserved - Never Deleted]
    VerifyDocNum --> ShowWatermark[UI Displays CANCELLED Stamp & Audit Log Entry]
```

---

## 5. Vendor Material Return Flow

```mermaid
flowchart TD
    StartReturn([Inventory Manager opens /apps/materialReturn]) --> ClickNewReturn[Click New Material Return Note]
    ClickNewReturn --> PickVendorStore[Select Vendor & Store]
    PickVendorStore --> SelectReason[Select Return Reason from MaterialReturns Master]
    SelectReason --> AddDefectiveItems[Select Products, Batch Barcode, Return Qty]
    AddDefectiveItems --> CommitReturn[Save MaterialReturnNoteHeader & Details]
    CommitReturn --> PrintNote[Generate Formal Debit / Return Note PDF for Supplier]
```
