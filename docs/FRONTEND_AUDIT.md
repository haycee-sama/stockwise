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

# Frontend Audit — Prioritised Findings

> Phase 1 audit. All findings below were verified directly against the
> repository source or by running the app in a headless browser. Each
> finding has a stable ID (e.g. `P1-002`), a priority, evidence, an impact
> statement, and a recommended fix. Findings are grouped by priority.

## Priority legend

| Priority | Meaning                                                                                  |
| -------- | ---------------------------------------------------------------------------------------- |
| **P0 — Critical** | Security exposure, serious data-loss risk, or an unusability blocker.                |
| **P1 — High**    | Broken core user journey, runtime/build failure, or essential integration blocker.   |
| **P2 — Medium**   | Significant usability, maintainability, accessibility, or integration-readiness issue. |
| **P3 — Low**     | Minor visual inconsistency, small refactor, non-essential improvement.                |

---

## P1 — High

### P1-001 — Session not persisted across page reloads

- **Files:** `src/context/AuthContext.jsx` (whole file), `src/App.jsx`
  (`ProtectedRoute`).
- **Evidence:**
  - `AuthContext.jsx` stores `user` in `useState(null)` only — no
    `localStorage`/`sessionStorage`/cookie write on login, no read on
    provider mount.
  - With the dev server running, after logging in and navigating to
    `/dashboard`, executing `agent-browser open http://localhost:5173/dashboard`
    (which triggers a full page reload) ends up at `http://localhost:5173/login`.
    The same is true for every protected route.
  - Confirmed in source: `login()` calls `setUser(mockUser)` then
    returns. There is no `localStorage.setItem` anywhere in the
    codebase (`grep` returns zero hits).
- **Impact:** Every refresh, every direct URL entry, and every
  `window.location.href = ...` call logs the user out. Combined with
  P1-003 below, this makes several dashboard CTAs act as a logout button.
  Real users would experience this as "I keep getting kicked to login".
- **Recommended fix (for backend integration):**
  1. On login/signup success, persist the returned auth token (e.g.
     `localStorage.setItem('stockwise.token', token)`) and user
     profile (`localStorage.setItem('stockwise.user', JSON.stringify(user))`).
  2. In `AuthProvider`, initialise `useState` from `localStorage` on
     mount (or use a `useEffect` to rehydrate).
  3. On `logout()`, clear the same keys.
  4. Token refresh strategy should be agreed with the backend engineer —
     see `BACKEND_HANDOVER.md` §1.
- **Decisions needed:** HTTP-only cookie vs. `localStorage` token;
     token rotation policy.

### P1-002 — `NewSaleModal` violates the Rules of Hooks and crashes on open

- **Files:** `src/components/sales/NewSaleModal.jsx` lines 64, 66, 76, 91, 92.
- **Evidence:**
  - Line 64: `if (!isOpen) return null;` is **before** the `useMemo` and
    `useCallback` calls on lines 66, 76, 91.
  - When `isOpen` transitions from `false` to `true`, the number of
    hooks called changes (previous render: 9 × useState; next render:
    9 × useState + useMemo + useCallback × 3).
  - In the running app, clicking the "New Sale" button on `/sales`
    prints the following to the browser console and **does not render
    the modal**:

    ```
    [error] React has detected a change in the order of Hooks called by NewSaleModal.
    Previous render            Next render
    ------------------------------------------------------
    1. useState                   useState
    …
    9. undefined                  useMemo
    [warning] An error occurred in the <NewSaleModal> component.
    Consider adding an error boundary to your tree…
    ```
  - Also confirmed by ESLint: `src/components/sales/NewSaleModal.jsx`
    66:29 `react-hooks/rules-of-hooks`, 76:21, 91:21 — and 92:20
    `Cannot access variable before it is declared` (because
    `updateQty` references `removeFromCart` which is declared later).
- **Impact:** **The primary user journey on the Sales page is broken.**
  Users cannot create a new sale through the UI. This is the most
  important feature of an inventory/sales app. (It also silently
  invalidates any future dashboard "today's sales" stat that would have
  counted new sales created today, because there are none.)
- **Recommended fix:**
  - Move all hook calls to the top of the component, **before** any
    `if (!isOpen) return null;` guard.
  - Reorder `removeFromCart` to be declared before `updateQty`, OR
    inline the remove logic in `updateQty`.
  - Wrap with an Error Boundary as a defensive measure (see P2-007).
- **Reversible?** Yes, fully local change. No data impact.

### P1-003 — Dashboard CTAs use `window.location.href = ...` and trigger logout

