# Stockwise

Stockwise is a retail SME inventory and sales management web application
targeted at Nigerian small and medium retail businesses. It lets a shop
owner track stock levels, record sales, manage customers and vendors, log
expenses, and view aggregate business reports.

The application is a single-page React frontend. It runs in two modes:

- **Supabase mode** — when `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` are both set, the app talks to a
  configured Supabase project for auth and data. All write operations
  persist.
- **Demo mode** — when either env var is missing, the app falls back to
  in-memory mock data and a clearly-labelled demo auth flow. Nothing
  persists across a page reload. A banner at the top of every page makes
  this honest.

The backend handover (frontend architecture, integration points,
verification status, and integration assumptions) is documented in
[`docs/BACKEND_HANDOVER.md`](./docs/BACKEND_HANDOVER.md).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React 19.2 |
| Routing | react-router-dom 7.13 (BrowserRouter + nested routes) |
| Language | JavaScript (JSX). No TypeScript. |
| Build tool | Vite 8 (with `@vitejs/plugin-react`, Rolldown) |
| Styling | Tailwind CSS 3.4 (with `autoprefixer`, `postcss`) |
| Charts | recharts 3.8 |
| Icons | lucide-react 0.577 |
| Auth + data | `@supabase/supabase-js` 2.118 (Supabase JS client) |
| Lint | ESLint 9.39 flat config |
| Tests | Vitest 5 + @testing-library/react 16 + jsdom 25 |

Package manager: npm (lockfile `package-lock.json`).

---

## Frontend directory structure

```
.
├── index.html                  # Document shell (Google Fonts links, meta)
├── package.json
├── vite.config.js              # Vite + Vitest config
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── .env.example                # Documented env vars (placeholders, no secrets)
├── .env.test.local             # Committed; forces demo mode for tests
├── public/
│   └── favicon.svg
├── docs/
│   └── BACKEND_HANDOVER.md     # Frontend handover for backend integration
└── src/
    ├── main.jsx                # React entry
    ├── App.jsx                 # Router + route guards
    ├── index.css               # Tailwind layers
    ├── pages/                  # Top-level route components
    │   ├── DashboardPage.jsx
    │   ├── InventoryPage.jsx
    │   ├── SalesPage.jsx
    │   ├── CustomersPage.jsx
    │   ├── VendorsPage.jsx
    │   ├── ExpensesPage.jsx
    │   ├── ReportsPage.jsx
    │   ├── SettingsPage.jsx    # Placeholder (ComingSoon)
    │   ├── DocumentsPage.jsx   # Placeholder (ComingSoon)
    │   ├── NotFoundPage.jsx
    │   └── auth/
    │       ├── LoginPage.jsx
    │       ├── SignupPage.jsx
    │       ├── ForgotPasswordPage.jsx
    │       └── ResetPasswordPage.jsx
    ├── components/
    │   ├── auth/               # LoginForm, SignupForm
    │   ├── common/             # ErrorBoundary, ComingSoon, ResourceState, DemoModeBanner
    │   ├── customers/          # CustomerModal, CustomerDrawer, CustomerDeleteModal
    │   ├── dashboard/          # StatCard, RevenueChart, StockDonut, TopSellersTable, LowStockTable
    │   ├── expenses/          # ExpenseModal, ExpenseDeleteModal
    │   ├── inventory/          # ItemModal, DeleteModal
    │   ├── layout/             # Sidebar, MobileNav, TopBar
    │   ├── sales/              # NewSaleModal, ViewOrderModal
    │   └── vendors/            # PlaceOrderModal, VendorModal, VendorDrawer, VendorDeleteModal
    ├── context/
    │   ├── AuthContext.jsx     # AuthProvider (dual-mode: Supabase + demo)
    │   ├── BusinessContext.jsx # BusinessProvider (auto-provisioning)
    │   ├── auth-context-instance.js
    │   ├── business-context-instance.js
    │   ├── useAuth.js
    │   └── useBusiness.js
    ├── lib/
    │   ├── env.js              # Typed env var access + isSupabaseConfigured
    │   └── supabase.js         # Supabase client singleton
    ├── services/               # Data-access layer (one module per domain)
    │   ├── index.js            # Switch-point: isSupabaseConfigured ? *Supabase : *Mock
    │   ├── inventorySupabase.js
    │   ├── salesSupabase.js
    │   ├── customersSupabase.js
    │   ├── vendorsSupabase.js
    │   ├── expensesSupabase.js
    │   ├── dashboardSupabase.js
    │   ├── reportsSupabase.js
    │   ├── businessesSupabase.js
    │   ├── *Mock.js            # Demo-mode equivalents
    │   └── supabaseServices.test.js
    ├── data/
    │   └── mockData.js         # Seed data for demo mode + category/type/status lists
    ├── utils/
    │   ├── inventoryIconData.js
    │   └── inventoryIcons.jsx
    └── test/
        └── setup.js            # Vitest setup (jsdom, @testing-library/jest-dom)
```

---

## Installation prerequisites

