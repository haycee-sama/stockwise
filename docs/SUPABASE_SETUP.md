# Stockwise — Supabase Setup

> **Phase 3A status**: PROPOSED migrations have been refined (now use
> `sw_` prefix to coexist with the existing dev project schema). The
> Supabase-backed service modules are written and committed. The
> frontend's `services/index.js` switches automatically based on
> `isSupabaseConfigured`. **The SQL migrations are NOT YET APPLIED
> to the dev project** — see §3 below for the manual application
> steps the user needs to run.

## 1. What is implemented (Phase 3A)

| Area                                | Status           | Notes                                                                                                            |
| ----------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `.env.example`                     | ✅ committed     | Includes `VITE_PUBLIC_APP_URL` for password-reset redirect URLs.                                                |
| `.env.local` (real values)         | ✅ created locally, gitignored | Contains the actual dev project URL + anon key + production redirect URL. NEVER committed. |
| `.env.test.local`                  | ✅ committed     | Overrides env to empty strings so tests run deterministically in demo mode regardless of `.env.local`. |
| `src/lib/env.js`                   | ✅ committed     | Typed env access. `isSupabaseConfigured` is the single switch.                                                  |
| `src/lib/supabase.js`              | ✅ committed     | Singleton Supabase client. Returns null in demo mode (does NOT throw).                                          |
| `@supabase/supabase-js` v2.118     | ✅ installed     | Public npm package.                                                                                              |
| `src/context/AuthContext.jsx`     | ✅ dual-mode     | Supabase mode uses `getSession()` + `onAuthStateChange`; demo mode persists to localStorage.                     |
| `src/context/useAuth.js`           | ✅ committed     | `useAuth` hook split out for lint compliance.                                                                    |
| `src/context/auth-context-instance.js` | ✅ committed | Bare context object in a non-component file.                                                                     |
| `src/services/*Mock.js`            | ✅ committed     | 7 mock modules for demo mode.                                                                                    |
| `src/services/*Supabase.js`        | ✅ committed     | 7 Supabase-backed modules + `businessesSupabase.js`. Each returns `{ data, error, pagination }` shape. |
| `src/services/index.js`            | ✅ committed     | Switch-point: `isSupabaseConfigured ? supabase : mock`.                                                          |
| `src/services/businessesSupabase.js` | ✅ committed   | `listMyBusinesses()`, `createBusiness()`, `getMyFirstBusinessId()`.                                              |
| `src/pages/auth/ResetPasswordPage.jsx` | ✅ committed  | The link target for `resetPasswordForEmail`. Handles invalid/expired tokens, success state, redirect to /login. |
| `src/App.jsx`                      | ✅ updated       | Routes `/reset-password` publicly.                                                                               |
| `supabase/migrations/0001_init_schema.sql` | ⚠️ PROPOSED, NOT APPLIED | 11 tables with `sw_` prefix + business-membership model + `sw_display_id_counters` for atomic display_id generation. |
| `supabase/migrations/0002_rls_policies_and_functions.sql` | ⚠️ PROPOSED, NOT APPLIED | RLS on every tenant-scoped table + 3 SECURITY DEFINER RPC functions: `sw_create_business`, `sw_create_sale` (atomic!), `sw_adjust_stock`. |
| `supabase/migrations/0003_optional_seed_dev_data.sql` | ⚠️ TEMPLATE | Optional dev seed; user must replace placeholder `:business_id`. |
| `docs/RLS_VERIFICATION.md`         | ✅ committed     | 10-test manual verification procedure. Cannot be automated without a service-role key + test users. |
| Vitest smoke tests                 | ✅ 33 tests, all pass | Includes new `supabaseServices.test.js` (15 tests for the Supabase code path's NOT_CONFIGURED guard + mock service round-trips). |

## 2. What is NOT implemented (awaiting approval / values)

1. **Applying the SQL migrations to the dev Supabase project.** The
   anon key can't run DDL. The user must apply the migrations via
   the Supabase Dashboard SQL Editor (see §3).
2. **Refactoring page components to call `src/services/*` instead of
   importing `mockData` directly.** The service layer is ready, but
   the pages haven't been migrated. Once the migrations are applied
   and the user signs in, the demo mode will continue to work for
   reads (mock data) but writes via the mock layer won't persist to
   Supabase. Full page-by-page refactor is the next phase.
3. **Phone/OTP + OAuth providers.** Out of scope.
4. **Service-role operations in the browser.** NEVER. All privileged
   operations go via SECURITY DEFINER functions.
5. **Production secrets.** None committed.

## 3. How to apply the migrations (manual step)

⚠️ **This step requires the user.** I cannot apply DDL with the anon
key, and I will not request the service_role key in chat (it would
be a critical security exposure).

### Step 0 (optional, recommended) — Drop the existing schema

The dev Supabase project currently has leftover tables from a
previous experiment (`profiles`, `addresses`, `orders`,
`order_items`, `user_roles`, `discounts`, `admin_audit_logs`,
`inventory_reservation_items`). The Stockwise migrations use the
`sw_` prefix so they coexist cleanly, but a clean slate is simpler
to reason about.

The user explicitly authorised this drop on 2026-10-18:
> "i want to drop the tables before running this migrations"

To drop the existing schema:

1. Open https://supabase.com/dashboard/project/yvphrgfxqdjaokaydkyw/sql/new
2. Open `supabase/migrations/0000_optional_drop_existing_schema.sql`
   from this repo. Copy. Paste. Run.
3. Verify success — the editor should show "Success."
4. Run the verification query:
   ```sql
   select tablename from pg_tables where schemaname = 'public';
   -- Expected: 0 rows.
   ```

What this drop script does (all `IF EXISTS CASCADE`):
- Drops the `on_auth_user_created` trigger on `auth.users` (so the
  previous schema's `handle_new_user` function isn't called after
  we drop the `profiles` table).
- Dynamically drops EVERY table in `public` schema.
- Dynamically drops EVERY function + procedure in `public` schema.
- Drops every view, sequence, and enum type in `public` schema.

What it does NOT drop:
- `auth.users` (Supabase Auth's user table — existing signed-up users
  are preserved. To wipe users, use the dashboard).
- `storage.*` (Supabase Storage buckets/objects).
- `_realtime.*`, `graphql_*`, `pg_*`, `extensions.*` schemas.

### Step 1 — Open the Supabase Dashboard SQL Editor

Go to: https://supabase.com/dashboard/project/yvphrgfxqdjaokaydkyw/sql/new

### Step 2 — Apply the schema migration

Open `supabase/migrations/0001_init_schema.sql` from this repo. Copy
the entire contents. Paste into the SQL Editor. Click "Run" (or
`Ctrl+Enter`).

Verify success — the editor should show "Success. No rows returned."
Run a sanity check:

```sql
select tablename from pg_tables where schemaname='public' and tablename like 'sw_%';
```

Should return 13 tables:
`sw_businesses`, `sw_business_memberships`, `sw_customers`,
`sw_vendors`, `sw_inventory_items`, `sw_sales`, `sw_sale_items`,
`sw_stock_movements`, `sw_purchase_orders`, `sw_purchase_order_items`,
`sw_expenses`, `sw_audit_log`, `sw_display_id_counters`.

### Step 3 — Apply the RLS + RPC functions migration

Open `supabase/migrations/0002_rls_policies_and_functions.sql`. Copy.
Paste. Run.

Verify success:
```sql
select tablename, rowsecurity from pg_tables
 where schemaname='public' and tablename like 'sw_%';
```
Every row should have `rowsecurity = true`.

Also verify the RPC functions are defined:
```sql
select routine_name from information_schema.routines
 where routine_schema='public' and routine_name like 'sw_%';
```
Should return: `sw_create_business`, `sw_create_sale`,
`sw_adjust_stock`, `current_user_sw_business_ids`,
`current_user_is_business_member`, `current_user_business_role`,
`next_display_id`.

### Step 4 — Configure Auth URL

In the Supabase Dashboard, go to:
**Authentication → URL Configuration**

- **Site URL**: `https://stockwise-rho.vercel.app`
- **Redirect URLs** (add both):
  - `https://stockwise-rho.vercel.app/reset-password`
  - `http://localhost:5173/reset-password` (for local dev)

### Step 5 — Verify

Visit https://stockwise-rho.vercel.app/signup (or
http://localhost:5173/signup locally). Sign up with a real email +
password. After submit:
- If "Confirm email" is OFF in Supabase Auth settings, you'll be
  logged in immediately + redirected to /dashboard.
- If "Confirm email" is ON, you'll see "Check your email for a
  confirmation link". Click the link, then return to /login.

Once logged in:
- Visit `/inventory`. You should see **no items yet** (because you
  haven't created any). The demo-mode banner should NOT be visible
  (because Supabase IS configured now).
- Click "Add Item" → fill the form → submit. The item should
  persist across refresh.
- Visit `/forgot-password` → enter your email → submit. You should
  receive a real email from Supabase with a reset link.
- Click the reset link → it should take you to
  `/reset-password` → enter a new password → submit → redirect to
  `/login`.

If any of the above fails, consult `docs/RLS_VERIFICATION.md` for
the 10-test manual procedure to verify RLS policies.

## 4. Required environment variables

| Variable                            | Where to find it (Supabase dashboard)                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                 | Project Settings → API → **Project URL**                                                                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY`     | Project Settings → API → **Project API keys** → **anon public** (NOT the service_role key)                                            |
| `VITE_PUBLIC_APP_URL`               | The deployed app URL — `https://stockwise-rho.vercel.app` for prod, `http://localhost:5173` for local dev. Must be in the Supabase Redirect URLs list. |

**Never** put the service_role key in a `VITE_*` env var. It bypasses
RLS and would let any browser user run arbitrary SQL.

## 5. Data-access architecture

```
                            ┌────────────────────────────────────────────────────┐
                            │   Page components (InventoryPage, SalesPage, …)    │
                            │   consume services via async calls                 │
                            │   (Promise<{ data, error, pagination }>).           │
                            └───────────────────────┬────────────────────────────┘
                                                    │
                            ┌───────────────────────▼────────────────────────────┐
                            │   src/services/index.js                            │
                            │   ───────── switch point ─────────                 │
                            │   isSupabaseConfigured ? supabase : mock           │
                            └───────────────────────┬────────────────────────────┘
                                ┌─────────────────────┴─────────────────────┐
                                │                                             │
                  ┌─────────────▼──────────────┐            ┌────────────────▼──────────────┐
                  │   Mock layer (demo mode)    │            │   Supabase layer (configured)  │
                  │   src/services/*Mock.js    │            │   src/services/*Supabase.js   │
                  │   - in-memory arrays       │            │   - real supabase.from(...)  │
                  │   - simulate latency       │            │     queries with RLS          │
                  │   - all CRUD works locally │            │   - atomic via RPC functions  │
                  └────────────────────────────┘            └───────────────────────────────┘
```

## 6. RLS policy requirements (the security boundary)

The RLS policies in
`supabase/migrations/0002_rls_policies_and_functions.sql` are the
PRIMARY authorization boundary. The frontend's `ProtectedRoute` is
UX only.

Key invariants:

1. Every tenant-scoped table has `ENABLE ROW LEVEL SECURITY`.
2. Every policy uses `current_user_sw_business_ids()` (a SETOF uuid
   helper) to derive the caller's businesses from
   `sw_business_memberships`. **This is the membership check — it
   cannot be bypassed by changing client-supplied IDs.**
3. `SELECT` policies filter on `business_id IN
   current_user_sw_business_ids() AND deleted_at IS NULL`.
4. `INSERT`/`UPDATE` policies use `WITH CHECK (business_id IN
   current_user_sw_business_ids())`.
5. Financial records (`sw_sales`, `sw_expenses`, `sw_purchase_orders`)
   have NO `DELETE` policy — they must be soft-deleted via
   `deleted_at`.
6. `sw_stock_movements` and `sw_audit_log` are read-only via the
   API. Writes ONLY via `SECURITY DEFINER` functions
   (`sw_create_sale`, `sw_adjust_stock`).
7. `sw_display_id_counters` has no policies — unreadable and
   unwritable directly. Only `next_display_id()` (SECURITY DEFINER)
   can touch it.

### Atomic sale creation

The frontend cannot do a sequence of independent INSERTs to create a
sale. Instead, all sale-creation logic lives in the
`sw_create_sale(p_payload jsonb)` SECURITY DEFINER RPC function:

1. Verify the caller is a member of `business_id`.
2. Validate each line item:
   - `item_id` exists in `sw_inventory_items` AND belongs to this
     business.
   - `qty > 0`.
   - `qty <= item.stock` (cannot oversell; only checked for
     completed sales).
   - `unit_price >= 0`.
3. Compute the total server-side from line items (client-supplied
   totals are IGNORED).
4. Generate the `display_id` atomically via `next_display_id()`
   (uses `pg_advisory_xact_lock` to serialise concurrent calls for
   the same business+entity).
5. INSERT the `sw_sales` row.
6. INSERT each `sw_sale_items` row.
7. For each item: decrement `sw_inventory_items.stock` + INSERT a
   `sw_stock_movements` ledger entry.
8. UPDATE `sw_sales.total` with the server-computed sum.

All in a single plpgsql transaction. Partial failures roll back.

### Manual RLS verification procedure

See `docs/RLS_VERIFICATION.md` — 10 tests covering read isolation,
unauthorized INSERT/UPDATE, atomic sale creation, server-side total
computation, unauthenticated access, and privileged-table privacy.

## 7. Decisions made / resolved in Phase 3A

| # | Decision | Resolution |
|---|----------|-----------|
| 1 | Token strategy | localStorage via Supabase's `persistSession: true` + `autoRefreshToken: true` + `detectSessionInUrl: true`. |
| 2 | Multi-tenancy model | Multi-business per user via `sw_business_memberships` join table. v1 frontend uses the first business; v2 will add a business picker. |
| 3 | Currency precision | `numeric(14, 2)` in naira (business's reporting currency, stored in `sw_businesses.currency`). Multi-currency conversion is out of scope for v1 (documented in 0001_init_schema.sql). |
| 4 | ID strategy | UUID v4 + `display_id` (ORD-XXXX, PO-XXXX) generated atomically via `next_display_id()` + `sw_display_id_counters` table. |
| 5 | `POS` vs `Card` payment-method name | Unified on `Card` across sales + expenses. |
| 6 | `expense.vendor` FK to vendors vs. free-text payee | Free-text payee (with frontend datalist suggestions from `sw_vendors`). |
| 7 | Stock tracking | Ledger via `sw_stock_movements` — written ONLY by `sw_create_sale` + `sw_adjust_stock` SECURITY DEFINER functions. |
| 8 | Soft delete vs. hard delete | Soft delete (`deleted_at`) for all business data. Financial records have no DELETE policy. |
| 9 | Pagination | Page-based (PostgREST `Range` header). |
| 10 | Trigger creates a new business per user | YES — `sw_create_business()` is called by the frontend after signup. The existing `profiles` table (from the previous schema) is NOT touched. |
| 11 | `sale_items` business scope via JOIN to `sales` vs. denormalised `business_id` | JOIN (keeps schema normalised). |
| 12 | Display-ID generation | `next_display_id()` SECURITY DEFINER function using `pg_advisory_xact_lock` + `sw_display_id_counters` table. |

## 8. What remains for Phase 3B

1. **Refactor page components** (`InventoryPage`, `SalesPage`,
   `CustomersPage`, `VendorsPage`, `ExpensesPage`, `DashboardPage`,
   `ReportsPage`) to call `src/services/*` instead of importing
   `mockData` directly. The service layer is ready; the callsites
   aren't yet updated.
2. **Active business ID management**: the frontend needs a context
   or hook that fetches the user's businesses (via
   `businessesService.listMyBusinesses()`) and exposes the "active
   business ID" for write operations.
3. **Mobile responsive testing** of the new `/reset-password` page.
4. **End-to-end Supabase tests** — currently blocked on the
   migrations being applied (see §3).
5. **Tailwind 3 → 4 upgrade** (separate PR, major rewrite, resolves
   the 7 dev-only vulnerabilities).

## 9. Handover checklist for the backend engineer

Before marking Phase 3A as "wired":

- [ ] Apply `0001_init_schema.sql` to the dev project via SQL Editor.
- [ ] Apply `0002_rls_policies_and_functions.sql` to the dev project.
- [ ] Configure Auth Site URL + Redirect URLs (see §3 step 4).
- [ ] Run the 10-test RLS verification procedure in
      `docs/RLS_VERIFICATION.md`. All 10 must pass.
- [ ] Sign up via the app; verify a `sw_businesses` row + an
      `sw_business_memberships` row (role=owner) are auto-created.
- [ ] Create an inventory item; refresh; verify it persists.
- [ ] Create a sale; verify:
      - `sw_sales` row created with server-computed total.
      - `sw_sale_items` rows created (one per line).
      - `sw_inventory_items.stock` decremented.
      - `sw_stock_movements` ledger entry created (kind=sale, qty=-N).
- [ ] Try to oversell (qty > stock); verify the sale is rejected AND
      no partial state remains.
- [ ] Submit forgot-password; verify the email arrives; click the
      link; verify the `/reset-password` page lets you set a new
      password; verify you can log in with the new password.
- [ ] Open the deployed app at https://stockwise-rho.vercel.app and
      repeat the signup + create-item flow against prod.

If any of the above fails, file an issue with the specific error
message and the test step that failed.

## 10. Related documents

- `docs/DATABASE_AUDIT.md` — schema analysis from `mockData.js` + open questions (Phase 1 baseline).
- `docs/BACKEND_HANDOVER.md` — proposed REST API contracts (in case a non-Supabase backend is later preferred).
- `docs/ENVIRONMENT_SETUP.md` — local dev setup + security checklist.
- `docs/FRONTEND_AUDIT.md` — all audit findings, current status updated.
- `docs/TESTING_REPORT.md` — what was actually tested + outstanding verification.
- `docs/RLS_VERIFICATION.md` — 10-test manual RLS verification procedure.
