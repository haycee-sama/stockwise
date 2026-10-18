<!--
  ╔════════════════════════════════════════════════════════════════════╗
  ║  PHASE 2 STATUS — updated after frontend remediation                  ║
  ║                                                                       ║
  ║  Branch:  feature/frontend-remediation-supabase-prep                    ║
  ║  Lint:    30 errors → 0 errors                                         ║
  ║  Tests:   0 → 18 (vitest + RTL, all passing)                          ║
  ║  Build:   succeeds (1.25s)                                             ║
  ║  Audit:   19 vulns → 7 (all dev-only, in Tailwind 3.x transitive deps) ║
  ║                                                                       ║
  ║  Highlights:                                                           ║
  ║    - P1-001 fixed: session persists across refresh (demo + Supabase)   ║
  ║    - P1-002 fixed: NewSaleModal Rules-of-Hooks crash resolved         ║
  ║    - P1-003 fixed: dashboard CTAs use React Router, no more reload    ║
  ║    - P1-004 fixed: 30 lint errors cleaned up                           ║
  ║    - P2-001 fixed: ErrorBoundary wraps every lazy page                ║
  ║    - P2-002 fixed: /settings, /documents, /forgot-password now exist ║
  ║    - P2-005/6/7 fixed: icon-rendering bugs (cat.Icon, item.emoji)     ║
  ║    - P2-009 fixed: CustomerModal phone regex tightened                ║
  ║    - P2-013 partial: dashboard Export now writes a real CSV           ║
  ║                                                                       ║
  ║  New files added in Phase 2:                                          ║
  ║    - src/lib/env.js                            (typed env access)      ║
  ║    - src/lib/supabase.js                        (safe Supabase client) ║
  ║    - src/context/useAuth.js                     (useAuth hook split)   ║
  ║    - src/context/auth-context-instance.js       (AuthContext ctx obj)  ║
  ║    - src/services/*.js                          (data-access layer)    ║
  ║    - src/components/common/ErrorBoundary.jsx                          ║
  ║    - src/components/common/ComingSoon.jsx                             ║
  ║    - src/components/common/DemoModeBanner.jsx                         ║
  ║    - src/pages/SettingsPage.jsx / DocumentsPage.jsx                   ║
  ║    - src/pages/NotFoundPage.jsx                                       ║
  ║    - src/pages/auth/ForgotPasswordPage.jsx                           ║
  ║    - supabase/migrations/0001_init_schema.sql   (NOT applied)         ║
  ║    - supabase/migrations/0002_rls_policies.sql (NOT applied)         ║
  ║    - docs/SUPABASE_SETUP.md                     (new)                  ║
  ║    - .env.example, .gitignore updates                                   ║
  ║                                                                       ║
  ║  What was NOT done in Phase 2 (deferred to Phase 3, requires approval):║
  ║    - Wiring services/* to real Supabase queries                      ║
  ║    - Applying SQL migrations to any database                          ║
  ║    - Building /reset-password page (link target for reset emails)    ║
  ║    - Phone/OTP or OAuth auth                                          ║
  ║    - Tailwind 3.x → 4.x upgrade (major rewrite, deferred)            ║
  ╚════════════════════════════════════════════════════════════════════╝
-->

# Feature & Route Inventory

> Phase 1 audit document. For every route and primary feature in the
> Stockwise app, this document records:
> - **Implementation status**: ✅ works, ⚠️ partial, ❌ broken, ❌ missing
> - **Data source**: mock / in-memory / (future) backend
> - **Backend dependency**: does this feature require a real endpoint?
> - **Testing status**: verified in browser, suspected, or untested
>
> Test evidence was gathered by running `npm run dev` and using
> `agent-browser` to walk every route and click every primary button.
> Console output and post-click URL changes are captured verbatim
> where relevant.

## 1. Route inventory

| # | Route          | Component (lazy)     | Visibility | Layout         | Status         | Verified in browser |
|---|----------------|---------------------|------------|----------------|----------------|---------------------|
| 1 | `/`            | `<Navigate to="/login">` | public  | —              | ✅ works        | ✅ yes              |
| 2 | `/login`       | `LoginPage`         | public (auth-only) | bare | ✅ works        | ✅ yes              |
| 3 | `/signup`      | `SignupPage`        | public (auth-only) | bare | ✅ works        | ✅ yes              |
| 4 | `/dashboard`   | `DashboardPage`     | protected  | AppLayout      | ⚠️ partial (see §3)| ✅ yes              |
| 5 | `/inventory`   | `InventoryPage`     | protected  | AppLayout      | ✅ works (mostly)| ✅ yes              |
| 6 | `/sales`       | `SalesPage`         | protected  | AppLayout      | ⚠️ broken (New Sale modal)| ✅ yes       |
| 7 | `/customers`   | `CustomersPage`     | protected  | AppLayout      | ✅ works        | ✅ yes              |
| 8 | `/vendors`     | `VendorsPage`       | protected  | AppLayout      | ✅ works        | ✅ yes              |
| 9 | `/expenses`    | `ExpensesPage`      | protected  | AppLayout      | ⚠️ minor bug   | ✅ yes              |
| 10| `/reports`     | `ReportsPage`       | protected  | AppLayout      | ⚠️ partial     | ✅ yes              |
| 11| `/documents`   | (none)              | protected  | AppLayout      | ❌ missing route| ✅ yes (404 → /dashboard) |
| 12| `/settings`    | (none)              | protected  | AppLayout      | ❌ missing route| ✅ yes (404 → /dashboard) |
| 13| `/forgot-password` | (none)          | public     | —              | ❌ missing route| ✅ yes (404 → /login) |
| 14| `*` (404)      | `<Navigate to="/dashboard">` | — | —           | ⚠️ silent fallback| ✅ yes            |

**Notes on verification:**
- "✅ works (mostly)" means the page renders, all visible features
  function as designed, but there are minor audit findings (see
  `FRONTEND_AUDIT.md`).
- "⚠️ broken" means a primary user journey on this route does not
  function (e.g. the New Sale button on `/sales` throws an error
  instead of opening the modal).
- All routes return HTTP 200 from the dev server because Vite serves
  the SPA shell for every path — client-side React Router handles the
  actual routing logic.

## 2. Page-by-page feature breakdown

### 2.1 LoginPage (`/login`)

| Feature                               | Status  | Backend needed? | Notes |
| ------------------------------------- | ------- | --------------- | ----- |
| Email + password form                 | ✅       | yes — `POST /auth/login` | Email regex `/S+@S+.S+/`; password min 6 chars. |
| Show/hide password toggle             | ✅       | no              |       |
| "Remember me for 30 days" checkbox    | ⚠️ visual only | yes — token expiry / refresh | Checkbox state is never read; no persistence logic. |
| "Forgot password?" link               | ❌ broken link | yes — `POST /auth/forgot-password` | Links to `/forgot-password` which has no route (P2-003). |
| "Create one free" link → `/signup`    | ✅       | no              |       |
| Submit → navigate to `/dashboard`      | ✅       | —               | But see P1-001 — no session persistence means refresh redirects to login. |
| Validation errors per field           | ✅       | no              |       |
| Loading state on submit button        | ✅       | —               | Spinner via `Loader2` from lucide. |
| General error banner (wrong creds)    | ⚠️ unreachable | yes — backend must return 401 | `login()` always returns success (P2-008). |
| "OR" divider                          | ⚠️ misleading | no            | Suggests SSO exists; doesn't (P3-014). |
| Left-panel branding (desktop)         | ✅ visual | no             | Hardcoded testimonial + stats. |

### 2.2 SignupPage (`/signup`)

| Feature                                | Status  | Backend needed? | Notes |
| -------------------------------------- | ------- | --------------- | ----- |
| Two-step form (Business Info → Account) | ✅       | yes — `POST /auth/signup` | Step indicator + Back/Continue. |
| First name, last name, business name   | ✅       | yes             |       |
| Business type select                   | ⚠️ value not captured | yes — should be in user profile | The `<select>` has no `name` / `value` / `onChange`; choosing an option does nothing (P3 — minor). |
| Email, phone                           | ✅       | yes             | Phone regex `/^[0-9+\s-]{10,15}$/` — too permissive (see P2-009 for the same issue in CustomerModal; here it's the same family of bug). |
| Password + confirm password            | ✅       | yes             | Strength meter (Weak/Fair/Good/Strong). |
| Terms checkbox                         | ✅       | no              |       |
| Submit → navigate to `/dashboard`      | ✅       | —               |       |

### 2.3 DashboardPage (`/dashboard`)

| Feature / CTA                       | Status        | Data source       | Notes |
| ----------------------------------- | ------------- | ----------------- | ----- |
| Stat cards (Gross sales, Net profit, Inventory, Low stock) | ✅ visual | `dashboardStats` (mock) | Static numbers, never recomputed. |
| Quick stats strip (Today / Week / Out of stock / Pending) | ⚠️ partial | derived from `salesData` + `inventoryItems` | "Today" and "This Week" are always ₦0 because mock sales are dated March 2026 (P3-006). |
| Period selector (Today / Week / Month) | ⚠️ visual only | n/a            | State changes but does not affect any displayed number (P2-014). |
| Filter chips (Low Stock / Pending / Out of Stock) | ❌ no onClick | n/a            | P2-014. |
| Refresh button                       | ❌ triggers logout | n/a           | `window.location.reload()` + P1-001 = user lands on /login. |
| Export button                        | ❌ `console.log` only | yes — `GET /reports/…/export.csv` | P2-013. |
| New Sale button (header)             | ❌ triggers logout | yes — `POST /sales` | `window.location.href = '/sales'` + P1-001 = user lands on /login (P1-003). |
| Add Item button (header)             | ❌ triggers logout | yes — `POST /inventory` | Same as above. |
| Revenue chart (this week vs last)    | ✅ visual     | `revenueData` (mock) | recharts BarChart. |
| Stock status donut                   | ✅ visual     | `stockStatusData` (mock) | recharts PieChart. |
| Top sellers table                    | ⚠️ partial    | `topSellers` (mock) | Icons are blank because `item.emoji` is rendered but data has no `emoji` field (P2-006). |
| Low stock alerts table               | ✅ visual     | `lowStockItems` (mock) |       |
| Recent sales (mobile cards + desktop table) | ✅ visual | `salesData` (mock, sorted desc, top 4) |       |
| Pending orders list + Fulfil button   | ⚠️ partial    | `pendingOrders` (mock) | Clicking "Fulfil" removes the order from local state only — no backend call, lost on refresh. |
| Alert banner (out of stock + low stock) | ✅ visual     | derived from `inventoryItems` |       |

### 2.4 InventoryPage (`/inventory`)

| Feature / CTA                       | Status        | Data source       | Notes |
| ----------------------------------- | ------------- | ----------------- | ----- |
| Stats cards (In stock, Low, Out, Inventory value) | ✅ | derived from `inventoryItems` |       |
| Category tabs (All / Clothing / Footwear / Accessories) | ✅ | `categories` (mock) |       |
| Search by name / SKU / category     | ✅             | in-memory        |       |
| Status filter (All / In stock / Low / Out) | ✅             | in-memory        |       |
| Sort by any column (asc/desc)       | ✅             | in-memory        | ESLint flags `sortDir` as unused in `SortTh` — see P1-004. |
| Table view / Cards view toggle      | ✅             | in-memory        |       |
| Multi-select with checkboxes        | ✅             | in-memory        | But there is no bulk action — the bulk delete UI is just a count + "Clear" button (no actual delete button on the bulk action bar). |
| Add Item button (header)            | ✅ opens modal | in-memory        | 2-step modal with icon picker, color picker, name/SKU/category/supplier, stock/threshold/cost/selling. Margin preview. |
| Edit Item (per row)                 | ✅ opens modal | in-memory        | Same modal pre-filled with `editItem`. |
| Delete Item (per row)               | ✅ opens confirm modal | in-memory | `DeleteModal` shows item preview + irreversible warning. |
| Bulk Upload button (header)         | ❌ no onClick  | yes — `POST /inventory/bulk` | P2-013. |
| Export button (header)              | ❌ no onClick  | yes — `GET /inventory.csv` | P2-013. |

### 2.5 SalesPage (`/sales`)

| Feature / CTA                       | Status        | Data source       | Notes |
| ----------------------------------- | ------------- | ----------------- | ----- |
| Summary cards (Today / Week / Month / Total orders) | ✅ visual | derived from `salesData` (mock) | Same P3-006 "today = ₦0" issue. |
| Pending alert banner                 | ✅ visual     | derived            |       |
| Search by order ID / customer / item name | ✅             | in-memory        |       |
| Status filter (All / Completed / Pending / Cancelled) | ✅             | in-memory        |       |
| Payment filter (All / Cash / Transfer / POS) | ✅             | in-memory        |       |
| Mobile cards view / desktop table    | ✅ visual     | `salesData` (mock) |       |
| View order (per row) — opens receipt modal | ✅             | in-memory        | `ViewOrderModal` shows full receipt with line items, status, payment, note. |
| Print receipt button (per row)      | ❌ no onClick  | yes — `GET /sales/{id}/receipt.pdf` or `window.print()` | P2-013. |
| New Sale button (header)             | ❌ **crashes** | yes — `POST /sales` | **P1-002**: clicking opens the modal, but `NewSaleModal` throws a React Rules-of-Hooks error and fails to render. Modal does not appear. Console shows the error. |
| Export button (header)              | ❌ no onClick  | yes — `GET /sales.csv` | P2-013. |

### 2.6 CustomersPage (`/customers`)

| Feature / CTA                       | Status        | Data source       | Notes |
| ----------------------------------- | ------------- | ----------------- | ----- |
| Stats cards (Total / Active / New this month / Revenue) | ✅ visual | derived from `customersData` (mock) |       |
| Owing customers alert banner        | ✅ visual     | derived            |       |
| Search by name / phone / email / location | ✅             | in-memory        |       |
| Type filter (Retailer / Wholesale / Walk-in / E-commerce) | ✅             | in-memory        |       |
| Status filter (Active / New / Owing / Inactive) | ✅             | in-memory        |       |
| Grid view / List view toggle        | ✅             | in-memory        |       |
| Add Customer button (header)         | ✅ opens modal | in-memory        | `CustomerModal` with name, contact, type, location, note. Avatar color/initials auto-generated. Phone regex too permissive (P2-009). |
| Edit Customer (per card/row)         | ✅             | in-memory        |       |
| Delete Customer (per card/row)       | ✅ opens confirm modal | in-memory | Shows warning if customer has orders. |
| View customer (per card/row)         | ✅ opens drawer | in-memory        | Right-side drawer with profile, stats, order history. |
| Import button (header)              | ❌ no onClick  | yes — `POST /customers/bulk` | P2-013. |

### 2.7 VendorsPage (`/vendors`)

| Feature / CTA                       | Status        | Data source       | Notes |
| ----------------------------------- | ------------- | ----------------- | ----- |
| Stats cards (Total / Active / Total purchases / Pending orders) | ✅ visual | derived from `vendorsData` (mock) |       |
| Pending payment alert banner        | ✅ visual     | derived            |       |
| Search by name / contact / location / item supplied | ✅             | in-memory        |       |
| Category filter (Clothing & Accessories / Footwear / Leather / Accessories) | ✅             | in-memory        |       |
| Status filter (Active / Inactive)   | ✅             | in-memory        |       |
| Vendor cards (with star rating, contact, lead time, items supplied, paid/pending, actions) | ✅ visual | `vendorsData` |       |
| Add Vendor button (header)          | ✅ opens modal | in-memory        | `VendorModal` with name, contact, phone/email, category, location, lead time, dynamic items-supplied list, note. |
| Edit Vendor (per card)              | ✅             | in-memory        |       |
| Delete Vendor (per card)            | ✅ opens confirm modal | in-memory | Shows pending balance warning. |
| View Vendor (per card)              | ✅ opens drawer | in-memory        | Drawer with profile, stats, items supplied, purchase order history. |
| Place Order (per card)              | ✅ opens modal | in-memory        | `PlaceOrderModal` with quick-select items, qty stepper, unit price, total, note. Order ID is `PO-{random 100-999}`. |
| Import button (header)              | ❌ no onClick  | yes — `POST /vendors/bulk` | P2-013. |

### 2.8 ExpensesPage (`/expenses`)

| Feature / CTA                       | Status        | Data source       | Notes |
| ----------------------------------- | ------------- | ----------------- | ----- |
| Stats cards (This month / This week / Top category / Total all-time) | ✅ visual | derived from `expensesData` (mock) |       |
| Monthly trend area chart            | ✅ visual     | `expenseTrend` (mock) |       |
| Category breakdown panel            | ⚠️ partial (icons blank) | derived from `expensesData` | P2-005 — uses `cat.Icon` (capital I) but data has `icon`. |
| Category tabs                       | ⚠️ partial (icons blank) | `expenseCategories` (mock) | Same P2-005 issue. |
| Search by name / vendor / note      | ✅             | in-memory        |       |
| Payment filter (All / Cash / Transfer / Card) | ✅             | in-memory        | Note: expenses use "Card" while sales use "POS" — inconsistent. |
| Expenses table                       | ✅ visual     | `expensesData` (mock) |       |
| Add Expense button (header)         | ✅ opens modal | in-memory        | `ExpenseModal` with name, category (visual grid), vendor/payee (with datalist suggestions from `vendorsData`), amount, date, payment method, note. |
| Edit Expense (per row)              | ✅             | in-memory        |       |
| Delete Expense (per row)            | ⚠️ minor bug   | in-memory        | `ExpenseDeleteModal` shows category emoji but `cat.emoji` is undefined → always wrench `🔧` (P2-007). |
| Export button (header)              | ❌ no onClick  | yes — `GET /expenses.csv` | P2-013. |

### 2.9 ReportsPage (`/reports`)

| Feature / CTA                       | Status        | Data source       | Notes |
| ----------------------------------- | ------------- | ----------------- | ----- |
| Business Health Overview banner (Revenue / Profit / Margin / Expenses / Avg Order / Avg LTV) | ✅ visual | `salesTrendData`, `expenseTrend`, `customersData` (all mock) |       |
| Tab selector (Sales / Inventory / Customers / Expenses) | ✅             | in-memory        |       |
| Period selector (This Month / Last Month / Quarter / This Year) | ⚠️ visual only | n/a            | State changes but does not affect data (P2-015). |
| Export PDF button                   | ❌ no onClick  | yes — `GET /reports/…/export.pdf` or `window.print()` | P2-013. |
| Sales report (Revenue & Profit Trend line chart, Top Products, Payment Breakdown donut) | ✅ visual | `salesTrendData`, `topProductsReport`, `paymentBreakdown` |       |
| Inventory report (Stock by Category donut, Top Selling Products table, Low Stock list) | ✅ visual | `inventoryCategoryReport`, `topProductsReport`, `inventoryItems` |       |
| Customers report (Customer Acquisition bar chart, Customer Type Breakdown donut, Top Customers by LTV table) | ✅ visual | `customerAcquisitionData`, `customerTypeBreakdown`, `customersData` |       |
| Expenses report (Expense Trend bar chart, Expense Category Report donut, Top Expense Categories list) | ✅ visual | `expenseTrend`, `expenseCategoryReport`, `expensesData` |       |

## 3. Cross-cutting features

### 3.1 Authentication

| Feature                              | Status       | Notes |
| ------------------------------------ | ------------ | ----- |
| `AuthContext` provides `user`, `login`, `signup`, `logout` | ✅ | |
| `ProtectedRoute` redirects unauthenticated users to `/login` | ✅ | |
| `AuthRoute` redirects authenticated users away from `/login` + `/signup` | ✅ | |
| Session persistence across reloads   | ❌           | **P1-001**. No `localStorage` write on login; no read on provider mount. |
| Real credential validation           | ❌           | **P2-008**. Mock `login` accepts any email + any 6+ char password. |
| Logout button (sidebar)              | ✅           | Calls `logout()` and navigates to `/login`. |

### 3.2 Navigation

| Feature                              | Status       | Notes |
| ------------------------------------ | ------------ | ----- |
| Desktop sidebar (3 sections, 9 items, collapse toggle) | ✅ | |
| Mobile bottom nav (5 items)          | ⚠️ partial   | **P2-012**: missing Vendors, Expenses, Documents, Settings. |
| TopBar with greeting, search, notifications, actions | ✅ visual | Search input is decorative (**P2-011**); notifications are hardcoded (**P2-004**). |
| Active-link styling (`NavLink`)      | ✅           | |
| Collapsible sidebar with tooltips when collapsed | ✅ | |

### 3.3 Layout shell

| Feature                              | Status       | Notes |
| ------------------------------------ | ------------ | ----- |
| `AppLayout` (sidebar + main + mobile nav) | ✅           | |
| `PageLoader` for lazy pages (animated green dots) | ✅ | |
| Responsive (desktop sidebar / mobile bottom nav) | ✅ | |
| `@media print` styles                | ✅           | `.no-print` hides chrome when printing. |
| Touch target min 36px                | ✅           | |
| iOS input zoom prevention (16px font) | ✅           | |

### 3.4 Forms & validation

| Feature                              | Status       | Notes |
| ------------------------------------ | ------------ | ----- |
| Field-level error messages with icons | ✅ | |
| Required field indicators (red asterisk) | ✅ | |
| Multi-step flows (signup, item modal, new sale) | ⚠️ partial | New sale modal is broken (P1-002). |
| Submit button loading state (spinner) | ✅ | |
| Duplicate submission prevention (`disabled={saving}`) | ✅ | |
| Format preview (margin bar, avatar preview, expense preview) | ✅ | |

### 3.5 Empty / loading / error states

| State                                | Status       | Notes |
| ------------------------------------ | ------------ | ----- |
| Empty state for every list page      | ✅           | Inventory, Sales, Customers, Vendors, Expenses, Pending Orders each have a friendly empty state with a CTA button. |
| Loading state for pages              | ✅           | `PageLoader` with animated dots. |
| Loading state for forms              | ✅           | Spinner on submit buttons. |
| Error state for failed network/data | ❌           | No error boundaries, no error UI. See P2-001. |
| Error state for failed form submit   | ❌           | Auth forms have an "invalid credentials" branch that is unreachable (P2-008). Other forms have no error path at all. |

### 3.6 Accessibility

| Feature                              | Status       | Notes |
| ------------------------------------ | ------------ | ----- |
| Semantic HTML (`<form>`, `<table>`, `<th>`, `<nav>`) | ✅ | |
| `<label>` for most form fields       | ⚠️ partial   | Some modals use `<label>` without `htmlFor` (e.g. `Field` in `ItemModal`, `CustomerModal`, `VendorModal`, `ExpenseModal`). Clicking the label text does not focus the input. |
| Focus ring (`focus:ring-2 focus:ring-green-100`) | ✅ | |
| Touch targets ≥ 36px                  | ✅           | |
| Keyboard navigation (Tab through inputs) | ✅ | |
| Modal close on Escape                | ❌           | No `onKeyDown` handler on any modal. Only backdrop click or X button closes. |
| Modal focus trap                     | ❌           | Tab focus can leave the modal. |
| ARIA roles for modals                | ❌           | No `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. |
| Color contrast                        | ⚠️ unverified | Visual inspection suggests AA compliance but no automated check was run. Some text uses `text-[10px] text-gray-400` which is small and low-contrast. |
| `alt` text on images                  | n/a          | No `<img>` in the app — all icons are SVG via lucide. |

### 3.7 Data persistence (cross-cutting)

| Feature                              | Status       | Notes |
| ------------------------------------ | ------------ | ----- |
| Add/edit/delete persists across navigation | ❌ | Every page keeps its own in-memory copy. Navigating to another page and back resets the data to `mockData` defaults. |
| Add/edit/delete persists across refresh | ❌ | State is React-only. |
| Add/edit/delete persists across sessions | ❌ | |
| Optimistic updates                   | ❌           | No backend, so n/a. |
| Conflict handling (multiple users)   | ❌           | No backend, so n/a. |

## 4. Untested / cannot-verify features

- **Email delivery**: Signup form asks for an email but there is no
  email-sending backend. Cannot verify delivery.
- **Phone format**: Form accepts phone numbers but no SMS is sent.
- **Export to CSV / PDF**: All export buttons are non-functional stubs.
- **Bulk upload (CSV)**: All bulk upload buttons are non-functional.
- **Production build deployment**: Build succeeds, but the app was not
  deployed to a real host so HTTPS, CDN, and runtime production
  behaviour are untested.
- **Performance under load**: With only mock data (~10–15 records per
  entity), no perf measurement is meaningful.

## 5. Feature readiness for backend integration

A feature is "ready for backend integration" if its UI is complete, its
client-side validation is solid, and the only thing missing is a real
API call.

| Feature area                          | UI complete? | Validation solid? | Ready for backend? |
| ------------------------------------- | ------------ | ----------------- | ------------------- |
| Login                                 | ✅           | ✅                | ✅                   |
| Signup (incl. 2-step)                 | ✅           | ✅                | ✅                   |
| Logout                                | ✅           | n/a               | ✅                   |
| Inventory CRUD                        | ✅           | ✅                | ✅                   |
| Sales list + view                     | ✅           | n/a               | ✅                   |
| **New Sale modal**                    | ❌ (P1-002) | ✅                | ❌ — fix first      |
| Customers CRUD + drawer              | ✅           | ⚠️ (P2-009)      | ✅ (after fix)      |
| Vendors CRUD + drawer + place order  | ✅           | ✅                | ✅                   |
| Expenses CRUD                         | ✅           | ✅                | ✅                   |
| Dashboard                             | ✅ visual    | n/a               | ✅ (data fetching only) |
| Reports                               | ✅ visual    | n/a               | ✅ (data fetching only) |
| Notifications                         | ⚠️ visual only | n/a            | ❌ — UI is hardcoded; needs wire-up |
| Search (global, TopBar)              | ❌ (P2-011) | n/a               | ❌ — no UI behaviour |
| Forgot password                       | ❌ (P2-003) | n/a               | ❌ — no page         |
| Settings                              | ❌ (P2-002) | n/a               | ❌ — no page         |
| Documents                             | ❌ (P2-002) | n/a               | ❌ — no page         |

## 6. Next document to read

Proceed to [`DATABASE_AUDIT.md`](./DATABASE_AUDIT.md) for an analysis of
the (lack of a) data layer, or [`BACKEND_HANDOVER.md`](./BACKEND_HANDOVER.md)
for the proposed API contracts.
