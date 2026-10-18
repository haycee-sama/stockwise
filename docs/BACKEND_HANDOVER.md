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

# Backend Handover — Proposed API Contracts & Integration Responsibilities

> Phase 1 audit document. This document is **prescriptive**, not
> descriptive. Every endpoint listed below is **proposed**, based on
> the current frontend behaviour and data shapes. None of these
> endpoints are implemented today. Anything marked `Needs
> confirmation` requires a decision from the backend engineer or
> product owner before implementation.

## 0. At-a-glance

The frontend currently has:
- Zero `fetch` / `axios` calls.
- Zero environment-driven URLs.
- Zero persisted auth state.
- A `src/data/mockData.js` module that is the **single source of truth**
  for every entity, mutated in-page only.

The backend engineer needs to:
1. Design and provision a database (suggested: PostgreSQL — see
   `DATABASE_AUDIT.md` §4).
2. Implement the endpoints listed below.
3. Define the auth flow (recommended: JWT access + refresh, with
   `HttpOnly` refresh cookie).
4. Define multi-tenancy (`business_id` scoping).
5. Provide API docs / OpenAPI spec matching this document.

The frontend engineer (Phase 2, after this audit is approved) will:
1. Create a `src/services/apiClient.js` with a base `fetch` wrapper,
   auth-header injection, error normalisation, and request retry.
2. Replace direct `mockData` imports with `services/<entity>Service.js`
   modules that call the API client.
3. Wire `AuthContext` to use real `POST /auth/login`, `POST /auth/signup`,
   `POST /auth/logout`, `POST /auth/refresh`.
4. Persist the access token (in-memory + refresh via cookie, or
   `localStorage` — see §1.4 decision).
5. Add error boundaries + toast notifications.

## 1. Auth

### 1.1 `POST /auth/signup`

**Purpose:** Register a new business + first user.

