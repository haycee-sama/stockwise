-- supabase/migrations/0002_rls_policies.sql
-- ─────────────────────────────────────────────────────────────────────────
-- PROPOSED Row-Level-Security policies for the Stockwise schema.
--
-- ⚠️  THIS FILE IS A PROPOSAL. IT HAS NOT BEEN APPLIED.
-- ⚠️  Do not run against a shared or production database without
--     explicit approval.
--
-- ⚠️  RLS IS THE PRIMARY AUTHORIZATION BOUNDARY. Frontend route guards
--     (ProtectedRoute) are UX only — they cannot enforce security. The
--     RLS policies here are what actually prevents one business's data
--     from being read or written by another.
--
-- Strategy:
--   - Every tenant-scoped table has RLS ENABLED.
--   - Every policy uses the helper function `current_user_business_id()`
--     to derive the caller's business_id from their auth.uid().
--   - SELECT / INSERT / UPDATE: only on rows where row.business_id =
--     current_user_business_id().
--   - DELETE: same scoping, plus a guard against hard-deleting financial
--     records (sales, expenses, purchase_orders) — those should use
--     soft delete instead.
--
-- Open questions for the backend engineer:
--   1. Role-based access (owner vs. staff)? Today's policies treat all
--      members of a business as having full read/write. A future
--      `business_members.role` column can refine this.
--   2. Should audit_log be readable by business members? (Today: yes,
--      but it can be locked down to the owner role.)
--   3. Should soft-deleted rows be visible? (Today: no — policies
--      filter `deleted_at IS NULL`.)
-- ─────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: current_user_business_id
-- Looks up the caller's business_id from `profiles`.
-- Returns NULL if the caller has no profile (e.g. anon user, or
-- the user is signed out). NULL propagation through `=` causes the
-- policy's WHERE clause to filter everything out — which is the
-- correct behaviour for an unauthenticated request.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid();
$$;

-- ╭─── businesses  ───────────────────────────────────────────────────────╮
-- A user can read the business they belong to.
-- Updates / deletes on `businesses` are reserved for an owner role
-- (out of scope for this proposal — see open question #1).
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table businesses enable row level security;

create policy "businesses: read own"
  on businesses for select
  using (id = public.current_user_business_id());

-- ╭─── profiles  ─────────────────────────────────────────────────────────╮
-- A user can read and update their own profile row. They cannot
-- create new profile rows directly (the `handle_new_user` trigger
-- does that) — this prevents privilege escalation via direct inserts.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table profiles enable row level security;

create policy "profiles: read own"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: update own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ╭─── customers  ───────────────────────────────────────────────────────╮
-- Full CRUD within the caller's business.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table customers enable row level security;

create policy "customers: read in own business"
  on customers for select
  using (business_id = public.current_user_business_id() and deleted_at is null);

create policy "customers: insert in own business"
  on customers for insert
  with check (business_id = public.current_user_business_id());

create policy "customers: update in own business"
  on customers for update
  using (business_id = public.current_user_business_id())
  with check (business_id = public.current_user_business_id());

create policy "customers: delete in own business"
  on customers for delete
  using (business_id = public.current_user_business_id());

-- ╭─── vendors  ─────────────────────────────────────────────────────────╮
-- Same pattern as customers.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table vendors enable row level security;

create policy "vendors: read in own business"
  on vendors for select
  using (business_id = public.current_user_business_id() and deleted_at is null);

create policy "vendors: insert in own business"
  on vendors for insert
  with check (business_id = public.current_user_business_id());

create policy "vendors: update in own business"
  on vendors for update
  using (business_id = public.current_user_business_id())
  with check (business_id = public.current_user_business_id());

create policy "vendors: delete in own business"
  on vendors for delete
  using (business_id = public.current_user_business_id());

-- ╭─── inventory_items  ─────────────────────────────────────────────────╮
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table inventory_items enable row level security;

create policy "inventory_items: read in own business"
  on inventory_items for select
  using (business_id = public.current_user_business_id() and deleted_at is null);

create policy "inventory_items: insert in own business"
  on inventory_items for insert
  with check (business_id = public.current_user_business_id());

create policy "inventory_items: update in own business"
  on inventory_items for update
  using (business_id = public.current_user_business_id())
  with check (business_id = public.current_user_business_id());

create policy "inventory_items: delete in own business"
  on inventory_items for delete
  using (business_id = public.current_user_business_id());

-- ╭─── sales  ───────────────────────────────────────────────────────────╮
-- No hard delete — sales are financial records. Use soft delete.
-- This policy intentionally has NO `delete` clause.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table sales enable row level security;

create policy "sales: read in own business"
  on sales for select
  using (business_id = public.current_user_business_id() and deleted_at is null);

create policy "sales: insert in own business"
  on sales for insert
  with check (business_id = public.current_user_business_id());

create policy "sales: update in own business"
  on sales for update
  using (business_id = public.current_user_business_id())
  with check (business_id = public.current_user_business_id());

-- ╭─── sale_items  ───────────────────────────────────────────────────────╮
-- Note: `sale_items` has no `business_id` column — it inherits its
-- business scope via the parent `sale_id`. The policy JOINs to sales
-- to determine the business. This is more expensive per-row but keeps
-- the schema normalised.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table sale_items enable row level security;

create policy "sale_items: read in own business"
  on sale_items for select
  using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
        and sales.business_id = public.current_user_business_id()
        and sales.deleted_at is null
    )
  );

