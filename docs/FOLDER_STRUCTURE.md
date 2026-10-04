# Repository Folder Structure Specification: POS & Billing System

## 1. Top-Level Workspace Organization
```text
pos-system/
├── .env.example               # Root configuration template with placeholders
├── CLAUDE.md                  # Strict developer constraints and coding invariants
├── PRD.md                     # Root copy / reference of requirements document
├── PROGRESS.md                # Project milestone execution tracker
├── README.md                  # System setup, startup, and operational guide
├── CHANGELOG.md               # Versioned chronological release notes
├── CHANGE_REQUESTS.md         # Formal architectural and dependency modification log
├── run-all.ps1                # PowerShell multi-process launcher (POSUI + OpenWA)
├── firebase.json              # Firebase Hosting, Firestore Rules & Indexes config
├── firestore.rules            # Firestore security rules definition
├── firestore.indexes.json     # Firestore composite index definitions
├── docs/                      # 43 Architecture, System & Testing Specifications
├── OpenWA/                    # NestJS WhatsApp Microservice Gateway
└── POSUI/                     # React 18 Point of Sale Single Page Application
```

---

## 2. POSUI Frontend Directory Tree (`POSUI/`)
```text
POSUI/
├── public/                    # Static assets, favicon, index.html
├── src/
│   ├── _api/                  # Modular Firestore data access service layer
│   │   ├── authService.js         # Firebase Auth login, token, and session handling
│   │   ├── bucketService.js       # Real-time cart staging and holding queries
│   │   ├── customerService.js     # Customer lookup, search, and directory management
│   │   ├── invoiceService.js      # Atomic invoice transactions and query methods
│   │   ├── materialInwardService.js# Inward dockets and barcode registry
│   │   ├── productService.js      # Product catalog CRUD with soft-delete filtering
│   │   ├── purchaseOrderService.js# Supplier PO workflows
│   │   ├── reportService.js       # Aggregated sales, tax, and expiry queries
│   │   ├── returnService.js       # Vendor material return note records
│   │   ├── settingService.js      # Store profile and tax slabs management
│   │   └── whatsappService.js     # Axios client communicating with OpenWA :2785
│   ├── components/            # Reusable UI presentation widgets (MUI Mantis)
│   │   ├── cards/                 # KPI metric cards, product POS cards
│   │   ├── dialogs/               # Confirmation modals, cancel invoice dialog
│   │   ├── feedback/              # Toast notifications, skeleton loaders, error alerts
│   │   ├── forms/                 # Formik text inputs, steppers, barcode inputs
│   │   ├── layout/                # Sidebar, header top bar, store selector
│   │   └── tables/                # Sticky-header paginated tables with CSV export
│   ├── contexts/              # React Context Providers
│   │   ├── AuthContext.js         # Firebase Auth state and role hydration
│   │   └── NotificationContext.js # Global snackbar and toast dispatcher
│   ├── hooks/                 # Custom React hooks (useScanner, useBarcode, useCart)
│   ├── locales/               # Internationalization JSON bundles (react-intl)
│   │   ├── en.json                # English strings (default)
│   │   └── hi.json                # Hindi strings
│   ├── pages/                 # Route page components
│   │   ├── apps/                  # Feature application modules
│   │   │   ├── bucket/                # POS terminal billing & cart staging
│   │   │   ├── customer/              # Customer directory and lookup
│   │   │   ├── dashboard/             # Admin KPI metrics & ApexCharts
│   │   │   ├── invoice/               # Invoice list, detail view, PDF & WhatsApp
│   │   │   ├── materialInward/        # Inward processing & barcode label print
│   │   │   ├── product/               # Product catalog & category dialogs
│   │   │   ├── purchaseOrder/         # Supplier PO creation and PDF
│   │   │   ├── reports/               # Daily sales, vendor sales, expired stock
│   │   │   ├── returns/               # Vendor material return dockets
│   │   │   ├── settings/              # Store profile, GSTIN, tax slabs
│   │   │   └── users/                 # Staff accounts & role matrix
│   │   ├── auth/                  # Login, Signup, Forgot Password
│   │   └── maintenance/           # 403 Forbidden, 404 Not Found, Network Offline
│   ├── routes/                # React Router v6 routing configurations & RBAC guards
│   ├── store/                 # Redux Toolkit store and feature slices
│   │   ├── index.js               # Root store configuration
│   │   ├── authSlice.js           # Current user profile & role state
│   │   ├── cartSlice.js           # POS active terminal cart state
│   │   ├── heldBucketsSlice.js    # Multi-tab held buckets
│   │   └── uiSlice.js             # Global theme and sidebar open/close state
│   ├── themes/                # Mantis Material UI theme definitions, palette, shadows
│   ├── utils/                 # Pure helper functions (GST math, currency, formatting)
│   ├── App.js                 # App root with ThemeProvider & Router
│   └── index.js               # Entry point with Redux Provider & Firebase init
├── .env                       # Local environment variables (git-ignored)
└── package.json               # NPM dependencies and scripts
```

---

## 3. OpenWA Gateway Directory Tree (`OpenWA/`)
```text
OpenWA/
├── src/
│   ├── auth/                  # API Bearer token authentication guard
│   ├── common/                # Formatters (Indian mobile number normalizer)
│   ├── messages/              # Message controller and WhatsApp sender service
│   │   ├── dto/                   # SendTextMessageDto validation schema
│   │   ├── messages.controller.ts # POST /api/v1/messages/send-text
│   │   └── messages.service.ts    # Integration with Baileys / WhatsApp-Web
│   ├── session/               # QR pairing dashboard and connection health check
│   │   ├── session.controller.ts  # GET /api/v1/session/status
│   │   └── session.service.ts     # Baileys socket lifecycle management
│   ├── app.module.ts          # Root NestJS module
│   └── main.ts                # Application bootstrapper (Ports 2785 / 2886)
├── auth_info_baileys/         # Persistent session credentials (git-ignored)
├── .env                       # OpenWA environment variables
└── package.json               # NestJS dependencies
```
