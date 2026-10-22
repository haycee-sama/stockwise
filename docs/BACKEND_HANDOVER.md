# Stockwise — Backend Handover

This document describes what the backend developer needs to implement, configure,
or verify for the Stockwise frontend to function end-to-end. It is written for the
engineer taking over backend responsibility. The frontend developer's work is
delivered; the items below remain with the backend.

All API contracts documented here are derived from the actual source code in
`src/services/*Supabase.js` and `src/lib/supabase.js`. No endpoints, fields, or
behaviours are invented — where a contract is unverified, it is marked
**requires confirmation**.

---

## A. Project boundary

**Delivered (frontend):**
- React 19.2 single-page application built with Vite 8.
- Entry point: `src/main.jsx` → `src/App.jsx` (BrowserRouter + nested routes).
- Source layout:
  - `src/pages/` — top-level route components.
  - `src/components/` — presentational + modal components.
  - `src/context/` — `AuthProvider` and `BusinessProvider` (active-business
    provisioning).
  - `src/services/` — data-access layer; one module per domain entity, with a
    mock and a Supabase-backed variant per domain (see `src/services/index.js`
    for the switch-point).
  - `src/lib/` — typed env access (`env.js`) and the Supabase client singleton
    (`supabase.js`).
  - `src/utils/` — icon-mapping and other pure helpers.
- Styling: Tailwind CSS 3.4. Charts: recharts 3.8. Icons: lucide-react.
- Tests: Vitest + React Testing Library, 39 passing smoke tests.

**Remains with the backend developer:**
- Database schema, migrations, constraints, and indexes.
- Row-Level Security (RLS) policies on every tenant-scoped table.
- Server-side business logic exposed as PostgreSQL RPC functions
  (SECURITY DEFINER).
- Authentication configuration (Supabase Auth provider settings, email
  templates, redirect URLs).
- Any server-side scheduled jobs, webhooks, or third-party integrations
  (e.g. email delivery, payment gateways) the product may later require.
- Verification that the data returned by the API matches the shapes the
  frontend expects (Section D).

The frontend is delivered against the Supabase JS client v2.118. If the backend
is migrated away from Supabase to a custom REST/GraphQL server, the service
modules in `src/services/*Supabase.js` become the canonical contract: every
function there maps one-to-one to an endpoint that the replacement server
must provide.

---

## B. Frontend-to-backend integration

### B.1 Environment configuration

The frontend reads these public env vars (see `.env.example` and
`src/lib/env.js`):

| Variable | Purpose | Required |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL. | Yes — without it the app runs in demo mode. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key. **NOT the service_role key.** | Yes — without it the app runs in demo mode. |
| `VITE_PUBLIC_APP_URL` | Public-facing app URL; used as the password-reset `redirectTo`. | Yes for password-reset to land on `/reset-password`. |
| `VITE_API_BASE_URL` | Optional REST API base URL (reserved for a future non-Supabase backend). | No. |
| `VITE_API_TIMEOUT_MS` | REST API timeout in ms. Default 15000. | No. |
| `VITE_ENABLE_NOTIFICATIONS` | Feature flag. Default false. | No. |
| `VITE_ENABLE_BULK_UPLOAD` | Feature flag. Default false. | No. |
| `VITE_ENABLE_PDF_EXPORT` | Feature flag. Default false. | No. |

**Security invariant:** the frontend must never receive the Supabase
`service_role` key. The publishable (anon) key is safe to ship to the browser
ONLY when every tenant-scoped table has RLS enabled and policies that filter
rows by `business_id` via the `current_user_sw_business_ids()` helper. Without
RLS, the anon key exposes all data.

### B.2 Supabase client

Location: `src/lib/supabase.js`. The client is a singleton constructed once at
module import. Configuration:

- `persistSession: true` — the user's auth session is stored in localStorage
  so refresh does not log them out.
- `autoRefreshToken: true` — the access token is refreshed before it expires.
- `detectSessionInUrl: true` — a stored session is restored on startup (this
  is what makes the email-reset-link flow work).

When either `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` is missing,
the singleton is `null` and the entire app falls back to a clearly-labelled
demo mode (see `src/components/common/DemoModeBanner.jsx`).

### B.3 Service layer switch-point

Location: `src/services/index.js`. The single switch-point is:

```js
export const inventoryService = isSupabaseConfigured ? inventorySupabase : inventoryMock;
```