- **Files:** `src/pages/DashboardPage.jsx` lines 120–134.
- **Evidence:**
  ```js
  const handleAddItem = useCallback(() => {
    window.location.href = '/inventory';
  }, []);
  const handleNewSale = useCallback(() => {
    window.location.href = '/sales';
  }, []);
  const handleExport = useCallback(() => {
    console.log('Export dashboard data');
  }, []);
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);
  ```
  These cause a full page reload. Combined with P1-001 (no session
  persistence), the user lands on `/login` instead of `/inventory` or
  `/sales`.
- **Impact:** The two most prominent dashboard action buttons
  ("Add Item" and "New Sale") silently log the user out. The "Refresh"
  button does the same. This is the worst possible first impression for
  a user clicking around the dashboard.
- **Recommended fix:** Use `react-router`'s `useNavigate()` (already
  used in `LoginForm.jsx` and `Sidebar.jsx`'s pattern). Replace:
  ```js
  const navigate = useNavigate();
  const handleAddItem = useCallback(() => navigate('/inventory'), [navigate]);
  const handleNewSale = useCallback(() => navigate('/sales'), [navigate]);
  ```
  For "Refresh", re-fetch data from the backend rather than
  `window.location.reload()`. For "Export", wire up a real export
  (CSV/PDF) once backend exists.
- **Decisions needed:** none — purely a frontend fix.

### P1-004 — ESLint reports 30 errors including 4× `set-state-in-effect` and the Rules-of-Hooks violation

- **Files:** all of `src/`. Full list captured during `npm run lint`.
- **Evidence:** `npm run lint` exits with `✖ 30 problems (29 errors, 1 warning)`.
  Summary by file (top offenders):
  | File                                        | Errors | Notable rules broken                                                       |
  | ------------------------------------------- | ------ | -------------------------------------------------------------------------- |
  | `components/sales/NewSaleModal.jsx`         | 5      | `react-hooks/rules-of-hooks` ×3, `react-hooks/purity`, `no-unused-vars`     |
  | `context/AuthContext.jsx`                   | 4      | unused `password` arg, unused `error` vars ×2, `react-refresh/only-export-components` |
  | `components/inventory/ItemModal.jsx`        | 1      | `react-hooks/set-state-in-effect`                                          |
  | `components/customers/CustomerModal.jsx`    | 2      | `react-hooks/set-state-in-effect`, `no-useless-escape`                     |
  | `components/vendors/VendorModal.jsx`        | 1      | `react-hooks/set-state-in-effect`                                          |
  | `components/expenses/ExpenseModal.jsx`      | 1      | `react-hooks/set-state-in-effect`                                          |
  | `App.jsx`, multiple pages & utils            | 16     | mostly `no-unused-vars` (`Icon`, `sortDir`, `paymentMethods`, `useCallback`) |
- **Impact:**
  - The Rules-of-Hooks violation is the direct cause of P1-002 (modal
    crash).
  - `set-state-in-effect` in four modals causes cascading renders
    (`editItem`/`editCustomer`/`editVendor`/`editExpense` props change
    → `useEffect` runs → `setForm` inside effect → extra render). It is
    a known React anti-pattern and the React team specifically
    recommends against it.
  - Unused vars are noise but also hide bugs (e.g. `password` arg in
    `AuthContext.login` is silently ignored — the login function
    succeeds regardless of what password is entered).
- **Recommended fix:** Address each file. For the modals, use a `key`
  prop on the modal component (e.g. `<ItemModal key={editItem?.id ??
  'new'} ... />`) to remount the modal when the edit target changes,
  removing the need for an effect-driven form sync. For
  `AuthContext.login(email, password)`, actually use the password.
- **Reversible?** Yes.

### P1-005 — 19 npm audit vulnerabilities (15 high)

- **Files:** `package.json`, `package-lock.json`.
- **Evidence:** `npm audit` reports 19 vulnerabilities (1 low, 3 moderate,
  15 high). The most material ones:
  - `vite` 8.0.0–8.0.15 — **5 separate advisories**: Path Traversal in
    Optimized Deps `.map` Handling, `server.fs.deny` bypass (×2),
    Arbitrary File Read via Vite Dev Server WebSocket, `launch-editor`
    NTLMv2 hash disclosure. (High.)
  - `react-router` / `react-router-dom` 7.0.0-pre.0 – 7.14.1 —
    **Stored XSS via unescaped Location header in prerendered redirect
    HTML** (High).
  - `source-map-js` 1.0.0–1.2.1 — event-loop DoS (High).
  - `brace-expansion` <1.1.17 — DoS via exponential expansion (High).
  - `@babel/core` ≤7.29.0 — Arbitrary File Read via
    sourceMappingURL (Low).
  - `@humanfs/node` <0.16.8 — symlink-following recursive copy (Moderate).
  - `baseline-browser-mapping` ≥2.0.0 <2.11.0 — DoS on invalid input
    (Moderate).
