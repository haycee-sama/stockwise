# Stockwise — Project Overview

> Phase 1 audit document. Generated from a clone of
> `https://github.com/haycee-sama/stockwise` (commit at audit time).
> This document describes only what was directly verified from the repository
> and from running the app locally — no speculative assumptions are made about
> intended future behaviour.

## 1. What Stockwise is

Stockwise is a **single-page web application** targeted at Nigerian small and
medium retail businesses (SMEs). It is positioned as an inventory + sales
management tool that helps a shop owner track stock levels, record sales,
manage customers and vendors, log expenses, and view aggregate business
reports. The product surface is intentionally compact — eight primary routes
plus auth — and the visual design is fully responsive (desktop sidebar +
mobile bottom-nav).

The application is currently in a **frontend-only prototype state**: every
piece of data shown is hardcoded in `src/data/mockData.js`, and every
"backend-like" operation (login, signup, add/edit/delete of any entity) is
simulated with `setTimeout(..., 700–1500ms)` and in-memory React state.
Nothing persists across a full page reload.

## 2. Technology stack (verified)

| Layer            | Choice                                                       | Verified in                       |
| ---------------- | ----------------------------------------------------------- | --------------------------------- |
| Framework        | React 19.2.4 (`react`, `react-dom`)                         | `package.json`                   |
| Routing          | react-router-dom 7.13.1 (BrowserRouter + nested `<Route>`) | `src/App.jsx`, `package.json`    |
| Language         | JavaScript (JSX). **No TypeScript** is used anywhere.       | `src/**/*.{js,jsx}`               |
| Build tool       | Vite 8.0.1 (with `@vitejs/plugin-react` 6.0.1, Rolldown)    | `vite.config.js`, lockfile        |
| Styling          | Tailwind CSS 3.4.19 (with `autoprefixer`, `postcss`)        | `tailwind.config.js`, `index.css` |
| Charts           | recharts 3.8.0 (BarChart, LineChart, PieChart, AreaChart)   | imports across dashboard/reports |
| Icons            | lucide-react 0.577.0                                        | imports across the app            |
| Package manager  | npm (lockfile `package-lock.json` present, 260 packages)     | repo root                         |
| Lint             | ESLint 9.39 flat config (`eslint.config.js`)               | `eslint.config.js`                |
| Fonts            | Google Fonts (DM Sans, Syne) via `<link>` in `index.html`   | `index.html`                      |
| Tests            | **None**. No test runner, no test files.                    | (verified absence)                |
| Database         | **None.** No schema, migrations, ORM, or seed files.       | (verified absence)                |
| Backend          | **None.** No API server, no endpoints, no env-driven URLs. | (verified absence)                |

Node version used during audit: `v24.21.0`; npm `11.19.0`.

## 3. Repository layout

```
stockwise/
├── README.md               # Default Vite template README — does NOT document Stockwise
├── package.json
├── package-lock.json
├── vite.config.js          # Manual chunks for react / recharts / lucide / d3
├── tailwind.config.js      # Brand palette: primary green scale + brand #16a34a
├── postcss.config.js
├── eslint.config.js        # Flat ESLint 9 config (no TS rules)
├── index.html              # SPA shell. Loads Google Fonts + /src/main.jsx
├── public/
│   ├── favicon.svg         # Generic Vite logo (purple #863bff) — NOT Stockwise brand
│   └── icons.svg           # SVG sprite (Bluesky icon, etc. — leftover from template)
└── src/
    ├── main.jsx            # Entry. StrictMode + createRoot(<App/>)
    ├── App.jsx             # BrowserRouter, lazy routes, ProtectedRoute, AuthRoute
    ├── index.css           # Tailwind directives + animations + responsive rules
    ├── assets/
    │   └── hero.png        # (imported nowhere — unused asset)
    ├── context/
    │   └── AuthContext.jsx # Mock auth — see BACKEND_HANDOVER for what's needed
    ├── data/
    │   └── mockData.js     # The entire "data layer" — hardcoded arrays (~290 lines)
    ├── utils/
    │   └── inventoryIcons.jsx  # String → Lucide component map for inventory items
    ├── components/
    │   ├── auth/           # LoginForm, SignupForm
    │   ├── layout/         # Sidebar, MobileNav, TopBar
    │   ├── dashboard/      # StatCard, RevenueChart, StockDonut, TopSellersTable, LowStockTable
    │   ├── inventory/     # ItemModal, DeleteModal
    │   ├── sales/          # NewSaleModal, ViewOrderModal
    │   ├── customers/      # CustomerModal, CustomerDrawer, CustomerDeleteModal
    │   ├── vendors/        # VendorModal, VendorDrawer, VendorDeleteModal, PlaceOrderModal
    │   └── expenses/       # ExpenseModal, ExpenseDeleteModal, CategoryBreakdown, ExpenseTrendChart
    └── pages/
        ├── auth/          # LoginPage, SignupPage
        ├── DashboardPage.jsx
        ├── InventoryPage.jsx
        ├── SalesPage.jsx
        ├── CustomersPage.jsx
        ├── VendorsPage.jsx
        ├── ExpensesPage.jsx
        └── ReportsPage.jsx
```