…applied per domain. The mock and Supabase variants expose the same function
signatures and the same `{ data, error, pagination }` return shape, so page
components are agnostic to which mode is active.

The frontend calls into this service layer — it does not call the Supabase
client directly from page components. The single entry point per domain keeps
the backend contract in one place.

### B.4 Authentication integration

`src/context/AuthContext.jsx` is dual-mode:

- **Supabase mode** uses `supabase.auth.getSession()` to restore the session,
  `onAuthStateChange` for cross-tab updates, and `signInWithPassword` /
  `signUp` / `signOut` for the three auth actions.
- **Demo mode** accepts any email + password and persists a clearly-labelled
  demo user to localStorage. This is a development convenience, NOT a
  parallel auth system.

Frontend auth flow expectations:

1. `signUp({ email, password, options: { data: { firstName, lastName, businessName } } })`
   — `firstName`, `lastName`, `businessName` are stored in `user_metadata`.
   These are read by `BusinessProvider` on first login to auto-provision the
   user's first business (see Section C).
2. `signInWithPassword({ email, password })` — standard email + password.
3. `resetPasswordForEmail(email, { redirectTo: \`${VITE_PUBLIC_APP_URL}/reset-password\` })`
   — the redirect target MUST be in the Supabase dashboard's "Redirect URLs"
   list (Auth → URL Configuration → Redirect URLs). The `/reset-password`
   route is implemented in `src/pages/auth/ResetPasswordPage.jsx`.
4. Phone/OTP, OAuth (Google/GitHub), and magic-link flows are not implemented
   in the frontend; they would require additional UI. The Supabase project
   may enable them later — the frontend would not break.

### B.5 Active-business provisioning

`src/context/BusinessContext.jsx` wraps every protected route. On mount:

1. Calls `businessesService.listMyBusinesses()`.
2. If the user has ≥1 business, the first one becomes `activeBusinessId`.
3. If the user has zero businesses, calls
   `businessesService.createBusiness({ name, type, currency, timezone })`
   using the values from `user_metadata` (set during signup), then
   re-fetches the list. StrictMode double-mount is guarded with a
   `provisioningRef` so a single signup does not create duplicate
   businesses.

`useBusiness()` returns `{ activeBusinessId, businesses, isBusinessLoading,
businessError, switchBusiness, isDemoMode }`. Pages read `activeBusinessId`
and pass it as `businessId` in service payloads, but **the server is the
security boundary**: the client cannot trust the supplied `business_id`, and
every RLS policy must filter by `auth.uid()` via the `sw_business_memberships`
join.

### B.6 Response shape contract

Every service function returns `{ data, error, pagination }`:

- `data` — the shaped result row(s), or `null` on error.
- `error` — `{ code, message }` or `null`. `code` is the PostgREST error code
  for Supabase calls (e.g. `'P0001'` for a raised exception, `'23505'` for a
  unique violation) or a frontend-defined sentinel (`'NOT_CONFIGURED'`,
  `'NOT_FOUND'`).
- `pagination` — `{ page, pageSize, total, totalPages }` for `list()` calls;
  `null` for single-record calls.

The frontend does NOT throw on Supabase errors. It checks `error` and renders
an `ErrorState` component. Backend code should raise `RAISE EXCEPTION '...'
USING ERRCODE = '...'` to surface meaningful error codes — these propagate
through PostgREST as `error.code` and `error.message`.

### B.7 Pagination, filtering, sorting, search

Service `list()` calls accept a uniform options object:

```js
{
  search:    string,       // case-insensitive ilike against name/email/etc.
  status:    string | 'All',
  category:  string | 'All',
  payment:   string | 'All',
  type:      string | 'All',
  sort:      '<field>:asc' | '<field>:desc',
  page:      number,        // 1-indexed
  pageSize:  number,        // default 100
  businessId: string,       // informational only — RLS enforces isolation
}
```

The Supabase query maps these to `.ilike()`, `.eq()`, `.order()`, `.range()`.
The backend does not need to expose anything beyond standard PostgREST query
support — Supabase handles the translation.

---

## C. Required backend capabilities

For each operation: (1) the feature/screen using it, (2) the required behaviour,
(3) the existing endpoint/method if verified, (4) the request payload shape,
(5) the response shape, (6) auth/permission requirements, (7) loading/error
cases the frontend expects, (8) verification status.

### C.1 Authentication