**Request body** (from `SignupForm.jsx`):
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "businessName": "My Store",
  "businessType": "retail",              // from the (currently non-wired) select
  "email": "you@business.com",
  "phone": "+234 800 000 0000",
  "password": "secret123",
  "agreedToTerms": true
}
```

**Response `201 Created`:**
```json
{
  "user": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Doe",
    "email": "you@business.com",
    "phone": "+234 800 000 0000",
    "business": {
      "id": "uuid",
      "name": "My Store",
      "type": "retail"
    }
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
  "refreshToken": "set as HttpOnly cookie"          // see §1.4
}
```

**Validation:**
- `email`: RFC 5322, must be unique in `users` table.
- `phone`: E.164-friendly; recommend `/^\+?[0-9]{7,15}$/` after
  stripping whitespace (the current frontend regex in `CustomerModal`
  is too permissive — see `FRONTEND_AUDIT.md` P2-009).
- `password`: minimum 8 chars (current frontend rule). Hash with
  bcrypt cost 12 or argon2id.
- `businessName`: required, non-empty.
- `businessType`: enum `{ retail, wholesale, ecommerce, distribution,
  manufacturing, other }` — currently the frontend `<select>` is
  not wired up (see `FEATURE_INVENTORY.md` §2.2). **The frontend
  engineer will fix the select before this endpoint is wired.**

**Errors:**
- `409 Conflict` if email already exists.
- `422 Unprocessable Entity` for validation failures, with
  field-level errors:
  ```json
  { "errors": { "email": "Email already registered", "phone": "Invalid phone format" } }
  ```

### 1.2 `POST /auth/login`

**Purpose:** Authenticate an existing user.

**Request body** (from `LoginForm.jsx`):
```json
{
  "email": "you@business.com",
  "password": "secret123"
}
```

**Response `200 OK`:** Same shape as signup response.

**Errors:**
- `401 Unauthorized` with `{ "message": "Invalid email or password" }`
  (the frontend already has a banner for this — `LoginForm.jsx`
  line 64 `setGeneralError('Invalid email or password. Please try
  again.')`).

### 1.3 `POST /auth/logout`

**Purpose:** Invalidate the refresh token (and access token if using a
denylist).

**Request:** no body. The refresh cookie is sent automatically.

**Response `204 No Content`.**

### 1.4 `POST /auth/refresh`

**Purpose:** Exchange a refresh token (cookie) for a new short-lived
access token.

**Request:** no body. Refresh token sent via `HttpOnly` cookie.

**Response `200 OK`:**
```json
{ "accessToken": "eyJ…" }
```

**Errors:**
- `401 Unauthorized` if the refresh token is missing, expired, or
  invalid. Frontend should treat this as "session expired, redirect
  to /login".

**Decision needed:**
- Option A: **HttpOnly refresh cookie + in-memory access token.**
  Most secure against XSS. Frontend stores access token in JS
  memory, refreshes on 401 via refresh interceptor. Access token
  short-lived (15 min), refresh long-lived (30 days).
- Option B: **localStorage access token + no refresh.** Simpler,
  but vulnerable to XSS token theft. Not recommended for an app
  with user-generated content.
- **Recommendation:** Option A.

### 1.5 `POST /auth/forgot-password`  *(Needs confirmation)*

**Purpose:** Trigger a password-reset email.

**Request body:**
```json
{ "email": "you@business.com" }
```

**Response `202 Accepted`** (always — to avoid leaking whether the
email exists).

**Decision needed:** Is this in scope for the initial backend, or
deferred? The frontend currently has a broken link to
`/forgot-password` (see P2-003). Either build it or remove the link.

### 1.6 `POST /auth/reset-password`

**Purpose:** Set a new password from a reset token.

**Request body:**
```json
{ "token": "reset-token-from-email", "password": "new-secret-123" }
```

**Response `200 OK`** on success, `422` if token invalid/expired.

## 2. Inventory (Items)

### 2.1 `GET /inventory`

**Query params:**
- `search` — string, matches name OR sku OR category (case-insensitive).
- `category` — string, exact match. `""` (empty) means "all".
- `status` — enum `in_stock | low_stock | out_of_stock`. Derived: `out`
  if `stock = 0`, `low` if `0 < stock <= threshold`, else `in_stock`.
- `sort` — string, format `{field}:{asc|desc}`. Valid fields:
  `name, sku, category, stock, cost_price, selling_price`.
- `page` — integer, 1-indexed. Default 1.
- `pageSize` — integer, default 50.

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Ankara Gown (M)",
      "sku": "SKU-001",
      "category": "Clothing",
      "supplier": {                          // denormalized vendor
        "id": "uuid",
        "name": "Lagos Fashion Hub"
      },
      "stock": 124,
      "threshold": 20,
      "costPrice": 2500,
      "sellingPrice": 3000,
      "lastRestocked": "2026-03-17"
    },
    …
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 1248,
    "totalPages": 25
  }
}
```

**Notes:**
- The frontend does not currently paginate (it shows all 10 mock
  records in one table). When the real dataset grows, pagination
  will become necessary. The frontend engineer will add a
  pagination control once this endpoint is wired.
- Field names use **camelCase** in the response (matching frontend
  convention). If the backend uses snake_case in the DB, transform
  at the serializer layer.
- `supplier` is denormalized for the list view (only `id` + `name`).
  Detail view (`GET /inventory/:id`) can return the full vendor.

### 2.2 `GET /inventory/:id`

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "name": "Ankara Gown (M)",
  "sku": "SKU-001",
  "category": "Clothing",
  "supplier": { /* full vendor object — see §6 */ },
  "stock": 124,
  "threshold": 20,
  "costPrice": 2500,
  "sellingPrice": 3000,
  "costCurrency": "NGN",                   // optional — default NGN
  "lastRestocked": "2026-03-17",
  "createdAt": "2025-09-01T10:00:00Z",
  "updatedAt": "2026-03-17T08:30:00Z",
  "createdBy": { "id": "uuid", "name": "John Doe" }    // optional
}
```

### 2.3 `POST /inventory`

**Auth:** requires `auth` scope.

**Request body** (from `ItemModal.jsx` step 2 submit):
```json
{
  "name": "Ankara Gown (M)",
  "sku": "SKU-001",
  "category": "Clothing",
  "supplierId": "uuid",                     // was free-text "supplier"; switch to FK
  "stock": 124,
  "threshold": 20,
  "costPrice": 2500,
  "sellingPrice": 3000
  // iconName, bg are presentation-only — NOT sent to backend
}
```