## 4. Entry points and route tree

The HTML entry is `index.html`, which mounts `/src/main.jsx`. `main.jsx`
renders `<App/>` inside React `StrictMode`. `App.jsx` wires the
`BrowserRouter`, wraps the app in `<AuthProvider>`, and declares the
following routes (verbatim from `App.jsx`):

| Path          | Component (lazy)         | Visibility | Layout                       |
| ------------- | ------------------------ | ---------- | ---------------------------- |
| `/`           | `<Navigate to="/login">` | public     | —                            |
| `/login`      | `LoginPage`              | public (auth-only) | bare page (no sidebar) |
| `/signup`     | `SignupPage`             | public (auth-only) | bare page (no sidebar) |
| `/dashboard`  | `DashboardPage`         | protected  | `AppLayout` (sidebar + TopBar + Outlet) |
| `/inventory`  | `InventoryPage`         | protected  | AppLayout                    |
| `/sales`      | `SalesPage`            | protected  | AppLayout                    |
| `/customers`  | `CustomersPage`        | protected  | AppLayout                    |
| `/vendors`    | `VendorsPage`          | protected  | AppLayout                    |
| `/expenses`   | `ExpensesPage`         | protected  | AppLayout                    |
| `/reports`    | `ReportsPage`          | protected  | AppLayout                    |
| `*`           | `<Navigate to="/dashboard">` | —    | — (catch-all)                |

Note that the sidebar (`Sidebar.jsx`) also declares links to `/documents`
and `/settings`, but **no routes are defined for these paths** — clicking
them hits the catch-all and silently redirects to `/dashboard`. Likewise,
`LoginForm.jsx` has a "Forgot password?" link to `/forgot-password` for
which no route exists. See `FRONTEND_AUDIT.md` for details.

## 5. Design system

The application has a coherent visual identity, all defined via Tailwind:

- **Brand colour:** green (`#16a34a` as `brand` token; full `primary` 50→900
  green scale in `tailwind.config.js`).
- **Body font:** `DM Sans` (loaded from Google Fonts in `index.html`).
- **Display font (used for headings in index.html link tag):** `Syne`.
  Note: `Syne` is loaded but no element in the source actually applies
  `font-family: 'Syne'` — the body font `DM Sans` is the only visible
  typeface. The `Syne` link tag appears to be a leftover.
- **Background:** `#f8fafc` (slate-50) for app shell; `#0f172a` (slate-900)
  for the sidebar / mobile nav.
- **Spacing scale:** default Tailwind spacing (no override).
- **Border radius:** `xl` / `2xl` are used pervasively for cards, modals,
  buttons, badges.
- **Animations:** defined in `index.css` — `fadeUp`, `fadeIn`, `slideInRight`,
  `slideInLeft`, `pulse-green`, `countUp` — plus utility classes
  `.animate-fade-up`, `.delay-100…350`.
- **Responsive breakpoints:** mobile (`max-width: 767px`) uses a fixed
  bottom nav and hides the desktop sidebar; `≥768px` shows the sidebar.
- **Touch targets:** `index.css` sets `button, a, [role="button"] { min-height: 36px; }`
  — a thoughtful a11y/mobile default.
- **iOS input zoom:** `input, select, textarea { font-size: 16px; }` — also
  a thoughtful default.

## 6. State management

There is no external state library (no Redux, Zustand, Jotai, Recoil).
State lives in two places:

1. **`AuthContext` (`src/context/AuthContext.jsx`)** — provides `user`,
   `isLoading`, `login()`, `signup()`, `logout()`. State is stored in
   React `useState` only — **not** persisted to `localStorage` /
   `sessionStorage` / cookies. A page reload clears the user.
2. **Per-page local `useState`** — each page (`InventoryPage`,
   `SalesPage`, `CustomersPage`, `VendorsPage`, `ExpensesPage`,
   `DashboardPage`) holds its own working copy of the relevant slice of
   `mockData.js`. Mutations (add/edit/delete) only update this in-memory
   copy and are lost on unmount or refresh.

There is no shared "data store" for inventory, sales, customers, etc.
Each page is its own island. This is acceptable for a prototype but is
the biggest thing the backend handover must address.