| Item | Detail |
| --- | --- |
| Feature | Login, Signup, Forgot Password, Reset Password screens. |
| Required | Email + password auth; session persistence; password reset via email link; redirect URL must accept `${VITE_PUBLIC_APP_URL}/reset-password`. |
| Endpoint | Supabase Auth (managed). No custom endpoint required. |
| Payload (signup) | `{ email, password, options: { data: { firstName, lastName, businessName } } }` |
| Response | `{ data: { session, user }, error }`. If email confirmation is required by the project, `data.session` is null and the frontend shows a "check your email" message. |
| Auth | Public (signup) / public (signin) / authenticated (signout). |
| Loading/error | The frontend shows a spinner during the 600ms+ round-trip and surfaces `error.message` in an alert box. |
| Verification | Verified in dev Supabase project. |

### C.2 Business provisioning (auto-provisioned on first signup)

| Item | Detail |
| --- | --- |
| Feature | `BusinessProvider` auto-provisions a business on first signup. |
| Required | Insert a `sw_businesses` row + a `sw_business_memberships` row (role='owner') for the calling user, atomically. |
| Endpoint | RPC `sw_create_business(p_name text, p_type text default 'retail', p_currency text default 'NGN', p_timezone text default 'Africa/Lagos') → jsonb`. |
| Response | `{ business_id, name, type, currency, timezone, role }` |
| Auth | Authenticated caller. The function must read `auth.uid()` and create the membership with that user as owner. |
| Loading/error | Frontend shows `PageLoader` during provisioning. If it fails, the user lands on a "Business setup error" screen. |
| Verification | Verified against dev project. |

### C.3 Inventory items CRUD

| Item | Detail |
| --- | --- |
| Feature | Inventory page (`/inventory`): list, create, edit, delete, search, filter, sort. |
| Required | Standard CRUD on `sw_inventory_items`, scoped to the caller's business via RLS. |
| Endpoints | PostgREST on `sw_inventory_items` — `SELECT`, `INSERT`, `UPDATE`. Soft delete via `UPDATE deleted_at = now()`. |
| Payload (create) | `{ business_id, name, sku, category, supplier_id?, stock, threshold, cost_price, selling_price, last_restocked }` |
| Response (shaped) | `{ id, name, sku, category, supplier, stock, threshold, costPrice, sellingPrice, lastRestocked, iconName, bg, createdAt, updatedAt }` |
| Auth | Authenticated + member of the business_id in the payload. RLS check `business_id IN current_user_sw_business_ids()`. |
| Loading/error | `LoadingState` while fetching, `ErrorState` with retry on error. |
| Verification | Verified against dev project. |

### C.4 Atomic sale creation

| Item | Detail |
| --- | --- |
| Feature | New Sale modal (`/sales` → "New Sale" button). |
| Required | Atomically: validate each line item's existence + stock, decrement stock, insert `sw_sales` + `sw_sale_items`, write `sw_stock_movements` rows (kind='sale'), generate `display_id` via `next_display_id()`. Reject on insufficient stock — the whole sale rolls back. Server computes `total` from line items. |
| Endpoint | RPC `sw_create_sale(p_payload jsonb) → jsonb`. |
| Payload | `{ business_id, customer_id | null, payment: 'Cash' \| 'Transfer' \| 'Card', status: 'completed' \| 'pending', note, items: [{ item_id, qty, unit_price }] }` |
| Response | `{ sale_id, display_id, total }` |
| Auth | Authenticated + member of `business_id`. The function must: (a) validate the customer_id (if non-null) belongs to the same business; (b) validate each item_id belongs to the same business; (c) validate each item has `stock >= qty` (reject with a clear error code if not); (d) wrap everything in a single transaction. |
| Loading/error | Spinner during the call. On error, the modal stays open and the error message is surfaced. |
| Verification | Verified against dev project — atomic rollback on insufficient stock confirmed. |

> **CRITICAL — payment-method terminology.** The DB CHECK constraint is
> `payment IN ('Cash', 'Transfer', 'Card')`. The frontend uses `'Card'` as
> the value (the user-facing label is `"Card / POS"`). A `'POS'` value is
> no longer sent by the frontend — earlier code sent `'POS'` and broke sale
> creation. The backend must reject `'POS'` with a CHECK constraint or RPC
> validation; it does, per migration 0002.

### C.5 Stock adjustment