**Validation:**
- `name`: required, 1–200 chars.
- `sku`: required, unique per `business_id`. Pattern: `^[A-Z0-9-]{3,20}$`.
- `category`: enum.
- `supplierId`: must exist in `vendors` for this `business_id`. If
  `null` allowed, `inventory.supplier_id` should be nullable.
- `stock`, `threshold`: integers ≥ 0. (`threshold` should be ≥ 1.)
- `costPrice`, `sellingPrice`: integers ≥ 0 (or `numeric(12,2)` if
  decimals are desired — see `DATABASE_AUDIT.md` §4 #3).
- `sellingPrice >= costPrice` (frontend already enforces; backend
  must also enforce).

**Response `201 Created`:** full item object (same shape as `GET
/inventory/:id`).

**Errors:**
- `409 Conflict` if `sku` already exists for this business.
- `422 Unprocessable Entity` for validation failures.

### 2.4 `PATCH /inventory/:id`

**Request body:** any subset of the fields from `POST /inventory`.
`sku` changes should be allowed but the uniqueness check applies.

**Response `200 OK`:** updated item.

### 2.5 `DELETE /inventory/:id`

**Response `204 No Content`** on success.

**Soft delete recommended** (see `DATABASE_AUDIT.md` §4 #9). If soft
delete, the record stays in the DB with `deleted_at` set, and is
excluded from future `GET /inventory` responses.

### 2.6 `POST /inventory/bulk`

**Purpose:** Import multiple items via CSV upload.

**Request:** `multipart/form-data` with a `file` field.

**Response `200 OK`:**
```json
{
  "imported": 47,
  "skipped": 3,
  "errors": [
    { "row": 12, "field": "sku", "message": "SKU already exists" },
    { "row": 18, "field": "sellingPrice", "message": "Must be ≥ cost price" }
  ]
}
```

**Note:** The frontend's "Bulk Upload" button currently has no
`onClick` (P2-013). The frontend engineer will add a file picker
that submits to this endpoint.

### 2.7 `GET /inventory/export.csv`

**Query params:** same filters as `GET /inventory` (so the export
respects the current view).

**Response `200 OK`:** `Content-Type: text/csv`,
`Content-Disposition: attachment; filename="inventory-{date}.csv"`.

## 3. Sales (Orders)

### 3.1 `GET /sales`

**Query params:**
- `search` — matches order ID OR customer name OR any item name.
- `status` — enum `completed | pending | cancelled`.
- `payment` — enum `Cash | Transfer | POS` (see note below).
- `from`, `to` — ISO datetime, inclusive.
- `page`, `pageSize`.

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "displayId": "ORD-0342",            // human-friendly
      "customer": {
        "id": "uuid",
        "name": "Chidinma Eze",
        "initials": "CE"                   // server-computed? or frontend?
      },
      "items": [
        {
          "id": "uuid",                   // sale_item_id
          "item": { "id": "uuid", "name": "Ankara Gown (M)", "sku": "SKU-001" },
          "qty": 2,
          "unitPrice": 3000,
          "lineTotal": 6000
        },
        …
      ],
      "total": 23500,                    // server-computed sum of line totals
      "payment": "Transfer",
      "status": "completed",
      "date": "2026-03-21T14:30:00Z",     // ISO 8601 UTC
      "note": "Customer requested gift wrapping"
    },
    …
  ],
  "pagination": { /* … */ }
}
```

**Notes:**
- `customer.initials`, `customer.color`, `customer.textColor` are
  presentation-only. The frontend can compute initials from `name`.
  Colors can be deterministic from `name` hash (frontend).
- `total` is server-derived, not stored (or stored in a denormalized
  cache column updated via trigger).
- `id` is the UUID. `displayId` (`ORD-XXXX`) is the human-friendly
  code shown to users. The frontend already renders `#{order.id}`
  in many places — these will need updating to use `displayId`.

### 3.2 `GET /sales/:id`

Same shape as a single entry in the `GET /sales` `data` array.

### 3.3 `POST /sales`

**Request body** (from `NewSaleModal.jsx`):
```json
{
  "customerId": "uuid",                  // was free-text "customer" string
  "items": [
    { "itemId": "uuid", "qty": 2, "unitPrice": 3000 },
    { "itemId": "uuid", "qty": 1, "unitPrice": 5500 }
  ],
  "payment": "Transfer",
  "status": "completed",                 // or "pending"
  "note": "Optional note"
}
```

