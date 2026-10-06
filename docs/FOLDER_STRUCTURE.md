# Repository Folder Structure Specification: POS & Billing System

## 1. Top-Level Workspace Organization
```text
pos-system/
├── .env.example               # Root unified environment configuration template
├── CLAUDE.md                  # Strict developer constraints and coding invariants
├── PRD.md                     # Core product requirements reference document
├── PROGRESS.md                # Project milestone execution tracker (B0–B16)
├── README.md                  # Operational quickstart and system overview
├── CHANGELOG.md               # Versioned chronological release notes
├── CHANGE_REQUESTS.md         # Formal architectural and dependency modification log
├── docker-compose.yml         # Production & development multi-container definition
├── run-all.ps1                # PowerShell multi-service launcher (Postgres, Backend, OpenWA, POSUI)
├── docs/                      # Comprehensive technical, architectural & testing specifications
├── backend/                   # NEW: NestJS + Prisma + PostgreSQL 16 REST API (:4000)
├── OpenWA/                    # Persistent WhatsApp Microservice Gateway (:2785 / :2886)
└── POSUI/                     # React 18 Point of Sale Single Page Application (:3000)
```

---

## 2. Backend Service Directory Tree (`backend/`)
```text
backend/
├── Dockerfile                 # Multi-stage production container build (Node 22 LTS)
├── package.json               # Backend dependencies (NestJS, Prisma, argon2, decimal.js, pino)
├── tsconfig.json              # TypeScript strict configuration (noImplicitAny, strictNullChecks)
├── tsconfig.build.json        # Production build compilation targets
├── prisma/                    # Relational database schema and migrations
│   ├── schema.prisma              # Prisma declarative schema mapping 21 tables
│   ├── seed.ts                    # Deterministic development/test database seeder
│   └── migrations/                # Versioned SQL migration directories
│       ├── 20261006000001_init_schema/
│       │   └── migration.sql      # Core tables, foreign keys, and indexes
│       └── 20261006000002_triggers_and_extensions/
│           └── migration.sql      # Triggers, CHECK constraints, and GIN trigram indexes
├── src/                       # Application source code
│   ├── main.ts                    # Application bootstrapper (Pipes, Helmet, Pino, Swagger, Port 4000)
│   ├── app.module.ts              # Root NestJS module importing domain modules
│   ├── config/                    # Environment validation and configuration loader
│   │   ├── env.validation.ts          # Fail-fast class-validator environment schema
│   │   └── configuration.ts          # Typed configuration provider
│   ├── common/                    # Shared cross-cutting utilities, decorators & filters
│   │   ├── decorators/                # Custom decorators (@RequirePermission, @CurrentUser)
│   │   ├── filters/                   # HttpExceptionFilter (RFC 7807 standard error envelope)
│   │   ├── guards/                    # JwtAuthGuard, PermissionsGuard, StoreScopeGuard
│   │   ├── interceptors/              # LoggingInterceptor (X-Request-Id, duration tracking)
│   │   ├── dto/                       # PaginationQueryDto, BaseResponseDto
│   │   └── utils/                     # decimal.js helpers (gstMath.ts, currency.ts, dates.ts)
│   ├── prisma/                    # Database connection service
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts          # Global Prisma client provider with connection hooks
│   ├── auth/                      # Authentication & session management (JWT, argon2id, Google OAuth)
│   ├── users/                     # Staff accounts management and status toggling
│   ├── roles/                     # System roles and permission matrix administration
│   ├── stores/                    # Store branch profiles and tax configurations
│   ├── tax-rates/                 # GST tax slabs management (0%, 5%, 12%, 18%, 28%)
│   ├── settings/                  # Global and per-store key-value configuration
│   ├── categories/                # Product categories CRUD
│   ├── products/                  # Product catalog with GIN trigram search and barcode lookup
│   ├── customers/                 # Customer directory with 10-digit mobile lookup
│   ├── vendors/                   # External supplier directory (non-login entities)
│   ├── purchase-orders/           # Procurement PO lifecycle and PDF data generator
│   ├── material-inward/           # Supply chain inward processing and thermal barcode label creator
│   ├── stock/                     # Real-time stock on hand, FEFO batches, adjustments, and ledger
│   ├── material-returns/          # Vendor material return notes and reasons master
│   ├── buckets/                   # Held checkout baskets management (`BKT-01`, `BKT-02`)
│   ├── invoices/                  # Server-side GST preview, atomic checkout, and soft-cancellation
│   ├── payments/                  # Payment settlement tracking (Cash / UPI)
│   ├── whatsapp/                  # Transactional outbox polling worker calling OpenWA
│   ├── reports/                   # Daily Sales, Vendor Sales, Expired Stock reports (JSON/CSV)
│   ├── dashboard/                 # Executive KPI summary metrics
│   ├── audit/                     # Immutable audit logging service
│   └── health/                    # Liveness and readiness diagnostic endpoints
└── test/                      # Test suites
    ├── jest-e2e.json              # E2E test configuration
    ├── helpers/                   # Database reset and test user token factories
    ├── auth.e2e-spec.ts           # Authentication, refresh rotation, and lockout tests
    ├── invoices.e2e-spec.ts       # Atomic invoice creation and soft-cancellation tests
    ├── concurrency.spec.ts        # Parallel 50-checkout numbering and FEFO race condition tests
    ├── stock-invariant.spec.ts    # Ledger sum equals batch sum verification test
    └── contracts.spec.ts          # OpenAPI vs Frontend endpoint contract validation
```