| Item | Detail |
| --- | --- |
| Feature | Manual stock adjustments (currently used by the inventory service — no dedicated UI yet). |
| Required | Atomically: update `sw_inventory_items.stock`, write a `sw_stock_movements` row (kind='adjustment'), prevent stock from going negative. |
| Endpoint | RPC `sw_adjust_stock(p_business_id uuid, p_item_id uuid, p_delta integer, p_note text?) → jsonb`. |
| Auth | Authenticated + member of `p_business_id`. |
| Verification | Verified against dev project. |

### C.6 Purchase order receiving

| Item | Detail |
| --- | --- |
| Feature | Vendor drawer → "Receive" button on a pending PO. |
| Required | Atomically: mark the PO `status='delivered'`, for each line item look up an inventory item by `(business_id, name)` — create one if missing — and increment its stock, write `sw_stock_movements` rows (kind='restock'). Idempotent on already-delivered POs (raise an error). Use `pg_advisory_xact_lock` to prevent concurrent double-receiving. |
| Endpoint | RPC `sw_receive_purchase_order(p_purchase_order_id uuid) → jsonb`. |
| Auth | Authenticated + member of the PO's business_id. |
| Frontend behaviour | The frontend sends the PO's `display_id` (e.g. `PO-001`); the Supabase service in `vendorsSupabase.receivePurchaseOrder` resolves it to a UUID via a `select id from sw_purchase_orders where display_id = $1` lookup before calling the RPC. The RPC must accept a UUID. |
| Loading/error | On error, an `alert()` is shown. (TODO: replace with a non-blocking toast.) |
| Verification | **Requires confirmation** — the RPC is documented in the handover but the backend developer must verify it is applied to the dev project. |

### C.7 Customers / Vendors / Expenses CRUD

These three domains follow the same pattern as inventory (Section C.3):
PostgREST CRUD on the respective tables, soft delete via `deleted_at`, RLS
filtering by `business_id`. No RPCs required.

- Customers: `src/services/customersSupabase.js`. The `get()` function also
  fetches up to 10 recent `sw_sales` rows for the customer (the join is
  not performed in `list()` — see Section F).
- Vendors: `src/services/vendorsSupabase.js`. `placeOrder()` inserts into
  `sw_purchase_orders` + `sw_purchase_order_items`; it calls the
  `next_display_id()` RPC for the `display_id`. The frontend passes the line
  items as `newOrder.lineItems` (an array of `{ name, qty, unitPrice }`);
  the count field `newOrder.items` (a number) is for display only.
- Expenses: `src/services/expensesSupabase.js`. Direct CRUD on
  `sw_expenses`. Categories and payment methods are hardcoded in the
  service (no DB lookup needed).

### C.8 Dashboard aggregates

The dashboard (`/dashboard`) calls five service functions, all of which perform
client-side aggregation over `sw_inventory_items`, `sw_sales`, and
`sw_sale_items`:

| Function | Source tables | Notes |
| --- | --- | --- |
| `summary()` | `sw_inventory_items`, `sw_sales` | Returns 13 counts/totals; `salesChange`, `profitChange`, `inventoryChange`, `lowStockChange` are not computed (returned as 0) — period-over-period comparison is **unimplemented** in the service. |
| `revenue()` | `sw_sales` | Groups by day-of-week for the last 2 weeks. |
| `stockStatus()` | `sw_inventory_items` | Counts by derived status (in_stock / low_stock / out_of_stock). |
| `topSellersList({ limit })` | `sw_sale_items` | Aggregates by `item_id`, returns top N. |
| `pendingOrdersList({ limit })` | `sw_sales` | Where `status='pending'`. **Does NOT join `sw_sale_items`** — the returned `items` field is 0; the dashboard shows "0 items" for each pending order. |
| `recentSalesList({ limit })` | `sw_sales` | Same — `items: []`. The dashboard shows "0 items" for recent sales too. |

The "items count" gap is documented in Section F as an outstanding task. A
server-side materialised view or a join in the service would resolve it.

### C.9 Reports aggregates

The reports page (`/reports`) calls four service functions
(`salesReport`, `inventoryReport`, `customersReport`, `expensesReport`). All
perform client-side aggregation. Several fields are returned as empty arrays
or hardcoded zero values where the service does not yet compute them:

- `salesReport.topProducts` — `[]` (not joined to inventory items by name).
- `salesReport.paymentBreakdown` — `[]` (not grouped by `payment`).
- `customersReport.acquisition` — `[]` (no month-by-month signup aggregation).
- `customersReport.topCustomers` — `totalSpent: 0, totalOrders: 0` (no join
  to `sw_sales` + `sw_sale_items`).

