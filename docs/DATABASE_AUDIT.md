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

# Database & Data-Layer Audit

> Phase 1 audit document. This document records what currently exists
> in the Stockwise repository regarding data persistence, schema, and
> data access, and what the backend engineer needs to know to plan the
> real database.

## 1. Headline finding

**There is no database.** There is no schema, no migrations directory,
no ORM, no SQL or NoSQL driver, no `prisma/schema.prisma`, no
`drizzle.config.ts`, no `knexfile.js`, no `sequelize` import, no
`mongoose` models, no `pg` / `mysql2` / `mongodb` dependency in
`package.json`. There is no `.env` or `.env.example` declaring a
`DATABASE_URL`. There is no `db/`, `db/`, `server/`, `api/`, or
`backend/` directory.

The "data layer" of this project is a single JavaScript module:
`src/data/mockData.js` (≈291 lines). It exports ~20 named arrays and
objects of hardcoded mock records. Every page imports the relevant
slice into local React `useState` and mutates it there; nothing
persists across navigation or refresh.

The remainder of this document treats `mockData.js` as a **de facto
schema sketch** — useful for understanding what entities the product
expects to exist — and identifies open questions for the backend
engineer. No schema changes have been made (none were possible); no
migrations have been run.

## 2. What was verified

| Item                                  | Present? | Where                                           |
| ------------------------------------- | -------- | ----------------------------------------------- |
| Database driver / ORM                 | ❌        | `package.json` (no `prisma`, `drizzle`, `mongoose`, `pg`, `mysql2`, `mongodb`) |
| Migration files                       | ❌        | No `migrations/`, `prisma/migrations/`, etc.    |
| Seed files                            | ❌        | No `seed.js`, `prisma/seed.ts`, etc.            |
| Schema definition                     | ❌        | No `schema.prisma`, `schema.sql`, etc.          |
| `.env` / `.env.example`               | ❌        | Neither in repo (`.gitignore` excludes `*.local`) |
| `DATABASE_URL` or similar             | ❌        | n/a                                             |
| API server entry point                | ❌        | No `server.js`, `server.ts`, `app.js` (Express), no `pages/api/` (Next.js) |
| `fetch` / `axios` / API client utility | ❌        | `grep -r 'fetch(' src/` returns zero hits in business code (only the Vite HMR client) |
| Data-access layer (`src/services/`, `src/api/`, `src/repositories/`) | ❌ | None of these directories exist. |
| Local storage / session storage / cookies | ❌    | `grep -r 'localStorage' src/` returns zero hits. |
| Real seed data fixtures               | ❌        | `mockData.js` is the closest thing, but it lives in app code and is consumed as live state, not as a seed for a real DB. |

## 3. The de facto "schema" (entities visible in `mockData.js`)

The mock data module is the only authoritative source for what entities
the frontend expects. Each export below maps to a logical entity. Field
names are preserved exactly so the backend engineer can plan table
/column names.

### 3.1 `dashboardStats` (aggregate, derived — not really a table)

```js
{
  totalSales: 2400000,        // currency, NGN
  totalProfit: 680000,
  totalInventory: 1248,         // count of stock units
  lowStockCount: 5,
  salesChange: 12.4,           // % vs previous period
  profitChange: 8.1,
  inventoryChange: -2.3,
  lowStockChange: 2,
}
```

This is a **derived aggregate**, not a persisted entity. The backend
should compute it on demand via SQL (e.g. `SELECT SUM(total) FROM sales
WHERE status='completed' AND created_at >= date_trunc('month', now())`).
See `BACKEND_HANDOVER.md` §4 for the proposed `/dashboard/summary`
endpoint.

### 3.2 `revenueData` (time-series, derived)

```js
[
  { day: 'Mon', thisWeek: 180000, lastWeek: 140000 },
  … 7 entries …
]
```

Derived from sales grouped by day-of-week. Backend should expose a
`/dashboard/revenue?period=week` endpoint returning this shape.

### 3.3 `stockStatusData` (derived)

```js
[
  { name: 'In Stock',     value: 875, color: '#16a34a' },
  { name: 'Low Stock',    value: 263, color: '#f59e0b' },
  { name: 'Out of Stock', value: 110, color: '#ef4444' },
]
```

Derived from inventory. `color` is presentation only — backend should
return just `{ name, value }` and frontend already knows the colors.
Or, more useful: return `{ inStock, lowStock, outOfStock }` as numbers.

