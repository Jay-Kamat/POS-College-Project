# Code Quality, Standards & Refactoring Specification: POS & Billing System

## 1. Type Safety Decision & Strategy
- **Context:** The Mantis Admin React template is written in modern JavaScript (ES6+ / JSX).
- **Architecture Decision:**
  - Standardize on **React PropTypes** and **JSDoc type annotations** across `POSUI` components and services.
  - Formik forms are strongly validated via comprehensive **Yup Schemas**.
  - OpenWA NestJS gateway is written in **TypeScript 5.x** with class-validator DTOs.
  - *Phase 2 Migration:* Progressively migrate `src/_api` and `src/store` to TypeScript `.ts` definitions to catch type regressions at compile time.

---

## 2. Component Design & Reusability Rules
1. **Single Responsibility:** A component should either handle layout, present data, or bind business state. Mixed giant components ($> 250\text{ lines}$) must be factored into smaller sub-components.
2. **Prop Drilling Elimination:** Global cart and terminal states route through Redux Toolkit; authentication and notification toasts route through React Context.
3. **No Direct Firestore Imports in Views:** Presentation components in `src/pages/` and `src/components/` are strictly prohibited from importing `getFirestore`, `collection`, `doc`, or `query`. All database access MUST route through `src/_api/`.

---

## 3. Linting, Formatting & Code Style
- **Linter:** ESLint with `eslint-config-react-app` and custom rules:
  - `no-console`: `warn` (strip in production).
  - `no-unused-vars`: `error`.
  - `react-hooks/exhaustive-deps`: `error`.
- **Formatter:** Prettier configured with:
  ```json
  {
    "singleQuote": true,
    "trailingComma": "es5",
    "printWidth": 100,
    "tabWidth": 2,
    "semi": true
  }
  ```

---

## 4. Legacy Toolchain Modernization Plan
- **Current Technical Debt:** React build toolchain relies on `react-scripts` requiring `NODE_OPTIONS=--openssl-legacy-provider`.
- **Target Modernization:**
  - Transition from `react-scripts` (Webpack 5) to **Vite 5 / 6**.
  - Benefits: Sub-300ms HMR, native ES modules, elimination of legacy OpenSSL flags, modern Node 20/22 runtime compatibility.
  - Scheduled for Milestone 14 hardening.

---

## 5. Peer Review & Pull Request Checklist
Before any feature PR is merged:
- [ ] Conforms to `CLAUDE.md` invariants (no direct firestore imports, soft-delete filtering).
- [ ] No hardcoded strings; text is localized via `react-intl`.
- [ ] Forms validated with Formik + Yup schema.
- [ ] Loading skeletons and empty states implemented.
- [ ] Firestore queries use compound index guidelines where applicable.
- [ ] No dead code, unused imports, or placeholder comments.