The frontend renders fallback mock data for these empty fields today (per
`src/pages/ReportsPage.jsx`). The mock fallback is NOT labelled as such on
the page — this is a known honesty gap. Section F lists it as an
outstanding task.

---

## D. Data contract and database responsibilities

The frontend expects the following database tables, columns, and constraints.
The backend developer is responsible for implementing and verifying these. The
SQL migrations that previously lived in this repository were removed as part of
the frontend-only cleanup; the schema summary below is the authoritative
contract.

### D.1 Tables

Every tenant-scoped table has: `id uuid primary key default gen_random_uuid()`,
`business_id uuid not null references sw_businesses(id)`,
`created_at timestamptz default now()`, `updated_at timestamptz default now()`,
`deleted_at timestamptz` (soft delete). RLS is enabled on every table.

| Table | Purpose | Key columns | Constraints |
| --- | --- | --- | --- |
| `sw_businesses` | Tenant root. | `name`, `type`, `currency`, `timezone` | `type IN ('retail','wholesale','ecommerce','distribution','manufacturing','other')`; `currency IN ('NGN','USD','EUR','GBP','GHS','KES')`. |
| `sw_business_memberships` | User ↔ business join. | `business_id`, `user_id references auth.users(id)`, `role` | `role IN ('owner','admin','staff')`; `UNIQUE(business_id, user_id)`. |
| `sw_customers` | Customer records. | `first_name`, `last_name`, `email?`, `phone`, `type`, `location`, `status`, `note?` | `type IN ('Retailer','Wholesale','Walk-in','E-commerce')`; `status IN ('active','new','owing','inactive')`. |
| `sw_vendors` | Supplier records. | `name`, `contact_person`, `email?`, `phone`, `category`, `location`, `status`, `lead_time_days`, `rating`, `note?` | `category IN ('Clothing & Accessories','Footwear','Leather Goods','Accessories','Other')`; `status IN ('active','inactive')`; `lead_time_days >= 0`; `rating BETWEEN 1 AND 5`. |
| `sw_inventory_items` | Stock items. | `name`, `sku`, `category`, `supplier_id? references sw_vendors(id)`, `stock`, `threshold`, `cost_price`, `selling_price`, `last_restocked?` | `category IN ('Clothing','Footwear','Accessories','Other')`; `stock >= 0`; `threshold >= 0`; `cost_price >= 0`; `selling_price >= 0`; `selling_price >= cost_price`. |
| `sw_display_id_counters` | Atomic display_id generator. | `business_id`, `entity`, `next_value` | `entity IN ('sale','purchase_order')`; `PRIMARY KEY(business_id, entity)`. |
| `sw_sales` | Sale headers. | `business_id`, `display_id`, `customer_id? references sw_customers(id)`, `payment`, `status`, `total`, `note?`, `sale_date` | `payment IN ('Cash','Transfer','Card')`; `status IN ('completed','pending','cancelled')`. |
| `sw_sale_items` | Sale line items. | `sale_id references sw_sales(id) on delete cascade`, `item_id references sw_inventory_items(id)`, `qty`, `unit_price`, `line_total` | `qty > 0`; `unit_price >= 0`; `line_total` is a generated column `qty * unit_price`. |
| `sw_purchase_orders` | PO headers. | `business_id`, `display_id`, `vendor_id references sw_vendors(id)`, `status`, `total`, `note?`, `order_date` | `status IN ('pending','delivered','cancelled')`. |
| `sw_purchase_order_items` | PO line items. | `purchase_order_id references sw_purchase_orders(id) on delete cascade`, `item_name`, `qty`, `unit_price`, `line_total` | `qty > 0`; `unit_price >= 0`; `line_total` is a generated column. |
| `sw_stock_movements` | Stock ledger. | `business_id`, `item_id references sw_inventory_items(id)`, `kind`, `qty`, `sale_id?`, `purchase_order_id?`, `note?`, `created_by references auth.users(id)` | `kind IN ('sale','restock','adjustment','return')`. |
| `sw_expenses` | Expense records. | `business_id`, `name`, `category`, `vendor`, `amount`, `payment`, `expense_date`, `note?` | `category IN ('stock','rent','transport','utilities','marketing','salaries','packaging','other')`; `amount > 0`; `payment IN ('Cash','Transfer','Card')`. |
| `sw_audit_log` | Audit trail (optional). | `business_id?`, `actor_user_id?`, `entity`, `entity_id?`, `action`, `payload_diff jsonb?` | `action IN ('insert','update','delete')`. |