- Node.js 18+ (the project uses native ESM + Vite 8).
- npm 9+.

---

## Installation and development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
# (or leave them blank to run in demo mode).

# 3. Run the dev server
npm run dev
# → http://localhost:5173
```

---

## Environment configuration

| Variable | Purpose | Required? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. | Yes — without it, demo mode. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key. **NOT the service_role key.** | Yes — without it, demo mode. |
| `VITE_PUBLIC_APP_URL` | Public-facing URL; used as the password-reset `redirectTo`. | Yes for password-reset. |
| `VITE_API_BASE_URL` | Optional REST API base URL (reserved for a future non-Supabase backend). | No. |
| `VITE_API_TIMEOUT_MS` | REST API timeout (ms). Default 15000. | No. |
| `VITE_ENABLE_NOTIFICATIONS` | Feature flag. Default false. | No. |
| `VITE_ENABLE_BULK_UPLOAD` | Feature flag. Default false. | No. |
| `VITE_ENABLE_PDF_EXPORT` | Feature flag. Default false. | No. |

`.env.local` is gitignored. `.env.example` is committed and documents every
variable with inline safety notes. `.env.test.local` is committed and
forces the test suite into demo mode (overrides Supabase vars to empty
strings).

**Security:** `VITE_*` variables are PUBLIC — they are inlined into the
browser bundle. Never put a Supabase `service_role` key, database password,
OAuth secret, or any other secret in a `VITE_*` variable. The publishable
(anon) key is safe to ship to the browser ONLY when every tenant-scoped
table has RLS enabled.

---

## Production build

```bash
npm run build      # → dist/
npm run preview     # serve the built bundle locally
```

Vite produces a static SPA bundle. Deploy `dist/` to any static host
(Vercel, Netlify, Cloudflare Pages, S3+CloudFront, Nginx, etc.). The
current production deployment is at
<https://stockwise-rho.vercel.app/>.

---

## Lint, type-check, and tests

```bash
npm run lint             # ESLint
npm test                 # Vitest (single run)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage report
```

There is no TypeScript type-check step — the project is plain JSX. ESLint
covers syntax + React Hooks rules + React Refresh. The test suite is
39 smoke tests across 7 files (auth context, business context, supabase
singleton, ComingSoon, NewSaleModal, InventoryPage, service layer).

---

## How the frontend connects to the backend

The frontend uses the Supabase JS client (`@supabase/supabase-js`) for
three categories of operation:

- **Auth** — `signInWithPassword`, `signUp`, `signOut`,
  `resetPasswordForEmail`, `getSession`, `onAuthStateChange`. See
  `src/context/AuthContext.jsx`.
- **Data** — PostgREST CRUD on `sw_*` tables, scoped per-business by the
  backend's RLS policies. See the `src/services/*Supabase.js` modules.
- **Atomic server-side operations** — the frontend calls server-side
  RPCs for operations that must be transactional (sale creation, stock
  adjustment, purchase-order receiving, business provisioning). See
  `src/services/businessesSupabase.js`, `src/services/salesSupabase.js`,
  `src/services/inventorySupabase.js`, `src/services/vendorsSupabase.js`.

The single switch-point is in `src/services/index.js`. Each domain
(inventory, sales, customers, vendors, expenses, dashboard, reports) has
both a mock and a Supabase variant; the active variant is selected at
import time based on `isSupabaseConfigured`.

For the full integration contract — function names, payload shapes,
expected response shapes, verification status, and integration
assumptions requiring confirmation — see
[`docs/BACKEND_HANDOVER.md`](./docs/BACKEND_HANDOVER.md).

---

## Known frontend-side limitations

These items are documented in detail in `docs/BACKEND_HANDOVER.md` →
Section 9 (Frontend-side limitations). A brief summary:

- **Settings and Documents pages** are placeholders — they render a
  ComingSoon component.
- **TopBar search and notifications** are disabled with honest
  "Coming soon" tooltips.
- **CSV / PDF / bulk-upload** buttons on list pages are disabled.
- **Pagination UI** is not implemented — the service `list()` functions
  default to `pageSize: 100` with no UI to advance.
- **Reports page** silently falls back to mock data for several
  aggregates the Supabase service does not yet compute
  (`topProducts`, `paymentBreakdown`, `acquisition`, `topCustomers`).
- **Dashboard "vs last month" deltas** are 0 — the service does not yet
  compute period-over-period changes.
- **Sales list** shows "Unknown" as the customer name and line-item name
  in Supabase mode — the service does not yet join `sw_customers` /
  `sw_inventory_items` in `list()`.
- **Supabase mode requires a configured backend.** When `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_PUBLISHABLE_KEY` are set, the frontend expects to
  talk to a Supabase project whose API contract matches the integration
  assumptions in `docs/BACKEND_HANDOVER.md` Section 11. Without them,
  the frontend runs in demo mode.

These gaps are honest — the frontend surfaces real data when available
and falls back to mock or empty state when not.

---

## License

This project's source code is proprietary. All rights reserved.
