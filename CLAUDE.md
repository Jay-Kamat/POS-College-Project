# Development Rules & Architectural Constraints: POS & Billing System

## Strict Coding Guidelines for AI & Engineers

### 1. Folder Structure & Conventions
- **`src/_api/`:** All Firestore queries and mutations MUST be written here. Direct calls to `firebase/firestore` inside React view components are STRICTLY FORBIDDEN.
- **`src/contexts/`:** React context providers only (e.g., `FirebaseContext`, `AuthContext`).
- **`src/pages/apps/`:** Feature modules only (`product`, `bucket`, `invoice`, `vendor`, `purchaseOrder`, `reports`, `settings`, `customer`).
- **Components:** Put reusable presentation widgets in `src/components/` with proper prop typing and Formik bindings.

### 2. Soft-Delete & Query Invariants
- **NEVER HARD DELETE:** Always update `RecordStatus: 1` (`0 = Active`, `1 = Deleted/Cancelled`).
- **DEFAULT QUERY FILTER:** Every Firestore query MUST explicitly filter `where('RecordStatus', '==', 0)` unless specifically rendering an audit history or trash view.
- **AUDIT TRAIL:** Every write operation MUST include: `Created`, `Updated`, `RecordStatus`, `CreatedId`, `UpdatedId`. Use Firestore `serverTimestamp()`.

### 3. Forms & Validation
- **Formik + Yup:** Every form without exception must use Formik with Yup validation schema. No unvalidated form submits.
- **Touched & Errors:** Form fields must show clear touched feedback and helper error strings.

### 4. Direct Client Architecture & Security
- **Security Rules First:** Authorization is enforced in `firestore.rules`. Client route guards are UX conveniences only.
- **Atomic Operations:** Multi-document updates (such as Bucket to Invoice conversion and sequential document counter increments) MUST use `runTransaction()`.
- **No Secrets in Code:** Never commit API secrets, service account credentials, or OpenWA auth keys. Public Firebase web config is an identifier, not a secret. Use environment variables.

### 5. Dependency Management
- **Zero Arbitrary Dependencies:** Do not install any new npm libraries or backend frameworks without explicit prior logging and approval in `CHANGE_REQUESTS.md`.

### 6. Workflow Discipline
- **Documentation First:** Never write application code before specs are approved.
- **Milestone Cadence:** Implement one small milestone at a time.
- **Update Logs:** After every milestone, update `PROGRESS.md` and `CHANGELOG.md`.
- **No Dead Code:** Remove unused imports, variables, console logs, and stubbed placeholders before finalizing milestones.
