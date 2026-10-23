# Stockwise — Frontend Handover for Backend Integration

This document describes the Stockwise frontend as delivered. It is written for
the backend engineer who will integrate with it. It documents what the
frontend provides, what API contracts it calls, what response shapes it
expects, and which integration points are verified versus unverified.

The backend architecture — database schema design, Row-Level Security
policies, server-side business logic, RPC implementation, deployment
topology, and operational configuration — is the backend developer's
independent responsibility and is not specified here.

Where the frontend makes an assumption about the shape of a response or the
name of a callable, that assumption is documented as an **integration
assumption requiring confirmation**. Backend developers should confirm or
renegotiate those assumptions before relying on them.

All claims in this document are derived from the actual source code in
`src/services/*Supabase.js`, `src/lib/supabase.js`, `src/context/*.jsx`, and
`src/pages/*.jsx`. No endpoints, fields, or behaviours are invented.

---

## 1. Frontend architecture

### 1.1 Application type and entry point

Stockwise is a single-page React application. The application entry is
`src/main.jsx`, which renders `src/App.jsx`. Routing uses
`react-router-dom` 7.13 with `BrowserRouter` and a nested `<Route>` tree.

### 1.2 Source layout

| Directory | Responsibility |
| --- | --- |
| `src/pages/` | Top-level route components. |
| `src/components/` | Presentational components and modals, grouped by domain (`auth/`, `common/`, `customers/`, `dashboard/`, `expenses/`, `inventory/`, `layout/`, `sales/`, `vendors/`). |
| `src/context/` | React context providers: `AuthProvider` (auth session) and `BusinessProvider` (active-business selection). Bare context objects live in `auth-context-instance.js` and `business-context-instance.js` so they can be imported by tests without triggering the provider's `useEffect`. |
| `src/lib/` | Typed env access (`env.js`) and the Supabase client singleton (`supabase.js`). |
| `src/services/` | Data-access layer. One module per domain, each with a mock variant and a Supabase-backed variant. The active variant is selected by `src/services/index.js` at import time. |
| `src/data/` | `mockData.js` — seed data for demo mode plus the category / type / status enumerations used by select dropdowns. |
| `src/utils/` | Pure helpers (`inventoryIconData.js`, `inventoryIcons.jsx`). |
| `src/test/` | Vitest setup (`setup.js`). |

### 1.3 Technologies

| Layer | Choice |
| --- | --- |
| Framework | React 19.2 |
| Routing | react-router-dom 7.13 |
| Language | JavaScript (JSX) |
| Build tool | Vite 8 (with `@vitejs/plugin-react`, Rolldown) |
| Styling | Tailwind CSS 3.4 |
| Charts | recharts 3.8 |
| Icons | lucide-react 0.577 |
| Auth + data client | `@supabase/supabase-js` 2.118 |
| Lint | ESLint 9.39 flat config |
| Tests | Vitest 5 + `@testing-library/react` 16 + jsdom 25 |

### 1.4 Route tree (verified in `src/App.jsx`)