create policy "sale_items: insert in own business"
  on sale_items for insert
  with check (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
        and sales.business_id = public.current_user_business_id()
    )
  );

create policy "sale_items: update in own business"
  on sale_items for update
  using (
    exists (
      select 1 from public.sales
      where sales.id = sale_items.sale_id
        and sales.business_id = public.current_user_business_id()
    )
  );

-- ╭─── stock_movements  ────────────────────────────────────────────────╮
-- Read-only via the API; writes happen via SECURITY DEFINER triggers
-- (so a malicious client cannot fake a stock movement). The policies
-- here only need SELECT.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table stock_movements enable row level security;

create policy "stock_movements: read in own business"
  on stock_movements for select
  using (business_id = public.current_user_business_id());

-- ╭─── purchase_orders  ────────────────────────────────────────────────╮
-- Same pattern as sales — no hard delete.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table purchase_orders enable row level security;

create policy "purchase_orders: read in own business"
  on purchase_orders for select
  using (business_id = public.current_user_business_id() and deleted_at is null);

create policy "purchase_orders: insert in own business"
  on purchase_orders for insert
  with check (business_id = public.current_user_business_id());

create policy "purchase_orders: update in own business"
  on purchase_orders for update
  using (business_id = public.current_user_business_id())
  with check (business_id = public.current_user_business_id());

-- ╭─── purchase_order_items  ───────────────────────────────────────────╮
-- Inherits scope via parent purchase_order_id.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table purchase_order_items enable row level security;

create policy "purchase_order_items: read in own business"
  on purchase_order_items for select
  using (
    exists (
      select 1 from public.purchase_orders
      where purchase_orders.id = purchase_order_items.purchase_order_id
        and purchase_orders.business_id = public.current_user_business_id()
        and purchase_orders.deleted_at is null
    )
  );

create policy "purchase_order_items: insert in own business"
  on purchase_order_items for insert
  with check (
    exists (
      select 1 from public.purchase_orders
      where purchase_orders.id = purchase_order_items.purchase_order_id
        and purchase_orders.business_id = public.current_user_business_id()
    )
  );

-- ╭─── expenses  ────────────────────────────────────────────────────────╮
-- No hard delete — financial records.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table expenses enable row level security;

create policy "expenses: read in own business"
  on expenses for select
  using (business_id = public.current_user_business_id() and deleted_at is null);

create policy "expenses: insert in own business"
  on expenses for insert
  with check (business_id = public.current_user_business_id());

create policy "expenses: update in own business"
  on expenses for update
  using (business_id = public.current_user_business_id())
  with check (business_id = public.current_user_business_id());

-- ╭─── audit_log  ──────────────────────────────────────────────────────╮
-- Read-only via the API; writes happen only via SECURITY DEFINER
-- triggers. Read access is restricted to the same business.
-- ╰──────────────────────────────────────────────────────────────────────╯
alter table audit_log enable row level security;

create policy "audit_log: read in own business"
  on audit_log for select
  using (business_id = public.current_user_business_id());