**Server-side behaviour:**
- Generate `displayId` (e.g. `ORD-{nextVal}` per business).
- Compute `total` from items.
- **Decrement stock for each item** (atomic transaction).
- If `items[i].qty > item.stock`, reject with `422` and a
  per-item error message.

**Response `201 Created`:** full sale object.

**Errors:**
- `422 Unprocessable Entity` if any item is out of stock or qty is
  invalid.
- `409 Conflict` if the customer does not belong to this
  `business_id`.

### 3.4 `PATCH /sales/:id`

Allow updating `status` (e.g. pending → completed) and `note`.
**Changing items after a sale is completed should be forbidden**
(per accounting best practice). If items need to change, refund +
re-create.

### 3.5 `DELETE /sales/:id`

Allow only for `pending` or `cancelled` sales. Completed sales
cannot be deleted (refund flow instead — out of scope for Phase 2).

### 3.6 `POST /sales/:id/refund`  *(Needs confirmation)*

Not currently in the frontend UI. Consider whether refunds are in
scope. If yes, this endpoint creates a negative sale and restocks
items.

### 3.7 `GET /sales/:id/receipt.pdf`

**Response `200 OK`:** `Content-Type: application/pdf`. The frontend
"Print receipt" button (currently broken — P2-013) should call this
and trigger `window.open()` to display the PDF in a new tab, where
the user can print it.

## 4. Customers

### 4.1 `GET /customers`

Query: `search`, `type` (enum), `status` (enum), `page`, `pageSize`.

Response shape: standard paginated list. Each customer:
```json
{
  "id": "uuid",
  "firstName": "Chidinma",
  "lastName": "Eze",
  "email": "chidinma.eze@gmail.com",
  "phone": "+234 803 456 7890",
  "type": "Retailer",
  "location": "Ikeja, Lagos",
  "status": "active",
  "joinDate": "2025-08-14",
  "totalSpent": 84500,                  // server-derived
  "totalOrders": 12,                    // server-derived
  "lastOrder": "2026-03-21",            // server-derived
  "note": "Prefers Ankara styles."
}
```

### 4.2 `GET /customers/:id`

Same shape as a single entry, plus an embedded `orders` array:
```json
{
  …,
  "orders": [
    { "id": "uuid", "displayId": "ORD-0342", "date": "2026-03-21", "total": 23500, "status": "completed", "items": 3 },
    …
  ]
}
```

### 4.3 `POST /customers`

**Request body** (from `CustomerModal.jsx`):
```json
{
  "firstName": "Amaka",
  "lastName": "Okonkwo",
  "phone": "+234 800 000 0000",
  "email": "amaka@example.com",         // optional
  "type": "Retailer",
  "location": "Lagos",
  "note": "Prefers evening deliveries."  // optional
}
```

**Validation:** Stricter phone regex — see `FRONTEND_AUDIT.md` P2-009.

### 4.4 `PATCH /customers/:id`

Same field subset. `status` transitions should be allowed
(e.g. `new` → `active`, `active` → `inactive`). Server may
auto-set `status='active'` after first order.

### 4.5 `DELETE /customers/:id`

**Soft delete recommended.** Sales referencing the customer must not
be orphaned. The frontend's delete modal warns if the customer has
orders — that warning should come from the server (`409 Conflict`
with `{ "message": "Customer has N orders. Use soft-delete." }`).

## 5. Vendors (Suppliers)

### 5.1 `GET /vendors`

Query: `search`, `category`, `status`, `page`, `pageSize`.

Response: paginated list. Each vendor:
```json
{
  "id": "uuid",
  "name": "Lagos Fashion Hub",
  "category": "Clothing & Accessories",
  "contactPerson": "Mr. Taiwo Adebayo",
  "email": "lagfashionhub@gmail.com",
  "phone": "+234 801 234 5678",
  "location": "Yaba, Lagos",
  "status": "active",
  "joinDate": "2025-01-15",
  "leadTimeDays": 3,
  "rating": 5,
  "itemsSupplied": [                     // server-derived: SELECT name FROM items WHERE supplier_id = vendor.id
    "Ankara Gown", "Bodysuit", …
  ],
  "totalOrders": 24,                     // server-derived
  "totalPaid": 680000,                  // server-derived
  "pendingAmount": 0,                  // server-derived
  "lastOrder": "2026-03-17",            // server-derived
  "note": "Most reliable supplier…"
}
```

