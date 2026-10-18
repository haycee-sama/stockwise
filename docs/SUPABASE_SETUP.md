# Stockwise — Supabase Setup

> **Status**: PROPOSED. The SQL in `supabase/migrations/` has NOT been
> applied to any database. The frontend changes in this PR are safe
> to merge regardless of whether a Supabase project is configured —
> the app runs in demo mode when `VITE_SUPABASE_URL` /
> `VITE_SUPABASE_PUBLISHABLE_KEY` are absent.
>
> This document is the single source of truth for the backend engineer
> who will eventually wire Supabase. It is also the document the
> frontend engineer will use to verify demo-mode behaviour locally.

## 1. What is implemented

| Area                           | Status            | Notes                                                                                                          |
| ------------------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `.env.example`                 | ✅ committed      | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` placeholders. See `docs/ENVIRONMENT_SETUP.md` §6.          |
| `.env.local` gitignored        | ✅ committed      | `.gitignore` explicitly excludes `.env` and `.env.*` (except `.env.example`).                                  |
| `src/lib/env.js`               | ✅ committed      | Typed access to Vite env vars. `isSupabaseConfigured` is the single source of truth for "demo vs. real" mode.    |
| `src/lib/supabase.js`          | ✅ committed      | Singleton Supabase client. Returns `null` in demo mode (does NOT throw).                                       |
| `src/context/AuthContext.jsx`  | ✅ refactored     | Dual-mode: Supabase mode uses `supabase.auth.*` + `onAuthStateChange`; demo mode persists to localStorage.      |
| `src/context/useAuth.js`       | ✅ created        | `useAuth` hook split out so `AuthContext.jsx` only exports the `AuthProvider` component (lint compliance).     |
| `src/context/auth-context-instance.js` | ✅ created | Bare `AuthContext` context object, in a file with no components (lint compliance).                          |
| `src/services/`               | ✅ created        | 7 mock-service modules + an `index.js` that is the single switch-point for demo → Supabase. See §4.           |
| `src/components/common/ErrorBoundary.jsx` | ✅ created | Wraps lazy pages so a crash in one page does not blank the app.                                                |
| `src/components/common/ComingSoon.jsx`   | ✅ created | Placeholder for `/settings`, `/documents`, `/forgot-password`.                                                |
| `src/components/common/DemoModeBanner.jsx` | ✅ created | Honest banner shown on protected pages in demo mode.                                                          |
| `supabase/migrations/0001_init_schema.sql` | ⚠️ proposed | NOT applied. Schema derived from `src/data/mockData.js` + audit open questions.                              |
| `supabase/migrations/0002_rls_policies.sql` | ⚠️ proposed | NOT applied. RLS policies enforce multi-tenant isolation (the primary security boundary).                    |
| Vitest smoke tests              | ✅ created        | 18 tests across `NewSaleModal`, `AuthContext`, `ForgotPasswordPage`, `ComingSoon`, `supabase`. All pass.      |

## 2. What is NOT implemented

These are explicitly out of scope for Phase 2 and are listed here as
follow-ups. They should NOT be done without explicit approval.

1. **Wiring the `src/services/*` modules to Supabase.** Today every
   service returns mock data. The day Supabase is configured and the
   schema applied, the `index.js` switch-point can be flipped with a
   one-line change per service — but the underlying Supabase-backed
   implementations need to be written first.
2. **Applying the SQL migrations.** The two files in
   `supabase/migrations/` are proposals. They have NOT been applied.
   The backend engineer must:
   - Review the schema (especially the `handle_new_user` trigger).
   - Resolve the open decisions (see §6 below).
   - Apply to a Supabase project using `supabase db push` or the
     dashboard SQL editor.
3. **Reset-password page.** `ForgotPasswordPage` calls
   `supabase.auth.resetPasswordForEmail({ redirectTo: '/reset-password' })`,
   but the `/reset-password` route does not exist. It must be built
   before email-confirmation flows go live.
4. **Phone/OTP auth.** Only email + password is supported today.
   Supabase supports phone OTP — adding it would require new env
   config, a new form, and new RLS for the phone-auth schema.
5. **OAuth providers (Google, GitHub, etc.).** Not wired.
6. **Service-role operations.** The browser bundle never imports the
   service_role key. All privileged operations (stock-movement
   triggers, audit-log writes, display_id generation) must run via
   SECURITY DEFINER functions or Edge Functions — NOT via the
   browser client.
7. **Production secrets.** No real Supabase URL, anon key, or any
   other secret has been committed. The repo only contains
   `.env.example` with placeholders.

## 3. Required environment variables

Create a `.env.local` (gitignored) from `.env.example`:

```bash
cp .env.example .env.local
```

Then fill in real values from the Supabase dashboard:

| Variable                            | Where to find it (Supabase dashboard)                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`                 | Project Settings → API → **Project URL**                                                                                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY`      | Project Settings → API → **Project API keys** → **anon public** (NOT the service_role key)                                            |

**Never** put the service_role key in a `VITE_*` env var. It bypasses
RLS and would let any browser user run arbitrary SQL.

## 4. Data-access architecture

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
                  │   Mock layer (default)     │            │   Supabase layer (future)     │
                  │   src/services/*Mock.js    │            │   src/services/*Supabase.js   │
                  │   - in-memory arrays       │            │   - real `supabase.from(...)` │
                  │   - simulate latency       │            │     queries with RLS          │
                  │   - all CRUD works locally │            │   - NOT YET WRITTEN           │
                  └────────────────────────────┘            └───────────────────────────────┘
```

The switch is one line per service in `src/services/index.js`:

```js
import * as inventoryMock from './inventoryMock';
// import * as inventorySupabase from './inventorySupabase'; // future

export const inventoryService = inventoryMock;
// export const inventoryService = isSupabaseConfigured ? inventorySupabase : inventoryMock;
```

Today the mock branch is the only one used. The page components
already call the services in the right shape (e.g.
`inventoryService.list({ search, category, status, sort, page,
pageSize })`) — but they currently import `mockData` directly. The
next refactor pass (Phase 3) will replace those direct imports with
service calls.

## 5. RLS policy requirements (the security boundary)

The RLS policies in `supabase/migrations/0002_rls_policies.sql` are
the PRIMARY authorization boundary. The frontend's `ProtectedRoute`
is UX only — it does not enforce security.

Key invariants:

1. Every tenant-scoped table has `ENABLE ROW LEVEL SECURITY`.
2. Every policy uses `public.current_user_business_id()` to derive the
   caller's business from `auth.uid()`.
3. `SELECT` policies filter on `business_id = current_user_business_id()
   AND deleted_at IS NULL`.
4. `INSERT` / `UPDATE` policies use `WITH CHECK (business_id =
   current_user_business_id())` so a malicious client cannot write to
   another business.
5. Financial records (`sales`, `expenses`, `purchase_orders`) have NO
   `DELETE` policy. They are soft-deleted via `deleted_at`.
6. `stock_movements` and `audit_log` are read-only via the API.
   Writes happen only via `SECURITY DEFINER` triggers (so a malicious
   client cannot fake a stock movement or audit entry).

### How to test RLS safely

After applying the migrations to a development Supabase project:

1. Create two businesses + two users (one in each business).
2. Sign in as user A and verify they can read/write their own data.
3. Sign in as user B and verify they cannot read or write user A's
   data (SQL like `select * from customers where business_id = '<A's
   business_id>'` should return 0 rows).
4. Sign in as user A and attempt to INSERT a row with
   `business_id = '<B's business_id>'` — it should be rejected by
   the `WITH CHECK` clause.
5. Sign in as user A and attempt to UPDATE one of B's rows — the
   `USING` clause should prevent the row from being found.

Run these tests in the Supabase SQL editor with the "Run as
authenticated user" feature, NOT as the service_role user (which
bypasses RLS).

## 6. Database decisions requiring backend-engineer approval

These were unresolved at audit time. The migrations use the proposed
defaults — flag any that should be different before applying.

| #  | Decision                                                                                                | Default in proposal                                  |
| -- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1  | Token strategy: HttpOnly refresh cookie vs. localStorage                                                | localStorage via Supabase's built-in persistSession  |
| 2  | Multi-tenancy model                                                                                      | Single business per user (future: `business_members`)|
| 3  | Currency precision                                                                                       | `numeric(14, 2)` in NGN naira (NOT kobo integers)     |
| 4  | ID strategy                                                                                              | UUID v4 + `display_id` (ORD-XXXX, PO-XXXX)           |
| 5  | `POS` vs `Card` payment-method name                                                                     | `Card` (unified)                                     |
| 6  | `expense.vendor` FK to vendors vs. free-text payee                                                       | Free-text payee                                      |
| 7  | Stock tracking: `stock` column only vs. `stock_movements` ledger                                          | Ledger                                               |
| 8  | Soft delete vs. hard delete                                                                              | Soft delete (`deleted_at`)                          |
| 9  | Pagination: page-based vs. cursor-based                                                                   | Page-based                                           |
| 10 | `handle_new_user` trigger creates a new business per user                                                | Yes (decision #2 default)                            |
| 11 | `sale_items` business scope via JOIN to `sales` vs. denormalised `business_id` column                    | JOIN (keeps schema normalised)                       |
| 12 | Display-ID generation: trigger-managed sequence vs. client-generated                                                                      | Sequence per business (TODO: write the trigger)       |

Note that #12 is currently a TODO: the migrations create the
`display_id` column and its unique index, but do NOT yet have a
trigger that auto-populates it. The backend engineer must either:

- Add a SECURITY DEFINER function `generate_display_id(p_business
  uuid, p_prefix text)` that uses an advisory lock + a per-business
  counter table, and call it from a BEFORE INSERT trigger on
  `sales` / `purchase_orders`.
- OR populate `display_id` from the API client (less safe — a
  malicious client could pass any value, but the unique index
  would reject duplicates).

## 7. How to test safely (local development)

### Demo mode (no Supabase credentials required)

```bash
npm ci
npm run dev
```

- Visit `http://localhost:5173/`.
- Login with any email + any 6+ char password.
- A `DemoModeBanner` is shown at the top of every protected page.
- Mutations are in-memory and lost on refresh.
- Login persists across refresh via the `stockwise.demoUser`
  localStorage key — but this is NOT real authentication. Anyone
  with access to the browser can write to localStorage.

### Supabase mode (requires real Supabase credentials)

1. Create a Supabase project (or use an existing one).
2. Apply the proposed migrations to a development database (NOT
   production). Either:
   - `supabase db push` (if you've linked the project via the Supabase
     CLI), OR
   - Dashboard → SQL Editor → paste the contents of
     `0001_init_schema.sql` then `0002_rls_policies.sql`.
3. Verify RLS is enabled on every table (Dashboard → Authentication →
   Policies).
4. In the Supabase dashboard, configure Auth:
   - Disable "Confirm email" for development OR enable email
     confirmation and use a test inbox.
   - Set the Site URL to `http://localhost:5173`.
   - Add `http://localhost:5173/forgot-password` to Redirect URLs.
5. Create `.env.local` with the real `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
6. `npm run dev` — the `DemoModeBanner` should disappear (because
   `isSupabaseConfigured` is now true).
7. Sign up a new user. If email confirmation is ON, you'll see a
   "Check your email" message after submit.
8. After confirming email, sign in. Refresh the page — you should
   stay signed in (this verifies the `onAuthStateChange` subscription
   + `getSession()` restore on mount).
9. Sign out — the session is cleared from both React state and
   Supabase's persistence layer.

## 8. Handover checklist for the backend engineer

Before applying the migrations to a production database, confirm:

- [ ] All 12 decisions in §6 have been reviewed and either accepted
      or overridden.
- [ ] The `handle_new_user` trigger + SECURITY DEFINER function have
      been reviewed (they create a new business per user — this may
      not match the intended multi-tenancy model).
- [ ] The display-ID generation strategy (#12) is decided and the
      trigger is written.
- [ ] RLS policies are tested with two different users from two
      different businesses (see §5).
- [ ] The Supabase project has email confirmation configured (either
      ON with a working SMTP provider, or OFF for development).
- [ ] The Supabase project has Site URL and Redirect URLs configured
      (Auth → URL Configuration).
- [ ] The frontend `.env.local` has been shared with the dev team
      OUT of band (NOT committed).
- [ ] The `VITE_SUPABASE_PUBLISHABLE_KEY` is the **anon public**
      key, NEVER the service_role key.
- [ ] A backup of the database has been taken before applying
      migrations to a shared project.

After the migrations are applied:

- [ ] Run the Vitest smoke tests (`npm test`) against the
      Supabase-configured local environment — the demo-mode tests
      should now switch to verifying Supabase behaviour. (Note: the
      current tests assume demo mode and will need to be parameterised
      before this step.)
- [ ] Manually exercise the user journeys documented in
      `docs/TESTING_REPORT.md` §6 (New Sale, login, refresh,
      sidebar routes).

## 9. Related documents

- `docs/DATABASE_AUDIT.md` — de-facto schema analysis from
  `mockData.js` + open questions.
- `docs/BACKEND_HANDOVER.md` — proposed REST API contracts (in case
  a non-Supabase backend is later preferred).
- `docs/ENVIRONMENT_SETUP.md` — local dev setup + security checklist.
- `docs/FRONTEND_AUDIT.md` — all audit findings, with current status
  updated for Phase 2.
- `docs/TESTING_REPORT.md` — what was actually tested + outstanding
  verification.