### 3.4 `topSellers` (derived)

```js
[
  { id: 1, icon: 'Shirt', bg: '#fce7f3', iconColor: '#9d174d', name: 'Ankara Gown (M)', sku: 'SKU-001', sold: 124, revenue: 372000, trend: 'up' },
  … 4 entries …
]
```

Fields `icon`, `bg`, `iconColor` are **presentation only** — backend
should not store them. `id`, `name`, `sku`, `sold`, `revenue` are the
real fields. `trend: 'up' | 'down'` is derived from comparing two
periods — backend should compute it.

### 3.5 `lowStockItems` (derived from inventory)

Same shape as `inventoryItems` but only items where `stock <=
threshold`. Includes `status: 'critical' | 'low'`. Computed; no
separate table.

### 3.6 `pendingOrders` (derived from sales)

```js
[
  { id: '#ORD-0342', customer: 'Chidinma Eze', amount: 18500, items: 3 },
  … 3 entries …
]
```

Subset of sales where `status='pending'`. Note `id` here is a string
prefixed with `#`, while in `salesData` (below) the `id` is a string
without the `#`. Inconsistent — pick one.

### 3.7 `inventoryItems` — **primary entity: Item / Product**

```js
[
  {
    id: 1,                              // integer (Date.now() when added via modal)
    iconName: 'Shirt',                  // PRESENTATION — Lucide icon name
    bg: '#fce7f3',                      // PRESENTATION — avatar/icon background color
    name: 'Ankara Gown (M)',
    sku: 'SKU-001',                     // unique, required
    category: 'Clothing',               // enum: Clothing | Footwear | Accessories | Other
    supplier: 'Lagos Fashion Hub',      // denormalized vendor name — see questions
    stock: 124,                         // integer, current stock level
    threshold: 20,                      // integer, low-stock alert threshold
    costPrice: 2500,                    // integer, NGN
    sellingPrice: 3000,                 // integer, NGN
    lastRestocked: '2026-03-17',        // ISO date string (yyyy-mm-dd)
  },
  … 10 entries …
]
```

**Schema notes:**
- `id` is generated as `Date.now()` (line 168 in `ItemModal.jsx`) —
  will be a large integer. Backend should use a proper UUID or
  auto-increment.
- `supplier` is a string (vendor name). Should be a foreign key to
  `vendors.id`.
- `iconName` and `bg` are presentation. Recommend the backend does NOT
  store these — the frontend can pick a default icon/color based on
  `category`, or store an icon name in a `metadata` JSON column if the
  user really wants to customise it.
- `category` is a free string here. Should be normalised into a
  `categories` table or a Postgres `enum`.

### 3.8 `categories` (enum)

```js
export const categories = ['All', 'Clothing', 'Footwear', 'Accessories'];
```

The first entry `'All'` is a UI sentinel — exclude from any backend
enum.

### 3.9 `suppliers` (denormalized list — should be vendors)

```js
export const suppliers = ['Lagos Fashion Hub', 'Aba Footwear Co.', 'Kano Leather Works'];
```

This duplicates vendor names. Should be replaced with a JOIN to
`vendors`.

### 3.10 `salesData` — **primary entity: Sale / Order**

```js
[
  {
    id: 'ORD-0342',                      // STRING with ORD- prefix
    customer: {
      name: 'Chidinma Eze',             // denormalized — should be customer_id
      initials: 'CE',                    // PRESENTATION
      color: '#fce7f3',                 // PRESENTATION
      textColor: '#9d174d',             // PRESENTATION
    },
    items: [
      { name: 'Ankara Gown (M)', qty: 2, price: 3000 },   // denormalized — should be item_id + qty
      …
    ],
    total: 23500,                       // integer, NGN — should be derived from items
    payment: 'Transfer',                // enum: Cash | Transfer | POS
    status: 'completed',               // enum: completed | pending | cancelled
    date: '2026-03-21T14:30:00',        // ISO datetime string
    note: 'Customer requested gift wrapping',
  },
  … 8 entries …
]
```

**Schema notes:**
- `id` is a string `ORD-XXXX`. Inconsistent with `inventoryItems.id`
  (integer) and `customersData.id` (integer). Should normalise to
  integer or UUID across all entities.
- `customer` is a nested object with denormalized customer details.
  Backend should store `customer_id` and JOIN.