### 5.2 `GET /vendors/:id` — same as list entry, plus `orders` (purchase order history).

### 5.3 `POST /vendors` — fields from `VendorModal.jsx`.

### 5.4 `PATCH /vendors/:id`

### 5.5 `DELETE /vendors/:id` — soft delete. Block if
`pendingAmount > 0` (the frontend delete modal already warns about
this — server should enforce).

### 5.6 `POST /vendors/:id/orders` (Place Purchase Order)

**Request body** (from `PlaceOrderModal.jsx`):
```json
{
  "items": [
    { "itemName": "Ankara Gown", "qty": 20, "unitPrice": 2500 },
    …
  ],
  "note": "Delivery before Easter"
}
```

**Server-side:**
- Generate `displayId` (`PO-{nextVal}`).
- Compute `total`.
- Set `status='pending'`.
- (Optional) Create pending stock increment; when status flips to
  `delivered`, increment `items.stock`.

**Response `201 Created`:** the new purchase order.

**Notes:** The frontend currently allows free-text `itemName` per
line item, not an item ID. Decision needed: enforce FK to
`items.id` (would require the items to pre-exist), or allow free-text
placeholder items that get linked to real items on delivery.

## 6. Expenses

### 6.1 `GET /expenses`

Query: `search`, `category`, `payment`, `from`, `to`, `page`, `pageSize`.

Response: paginated list. Each expense:
```json
{
  "id": "uuid",
  "name": "Monthly Shop Rent",
  "category": "rent",                   // FK slug
  "vendor": "Landlord",                 // free-text OR vendor_id (decision needed)
  "amount": 30000,
  "date": "2026-03-01",
  "payment": "Transfer",
  "note": "March 2026 rent"
}
```

### 6.2 `POST /expenses`

**Request body** (from `ExpenseModal.jsx`):
```json
{
  "name": "Monthly Shop Rent",
  "category": "rent",
  "vendor": "Landlord",                  // see decision in DATABASE_AUDIT.md §4 #6
  "amount": 30000,
  "date": "2026-03-01",
  "payment": "Transfer",
  "note": "March 2026 rent"
}
```

**Validation:**
- `amount`: positive integer.
- `category`: must exist in `expense_categories` lookup.
- `payment`: enum `Cash | Transfer | Card`.
- `date`: ISO date, not in the future.

### 6.3 `PATCH /expenses/:id` / `DELETE /expenses/:id`

Standard. Soft delete optional.

## 7. Dashboard & Reports (derived)

These are all **read-only** endpoints that aggregate data from the
above tables. None of these have their own table.

### 7.1 `GET /dashboard/summary`

Returns the four stat cards + quick-stats strip.

```json
{
  "totalSales": 2400000,
  "totalProfit": 680000,
  "totalInventory": 1248,
  "lowStockCount": 5,
  "salesChangePct": 12.4,
  "profitChangePct": 8.1,
  "inventoryChangePct": -2.3,
  "lowStockChangePct": 2,
  "todayRevenue": 18500,
  "weekRevenue": 265500,
  "outOfStockCount": 2,
  "pendingOrdersCount": 3
}
```

All `*ChangePct` values are computed vs. the previous equivalent
period (last month vs. month-before-last).

### 7.2 `GET /dashboard/revenue?period=week|month`

Returns the time-series for the bar chart:
```json
{
  "data": [
    { "label": "Mon", "thisPeriod": 180000, "lastPeriod": 140000 },
    { "label": "Tue", … },
    …
  ],
  "total": 1800000,
  "lastTotal": 1490000,
  "growthPct": 20.8
}
```

For `period=week`: 7 days, this week vs. last week.
For `period=month`: 30/31 days, this month vs. last month (or daily
for current month).

### 7.3 `GET /dashboard/stock-status`

Returns the donut chart data:
```json
{
  "inStock": 875,
  "lowStock": 263,
  "outOfStock": 110,
  "total": 1248,
  "inStockPct": 70.0
}
```