- **Impact:** Vite advisories are dev-server-only but serious during
  local development. The react-router XSS is the most concerning
  production-relevant one — once a backend exists and the app is
  deployed, redirects rendered server-side via the Location header
  could be XSS vectors if user-controlled data lands in a redirect URL.
- **Recommended fix:** `npm audit fix` (non-breaking) for the dev-only
  ones; for `react-router-dom` and `vite`, bump to the latest patch
  within the same major and re-test the build. The full bump matrix is
  in `ENVIRONMENT_SETUP.md`.

---

## P2 — Medium

### P2-001 — No error boundaries anywhere in the tree

- **Files:** `src/App.jsx`, `src/main.jsx`. There is no
  `componentDidCatch` or `react-error-boundary` package.
- **Evidence:** When `NewSaleModal` crashes (P1-002), the error
  propagates and React prints `"An error occurred in the
  <NewSaleModal> component. Consider adding an error boundary to your
  tree…"`. The modal tree simply doesn't render — there is no fallback
  UI.
- **Impact:** Any future component crash will leave the user looking at
  a half-rendered page with no explanation. With a backend, network
  failures will become a common cause of such crashes.
- **Recommended fix:** Add `react-error-boundary` (or a small custom
  boundary) wrapping each lazy-loaded page in `App.jsx`, with a
  branded fallback UI ("Something went wrong. Reload / go back.").

### P2-002 — Sidebar links to `/documents` and `/settings` but no routes exist

- **Files:** `src/components/layout/Sidebar.jsx` (lines 33, 131),
  `src/App.jsx` (route table).
- **Evidence:** Sidebar declares:
  ```js
  { to: '/documents', icon: FolderOpen, label: 'Documents' },
  …
  <NavLink to="/settings" …>
  ```
  But `App.jsx` only declares `/dashboard`, `/inventory`, `/sales`,
  `/customers`, `/vendors`, `/expenses`, `/reports`. Clicking either
  link hits the `path="*"` catch-all which redirects to `/dashboard`
  silently.
- **Impact:** Dead navigation. The user sees a "Documents" item but
  clicking it does nothing visible (they stay on /dashboard, or land on
  /dashboard if they were elsewhere).
- **Recommended fix:** Either implement minimal pages
  ("Coming soon" placeholders are fine for Phase 1) or remove the
  links from the sidebar until the pages exist. Confirm with product
  whether these are planned features.

### P2-003 — `LoginForm` "Forgot password?" link goes to a non-existent route

- **Files:** `src/components/auth/LoginForm.jsx` line 123–128.
- **Evidence:** `<Link to="/forgot-password">Forgot password?</Link>`.
  No `/forgot-password` route in `App.jsx`. Clicking → catch-all →
  redirect to `/dashboard` → `ProtectedRoute` → `/login`. So clicking
  "Forgot password?" on the login page does… nothing visible.
- **Impact:** Users who genuinely forgot their password get no path
  forward.
- **Recommended fix:** Either build a basic `/forgot-password` page
  (a simple form that POSTs an email) or remove the link until the
  backend supports password reset. Cross-reference `BACKEND_HANDOVER.md`
  §3 for the proposed endpoint.

### P2-004 — `TopBar` notifications panel has non-functional CTAs

- **Files:** `src/components/layout/TopBar.jsx` lines 99–101, 117–120,
  and the entire `notifications` array (lines 6–11) which is hardcoded.
- **Evidence:** The notification dropdown has:
  - "Mark all read" — `<span>` styled like a link with `cursor: pointer`
    but **no `onClick`**.
  - "View all notifications" — same problem.
  - The notifications themselves are hardcoded at the top of the file
    (4 entries), never updated, never fetched.
  - The bell badge count (`unreadCount`) is computed from the
    hardcoded list and so is constant.
- **Impact:** The bell icon shows a red "2" badge permanently. Users
  who try to dismiss notifications get no feedback. Once a backend
  exists this becomes a real feature to wire up.
- **Recommended fix:** Stub `onClick` handlers (e.g.
  `setNotifications(prev => prev.map(n => ({ ...n, unread: false })))`
  for "Mark all read") so the UI is at least internally consistent,
  then add a TODO for backend integration. See `BACKEND_HANDOVER.md` §7.

### P2-005 — `ExpensesPage.jsx` inline `CategoryBreakdown` + category tabs use `cat.Icon` (capital I) but data has `icon` (lowercase)