### D.2 Money

All monetary amounts are `numeric(14, 2)` in the business's reporting
currency (`sw_businesses.currency`, default `'NGN'`). Multi-currency
conversion is out of scope for v1.

### D.3 Display IDs

`sw_sales.display_id` and `sw_purchase_orders.display_id` are
human-friendly codes (e.g. `ORD-0001`, `PO-0001`) generated atomically by
the `next_display_id(p_business_id uuid, p_entity text) → text` RPC. The RPC
must:

1. Lock the `(business_id, entity)` row in `sw_display_id_counters` (or
   insert one if missing).
2. Read `next_value`, format it with the entity prefix (`ORD-` or `PO-`),
   increment `next_value`, return the formatted string.

The frontend uses `display_id` for user-facing IDs and resolves to UUID
where needed (see Section C.6 for the PO receiving flow).

### D.4 Required RPC functions

All RPCs are `SECURITY DEFINER` with `set search_path = public, auth`. They
must validate the caller is a member of the business in the payload before
mutating.

| Function | Signature | Returns |
| --- | --- | --- |
| `current_user_sw_business_ids()` | — | `SETOF uuid` — the caller's business IDs. |
| `current_user_is_business_member(p_business_id uuid)` | — | `boolean`. |
| `current_user_business_role(p_business_id uuid)` | — | `text` — `'owner' \| 'admin' \| 'staff' \| null`. |
| `next_display_id(p_business_id uuid, p_entity text)` | — | `text` — formatted display ID. |
| `sw_create_business(p_name text, p_type text default 'retail', p_currency text default 'NGN', p_timezone text default 'Africa/Lagos')` | — | `jsonb` — `{ business_id, name, type, currency, timezone, role }`. |
| `sw_create_sale(p_payload jsonb)` | — | `jsonb` — `{ sale_id, display_id, total }`. |
| `sw_adjust_stock(p_business_id uuid, p_item_id uuid, p_delta integer, p_note text?)` | — | `jsonb`. |
| `sw_receive_purchase_order(p_purchase_order_id uuid)` | — | `jsonb`. |

### D.5 RLS policies

Every tenant-scoped table (`sw_customers`, `sw_vendors`, `sw_inventory_items`,
`sw_sales`, `sw_sale_items`, `sw_purchase_orders`, `sw_purchase_order_items`,
`sw_stock_movements`, `sw_expenses`) must have:

- `FOR SELECT USING (business_id IN current_user_sw_business_ids())`
- `FOR INSERT WITH CHECK (business_id IN current_user_sw_business_ids())`
- `FOR UPDATE USING (business_id IN current_user_sw_business_ids()) WITH CHECK (business_id IN current_user_sw_business_ids())`
- `FOR DELETE USING (business_id IN current_user_sw_business_ids())`

And filter `deleted_at IS NULL` in the `USING` clause for soft-deleted
tables.

`sw_businesses` itself is scoped by membership in
`sw_business_memberships`. `sw_business_memberships` is readable by the
membership's user and writable (insert/update/delete) only by an existing
`owner` or `admin` of the same business.

### D.6 Manual RLS verification

The frontend ships an automated test suite (Vitest + jsdom) that covers
service-layer contract shape and the demo-mode code path. RLS isolation
CANNOT be automated without a configured Supabase project + two test users
in different businesses. The backend developer should manually verify:

1. User A in Business A cannot `SELECT` rows from Business B's
   `sw_inventory_items` / `sw_sales` / `sw_customers` / `sw_vendors` /
   `sw_expenses` / `sw_purchase_orders` / `sw_stock_movements`.
2. User A cannot `INSERT` a `sw_inventory_items` row with
   `business_id = <Business B's UUID>`.
3. `sw_create_sale` rejects an `item_id` from another business (whole
   sale rolls back, no partial state).
4. `sw_create_sale` rejects a `customer_id` from another business.
5. `sw_create_sale` rejects when `qty > stock` (insufficient stock).
6. Concurrent `sw_create_sale` calls for the same item do not produce
   negative stock (`pg_advisory_xact_lock` on the item).