---

## 3. POSUI Frontend Directory Tree (`POSUI/`)
```text
POSUI/
├── package.json               # Frontend dependencies (React 18, MUI, Redux Toolkit, Axios)
├── vite.config.js             # Vite 5 build configuration
├── src/
│   ├── index.jsx                  # Application entry point
│   ├── App.jsx                    # Root router and theme provider
│   ├── _api/                      # Central HTTP REST API client and domain services
│   │   ├── httpClient.js              # Axios instance (Bearer token, refresh interceptor, idempotency)
│   │   ├── mappers/                   # Bidirectional data mappers (API camelCase ⇄ UI PascalCase)
│   │   │   ├── productMapper.js
│   │   │   ├── invoiceMapper.js
│   │   │   ├── customerMapper.js
│   │   │   ├── vendorMapper.js
│   │   │   ├── purchaseOrderMapper.js
│   │   │   └── userMapper.js
│   │   ├── authService.js             # Calls /api/v1/auth
│   │   ├── bucketService.js           # Calls /api/v1/buckets
│   │   ├── customerService.js         # Calls /api/v1/customers
│   │   ├── invoiceService.js          # Calls /api/v1/invoices
│   │   ├── materialInwardService.js   # Calls /api/v1/material-inwards
│   │   ├── productService.js          # Calls /api/v1/products
│   │   ├── purchaseOrderService.js    # Calls /api/v1/purchase-orders
│   │   ├── reportService.js           # Calls /api/v1/reports
│   │   ├── returnService.js           # Calls /api/v1/material-returns
│   │   ├── settingService.js          # Calls /api/v1/settings
│   │   ├── userService.js             # Calls /api/v1/users
│   │   ├── vendorService.js           # Calls /api/v1/vendors
│   │   └── whatsappService.js         # Calls /api/v1/invoices/:id/share-whatsapp
│   ├── components/                # Presentation widgets (MUI Mantis)
│   ├── contexts/                  # AuthContext with backend JWT session hydration
│   ├── pages/                     # Application screens
│   │   ├── apps/                      # Core business pages (bucket, invoice, product, etc.)
│   │   └── auth/                      # Login and signup screens
│   └── store/                     # Redux Toolkit state slices
```