- `customer.initials`, `customer.color`, `customer.textColor` are
  presentation — compute on the client from the customer name.
- `items` is an array of `{ name, qty, price }`. Should be a separate
  `sale_items` table with `sale_id`, `item_id`, `qty`, `unit_price`,
  `line_total`.
- `total` should be derived as `SUM(line_total)` in the backend, not
  stored as a separate column (or stored in a denormalized cache column
  updated via trigger).
- `payment` enum is `{ Cash, Transfer, POS }`. Expenses use `{
  Cash, Transfer, Card }`. Inconsistent — `POS` vs `Card` for the
  same concept. **Needs a product decision.**
- `status` enum is `{ completed, pending, cancelled }`. No
  `refunded` state — may be needed.

### 3.11 `paymentMethods` (enum)

```js
['Cash', 'Transfer', 'POS'];
```

### 3.12 `customersData` — **primary entity: Customer**

```js
[
  {
    id: 1,
    firstName: 'Chidinma',
    lastName: 'Eze',
    initials: 'CE',                      // PRESENTATION
    color: '#fce7f3',                    // PRESENTATION
    textColor: '#9d174d',               // PRESENTATION
    email: 'chidinma.eze@gmail.com',
    phone: '+234 803 456 7890',
    type: 'Retailer',                   // enum: Retailer | Wholesale | Walk-in | E-commerce
    location: 'Ikeja, Lagos',
    status: 'active',                   // enum: active | new | owing | inactive
    joinDate: '2025-08-14',             // ISO date
    totalSpent: 84500,                 // derived — SUM of completed orders
    totalOrders: 12,                   // derived — COUNT of orders
    lastOrder: '2026-03-21',            // derived — MAX(order.date)
    note: 'Prefers Ankara styles. Usually orders in bulk.',
    orders: [                            // derived — list of customer's orders
      { id: 'ORD-0342', date: '2026-03-21', total: 23500, status: 'completed', items: 3 },
      …
    ],
  },
  … 8 entries …
]
```

**Schema notes:**
- `initials`, `color`, `textColor` are presentation.
- `totalSpent`, `totalOrders`, `lastOrder`, `orders` are all derived
  from `salesData` — backend should compute these via JOINs / views,
  not store them as columns.
- `type` enum and `status` enum are tight (4 values each) — good.
- `joinDate` is auto-set to today's date on create in `CustomerModal`
  (`new Date().toISOString().slice(0, 10)`).
- No `business_id` field — see "Multi-tenancy" open question.

### 3.13 `customerTypes`, `customerStatuses`, `avatarColors`

UI sentinels and presentation. Not schema.

### 3.14 `vendorsData` — **primary entity: Vendor / Supplier**

```js
[
  {
    id: 1,
    name: 'Lagos Fashion Hub',
    initials: 'LF',                      // PRESENTATION
    color: '#dbeafe',                   // PRESENTATION
    textColor: '#1d4ed8',               // PRESENTATION
    category: 'Clothing & Accessories', // enum
    contactPerson: 'Mr. Taiwo Adebayo',
    email: 'lagfashionhub@gmail.com',
    phone: '+234 801 234 5678',
    location: 'Yaba, Lagos',
    status: 'active',                   // enum: active | inactive
    joinDate: '2025-01-15',
    itemsSupplied: ['Ankara Gown', 'Bodysuit', 'Polo Shirt', 'Silk Scarf', 'Sun Hat', 'Cap'],
                                         // many-to-many with items — should be a join table
    totalOrders: 24,                    // derived
    totalPaid: 680000,                  // derived
    pendingAmount: 0,                   // derived
    lastOrder: '2026-03-17',            // derived
    leadTimeDays: 3,
    rating: 5,                          // 1–5
    note: 'Most reliable supplier. Offers 5% discount on orders above ₦100K.',
    orders: [                            // purchase order history
      { id: 'PO-024', date: '2026-03-17', items: 4, total: 85000, status: 'delivered' },
      …
    ],
  },
  … 5 entries …
]
```

**Schema notes:**
- `itemsSupplied` is an array of strings — should be a `vendor_items`
  join table (vendor_id ↔ item_id) or, more practically, derived by
  querying `items WHERE supplier_id = vendor.id`.