7. `sw_receive_purchase_order` is idempotent — calling it twice on the
   same PO raises on the second call.
8. The `sw_display_id_counters` row is created on first sale / first PO
   per business (atomic; no duplicate IDs under concurrent inserts).

---

## E. Environment and local integration

### E.1 Required frontend env vars (developer's `.env.local`)

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-public-key>
VITE_PUBLIC_APP_URL=http://localhost:5173
```

`.env.example` is committed and contains the full set with placeholder values
and inline safety notes. `.env.test.local` is also committed (it overrides
Supabase vars to empty strings so the test suite runs deterministically in
demo mode).

### E.2 Run the frontend locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle in dist/
npm run lint      # ESLint
npm test          # Vitest (39 tests, jsdom)
```

### E.3 Test the frontend against the backend

1. Apply the schema, RLS policies, and RPC functions to a dev Supabase
   project (the SQL is documented in Section D — the backend developer
   owns the migration files).
2. Set the env vars in `.env.local`.
3. Run `npm run dev`. The frontend should detect Supabase mode (the
   `DemoModeBanner` will disappear).
4. Sign up a test user; the `BusinessProvider` should auto-provision a
   business.
5. Walk through each page (Dashboard, Inventory, Sales, Customers,
   Vendors, Expenses, Reports) and verify data flows.

### E.4 CORS and Supabase Auth configuration

In the Supabase dashboard:

- **Auth → URL Configuration → Site URL**: the production deployment URL
  (e.g. `https://stockwise-rho.vercel.app`).
- **Auth → URL Configuration → Redirect URLs**: must include
  `http://localhost:5173/reset-password` (dev) and
  `https://stockwise-rho.vercel.app/reset-password` (prod). Without these
  entries, the password-reset email link will be rejected.
- **Database → Connection string**: not used by the frontend. The frontend
  uses the publishable anon key only.

### E.5 Distinguishing a frontend defect from an unavailable backend

| Symptom | Likely cause |
| --- | --- |
| Page renders but data is empty + "Demo mode" banner is shown. | Frontend is in demo mode (Supabase env vars missing). Not a backend issue. |
| Page renders, "Demo mode" banner is NOT shown, but a specific table is empty. | Either no data exists for this business OR an RLS policy is rejecting the read. Check the Supabase logs. |
| A create/update/delete fails with `error.code = 'P0001'`. | The RPC raised an exception (e.g. insufficient stock). Check the error message. |
| A create fails with `error.code = '42501'`. | RLS denied the write. Verify the user is a member of the `business_id` in the payload. |
| `error.code = 'NOT_CONFIGURED'`. | The Supabase client is `null` (env vars missing). Not a backend issue. |
| `error.code = 'NOT_FOUND'`. | The frontend looked up an ID that does not exist (or is in another business). |

---

## F. Outstanding integration tasks

The list below contains only items supported by the audit. Each is tied to a
frontend feature and a verification status.