(Frontend already has the color mapping; server returns only
numbers.)

### 7.4 `GET /dashboard/top-sellers?limit=4`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Ankara Gown (M)",
      "sku": "SKU-001",
      "sold": 124,
      "revenue": 372000,
      "trend": "up"                    // up | down | flat
    },
    …
  ]
}
```

### 7.5 `GET /dashboard/low-stock?limit=5`

Returns items where `stock <= threshold`, sorted by `stock` asc.

### 7.6 `GET /dashboard/pending-orders?limit=5`

Returns sales where `status='pending'`, sorted by `date` desc.

### 7.7 `GET /dashboard/recent-sales?limit=4`

Returns recent sales regardless of status, sorted by `date` desc.

### 7.8 `GET /reports/sales?period=month|last_month|quarter|year`

```json
{
  "kpis": {
    "revenue": 2400000,
    "profit": 680000,
    "orders": 342,
    "avgOrder": 7017,
    "marginPct": 28.3
  },
  "trend": [
    { "month": "Oct", "revenue": 1420000, "profit": 398000, "orders": 198 },
    … 6 entries …
  ],
  "momGrowthPct": 22.4,
  "topProducts": [
    { "name": "Ankara Gown (M)", "category": "Clothing", "sold": 124, "revenue": 372000, "growthPct": 18 }
    …
  ],
  "paymentBreakdown": [
    { "method": "Transfer", "pct": 58, "color": "#16a34a" },
    …
  ]
}
```

### 7.9 `GET /reports/inventory`, `GET /reports/customers`, `GET /reports/expenses`

Same pattern: accept `period`, return KPIs + charts + tables. See
`ReportsPage.jsx` for the exact shape each tab needs.

### 7.10 `GET /reports/export.pdf?tab=sales|inventory|customers|expenses&period=…`

Returns a PDF. The frontend Reports "Export PDF" button should call
this and `window.open()` the URL.

## 8. Notifications  *(Needs confirmation)*

Currently the TopBar has a hardcoded 4-entry notification list with
non-functional "Mark all read" / "View all" actions. Decision needed:
- Are notifications a real feature (e.g. low-stock alerts, pending
  order reminders) or cosmetic?
- If real, propose `GET /notifications`, `PATCH /notifications/:id/read`,
  `POST /notifications/read-all`.

## 9. Settings & Documents  *(Needs confirmation)*

The sidebar links to `/settings` and `/documents` but no routes
exist. Decide:
- Is `/settings` a user profile + business settings page (change
  name, change password, business type, currency, timezone)?
- Is `/documents` a document/invoice storage area?

If yes to either, the backend will need additional endpoints
(`GET/PATCH /me`, `GET/PATCH /businesses/:id`, etc.).

## 10. Cross-cutting requirements

### 10.1 Authentication & authorization

- Every endpoint except `POST /auth/login`, `POST /auth/signup`,
  `POST /auth/forgot-password`, `POST /auth/reset-password` requires
  a valid access token in the `Authorization: Bearer <token>` header.
- Every query must be scoped to the `business_id` derived from the
  authenticated user. The backend must never return or modify a
  record belonging to another business. This is a **P0 security
  requirement** once the backend exists.
- Role-based access (e.g. owner vs. staff) is not visible in the
  current frontend. Consider for v2.

### 10.2 Pagination convention

All list endpoints should return:
```json
{
  "data": [ … ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 1248,
    "totalPages": 25
  }
}
```

The frontend does not currently paginate, but the contract should
be defined now so the frontend engineer can add pagination UI in
Phase 2 without coordination pain.

### 10.3 Error envelope

All 4xx / 5xx responses should return:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",          // machine-readable
    "message": "Human-readable message",
    "fieldErrors": {                     // optional, for form errors
      "email": "Email already registered"
    }
  }
}
```

The frontend's API client (to be built in Phase 2) will surface
`fieldErrors` directly into the form's `errors` state, and surface
`message` via a toast notification.

### 10.4 CORS

The backend must allow the frontend's origin (dev: `http://localhost:5173`,
prod: TBD). Allow credentials (for the refresh cookie) with
`Access-Control-Allow-Credentials: true`.