- **Files:** `src/pages/ExpensesPage.jsx` lines 96, 251; `src/data/mockData.js` lines 197–206.
- **Evidence:** `expenseCategories` in `mockData.js`:
  ```js
  { id: 'stock', label: 'Stock Purchase', icon: 'Package', color: '#16a34a', bg: '#f0fdf4' },
  ```
  Each entry has lowercase `icon` (a string). But in `ExpensesPage.jsx`:
  ```js
  const Icon = cat.Icon;     // line 96 (CategoryBreakdown inside ExpensesPage)
  {Icon && <Icon size={14} …/>}   // never renders — cat.Icon is undefined
  …
  const Icon = cat.Icon;     // line 251 (category tabs)
  {Icon && <Icon size={12} />}    // never renders
  ```
  Compare with `src/components/expenses/ExpenseModal.jsx` line 109,
  which does it correctly:
  ```js
  const SelectedCatIcon = selectedCat ? (iconMap[selectedCat.icon] ?? Wrench) : null;
  ```
  Note that the **external** `src/components/expenses/CategoryBreakdown.jsx`
  also does it correctly (line 53: `iconMap[cat.icon]`), but it is
  **never imported by `ExpensesPage`** — the page uses its own inline
  re-implementation.
- **Impact:** Every category icon in the Expenses page's breakdown
  panel and category tab strip is blank (just the colored background
  square, no Lucide icon). Visual regression only; data still works.
- **Recommended fix:** Replace `cat.Icon` with
  `iconMap[cat.icon] ?? Wrench` in `ExpensesPage.jsx` (and consider
  deleting the inline `CategoryBreakdown` and importing the external
  one — see P3-006).

### P2-006 — `TopSellersTable.jsx` renders `item.emoji` but data has no `emoji` field

- **Files:** `src/components/dashboard/TopSellersTable.jsx` line 63;
  `src/data/mockData.js` lines 31–36.
- **Evidence:**
  ```js
  // mockData.js
  export const topSellers = [
    { id: 1, icon: 'Shirt', bg: '#fce7f3', iconColor: '#9d174d', name: 'Ankara Gown (M)', … },
    …
  ];
  ```
  ```jsx
  // TopSellersTable.jsx line 60–64
  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
    style={{ background: item.bg }}>
    {item.emoji}      {/* ← emoji is undefined; renders nothing */}
  </div>
  ```
- **Impact:** Every product icon in the dashboard's "Top Sellers" table
  is blank. The coloured background is shown, but no icon. The comment
  on line 62 (`Render item emoji as text — this stays since it's
  product art not UI`) suggests this used to be an emoji before the
  icon refactor, and the migration left this site behind.
- **Recommended fix:** Use the same `ItemIcon` helper that
  `InventoryPage` uses (`src/utils/inventoryIcons.jsx`), passing
  `iconName={item.icon}` and `bg={item.bg}`.

### P2-007 — `ExpenseDeleteModal.jsx` uses `cat?.emoji` but data has no `emoji` field

- **Files:** `src/components/expenses/ExpenseDeleteModal.jsx` line 26;
  `src/data/mockData.js` `expenseCategories` (lines 197–206).
- **Evidence:**
  ```jsx
  {cat?.emoji ?? '🔧'}    // cat.emoji is always undefined → always renders the wrench emoji
  ```
  All other modals (e.g. `ExpenseModal.jsx`) correctly do
  `iconMap[cat.icon]`. This file was missed in the icon refactor.
- **Impact:** The category icon in the delete-confirmation modal is
  always the wrench emoji `🔧`, regardless of the expense's actual
  category. Minor visual bug.
- **Recommended fix:** Mirror the pattern in `ExpenseModal.jsx`:
  ```js
  import { Package, Home, Truck, Zap, Megaphone, Users, MailOpen, Wrench } from 'lucide-react';
  const iconMap = { Package, Home, Truck, Zap, Megaphone, Users, MailOpen, Wrench };
  …
  const CatIcon = cat ? (iconMap[cat.icon] ?? Wrench) : Wrench;
  …
  <CatIcon size={18} style={{ color: cat?.color ?? '#6b7280' }} />
  ```

### P2-008 — Mock auth accepts any credentials (no real validation)

- **Files:** `src/context/AuthContext.jsx` lines 13–34 (login), 37–56 (signup).
- **Evidence:**
  ```js
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // password is ignored — eslint: 'password' is defined but never used
      const mockUser = { id: 1, email, firstName: 'Business', lastName: 'Owner', businessName: 'My Store' };
      setUser(mockUser);
      return { success: true };
    } catch (error) {
      return { success: false, message: 'Login failed' };
    } finally { setIsLoading(false); }
  };
  ```
  The `catch (error)` block also has `error` unused — i.e. **the try
  block literally cannot throw**, so the failure branch is unreachable.
  Same pattern in `signup()`.
- **Impact:**
  - **In production this would be a P0 security exposure.** Any string
    for email + any 6+ char password authenticates the user as the
    "Business Owner" of "My Store". There is no real user record, no
    password hash, no token.
  - Currently the app is a frontend prototype, so it is "P2". The
    instant a backend exists, this *must* be replaced with a real
    `POST /auth/login` call that returns a token.