## 7. Build, lint, test commands

| Command             | Status    | Notes                                                                |
| ------------------- | --------- | ------------------------------------------------------------------- |
| `npm ci`            | ✅ works  | 260 packages installed in 7s. **19 vulnerabilities** reported (1 low, 3 moderate, **15 high**). |
| `npm run dev`       | ✅ works  | Vite dev server on `http://localhost:5173/`.                         |
| `npm run build`     | ✅ works  | `vite build` succeeds in ~1.15s. Output: `dist/`. Largest chunks: `vendor-recharts` 321 KB (89 KB gzip), `vendor-react` 253 KB (81 KB gzip). |
| `npm run lint`      | ⚠️ fails | **30 errors** (29 errors + 1 warning). Details in `FRONTEND_AUDIT.md`. |
| `npm run preview`   | ✅ works  | Vite preview of the production build.                                |
| `npm test`          | ❌ N/A    | No test script, no test runner, no test files.                       |

## 8. Current implementation status (summary)

| Area                          | Status              | Notes                                                                                              |
| ----------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| Login + Signup forms (UI)     | ✅ complete          | Validation, password show/hide, password strength meter, multi-step signup.                         |
| Auth flow (functional)         | ⚠️ mock              | `AuthContext.login/signup` accept **any** credentials. No token, no persistence, no error path.     |
| Dashboard                     | ✅ visually complete | All charts/tables render from mock data. Several CTAs (Export, period filter, quick filters) non-functional. |
| Inventory                     | ✅ visually complete | Table + cards view, search, filter, sort, multi-select. Add/Edit modal works. Delete modal works. **Bulk Upload, Export buttons are dead**. |
| Sales                         | ⚠️ broken           | List, filter, view-order modal work. **"New Sale" modal throws a React Rules-of-Hooks error and fails to render** (see FRONTEND_AUDIT P1-002). Print receipt button is dead. |
| Customers                     | ✅ visually complete | Grid + list view, search, filter, add/edit drawer/modal. Drawer shows order history from mock data. |
| Vendors                       | ✅ visually complete | Card grid, search, filter, add/edit, place-order modal works.                                       |
| Expenses                      | ✅ visually complete | Table, charts (trend area + category breakdown), filter. Add/edit/delete works. Inline `CategoryBreakdown` has a bug rendering category icons (P2-005). |
| Reports                       | ✅ visually complete | Sales / Inventory / Customers / Expenses tabs. Period filter + Export PDF buttons are dead.        |
| Settings / Documents pages    | ❌ missing          | Sidebar links exist but no routes/components defined.                                                |
| Forgot-password page          | ❌ missing          | LoginForm links to `/forgot-password` but no route exists.                                          |
| Session persistence           | ❌ missing          | Refresh on any protected route redirects to `/login`.                                               |
| Database / data persistence   | ❌ missing          | Zero persistence. All mutations are in-memory and lost on refresh.                                   |
| Backend / API service layer   | ❌ missing          | No `fetch`, no axios, no API client.                                                                |
| Tests                         | ❌ missing          | None.                                                                                                |
| Error boundaries              | ❌ missing          | A single component crash (e.g. NewSaleModal) propagates and leaves a blank page.                     |

## 9. Outstanding questions for the team

These were not answerable from the repository alone and are flagged here so
the team can resolve them before backend work starts. Each is also
cross-referenced in the relevant audit document.

1. Is the data model in `mockData.js` the **intended** schema, or just
   illustrative? Several fields (`initials`, `color`, `textColor`,
   `iconName`, `bg`) are presentation-only and may not belong in the
   backend. → see `DATABASE_AUDIT.md`.
2. Are `/settings`, `/documents`, `/forgot-password` **intentionally
   missing** or work-in-progress? → see `FEATURE_INVENTORY.md`.
3. Should login be email/password only, or is phone/OTP planned (the
   phone field on signup suggests possibly)? → see `BACKEND_HANDOVER.md`.
4. What is the multi-tenancy model? Each business is independent
   (`businessName` in user), or is there a hierarchy? → see
   `BACKEND_HANDOVER.md`.
5. Should the dashboard period filter (`today`/`week`/`month`) actually
   filter the displayed data? Currently it is purely visual. → see
   `FEATURE_INVENTORY.md`.

## 10. Next document to read

Proceed to [`FRONTEND_AUDIT.md`](./FRONTEND_AUDIT.md) for the prioritised
list of issues with evidence, or [`FEATURE_INVENTORY.md`](./FEATURE_INVENTORY.md)
for a per-route/per-feature breakdown of what works and what doesn't.