| # | Required action | Reason | Frontend feature | Acceptance condition | Status |
| --- | --- | --- | --- | --- | --- |
| F-1 | Apply the schema, RLS policies, and RPC functions to the dev and prod Supabase projects. | Without these, the frontend runs in demo mode and no data persists. | All authenticated pages. | All `sw_*` tables exist; RLS is enabled on every tenant-scoped table; all four RPCs (`sw_create_business`, `sw_create_sale`, `sw_adjust_stock`, `sw_receive_purchase_order`) respond. | **Requires confirmation** — backend developer must apply. |
| F-2 | Implement a join from `sw_sales` to `sw_sale_items` in `dashboardSupabase.recentSalesList` and `pendingOrdersList`. | Today the dashboard shows "0 items" for every pending order and recent sale. | Dashboard pending-orders + recent-sales sections. | Each pending-order and recent-sale row shows the actual line-item count. | Verified as a known gap; fix is localised to `src/services/dashboardSupabase.js`. |
| F-3 | Implement a join from `sw_sales` to `sw_customers` in `salesSupabase.list` and `salesSupabase.get`. | Today the Sales page shows "Unknown" as the customer name in Supabase mode. | Sales list + sale detail. | Each sale row shows the customer's real name. | Verified as a known gap. |
| F-4 | Implement a join from `sw_sale_items` to `sw_inventory_items` for the `name` field. | Today line-item names show as "Unknown item". | Sales list + sale detail line items. | Each line item shows the inventory item's name. | Verified as a known gap. |
| F-5 | Compute `salesChange`, `profitChange`, `inventoryChange`, `lowStockChange` in `dashboardSupabase.summary`. | Today the dashboard's "vs last month" deltas are always 0. | Dashboard StatCard `change` prop. | StatCards show non-zero deltas when historical data exists. | Verified as a known gap. |
| F-6 | Compute `topProducts`, `paymentBreakdown`, `acquisition`, and `topCustomers` aggregates in `reportsSupabase.*Report`. | Today the Reports page falls back to mock data for these sections (silently). | Reports page sales / customers / expenses tabs. | Reports render real data, not mock fallback. | Verified as a known gap. |
| F-7 | Implement the Settings page (profile editing, business profile editing, password change, session revocation). | The page is a placeholder today. | `/settings`. | User can edit their profile + business + password. | Unimplemented. |
| F-8 | Implement the Documents page (list of generated documents, document upload, per-business storage bucket). | The page is a placeholder today. | `/documents`. | User can view and upload documents. | Unimplemented. |
| F-9 | Implement the TopBar search (across inventory, customers, vendors, sales). | Today the search input is disabled. | TopBar search. | User can search across entities and click through to results. | Unimplemented. |
| F-10 | Implement the TopBar notifications centre (low-stock alerts, pending orders, etc.). | Today the bell is empty. | TopBar notifications. | User sees real alerts based on inventory state. | Unimplemented. |
| F-11 | Implement CSV export on Inventory, Sales, and Expenses pages. | Today the export buttons are disabled. | Per-page export buttons. | User can export the filtered list to CSV. | Unimplemented. |
| F-12 | Implement PDF export on the Reports page. | Today the "Export PDF" button is disabled. | Reports page. | User can download a PDF of the active report. | Unimplemented. |
| F-13 | Implement bulk upload on the Inventory page. | Today the "Bulk Upload" button is disabled. | Inventory page. | User can upload a CSV of inventory items. | Unimplemented. |
| F-14 | Implement pagination on the list views. | Today the service `list()` functions default to `pageSize: 100` with no UI to advance pages. | Inventory, Sales, Customers, Vendors, Expenses list views. | User can paginate through >100 records. | Unimplemented. |
| F-15 | Replace `alert()` in `VendorsPage.handleReceive` with a non-blocking toast. | UX polish. | Vendor drawer → Receive PO. | Errors surface in a toast, not a native blocking alert. | Verified as a known gap. |
| F-16 | Replace `alert()` in the password-reset success state with a non-blocking banner. | UX polish. | Forgot Password page. | Same. | Verified as a known gap. |

---

## G. Integration acceptance criteria

The backend handover is complete when:

- [ ] All `sw_*` tables from Section D.1 exist on the dev Supabase project
      with the documented columns and constraints.
- [ ] RLS is enabled on every tenant-scoped table; the policies from
      Section D.5 are applied.
- [ ] All four SECURITY DEFINER RPC functions respond:
      `sw_create_business`, `sw_create_sale`, `sw_adjust_stock`,
      `sw_receive_purchase_order`.
- [ ] The `next_display_id` helper RPC responds and produces unique
      sequential IDs per business per entity.
- [ ] A user signing up via the frontend is auto-provisioned a business;
      `sw_businesses` and `sw_business_memberships` rows exist for them.
- [ ] A user can CRUD inventory items, customers, vendors, expenses — and
      those records are scoped to their business (a second user in a
      different business cannot read or write them).
- [ ] A user can create a sale via the New Sale modal; stock decrements
      atomically; the sale appears in the Sales list; the dashboard's
      pending-orders count updates.
- [ ] A sale with `qty > stock` is rejected; no partial state is left
      behind.
- [ ] A user can place a purchase order via the Vendor drawer; line items
      are persisted in `sw_purchase_order_items`; the PO appears in the
      vendor's recent-orders list.
- [ ] A user can receive a PO via the Vendor drawer; stock increments
      atomically; the PO's status changes to `delivered`; the dashboard's
      inventory count updates.
- [ ] Password reset flow works end-to-end: the user enters their email,
      receives a link, lands on `/reset-password`, and can set a new
      password.
- [ ] The frontend's `error.code` surface shows meaningful PostgREST
      codes for validation failures (P0001), unique violations (23505),
      and RLS denials (42501).
- [ ] The frontend builds, lints, and tests pass:
      `npm run build && npm run lint && npm test` all exit 0.