- **Recommended fix:** Already covered by the handover plan in
  `BACKEND_HANDOVER.md` §1. Frontend side: change `login(email, password)`
  to actually send a `POST` request, throw on non-2xx, and store the
  returned token. Make the `catch` branch meaningful.

### P2-009 — `CustomerModal.jsx` phone regex is far too permissive

- **Files:** `src/components/customers/CustomerModal.jsx` line 82.
- **Evidence:**
  ```js
  else if (!/^[0-9+\s\-]{7,15}$/.test(form.phone)) e.phone = 'Enter a valid phone number';
  ```
  This regex matches `"+++++++"`, `"------"`, `"       "` (all spaces),
  `" +-+-+- "`, etc. — any 7–15 char string of digits, plus signs,
  hyphens, or spaces. No requirement that digits actually be present.
- **Impact:** Garbage data can be saved as a phone number, which would
  break any future SMS notification feature and look bad in customer
  profile views.
- **Recommended fix:** A stricter regex, e.g.
  `/^\+?[0-9]{7,15}$/` (optional `+` prefix, then 7–15 digits, no
  internal spaces) and strip whitespace before validation. Coordinate
  with backend so the same rule is enforced server-side.

### P2-010 — `index.html` references `/vite.svg` as favicon but file does not exist

- **Files:** `index.html` line 5; `public/` directory listing.
- **Evidence:** `index.html` has:
  ```html
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  ```
  But `public/` contains only `favicon.svg` and `icons.svg`. `vite.svg`
  is the default Vite template favicon and was never replaced. Browser
  devtools network tab shows a 404 for `/vite.svg`.
- **Impact:** The browser tab shows no favicon (broken icon).
- **Recommended fix:** Replace `href="/vite.svg"` with
  `href="/favicon.svg"`. Optionally, replace the contents of
  `public/favicon.svg` (currently the default Vite purple `#863bff`
  lightning bolt) with a Stockwise-branded mark (e.g. a green `Package`
  Lucide-style icon). Low effort, high polish.

### P2-011 — TopBar search input is decorative (no logic)

- **Files:** `src/components/layout/TopBar.jsx` lines 62–69 (desktop
  search), 145–153 (mobile search).
- **Evidence:** The search input has no `value`, `onChange`, or
  `onSubmit` — it's an uncontrolled input with no behaviour. Whatever
  the user types is silently discarded.
- **Impact:** Users will type a product/customer name expecting search
  results and get nothing.
- **Recommended fix:** Either wire it up (open a global command palette
  that filters across inventory + customers + vendors + sales —
  non-trivial) or, in the interim, change the placeholder to
  `"Search (coming soon)"` and disable the input to set expectations.

### P2-012 — Mobile bottom nav is missing 4 of the 9 sidebar sections

- **Files:** `src/components/layout/MobileNav.jsx` lines 8–14.
- **Evidence:**
  ```js
  const items = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home'  },
    { to: '/inventory', icon: Package,          label: 'Stock' },
    { to: '/sales',     icon: ShoppingCart,     label: 'Sales' },
    { to: '/customers', icon: Users,            label: 'People'},
    { to: '/reports',   icon: BarChart3,        label: 'Reports'},
  ];
  ```
  Sidebar has 9 sections (Dashboard, Inventory, Sales, Customers,
  Vendors, Expenses, Reports, Documents, Settings). Mobile nav has 5
  (no Vendors, Expenses, Documents, Settings).
- **Impact:** On mobile, users can't reach Vendors, Expenses, or
  Settings without typing the URL. (And given P1-001, even that won't
  work because of the auth redirect.)