### 10.5 Rate limiting

Login + signup endpoints should be rate-limited (e.g. 10 attempts per
IP per minute) to mitigate brute force. Other endpoints: standard
limits.

### 10.6 Idempotency

`POST /sales` and `POST /vendors/:id/orders` should accept an
`Idempotency-Key` header so a retried request (e.g. after network
timeout) does not create a duplicate sale.

### 10.7 Audit log

Recommend an `audit_log` table recording every write operation
(`actor_user_id`, `entity`, `entity_id`, `action`, `payload_diff`,
`created_at`). Especially important for financial records (sales,
expenses, purchase orders).

## 11. Frontend's responsibilities (Phase 2)

To receive the backend cleanly, the frontend engineer will:

1. **Add an API client.** Create `src/services/apiClient.js` with:
   - `import.meta.env.VITE_API_BASE_URL` as the base URL.
   - Authorization header injection from auth context.
   - 401 → trigger refresh → retry once → if refresh fails, redirect
     to `/login`.
   - Network error → toast notification.
   - 422 with `fieldErrors` → return to caller for form display.
2. **Add per-entity service modules.** `src/services/inventoryService.js`,
   `salesService.js`, `customersService.js`, `vendorsService.js`,
   `expensesService.js`, `reportsService.js`, `dashboardService.js`.
   Each is initially a thin wrapper over the apiClient, returning
   typed (JSDoc) shapes.
3. **Replace direct `mockData` imports.** Each page should call the
   service on mount (`useEffect` + `useState`) and display loading /
   error / empty / data states.
4. **Wire `AuthContext` to the API client.** `login()` calls
   `authService.login()` and stores the returned access token; on
   401 it calls `authService.refresh()`.
5. **Persist session.** If Option A (HttpOnly refresh cookie), store
   the access token in JS memory + a `localStorage` flag indicating
   "session exists" so the page reload can attempt a silent refresh
   on mount.
6. **Add error boundaries.** Wrap each lazy page in
   `<ErrorBoundary>` with a branded fallback UI.
7. **Add toast notifications.** Library (e.g. `react-hot-toast`) +
   context to surface API errors globally.
8. **Fix P1-001 through P1-005** (see `FRONTEND_AUDIT.md`) before
   any backend wiring — otherwise the New Sale modal will still crash
   and the session will still be lost on refresh.

## 12. Decisions to confirm before backend starts

| #  | Decision                                                                                            | Default proposal                       |
| -- | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 1  | Token strategy: HttpOnly refresh cookie vs. localStorage                                              | HttpOnly refresh cookie (Option A)     |
| 2  | Multi-tenancy: single business per user vs. shared businesses                                        | Single business per user (with future `business_users` table) |
| 3  | Currency: integer kobo vs. `numeric(12,2)` naira                                                    | Integer kobo (precision-critical)     |
| 4  | ID strategy: UUID v4 vs. ULID vs. serial integer + display_id                                        | UUID v4 + display_id for ORD-XXXX/PO-XXXX codes |
| 5  | `POS` vs `Card` — same payment method, pick one name                                                | `Card` (more general)                  |
| 6  | `expense.vendor`: FK to vendors vs. free-text payee                                                 | Free-text payee (more flexible)       |
| 7  | Stock tracking: `stock` column only vs. `stock_movements` ledger                                    | Ledger (reproducible audit trail)      |
| 8  | Soft delete vs. hard delete                                                                         | Soft delete (`deleted_at`)             |
| 9  | Pagination: page-based vs. cursor-based                                                             | Page-based (simpler for the UI)        |
| 10 | Notifications: real feature vs. cosmetic                                                            | Cosmetic for v1 (defer)                |
| 11 | Settings & Documents pages: in scope vs. defer                                                       | Defer for v1                           |
| 12 | Forgot password: in scope vs. defer                                                                 | In scope (low effort, common request)  |
| 13 | Reports period filter: server-side aggregation vs. client-side filter                                                               | Server-side (DB can index)             |
| 14 | `iconName` / `bg` on inventory: stored on backend vs. computed on frontend                                                           | Frontend (presentation only)          |

The backend engineer should send back the decided list. Once these
are locked, the frontend engineer can finalise the API client and
the data-layer refactor in Phase 2.