- `orders` is the purchase-order history — implies a `purchase_orders`
  table separate from customer `sales`. Note the `status` enum is
  `{ delivered, pending, cancelled }` — different from sales'
  `{ completed, pending, cancelled }`. Inconsistent.
- `totalOrders`, `totalPaid`, `pendingAmount`, `lastOrder` are all
  derived from `purchase_orders`.

### 3.15 `vendorCategories`, `vendorStatuses`, `vendorAvatarColors`

UI sentinels. Not schema.

### 3.16 `expenseCategories` (lookup table)

```js
[
  { id: 'stock',     label: 'Stock Purchase', icon: 'Package',   color: '#16a34a', bg: '#f0fdf4' },
  { id: 'rent',      label: 'Rent',           icon: 'Home',      color: '#3b82f6', bg: '#dbeafe' },
  { id: 'transport', label: 'Transport',      icon: 'Truck',     color: '#f59e0b', bg: '#fef3c7' },
  { id: 'utilities', label: 'Utilities',      icon: 'Zap',       color: '#8b5cf6', bg: '#ede9fe' },
  { id: 'marketing', label: 'Marketing',      icon: 'Megaphone', color: '#ec4899', bg: '#fdf2f8' },
  { id: 'salaries',  label: 'Salaries',       icon: 'Users',     color: '#0ea5e9', bg: '#e0f2fe' },
  { id: 'packaging', label: 'Packaging',      icon: 'MailOpen',  color: '#10b981', bg: '#d1fae5' },
  { id: 'other',     label: 'Other',          icon: 'Wrench',    color: '#6b7280', bg: '#f3f4f6' },
]
```

**Schema notes:**
- `id` is a string slug. Good for a stable enum reference.
- `icon`, `color`, `bg` are presentation. The backend could store
  them in a `metadata` JSON column OR just return `id` and `label` and
  let the frontend maintain its own icon map.
- This is the only lookup table that has presentation fields baked in.
  Decision needed: should the backend own presentation, or the
  frontend? (Recommendation: backend owns `id` + `label`, frontend
  owns icon/color mapping — see `BACKEND_HANDOVER.md`.)

### 3.17 `expensesData` — **primary entity: Expense**

```js
[
  {
    id: 1,                              // integer (Date.now())
    name: 'Monthly Shop Rent',
    category: 'rent',                   // FK to expense_categories.id
    vendor: 'Landlord',                 // denormalized string — could be vendor_id or free-text payee
    amount: 30000,                      // integer NGN
    date: '2026-03-01',                 // ISO date
    payment: 'Transfer',                // enum: Cash | Transfer | Card (NOTE: 'Card' here, 'POS' in sales)
    note: 'March 2026 rent',
  },
  … 15 entries …
]
```