- **Recommended fix:** Replace one of the items (e.g. move "Reports"
  out, since it's a less-frequent destination) with a "More" item
  that opens a sheet listing Vendors / Expenses / Documents /
  Settings. Or use a 6-item nav. Confirm with design.

### P2-013 — `handleExport` is a stub (`console.log`) across all pages

- **Files:** `src/pages/DashboardPage.jsx` line 128, `InventoryPage.jsx`
  (Bulk Upload + Export buttons have no `onClick`), `SalesPage.jsx`
  (Export button has no `onClick`), `CustomersPage.jsx` (Import button
  has no `onClick`), `VendorsPage.jsx` (Import button has no `onClick`),
  `ExpensesPage.jsx` (Export button has no `onClick`), `ReportsPage.jsx`
  (Export PDF button has no `onClick`).
- **Evidence:** Every page has an "Export" or "Import"/"Bulk Upload"
  button in its `headerActions` JSX that is visually prominent but
  either has no `onClick` at all, or in the dashboard case calls
  `console.log('Export dashboard data')`.
- **Impact:** Users clicking any of these buttons get no feedback.
  Looks unpolished.
- **Recommended fix:** Wire up real CSV export using a small client-side
  helper (build a Blob from the current page's data, trigger a
  download). Bulk import can be a file picker that parses CSV. Both are
  achievable without a backend. For PDF export on the Reports page,
  use `window.print()` with the existing `@media print` CSS in
  `index.css` as a stop-gap.

### P2-014 — `DashboardPage` period selector and quick filters are non-functional

- **Files:** `src/pages/DashboardPage.jsx` lines 88, 257–270 (period
  toggle), 301–306 (quick filter chips).
- **Evidence:**
  - `const [period, setPeriod] = useState('today');` — the state
    changes, but `liveStats` (`useMemo`) is computed unconditionally
    without referencing `period`. The period toggle is purely visual.
  - The "Low Stock", "Pending Orders", "Out of Stock" quick filter
    chips have no `onClick` at all.
- **Impact:** The "Today / Week / Month" toggle visibly changes the
  active button but does not change any displayed number. Misleading.
- **Recommended fix:** Either remove the period toggle until backend
  can filter, or compute the live stats with respect to `period`
  (today = today's date; week = last 7 days; month = current month).

### P2-015 — `ReportsPage` period selector and Export PDF button are non-functional

- **Files:** `src/pages/ReportsPage.jsx` lines 64–69 (periods), header
  export button.
- **Evidence:** `const [period, setPeriod] = useState('month')` (or
  similar) is declared but `period` is never read in the render logic.
  The Export PDF button has no `onClick`.
- **Impact:** Same as P2-014 — looks interactive, isn't.
- **Recommended fix:** Same as P2-014. For the export, wire up
  `window.print()` as a stop-gap (the existing `@media print` CSS will
  apply).

### P2-016 — `Sidebar.jsx` "Sales" badge is hardcoded to `3`

- **Files:** `src/components/layout/Sidebar.jsx` line 18
  (`{ to: '/sales', icon: ShoppingCart, label: 'Sales', badge: 3 }`).
- **Evidence:** `badge: 3` is a literal. It is rendered as a red pill
  with "3" next to the Sales link, regardless of the actual number of
  pending orders.
- **Impact:** Misleading. The dashboard's "Pending Orders" count and
  the sidebar badge can disagree.
- **Recommended fix:** Either remove the badge until it can be
  data-driven, or compute it from the auth context / a future
  notifications API.

---

## P3 — Low

### P3-001 — `App.jsx` imports `useCallback` but never uses it

- **File:** `src/App.jsx` line 2.
- **Evidence:** `import { lazy, Suspense, useCallback } from 'react';`
  — `useCallback` is never called. ESLint flags this as
  `no-unused-vars`.
- **Impact:** Pure noise.
- **Recommended fix:** Remove `useCallback` from the import.

### P3-002 — `index.html` loads `Syne` font but no element uses it

- **File:** `index.html` line 9; `tailwind.config.js` (font config),
  `src/index.css` (body font).
- **Evidence:** `index.html` loads both `Syne` (display) and `DM Sans`
  (body) from Google Fonts. But `tailwind.config.js` only sets
  `fontFamily.sans: ['Inter', …]` (note: `Inter` is referenced but
  never loaded — another inconsistency), and `index.css` sets
  `body { font-family: 'DM Sans', system-ui, sans-serif; }`. Nothing
  applies `Syne`.
- **Impact:** Extra web font download with no visual benefit. Also,
  `tailwind.config.js` mentions `Inter` which is never loaded — so any
  class using `font-sans` would fall back through `Inter` (missing) →
  `system-ui`.
- **Recommended fix:** Decide on a type system (e.g. Syne for
  headings, DM Sans for body) and apply it consistently in
  `tailwind.config.js` (`fontFamily: { sans: ['DM Sans', …],
  display: ['Syne', …] }`) and use `font-display` on headings.

### P3-003 — `src/assets/hero.png` exists but is never imported

- **File:** `src/assets/hero.png`.
- **Evidence:** `grep -r 'hero.png' src/` returns zero hits.
- **Impact:** Dead asset, shipped with the bundle for no reason.
- **Recommended fix:** Delete, or wire up (e.g. on the login page left
  panel instead of the current gradient + text).

### P3-004 — `src/components/expenses/CategoryBreakdown.jsx` is unused (dead code)

- **File:** the whole file.
- **Evidence:** `ExpensesPage.jsx` defines its own inline
  `CategoryBreakdown` function (lines 74–127) and never imports the
  external one. `grep -r 'components/expenses/CategoryBreakdown' src/`
  returns zero hits.
- **Impact:** Maintenance burden — two implementations of the same
  concept, and the unused one is actually slightly better (it has a
  proper "No expenses recorded yet" empty state and uses the correct
  `iconMap[cat.icon]` lookup).
- **Recommended fix:** Delete the inline version in `ExpensesPage.jsx`,
  import the external one. This also fixes P2-005 for free.

### P3-005 — `CustomerModal` and `VendorModal` use `Math.random()` to pick avatar colors

- **Files:** `src/components/customers/CustomerModal.jsx` line 95,
  `src/components/vendors/VendorModal.jsx` line 104.
- **Evidence:**
  ```js
  const colorPair = avatarColors[Math.floor(Math.random() * avatarColors.length)];
  ```
  This is fine on first creation, but if the same record is later
  edited (and `editCustomer.color` was already set), the existing
  color is preserved (the `?? colorPair.color` falls through to the
  random one only if there is no existing color). So actually this is
  mostly OK — but the call to `Math.random()` still runs even when
  not needed, which is wasteful and a lint warning (P1-004 covers the
  `react-hooks/purity` warning that fires from this line).
- **Impact:** Cosmetic / minor perf.
- **Recommended fix:** Compute the random color lazily — only when
  `editCustomer?.color` is missing:
  ```js
  const colorPair = editCustomer?.color ? null : avatarColors[Math.floor(Math.random() * avatarColors.length)];
  …
  color: editCustomer?.color ?? colorPair.color,
  ```

### P3-006 — Dashboard's "Today's Revenue" will always be ₦0 because mock sales are dated March 2026

- **Files:** `src/pages/DashboardPage.jsx` lines 91–108;
  `src/data/mockData.js` `salesData` (dates in March 2026).
- **Evidence:** `liveStats.todayRevenue` filters `salesData` by
  `new Date(s.date).toDateString() === todayStr`. The mock sales are
  all dated 2026-03-14 to 2026-03-21. Audit ran on 2026-10-17. So
  "today's revenue" is always ₦0.
- **Impact:** Misleading "Today" stat that always shows zero. The
  "This Week" stat also always shows ₦0 for the same reason.
- **Recommended fix:** Either re-date the mock data to be relative to
  `new Date()` at app startup, or surface a banner like "Demo data —
  last updated March 2026" on the dashboard. Once a backend exists,
  this becomes moot.

### P3-007 — Console warning: Browserslist data is 7 months old

- **Evidence:** `npm run build` prints:
  ```
  Browserslist: browsers data (caniuse-lite) is 7 months old. Please run:
  npx update-browserslist-db@latest
  ```
- **Impact:** Build target data is stale; new browser versions released
  in the last 7 months may not be correctly targeted.
- **Recommended fix:** `npx update-browserslist-db@latest` then commit
  the lockfile change.

### P3-008 — `App.jsx` catch-all redirects unknown URLs to `/dashboard` (silent)

- **File:** `src/App.jsx` line 96.
- **Evidence:** `<Route path="*" element={<Navigate to="/dashboard" replace />} />`.
- **Impact:** A typo'd URL (e.g. `/invnetory`) silently redirects to
  `/dashboard`. Bad for user mental model. Also, if unauthenticated,
  the redirect chain is `/invnetory → /dashboard → (ProtectedRoute)
  → /login` — so the user lands on login with no explanation.
- **Recommended fix:** Implement a proper 404 page (small component,
  friendly message, link back to dashboard).

### P3-009 — `ReportsPage` is 578 lines and growing; consider splitting

- **File:** `src/pages/ReportsPage.jsx`.
- **Evidence:** Single file contains `ChartTip`, `DonutTip`,
  `tabs` config, `periods` config, `ReportCard`, `KpiPill`,
  `HealthBanner`, `SalesReport`, `InventoryReport`,
  `CustomersReport`, `ExpensesReport`, and the main `ReportsPage`.
- **Impact:** Maintainability. Hard to test in isolation later.
- **Recommended fix:** Extract each `*Report` sub-component to
  `src/components/reports/` and let `ReportsPage` be a thin shell.

### P3-010 — Avatar initials calculation is fragile for single-word names

- **Files:** `src/components/vendors/VendorModal.jsx` line 105,
  `src/components/sales/NewSaleModal.jsx` line 121.
- **Evidence:**
  ```js
  const initials = form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  ```
  If `form.name = "Lagos"` (single word), initials = `"L"` (one
  letter). If `form.name = ""`, `w[0]` throws `TypeError: Cannot read
  properties of undefined`.
- **Impact:** Crash on empty input during form completion — but the
  `name` field is required, so the form would not normally submit
  empty. Still, the calculation is fragile.
- **Recommended fix:** Guard: `(w[0] ?? '')`.

### P3-011 — `forgot-password` route is referenced from two places but never declared

- **Files:** `src/components/auth/LoginForm.jsx` line 123.
- **Evidence:** Already covered in P2-003. Listed separately here
  because the fix is different (build the page vs. remove the link).

### P3-012 — `vite.config.js` `manualChunks` may split d3 packages that recharts bundles internally

- **File:** `vite.config.js` lines 24–29.
- **Evidence:**
  ```js
  if (id.includes('d3-shape') || id.includes('d3-scale') || id.includes('d3-array')) {
    return 'vendor-d3';
  }
  ```
  recharts depends on these d3 packages. Splitting them out is fine,
  but if recharts ever pins a different d3 version than the one Vite
  hoists, the manual chunk can cause version-mismatch runtime errors.
- **Impact:** Low — current build succeeds. Future risk only.
- **Recommended fix:** Remove the d3 split unless there's a measurable
  performance reason for it; recharts already bundles d3 internally.

### P3-013 — Production bundle size: `vendor-recharts` is 321 KB (89 KB gzip)

- **File:** `dist/assets/vendor-recharts-*.js`.
- **Evidence:** Build output:
  ```
  dist/assets/vendor-recharts-DnfHbHJs.js   320.89 kB │ gzip: 88.72 kB
  ```
  recharts is heavy. Combined with `vendor-react` (253 KB / 81 KB gzip)
  the total initial JS is large for a dashboard app.
- **Impact:** Slow first load on mobile networks.
- **Recommended fix:** Consider lighter charting libraries (e.g.
  `visx`, `chart.js` with tree-shaking, or hand-rolled SVG for the
  simple bar/donut charts). Defer until perf becomes a measured
  problem.

### P3-014 — `Login` "OR" divider has no purpose

- **File:** `src/components/auth/LoginForm.jsx` lines 194–199.
- **Evidence:** An "OR" divider between the sign-in form and the
  "Create one free" link — but no OAuth/social SSO option exists.
- **Impact:** Misleading; user expects an alternative auth method
  below the divider.
- **Recommended fix:** Remove the divider, or add Google/GitHub SSO
  once backend supports it.

### P3-015 — `TopBar` notifications list mixes date-relative text ("5m ago") that will become stale

- **File:** `src/components/layout/TopBar.jsx` lines 6–11.
- **Evidence:** `"time: '5m ago'"` is hardcoded. It will say "5m ago"
  forever.
- **Impact:** Cosmetic staleness.
- **Recommended fix:** Either remove time stamps until backend can
  supply real ones, or compute them from a `notif.createdAt` ISO
  string.

### P3-016 — `index.html` has a leftover comment `<!-- ADD THIS LINE below ↓ -->`

- **File:** `index.html` line 8.
- **Evidence:** `<-- ADD THIS LINE below ↓ -->` is a developer note
  that was committed.
- **Impact:** Unprofessional.
- **Recommended fix:** Delete the comment line.

---

## Summary table

| Priority | Count | IDs                                                            |
| -------- | ----- | ------------------------------------------------------------- |
| **P0**   | 0     | —                                                             |
| **P1**   | 5     | P1-001 … P1-005                                               |
| **P2**   | 16    | P2-001 … P2-016                                               |
| **P3**   | 16    | P3-001 … P3-016                                               |
| **Total**| 37    |                                                               |

The **absence of P0 items** is intentional. The current state of the
app — a frontend-only prototype with no backend, no real auth, no
database, and no production deployment — means there is no production
security exposure yet. The items that would become P0 in production
(mock auth accepting any credentials, no HTTPS, no CSRF, etc.) are
flagged as **P2** here and will be promoted to P0 in `BACKEND_HANDOVER.md`
where they belong.

## Recommended order of remediation (before backend handover)

1. **P1-002** (Rules of Hooks in `NewSaleModal`) — unblocks the primary
   "create sale" user journey. ~30 min fix.
2. **P1-001 + P1-003** (session persistence + dashboard CTAs) — fix
   together. ~1–2 hours.
3. **P1-004** (lint errors) — fixes a class of bugs at once. ~2 hours.
4. **P1-005** (npm audit) — `npm audit fix`, re-test build. ~30 min.
5. **P2-001** (error boundary) — defensive scaffold. ~30 min.
6. **P2-002, P2-003, P2-010** (dead links, missing favicon) — small
   polish. ~1 hour.
7. **P2-005, P2-006, P2-007** (icon rendering bugs) — small UI fixes
   that visibly improve polish. ~1 hour.
8. **P2-013, P2-014, P2-015** (non-functional buttons) — either wire
   up or label as "coming soon". ~2 hours.
9. All P3 items — defer until after backend integration, except
   P3-004 (delete dead `CategoryBreakdown` external file or
   switch to it) which is best done during P2-005.

This order is proposed — not approved. The audit phase is complete;
no code changes have been made. Awaiting approval to proceed with
remediation.