| Path | Component | Guard |
| --- | --- | --- |
| `/` | redirects to `/login` | none |
| `/login` | `LoginPage` | `AuthRoute` (redirects to `/dashboard` if already signed in) |
| `/signup` | `SignupPage` | `AuthRoute` |
| `/forgot-password` | `ForgotPasswordPage` | public |
| `/reset-password` | `ResetPasswordPage` | public |
| `/dashboard` | `DashboardPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/inventory` | `InventoryPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/sales` | `SalesPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/customers` | `CustomersPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/vendors` | `VendorsPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/expenses` | `ExpensesPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/reports` | `ReportsPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/settings` | `SettingsPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `/documents` | `DocumentsPage` | `ProtectedRoute` + `BusinessReadyGate` |
| `*` | `NotFoundPage` | none |

`ProtectedRoute` wraps children in `BusinessProvider` and shows a loader
while `BusinessProvider` is resolving the active business. `BusinessReadyGate`
additionally shows a "Business setup error" screen if provisioning fails.

Every lazy-loaded page is wrapped in an `ErrorBoundary` so a runtime crash in
one page does not blank out the whole app.

---

## 2. Operating modes

The frontend has two operating modes, selected at module import time.

### 2.1 Demo mode (default)

Triggered when either `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY`
is empty. In this mode:

- The Supabase client singleton in `src/lib/supabase.js` is `null`.
- The service layer in `src/services/index.js` selects the mock variant
  for every domain.
- `AuthProvider` accepts any email + password and persists a clearly
  labelled demo user to `localStorage` under the key
  `stockwise.demoUser`. This is a development convenience, not a
  parallel auth system.
- `BusinessProvider` synthesises an `activeBusinessId = 'demo-business'`
  sentinel.
- The `DemoModeBanner` component renders at the top of every page so
  the user is not misled into thinking data is real.

In demo mode, **no network calls are made** — the app is fully offline.

### 2.2 Supabase mode

Triggered when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
are present in the build environment. In this mode:

- The Supabase client singleton is constructed once with
  `{ persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }`.
- The service layer selects the `*Supabase.js` variants.
- `AuthProvider` delegates to Supabase Auth (`signInWithPassword`,
  `signUp`, `signOut`, `getSession`, `onAuthStateChange`).
- `BusinessProvider` calls `businessesService.listMyBusinesses()` and, if
  the user has zero businesses, calls `businessesService.createBusiness()`
  to provision one.
- The `DemoModeBanner` does NOT render.

### 2.3 Mode detection

The single detection point is `isSupabaseConfigured` in `src/lib/env.js`:

```js
export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_PUBLISHABLE_KEY.length > 0;
```

`src/services/index.js` consumes this flag at import time and selects the
active service variant per domain. Page components are agnostic to which
mode is active.

---

## 3. Frontend service layer

### 3.1 Pattern

Each domain (inventory, sales, customers, vendors, expenses, dashboard,
reports) has two service modules:

- `src/services/<domain>Mock.js` — in-memory implementation used in demo
  mode. Mutations do not persist across a page reload.
- `src/services/<domain>Supabase.js` — Supabase-backed implementation used
  in Supabase mode. Reads and writes go through the Supabase JS client.

The `businesses` domain is the exception: it has a `businessesSupabase.js`
module but no `businessesMock.js` — businesses only make sense when the
auth user is a real Supabase user with real business memberships. In demo
mode, the switch-point in `src/services/index.js` returns an inlined
mock-shaped object (`{ listMyBusinesses: async () => ({ data: [], error: null }), createBusiness: async () => ({ ... 'DEMO_MODE' }), getMyFirstBusinessId: async () => null }`).

`src/services/index.js` is the single switch-point. Page components import
from `src/services` (not directly from a variant), so the active mode is
encapsulated.

### 3.2 Return-shape contract

Every service function returns `{ data, error, pagination }`:

- `data` — the shaped result row(s), or `null` on error.
- `error` — `{ code, message }` or `null`. `code` is the PostgREST error
  code for Supabase calls (e.g. `'P0001'` for a raised exception,
  `'23505'` for a unique violation) or a frontend-defined sentinel
  (`'NOT_CONFIGURED'`, `'NOT_FOUND'`).
- `pagination` — `{ page, pageSize, total, totalPages }` for `list()`
  calls; `null` for single-record calls.

The frontend does NOT throw on Supabase errors. It checks `error` and
renders an `ErrorState` component (see `src/components/common/ResourceState.jsx`).

### 3.3 List-function parameters

Service `list()` calls accept a uniform options object:

```js
{
  search:    string,        // case-insensitive ilike on name/sku/etc.
  status:    string | 'All',
  category:  string | 'All',
  payment:   string | 'All',
  type:      string | 'All',
  sort:      '<field>:asc' | '<field>:desc',
  page:      number,         // 1-indexed
  pageSize:  number,         // default 100
  businessId: string,        // informational; isolation is enforced server-side
}
```

The frontend passes `businessId` from `useBusiness()` so server-side code
can use it if desired. The frontend treats the server as the security
boundary — the client cannot trust the supplied `business_id`.

---

## 4. Frontend API integration points

This section documents each Supabase-backed service module: the functions
it exposes, what they call on the Supabase client, what payload shape they
send, and what response shape they expect. The shape names referenced
(e.g. `sw_inventory_items`) are the names the frontend literally queries
via the Supabase JS client — they are observable in the source code. The
backend developer should confirm that those names match their backend
implementation.

Verification status legend:

- **mock-tested** — the function is exercised by an automated test
  against the mock variant (in `src/services/supabaseServices.test.js`).
- **supabase-tested (prior)** — the function was tested against a live
  Supabase project in an earlier development phase, but the test is not
  part of the local automated suite (it required credentials).
- **unverified** — the function is implemented but has not been tested
  against a live backend in this code path.
- **not implemented** — the function is a stub or returns hardcoded
  values.

### 4.1 Authentication — `src/context/AuthContext.jsx`

| Operation | Frontend call | Payload | Expected response | Verification |
| --- | --- | --- | --- | --- |
| Sign in | `supabase.auth.signInWithPassword({ email, password })` | email + password | `{ data: { session, user }, error }` | supabase-tested (prior) |
| Sign up | `supabase.auth.signUp({ email, password, options: { data: { firstName, lastName, businessName } } })` | email + password + user_metadata | `{ data: { session, user }, error }` (session may be `null` if email confirmation is required) | supabase-tested (prior) |
| Sign out | `supabase.auth.signOut()` | — | `{ error }` | supabase-tested (prior) |
| Restore session | `supabase.auth.getSession()` | — | `{ data: { session }, error }` | supabase-tested (prior) |
| Cross-tab sync | `supabase.auth.onAuthStateChange((event, session) => …)` | callback | `{ data: { subscription } }` | supabase-tested (prior) |
| Password reset | `supabase.auth.resetPasswordForEmail(email, { redirectTo: \`${VITE_PUBLIC_APP_URL}/reset-password\` })` | email + redirect URL | `{ data, error }` | supabase-tested (prior) |

The `redirectTo` value must be an entry in the Supabase project's "Redirect
URLs" list for the reset email link to be accepted. The `/reset-password`
route is implemented in `src/pages/auth/ResetPasswordPage.jsx`.

The `user_metadata` shape the frontend reads (set during signup via the
`data` option above) is `{ firstName, lastName, businessName }`.
`BusinessProvider` reads these on first login to auto-provision a business.

### 4.2 Businesses — `src/services/businessesSupabase.js`

| Function | Frontend call | Payload | Expected response | Verification |
| --- | --- | --- | --- | --- |
| `listMyBusinesses()` | `supabase.from('sw_business_memberships').select('role, business:sw_businesses!inner(id, name, type, currency, timezone, created_at, deleted_at)').is('business.deleted_at', null)` | — | Array of `{ id, name, type, currency, timezone, role, createdAt }` | mock-tested; supabase-tested (prior) |
| `createBusiness({ name, type, currency, timezone })` | `supabase.rpc('sw_create_business', { p_name, p_type, p_currency, p_timezone })` | RPC args | `{ business_id, name, type, currency, timezone, role }` | supabase-tested (prior) |
| `getMyFirstBusinessId()` | wraps `listMyBusinesses()` | — | UUID or `null` | supabase-tested (prior) |

**Note on user-scoping:** the frontend does NOT add a client-side
`user_id` filter to `listMyBusinesses()`. The `auth.uid()` function
is server-side only and cannot be called from the browser. The
filtering by the calling user is enforced entirely by RLS on the
`sw_business_memberships` table — the backend developer must ensure
the SELECT policy on `sw_business_memberships` filters by
`auth.uid()`.

**Integration assumption requiring confirmation:** The frontend assumes the
`sw_create_business` RPC accepts `(p_name text, p_type text, p_currency
text, p_timezone text)` and returns a JSON object containing at least
`business_id`, `name`, `type`, `currency`, `timezone`, and `role`. The
backend developer should confirm or renegotiate this signature.

### 4.3 Inventory — `src/services/inventorySupabase.js`

| Function | Frontend call | Payload | Expected response | Verification |
| --- | --- | --- | --- | --- |
| `list({ search, category, status, sort, page, pageSize })` | `supabase.from('sw_inventory_items').select('*', { count: 'exact' }).is('deleted_at', null)` + filters | — | Array of shaped rows + pagination | mock-tested; supabase-tested (prior) |
| `get(id)` | `supabase.from('sw_inventory_items').select('*').eq('id', id).maybeSingle()` | UUID | shaped row | mock-tested |
| `create({ businessId, name, sku, category, supplierId?, stock, threshold, costPrice, sellingPrice, lastRestocked? })` | `supabase.from('sw_inventory_items').insert({ … }).select().single()` | row | shaped row | mock-tested |
| `update(id, patch)` | `supabase.from('sw_inventory_items').update(dbPatch).eq('id', id).select().maybeSingle()` | UUID + patch | shaped row | mock-tested |
| `remove(id)` | soft delete via `supabase.from('sw_inventory_items').update({ deleted_at: now() }).eq('id', id)` | UUID | `{ id }` | mock-tested |
| `listCategories()` | hardcoded `['Clothing', 'Footwear', 'Accessories', 'Other']` | — | array | mock-tested |
| `listSuppliers()` | `supabase.from('sw_vendors').select('name').is('deleted_at', null).order('name')` | — | array of vendor names | mock-tested |
| `adjustStock(businessId, itemId, delta, note?)` | `supabase.rpc('sw_adjust_stock', { p_business_id, p_item_id, p_delta, p_note })` | RPC args | result object | mock-tested; supabase-tested (prior) |

The frontend's shaped row for an inventory item is:
`{ id, name, sku, category, supplier, stock, threshold, costPrice,
sellingPrice, lastRestocked, iconName, bg, createdAt, updatedAt }`.
`iconName` and `bg` are presentation-only fields derived from `category`
client-side — they are not stored server-side.

**Integration assumption requiring confirmation:** The frontend queries a
table named `sw_inventory_items` and reads / writes the columns listed
above (snake_case). It also calls an RPC named `sw_adjust_stock` with
`(p_business_id uuid, p_item_id uuid, p_delta integer, p_note text?)`. The
backend developer should confirm these names match their backend.

### 4.4 Sales — `src/services/salesSupabase.js`

| Function | Frontend call | Payload | Expected response | Verification |
| --- | --- | --- | --- | --- |
| `list({ search, status, payment, page, pageSize })` | `supabase.from('sw_sales').select('*, customer:customer_id(first_name, last_name)', { count: 'exact' }).is('deleted_at', null)` + filters | — | Array + pagination; each row's `customer.name` resolved via PostgREST embedding | mock-tested; supabase-tested (prior) |
| `get(id)` | `supabase.from('sw_sales').select('*, customer:customer_id(first_name, last_name)').eq('id', id).is('deleted_at', null).maybeSingle()` then fallback by `display_id` (same embedding). Then `supabase.from('sw_sale_items').select('qty, unit_price, item_id, item:item_id(name, sku)').eq('sale_id', row.id)` | UUID or display_id | shaped row with customer name + line-item names | mock-tested |
| `create({ businessId, customerId?, payment, status, note, items: [{ itemId, qty, unitPrice }] })` | `supabase.rpc('sw_create_sale', { p_payload: rpcPayload })` then `get(sale_id)` | RPC payload | `{ sale_id, display_id, total }` | mock-tested; supabase-tested (prior) |
| `update(id, patch)` | `supabase.from('sw_sales').update(dbPatch).eq('id', id).select().maybeSingle()` | UUID + patch | shaped row | mock-tested |
| `listPaymentMethods()` | hardcoded `['Cash', 'Transfer', 'Card']` | — | array | mock-tested |

The frontend's shaped row for a sale resolves customer + item names
via PostgREST resource embedding:
- `customer.name` → 'Walk-in' when `customer_id` is null.
- `customer.name` → real customer name when `customer_id` is non-null.
- `items[i].name` → real inventory item name when the FK resolves.
- `items[i].name` → 'Unavailable item' when the inventory item has
  been soft-deleted AND the FK relationship filters it out.

No mock data is fabricated — missing relationships render honestly.

The RPC payload the frontend constructs for `sw_create_sale` is:

```js
{
  business_id,
  customer_id: customerId ?? null,
  payment,                          // 'Cash' | 'Transfer' | 'Card'
  status: status ?? 'completed',    // 'completed' | 'pending' | 'cancelled'
  note: note ?? null,
  items: items.map(i => ({
    item_id: i.itemId ?? i.item_id,
    qty: Number(i.qty),
    unit_price: Number(i.unitPrice ?? i.unit_price),
  })),
}
```

The frontend expects the response to contain `{ sale_id, display_id, total }`
and re-fetches the full sale via `get(sale_id)` after the RPC returns.

**Frontend-side gap (known):** `list()` and `get()` do not currently join
`sw_customers` or `sw_inventory_items`. As a result, the Sales page shows
the customer name as `'Unknown'` and line-item names as `'Unknown item'`
in Supabase mode. This is a frontend-side implementation gap; the backend
developer should NOT assume the server is misconfigured. See Section 10.

**Integration assumption requiring confirmation:** The frontend assumes
`sw_create_sale` accepts a single JSON argument (`p_payload`) with the
shape above, returns `{ sale_id, display_id, total }`, and atomically
inserts the sale + decrements stock + writes ledger entries. The backend
developer should confirm this contract and the atomicity expectation.

### 4.5 Customers — `src/services/customersSupabase.js`

Standard PostgREST CRUD on a table the frontend queries as
`sw_customers`. The `get()` function also fetches up to 10 recent
`sw_sales` rows for the customer (the join to line items is not performed;
`orders[].items` is `0`). The `list()` function does not perform this
join either.

The frontend's shaped customer row is:
`{ id, firstName, lastName, email, phone, type, location, status, note,
joinDate, initials, color, textColor, totalSpent, totalOrders, lastOrder,
orders }`. `initials`, `color`, `textColor` are presentation-only and
derived client-side from the customer name. `totalSpent`, `totalOrders`,
`lastOrder`, and `orders` are computed in `get()` only (from up to 10
recent `sw_sales` rows for the customer, with `totalSpent` summing
completed-order totals). In `list()` these fields are returned as
`totalSpent: 0`, `totalOrders: 0`, `lastOrder: null`, `orders: []`
because `list()` does not perform the per-customer sales lookup (it
would be N+1 across the page).

**Integration assumption requiring confirmation:** The frontend queries a
table named `sw_customers` with snake_case columns matching the shaped
row above. The `listTypes()` and `listStatuses()` calls return hardcoded
lists (`['Retailer','Wholesale','Walk-in','E-commerce']` and
`['Active','New','Owing','Inactive']` respectively). The backend developer
should confirm whether these enumerations should be enforced server-side
or remain frontend-only.

### 4.6 Vendors — `src/services/vendorsSupabase.js`

| Function | Frontend call | Payload | Expected response | Verification |
| --- | --- | --- | --- | --- |
| `list({ search, category, status, page, pageSize })` | `supabase.from('sw_vendors').select('*', { count: 'exact' }).is('deleted_at', null)` + filters | — | Array + pagination | mock-tested |
| `get(id)` | `supabase.from('sw_vendors').select('*').eq('id', id).is('deleted_at', null).maybeSingle()` then fetches 10 recent POs + batch-fetches `sw_purchase_order_items` per PO to populate `orders[i].items` with real line-item counts | UUID | shaped row with `orders[]` (items count is real, not 0) | mock-tested |
| `create({ businessId, name, contactPerson, email?, phone, category, location, status, leadTimeDays, rating, note? })` | `supabase.from('sw_vendors').insert({ … }).select().single()` | row | shaped row | mock-tested |
| `update(id, patch)` | `supabase.from('sw_vendors').update(dbPatch).eq('id', id).select().maybeSingle()` | UUID + patch | shaped row | mock-tested |
| `remove(id)` | soft delete | UUID | `{ id }` | mock-tested |
| `placeOrder(vendorId, newOrder, total)` | 1. `supabase.from('sw_vendors').select('business_id').eq('id', vendorId).maybeSingle()` 2. `supabase.rpc('next_display_id', { p_business_id, p_entity: 'purchase_order' })` 3. `supabase.from('sw_purchase_orders').insert({ … }).select().single()` 4. `supabase.from('sw_purchase_order_items').insert(lineItems)` | — | PO header + line items | mock-tested; supabase-tested (prior) |
| `receivePurchaseOrder(purchaseOrderId)` | resolves display_id → UUID if needed, then `supabase.rpc('sw_receive_purchase_order', { p_purchase_order_id: uuid })` | display_id or UUID | result object | mock-tested; **unverified** against live backend in this branch |

The frontend sends the PO line items as `newOrder.lineItems` — an array
of `{ name, qty, unitPrice }`. The `newOrder.items` field (a number, the
count of items) is for display compatibility only; the Supabase service
uses `Array.isArray(newOrder.lineItems)` to find the array.

The `receivePurchaseOrder` function accepts either a UUID or a
`display_id` (e.g. `PO-001`). If the input does not match the UUID
regex, it looks up the UUID from `sw_purchase_orders.display_id` first,
then calls the RPC. This is so the rest of the app can keep using the
user-facing `display_id`.

**Integration assumption requiring confirmation:** The frontend assumes an
RPC named `sw_receive_purchase_order` exists that accepts a single UUID
argument (`p_purchase_order_id`) and atomically marks the PO as delivered
+ increments inventory stock + writes stock-movement ledger entries. The
backend developer should confirm this contract and the idempotency
expectation (calling the RPC twice on the same PO should not double-
increment stock).

### 4.7 Expenses — `src/services/expensesSupabase.js`

Standard PostgREST CRUD on a table the frontend queries as `sw_expenses`.
No RPCs. Categories and payment methods are hardcoded in the service
(`listCategories()` returns 8 expense categories; `listPaymentMethods()`
returns `['Cash', 'Transfer', 'Card']`).

The frontend's shaped expense row is:
`{ id, name, category, vendor, amount, payment, date, note }`. The
`category` field on the shaped row is the category ID (e.g. `'rent'`);
the page-level code in `src/pages/ExpensesPage.jsx` maps the ID to a
display label via the hardcoded `staticCategories` list in
`src/data/mockData.js`. (The expense shaped row does NOT include
`createdAt` / `updatedAt` — the table has those columns but the
`shapeRow` function does not surface them.)

**Integration assumption requiring confirmation:** The frontend queries a
table named `sw_expenses` and writes `category` as one of `('stock',
'rent', 'transport', 'utilities', 'marketing', 'salaries', 'packaging',
'other')` and `payment` as one of `('Cash', 'Transfer', 'Card')`. The
backend developer should confirm whether these enumerations should be
enforced server-side.

### 4.8 Dashboard aggregates — `src/services/dashboardSupabase.js`

| Function | Frontend call | Notes | Verification |
| --- | --- | --- | --- |
| `summary()` | counts on `sw_inventory_items` + `sw_sales`; also fetches `sw_sale_items` + embeds `item:item_id(cost_price)` to compute `totalProfit` | Returns 13 fields. `totalProfit` is now computed from (selling_price - cost_price) * qty per line item. `salesChange` + `profitChange` are computed from this-month vs last-month completed sales. `inventoryChange` + `lowStockChange` are approximated from `salesChange` (no historical inventory snapshot table on the backend — see §9.3). | mock-tested; **partially approximated** |
| `revenue()` | groups by day-of-week for last 2 weeks on `sw_sales` | Returns `{ data: [{day, thisWeek, lastWeek}], total, lastTotal, growthPct }` | mock-tested |
| `stockStatus()` | counts by derived status on `sw_inventory_items` | Returns counts for In Stock / Low Stock / Out of Stock | mock-tested |
| `topSellersList({ limit })` | aggregates `sw_sale_items` by `item_id` | Returns top N items **sorted by revenue (descending)** — not by qty. The `sold` (qty) field is computed and returned but is not the sort key. | mock-tested |
| `lowStockList({ limit })` | `sw_inventory_items` ordered by `stock` ascending | Returns the lowest-stock items (used by `src/components/dashboard/LowStockTable.jsx`). | mock-tested |
| `pendingOrdersList({ limit })` | `sw_sales` where `status='pending'`, joined to `sw_customers` via `customer:customer_id(first_name, last_name)` | DOES join `sw_customers` to fetch the customer name (rendered as `${first_name} ${last_name}` or `'Walk-in'` for null customers). Does NOT join `sw_sale_items` — the returned `items` field is `0`. | mock-tested; **frontend-side gap** |
| `recentSalesList({ limit })` | recent `sw_sales`, joined to `sw_customers` (same pattern as `pendingOrdersList`) | Same: customer name is fetched, but `items: 0` (no join to `sw_sale_items`). | mock-tested; **frontend-side gap** |

### 4.9 Reports aggregates — `src/services/reportsSupabase.js`

| Function | Frontend call | Notes | Verification |
| --- | --- | --- | --- |
| `salesReport()` | aggregates over `sw_sales` only (filtered to `status='completed'`); also fetches `sw_sale_items` + embeds `item:item_id(name, sku)` for topProducts | `topProducts` (top 5 by revenue), `paymentBreakdown` (grouped by payment method with pct), and `momGrowthPct` (from last two trend months) are all now computed. Previously all were `[]` or `0`. | mock-tested |
| `inventoryReport()` | aggregates over `sw_inventory_items` | `categoryReport` and `lowStock` are computed; `topProducts` returned as `[]`. | mock-tested |
| `customersReport()` | fetches `sw_customers` + `sw_sales` (completed) in parallel, joins in JS | `acquisition` (new customers per month, from `created_at`), `topCustomers` (top 5 by `totalSpent` — real, computed from completed sales per `customer_id`), and `typeBreakdown` are all now computed. Previously `topCustomers[i].totalSpent` was hardcoded 0. | mock-tested |
| `expensesReport()` | aggregates over `sw_expenses` | Computed. | mock-tested |

The Reports page (`src/pages/ReportsPage.jsx`) behaviour for the
unimplemented aggregates differs by field (see also §9.3 for the
full breakdown): for `topProducts`, `paymentBreakdown`, and
`acquisition` the page uses `??` on the service response — since the
service returns literal `[]` (not `null`/`undefined`), the page
renders empty charts/tables in Supabase mode (no silent mock
substitution). For `topCustomers` the page ALWAYS uses mock data
regardless of the service response.

---

## 5. Environment variables

The frontend reads these env vars (see `.env.example` and
`src/lib/env.js`). All `VITE_*` variables are PUBLIC — they are inlined
into the browser bundle at build time. Do NOT put secrets in a `VITE_*`
variable.

| Variable | Purpose | Required? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. | Yes — without it, demo mode. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key. | Yes — without it, demo mode. |
| `VITE_PUBLIC_APP_URL` | Public-facing app URL; used as the password-reset `redirectTo`. | Yes for password-reset flow to land on `/reset-password`. |
| `VITE_API_BASE_URL` | Optional REST API base URL. Reserved for a future non-Supabase backend; not currently consumed by any service module. | No. |
| `VITE_API_TIMEOUT_MS` | REST API timeout in ms. Default 15000. Not currently consumed. | No. |
| `VITE_ENABLE_NOTIFICATIONS` | Feature flag. Default false. Read by `envSummary` for inspection; no UI gated by it today. | No. |
| `VITE_ENABLE_BULK_UPLOAD` | Feature flag. Default false. Same — reserved. | No. |
| `VITE_ENABLE_PDF_EXPORT` | Feature flag. Default false. Same — reserved. | No. |

`.env.local` is gitignored. `.env.example` is committed and documents every
variable with inline safety notes. `.env.test.local` is committed and
overrides Supabase vars to empty strings so the test suite runs
deterministically in demo mode regardless of the developer's `.env.local`.

The Supabase publishable (anon) key is designed to be public. The frontend
never reads, stores, or transmits a Supabase `service_role` key — that key
must not appear in any `VITE_*` variable or anywhere else in the frontend
source.

---

## 6. Authentication integration

`src/context/AuthContext.jsx` is the auth boundary. In Supabase mode it
uses the Supabase JS client exclusively; in demo mode it accepts any
credentials and persists a clearly-labelled demo user to `localStorage`.

The frontend expects:

1. `signUp` to accept `options.data` with `{ firstName, lastName,
   businessName }` — these become `user.user_metadata` and are read by
   `BusinessProvider` on first login.
2. `signInWithPassword` to return a session that persists across refresh
   (the frontend sets `persistSession: true`).
3. `onAuthStateChange` to fire on token refresh, sign-out, and sign-in
   from other tabs. The frontend uses this to keep its `user` state in
   sync.
4. `resetPasswordForEmail` to send an email with a link that includes a
   recovery token; the link target is
   `${VITE_PUBLIC_APP_URL}/reset-password`. The `/reset-password` route
   is implemented in `src/pages/auth/ResetPasswordPage.jsx` and uses
   `supabase.auth.getSession()` after a 1.5s delay to detect the
   recovery token.

The frontend does NOT implement phone/OTP, OAuth (Google/GitHub), or
magic-link flows. The Supabase project may enable them later — the
frontend would not break, but no UI is provided for them.

---

## 7. Active-business selection

`src/context/BusinessContext.jsx` wraps every protected route. On mount
in Supabase mode:

1. Calls `businessesService.listMyBusinesses()`.
2. If the user has ≥1 business, the first one becomes `activeBusinessId`.
3. If the user has zero businesses, calls
   `businessesService.createBusiness({ name, type, currency, timezone })`
   using values from `user_metadata` (set during signup), then re-fetches
   the list. A `provisioningRef` guards against React 19 StrictMode
   double-mount so a single signup does not create duplicate businesses.

`useBusiness()` returns `{ activeBusinessId, businesses,
isBusinessLoading, businessError, switchBusiness, isDemoMode }`. Pages
read `activeBusinessId` and pass it as `businessId` in service payloads.

In demo mode, `BusinessProvider` synthesises an `activeBusinessId =
'demo-business'` sentinel and a single demo business.

**Integration assumption requiring confirmation:** The frontend assumes
`listMyBusinesses()` returns rows shaped as
`{ id, name, type, currency, timezone, role, createdAt }` and that
`createBusiness()` returns
`{ business_id, name, type, currency, timezone, role }`. The backend
developer should confirm these shapes.

---

## 8. Verification status

The frontend ships an automated test suite (Vitest + jsdom) of 39 tests
across 7 files. These tests run in demo mode (Supabase env vars are
overridden to empty strings by `.env.test.local`) — they do NOT exercise
the Supabase code path against a live backend.

| Test file | What it covers |
| --- | --- |
| `src/context/AuthContext.test.jsx` | `AuthProvider` reports demo mode when Supabase env vars are missing; demo user persists across `AuthProvider` remount. |
| `src/context/BusinessContext.test.jsx` | `BusinessProvider` exposes the documented context shape in demo mode and does not crash without a user. |
| `src/lib/supabase.test.js` | When env vars are missing, `isSupabaseConfigured` is `false`, `supabase` client is `null`, `envSummary` honestly reports demo mode. |
| `src/components/common/ComingSoon.test.jsx` | `ComingSoon` placeholder renders title + description; "Back to Dashboard" button navigates to `/dashboard`. |
| `src/components/sales/NewSaleModal.test.jsx` | The modal renders when `isOpen=true` and returns `null` when `isOpen=false` (Rules-of-Hooks regression check). |
| `src/pages/InventoryPage.test.jsx` | `InventoryPage` renders a loading state, then renders inventory after the service loads. The file's header comment lists "does NOT silently fall back to mock data on service error" as a goal, but no actual `it(...)` block in the file tests that assertion — the 3 tests cover loading-state, render-after-load, and demo-mode-banner only. |
| `src/services/supabaseServices.test.js` | Service-layer switch logic: `dataMode.isSupabase` is `false` in tests; dynamically imported Supabase service modules return `NOT_CONFIGURED` errors when the client is `null`. |

### 8.1 What is verified

- The frontend builds cleanly with `npm run build`.
- The frontend lints cleanly with `npm run lint` (0 errors, 0 warnings).
- The frontend's automated test suite passes (`npm test`, 39/39).
- The demo-mode code path is exercised end-to-end: a user can sign in,
  view every page, and interact with mock data without crashing.
- The Supabase code path's "not configured" guard is verified (every
  Supabase service module returns a `NOT_CONFIGURED` error when the
  client is `null`).

### 8.2 What is verified against a live backend (prior phases, not in this branch's automated suite)

Several integration points were tested against a live Supabase project in
earlier development phases. Those tests required credentials and are not
part of the local automated suite. The verified flows were:

- Sign-up + auto-provisioning of a business on first login.
- Inventory CRUD.
- Atomic sale creation (`sw_create_sale`) — including rejection on
  insufficient stock and on cross-business `customer_id`.
- Concurrent sale creation against the same item (no negative stock).
- Purchase-order receiving (`sw_receive_purchase_order`) — after the RPC
  was applied to the dev project.

These results are not reproducible from the local test suite alone. To
re-verify, the backend developer should run the equivalent flows against
their own Supabase project.

### 8.3 What is NOT verified in this branch

- No automated test asserts the response shape of any Supabase RPC.
- No automated test exercises the `sw_receive_purchase_order` flow against
  a live backend in this branch.
- No automated test exercises the dashboard's `summary()` / `revenue()`
  / `stockStatus()` / `topSellersList()` functions against a live
  backend.
- No automated test exercises the reports page's `*Report()` functions
  against a live backend.

A successful `npm run build` does NOT prove live API integration. The
Supabase code path is implemented and was exercised in earlier phases,
but its current behaviour against a live backend is unverified in this
branch's automated suite.

---

## 9. Frontend-side limitations

The list below contains frontend-side implementation gaps and known
limitations. These are NOT instructions to the backend developer — they
describe what the frontend does today so the backend developer
understands the integration surface they are inheriting.

### 9.1 Placeholders

- `/settings` renders `<ComingSoon title="Settings" />`. No profile
  editing, business profile editing, password change, or session
  revocation UI exists.
- `/documents` renders `<ComingSoon title="Documents" />`. No list,
  upload, or storage UI exists.

### 9.2 Disabled controls (honest "Coming soon")

- TopBar search input is `disabled` with placeholder
  `"Search (coming soon)"`.
- TopBar notifications bell renders an empty list; the "Mark all read"
  and "View all notifications" links are non-clickable `<span>` elements.
- Inventory page: "Bulk Upload" button is `disabled` with
  `title="Coming soon — bulk upload is not yet implemented"`.
- Inventory page: "Export" button is `disabled` with
  `title="Coming soon — CSV export is not yet implemented"`.
- Sales page: "Export" button is `disabled` (same).
- Sales page: "Print" icon button in the desktop table has no `onClick`.
- Customers page: "Import" button is `disabled` with
  `title="Coming soon"`.
- Vendors page: "Import" button is `disabled` with
  `title="Coming soon"`.
- Expenses page: "Export" button is `disabled` with
  `title="Coming soon"`.
- Reports page: "Export PDF" button is `disabled` with
  `title="Coming soon — PDF export is not yet implemented"`.

### 9.3 Frontend-side implementation gaps in Supabase mode

These are gaps in the frontend's service layer — they are NOT caused by
the backend. The backend developer should not assume the server is
misconfigured because of these.

**Resolved in the latest frontend phase:**
- `salesSupabase.list()` and `salesSupabase.get()` now join
  `sw_customers` and `sw_inventory_items` via PostgREST resource
  embedding (`customer:customer_id(first_name, last_name)` on
  sw_sales; `item:item_id(name, sku)` on sw_sale_items). The Sales
  page shows the real customer name and item name in Supabase mode.
  Walk-in customers (customer_id is null) show "Walk-in" honestly.
  Soft-deleted inventory items (FK filtered out) show "Unavailable
  item" honestly.
- `customersSupabase.list()` now batch-fetches completed sales per
  customer in a single query and computes `totalSpent` + `totalOrders`.
  The Customers list view shows real per-customer totals (previously
  0). `get()` continues to also fetch up to 10 recent orders for
  the detail drawer (with `orders[i].items = 0` — see below).
- `vendorsSupabase.get()` now batch-fetches `sw_purchase_order_items`
  per PO and populates `orders[i].items` with the real line-item count
  (previously hardcoded 0).
- `dashboardSupabase.summary()` now computes `totalProfit` from
  `sw_sale_items` joined to `sw_inventory_items.cost_price` via
  PostgREST resource embedding (`item:item_id(cost_price)`). Sale
  items with missing cost data (soft-deleted inventory, FK broken)
  are EXCLUDED from the profit sum — their cost is unknown, not
  zero. The count of excluded items is returned as
  `profitExcludedCount` so the UI can show a "partial" indicator.
  `salesChange` + `profitChange` are computed from this-month vs
  last-month completed sales. `inventoryChange` + `lowStockChange`
  are returned as `null` (unavailable) — there is no historical
  inventory snapshot table on the backend to compute a real
  period-over-period inventory-count delta. The dashboard shows
  "—" for these. A periodic inventory snapshot table is a backend
  dependency documented below.
- `reportsSupabase.salesReport()` now computes `topProducts` (by
  revenue, from `sw_sale_items` joined to `sw_inventory_items` via
  PostgREST), `paymentBreakdown` (grouped by payment method with pct),
  and `momGrowthPct` (from the last two trend months). Previously all
  were `[]` or `0`.
- `reportsSupabase.customersReport()` now fetches `sw_customers` +
  `sw_sales` in parallel and joins in JS to compute per-customer
  `totalSpent` + `totalOrders`. `topCustomers` is sorted by totalSpent
  desc (real, not hardcoded 0). `acquisition` trend groups customers
  by `created_at` month.

**Remaining gaps (still open):**
- `dashboardSupabase.recentSalesList()` and `pendingOrdersList()` DO
  join `sw_customers` (via `customer:customer_id(first_name, last_name)`)
  so the dashboard shows the customer name on each pending order and
  recent sale. They do NOT join `sw_sale_items`, so the dashboard shows
  "0 items" for each row (the `items` field is `0`).
- `dashboardSupabase.summary()` `inventoryChange` + `lowStockChange`
  are approximated from `salesChange` — the true inventory-count
  delta would require a periodic inventory snapshot table on the
  backend (out of scope for a frontend-only fix).
- `customersSupabase.get()` returns `orders[i].items = 0` (no join
  to `sw_sale_items` for the per-customer recent-orders list in the
  detail drawer).
- **Reports page fallback behaviour** (`src/pages/ReportsPage.jsx`):
  the page reads from the service response for `topProducts`,
  `paymentBreakdown`, `acquisition`, and `topCustomers`. The
  `topCustomers` table uses the real service response and shows an
  honest "No customers yet" empty state when the list is empty. In
  demo mode the mock service returns mock customers with real mock
  values. The static `fallbackCustomers` import is only used when
  `reports.customers` is `null`/`undefined` (i.e., the service hasn't
  loaded yet).

### 9.4 Mock-data leakage

`src/data/mockData.js` is imported by 18 files: 7 mock service modules
(expected) plus 11 page and component files that use its category / type
/ status enumerations and avatar-color palettes for select dropdowns and
icons. In Supabase mode these enumerations are not refetched from the
backend — they remain frontend-defined. The Reports page and the
Expenses page also use mock arrays as chart fallbacks when the Supabase
service returns `null` or an empty result.

### 9.5 Pagination UI

All list pages (Sales, Customers, Inventory, Vendors, Expenses) now
expose a reusable pagination control (`src/components/common/Pagination.jsx`)
with Previous/Next buttons, a page indicator, a page-size selector
(10/25/50/100 — default 25), and a "Showing X–Y of Z" count. The control
resets to page 1 when any filter / search / sort changes to prevent
out-of-range pages. The service `list()` functions consume the existing
`page` + `pageSize` PostgREST `.range()` parameters — no backend change
was required.

### 9.6 Hardcoded `alert()` calls

One call site uses the native `alert()` to surface errors:

- `src/pages/VendorsPage.jsx` `handleReceive` — PO receive failure.

The blocking native dialog should be replaced with a non-blocking
toast. (An earlier audit also flagged `src/pages/auth/ForgotPasswordPage.jsx`,
but that file does NOT use `alert()` — it renders success inline via
`setSubmitted(true)` + a styled `<CheckCircle>` + `<h2>` block.)

### 9.7 Dashboard "Fulfil" button

`src/pages/DashboardPage.jsx` `handleFulfil(id)` calls
`salesService.update(id, { status: 'completed' })` and on success removes
the order from local state. If the server call fails, the order remains
in the list and the error is logged to the console (no UI feedback).

---

## 10. Installation, build, and verification

### 10.1 Prerequisites

- Node.js 18+ (the project uses native ESM + Vite 8).
- npm 9+.

### 10.2 Installation

```bash
npm install
```

### 10.3 Environment configuration

```bash
cp .env.example .env.local
# Edit .env.local — set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
# (or leave them blank to run in demo mode).
```

### 10.4 Run

```bash
npm run dev       # → http://localhost:5173
npm run build     # → dist/
npm run preview   # serve the built bundle locally
```

### 10.5 Lint and tests

```bash
npm run lint             # ESLint (0 errors, 0 warnings at HEAD)
npm test                 # Vitest single run (39 tests, 7 files)
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage report
```

There is no TypeScript type-check step — the project is plain JSX.

### 10.6 Distinguishing a frontend defect from an unavailable backend

| Symptom | Likely cause |
| --- | --- |
| Page renders but data is empty + "Demo mode" banner is shown. | Frontend is in demo mode (Supabase env vars missing). Not a backend issue. |
| Page renders, banner is NOT shown, but a specific table is empty. | Either no data exists for this business OR an RLS policy is rejecting the read. Check the Supabase logs. |
| A create / update / delete fails with `error.code = 'P0001'`. | A server-side RPC raised an exception. Check the error message. |
| A create fails with `error.code = '42501'`. | RLS denied the write. Verify the user is a member of the `business_id` in the payload. |
| `error.code = 'NOT_CONFIGURED'`. | The Supabase client is `null` (env vars missing). Not a backend issue. |
| `error.code = 'NOT_FOUND'`. | The frontend looked up an ID that does not exist (or is in another business). |

---

## 11. Integration assumptions requiring confirmation

The frontend makes the assumptions below. The backend developer should
confirm or renegotiate each before relying on it. None of these are
instructions to implement the backend in a particular way — they are the
observable contract the frontend currently depends on.

| # | Assumption | Where in the frontend |
| --- | --- | --- |
| 1 | The Supabase JS client v2.118 is the integration transport. | `package.json`, `src/lib/supabase.js` |
| 2 | The publishable (anon) key is safe to ship to the browser. | `.env.example`, `src/lib/supabase.js` |
| 3 | `signUp` accepts `options.data` with `{ firstName, lastName, businessName }` and these are stored in `user.user_metadata`. | `src/context/AuthContext.jsx` |
| 4 | `resetPasswordForEmail` accepts a `redirectTo` option and the resulting email link is accepted if the value is in the project's "Redirect URLs" list. | `src/pages/auth/ForgotPasswordPage.jsx` |
| 5 | `listMyBusinesses()` returns rows shaped `{ id, name, type, currency, timezone, role, createdAt }`. | `src/services/businessesSupabase.js` |
| 6 | `sw_create_business` accepts `(p_name, p_type, p_currency, p_timezone)` and returns `{ business_id, name, type, currency, timezone, role }`. | `src/services/businessesSupabase.js` |
| 7 | `sw_create_sale` accepts a single JSON argument `p_payload` with the shape documented in Section 4.4 and returns `{ sale_id, display_id, total }`. The RPC atomically inserts the sale + line items + decrements stock + writes ledger entries; on failure the whole sale rolls back. | `src/services/salesSupabase.js` |
| 8 | `sw_adjust_stock` accepts `(p_business_id, p_item_id, p_delta, p_note)` and atomically updates stock + writes a stock-movement ledger entry. | `src/services/inventorySupabase.js` |
| 9 | `sw_receive_purchase_order` accepts a single UUID `p_purchase_order_id` and atomically marks the PO as delivered + increments inventory stock + writes stock-movement ledger entries. Calling it twice on the same PO does not double-increment stock. | `src/services/vendorsSupabase.js` |
| 10 | `next_display_id` accepts `(p_business_id, p_entity)` and returns a string formatted display ID (e.g. `ORD-0001`, `PO-0001`). | `src/services/vendorsSupabase.js` |
| 11 | The frontend queries tables named `sw_businesses`, `sw_business_memberships`, `sw_customers`, `sw_vendors`, `sw_inventory_items`, `sw_sales`, `sw_sale_items`, `sw_purchase_orders`, `sw_purchase_order_items`, `sw_stock_movements`, `sw_expenses`. (The `sw_audit_log` and `sw_display_id_counters` names appear in earlier audit docs only — they are not queried by current frontend code in this branch.) | `src/services/*Supabase.js` |
| 12 | The `payment` field on `sw_sales` and `sw_expenses` accepts `'Cash'`, `'Transfer'`, or `'Card'`. The frontend standardised on `'Card'` (the user-facing label is `"Card / POS"`). The frontend no longer sends `'POS'`. | `src/components/sales/NewSaleModal.jsx`, `src/components/sales/ViewOrderModal.jsx`, `src/pages/SalesPage.jsx`, `src/data/mockData.js` |
| 13 | The `category` field on `sw_inventory_items` accepts `'Clothing'`, `'Footwear'`, `'Accessories'`, or `'Other'`. The `category` field on `sw_vendors` accepts `'Clothing & Accessories'`, `'Footwear'`, `'Leather Goods'`, `'Accessories'`, or `'Other'`. The `category` field on `sw_expenses` accepts `'stock'`, `'rent'`, `'transport'`, `'utilities'`, `'marketing'`, `'salaries'`, `'packaging'`, or `'other'`. | `src/services/*Supabase.js`, `src/data/mockData.js` |
| 14 | The `status` field on `sw_sales` accepts `'completed'`, `'pending'`, `'cancelled'`. The `status` field on `sw_purchase_orders` accepts `'pending'`, `'delivered'`, `'cancelled'`. The `status` field on `sw_customers` accepts `'active'`, `'new'`, `'owing'`, `'inactive'`. The `status` field on `sw_vendors` accepts `'active'`, `'inactive'` (the frontend's `vendorsSupabase.create()` honours `payload.status ?? 'active'`; the `vendorsSupabase.list()` filter does `.eq('status', status.toLowerCase())` so the DB stores lowercase values; the `listStatuses()` helper returns the capitalized display labels `['Active', 'Inactive']`). | `src/services/*Supabase.js`, `src/data/mockData.js` |
| 15 | Money is stored as `numeric(14, 2)` in the business's reporting currency. The frontend does not perform currency conversion. | `src/services/*Supabase.js` (no conversion logic present) |

The backend developer is free to design the database, RLS, and
server-side business logic however they see fit — the only requirement is
that the observable API contract the frontend depends on (the function
names, the table names, the field names, the JSON payload shapes, and the
response shapes listed above) is satisfied or renegotiated with the
frontend developer.