**Schema notes:**
- `vendor` here is a free-text field (e.g. "Landlord", "Total
  Energies", "GIG Logistics") — not necessarily a vendor in
  `vendorsData`. The `ExpenseModal` provides a `<datalist>` of
  vendor names as suggestions, but accepts any string. **Decision
  needed:** enforce FK to `vendors` (with "Other" option for ad-hoc
  payees), or keep as free-text.
- Payment enum mismatch (`Card` vs `POS` in sales) — see `BACKEND_HANDOVER.md`.

### 3.18 `expensePaymentMethods` (enum)

```js
['Cash', 'Transfer', 'Card'];
```

### 3.19 `expenseTrend` (derived time-series)

```js
[
  { month: 'Oct', amount: 142000 },
  … 6 entries …
]
```

Derived by grouping expenses by month. Backend should expose
`/expenses/trend?months=6`.

### 3.20 Reports-only derived datasets

- `salesTrendData` — monthly revenue / profit / orders, 6 months.
- `paymentBreakdown` — % split by payment method (Bank Transfer /
  Cash / POS). Note: labels here differ again ("Bank Transfer" vs
  "Transfer" in `paymentMethods`) — inconsistent.
- `topProductsReport` — top products by units sold + growth %.
- `inventoryCategoryReport` — inventory value by category.
- `customerAcquisitionData` — new vs returning customers per month.
- `customerTypeBreakdown` — % split by customer type.
- `expenseCategoryReport` — % split by expense category.

All of these are **derived** from the primary entities above. The
backend should compute them on demand; no separate storage needed.

## 4. Open questions for the backend engineer

These need product/engineering decisions before schema design can
finalise:

1. **Multi-tenancy.** The user object has a `businessName` field, but
   there is no explicit `business_id` foreign key on any entity. Are
   all records scoped to a single business per user? If yes, every
   table needs a `business_id` column + index, and every list query
   must filter by it. If multiple users can share a business, a
   `business_users` join table is needed.
2. **Auth model.** Email+password only, or phone+OTP (the phone field
   on signup suggests possibly)? JWT or session cookies? Refresh
   token rotation strategy?
3. **Currency.** All amounts are integers (naira, no decimals). Should
   the schema store `numeric(12, 2)` or `integer` (kobo)? Decision
   affects rounding on totals.
4. **ID strategy.** Inconsistent today: integers (`Date.now()`) for
   inventory/customers/vendors/expenses, strings (`ORD-XXXX`,
   `PO-XXX`) for sales and purchase orders. Pick one: serial integer,
   UUID v4, or ULID. Consider human-readable display IDs separately
   (`display_id` column for `ORD-XXXX` formatting).
5. **`POS` vs `Card`.** Sales use `POS`, expenses use `Card`. Are
   these the same payment method? If so, pick one term.
6. **Vendor on expense.** Should `expense.vendor` be a FK to
   `vendors.id` (with a fallback "Other" option), or a free-text
   `payee` column? Currently free-text + datalist suggestions.
7. **`itemsSupplied` on vendor.** Store as a separate `vendor_items`
   join table, or derive from `items.supplier_id`?
8. **Stock movements.** Currently `inventoryItems.stock` is a static
   number. When a sale is created, stock should decrement; when a
   purchase order is delivered, stock should increment. Should we
   track a `stock_movements` ledger (audit trail) or just update the
   `stock` column in place? Ledger is safer (reproducible) but more
   complex.
9. **Soft delete.** Customers and vendors are deleted permanently
   today (local state). Should the schema use `deleted_at` for soft
   delete? Especially important because sales/expenses reference
   customer_id/vendor_id — hard delete would orphan those records.
10. **Timezone.** All dates are stored as ISO strings without timezone
    in mock data. Backend should normalise to UTC + a `business.timezone`
    column for display purposes.
11. **Reports period filter.** The Reports page has a `period` selector
    (This Month / Last Month / Quarter / This Year) that does nothing
    today. Backend should accept `?period=month|last_month|quarter|year`
    on every reports endpoint.
12. **Search.** The TopBar has a decorative search input. Should the
    backend support a global `/search?q=…` endpoint that searches
    across inventory + customers + vendors + sales? If yes, Postgres
    full-text search or a separate search index (e.g. Meilisearch)?

## 5. What the frontend would benefit from (data-layer side)

Even before the backend exists, the frontend would benefit from:

1. **A typed API client.** Today every page imports `mockData`
   directly. Refactor to a `src/services/` directory with one module
   per entity (`inventoryService.js`, `salesService.js`, etc.) that
   initially returns the same mock data but is structured to be
   swapped for `fetch()` calls later. This isolates the swap point.
2. **Shared TypeScript types.** The project uses plain JS. Adding
   JSDoc or migrating to TypeScript would catch many of the field
   mismatches identified in this audit (e.g. `cat.Icon` vs `cat.icon`,
   `item.emoji` vs `item.icon`) at compile time.
3. **An environment-driven API base URL.** Today there is no `fetch`
   usage. When it's added, a `VITE_API_BASE_URL` env var and a single
   `apiClient` instance will be needed. See `ENVIRONMENT_SETUP.md`.
4. **A consistent ID type.** Until the backend decides, the frontend
   should at least normalise — either always string, or always number.
5. **An error-handling wrapper.** A small `withErrorHandling(asyncFn)`
   utility that catches network errors and surfaces them via a toast
   notification system, so individual components don't each have to
   write try/catch.

## 6. What was NOT done in this audit (per the rules)

- **No schema was created** — there was no schema to begin with.
- **No migrations were run** — none exist.
- **No seed data was written** — the existing `mockData.js` was left
  untouched.
- **No database credentials were exposed or committed.** None exist
  in the repo.
- **No DB client was added as a dependency.**
- **No `.env` file was created.**

The state of the repository is **unchanged** by this audit. Only the
new `docs/` directory and these markdown files were added.

## 7. Next document to read

Proceed to [`BACKEND_HANDOVER.md`](./BACKEND_HANDOVER.md) for the
proposed API contracts, or [`ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md)
for local setup instructions.
