-- supabase/migrations/0002_rls_policies_and_functions.sql
-- ─────────────────────────────────────────────────────────────────────────
-- PROPOSED Row-Level-Security policies + SECURITY DEFINER RPC functions
-- for the Stockwise schema.
--
-- ⚠️  THIS FILE HAS NOT BEEN APPLIED YET. Apply AFTER 0001_init_schema.sql
-- ⚠️  in the same dashboard SQL session.
--
-- ⚠️  RLS IS THE PRIMARY AUTHORIZATION BOUNDARY. Frontend route guards
-- ⚠️  are UX only. The policies here are what actually prevents one
-- ⚠️  business's data from being read or written by another.
--
-- Strategy:
--   - Every tenant-scoped table has RLS ENABLED.
--   - Every policy uses the helper `current_user_sw_business_ids()`
--     (a SETOF uuid returning the business IDs the current auth user
--     is a member of). This is the membership check — it cannot be
--     bypassed by changing client-supplied IDs.
--   - SELECT / INSERT / UPDATE: only on rows where row.business_id
--     ∈ current_user_sw_business_ids().
--   - Financial records (sw_sales, sw_expenses, sw_purchase_orders)
--     have NO DELETE policy — they must be soft-deleted via
--     `deleted_at`.
--   - sw_stock_movements and sw_audit_log are read-only via the API;
--     writes happen ONLY via SECURITY DEFINER functions (so a
--     malicious client cannot fake a stock movement or audit entry).
--
-- Atomic sale creation:
--   The frontend cannot do a sequence of independent INSERTs to
--   create a sale (header + line items + stock movements). If one
--   fails, the data is inconsistent. Instead, all sale-creation
--   logic lives in a SECURITY DEFINER RPC function
--   `sw_create_sale(p_payload jsonb)` that:
--     1. Verifies the caller is a member of the business.
--     2. Validates each line item: item belongs to the business,
--        qty > 0, qty <= item.stock (cannot oversell).
--     3. Validates the total matches the sum of line totals.
--     4. Inserts the sw_sales row with a server-generated display_id.
--     5. Inserts each sw_sale_items row.
--     6. Inserts a sw_stock_movements row per item (negative qty).
--     7. Decrements sw_inventory_items.stock for each item.
--     8. All in a single transaction — partial failures roll back.
--
-- All SECURITY DEFINER functions explicitly `set search_path = public, auth`
-- to prevent search-path injection attacks (CVE-class issue).
-- ─────────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: current_user_sw_business_ids() — returns the set of
-- business_id UUIDs the current auth user is a member of.
-- (Already created in 0001, but defined here too for completeness
-- if applying only this migration.)
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_sw_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select business_id from public.sw_business_memberships where user_id = auth.uid();
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: current_user_is_business_member(p_business_id uuid)
-- Boolean check used by INSERT/UPDATE policies and by SECURITY DEFINER
-- functions. Returns true if the caller is a member of the given
-- business (any role).
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.sw_business_memberships
    where user_id = auth.uid()
      and business_id = p_business_id
  );
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: current_user_business_role(p_business_id uuid)
-- Returns the caller's role in the given business, or NULL if not a
-- member. Used by role-gated operations (e.g. delete business,
-- manage members).
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.current_user_business_role(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from public.sw_business_memberships
  where user_id = auth.uid()
    and business_id = p_business_id;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: next_display_id(p_business_id uuid, p_entity text)
-- Atomically returns the next display_id for the given business +
-- entity ('sale' or 'purchase_order'). Uses pg_advisory_xact_lock
-- (transaction-scoped) so concurrent inserts in the same business
-- serialise. The counter row is created on first use.
-- Returns the FULL display string (e.g. 'ORD-0001', 'PO-0001').
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.next_display_id(p_business_id uuid, p_entity text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_prefix text;
  v_result text;
begin
  if p_entity = 'sale' then
    v_prefix := 'ORD';
  elsif p_entity = 'purchase_order' then
    v_prefix := 'PO';
  else
    raise exception 'Invalid entity for display_id: %', p_entity;
  end if;

  -- Transaction-scoped advisory lock on the (business, entity) pair.
  -- Hash of (business_id, entity string) → bigint.
  -- This serialises concurrent calls for the same business+entity,
  -- while letting different businesses run in parallel.
  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text || ':' || p_entity, 0)
  );

  -- Upsert the counter row, then increment atomically.
  insert into public.sw_display_id_counters (business_id, entity, next_value)
  values (p_business_id, p_entity, 1)
  on conflict (business_id, entity) do nothing;

  update public.sw_display_id_counters
     set next_value = next_value + 1
   where business_id = p_business_id
     and entity = p_entity
  returning next_value into v_next;

  if v_next is null then
    -- Race: the row was just inserted by another transaction. Try once more.
    select next_value into v_next
      from public.sw_display_id_counters
     where business_id = p_business_id
       and entity = p_entity;
    if v_next is null then
      raise exception 'Could not obtain display_id for business % entity %', p_business_id, p_entity;
    end if;
  end if;

  v_result := v_prefix || '-' || lpad(v_next::text, 4, '0');
  return v_result;
end;
$$;

-- ╭─── sw_businesses  ────────────────────────────────────────────────────╮
-- │ Read: caller is a member.                                              │
-- │ Insert: open — the SECURITY DEFINER function `sw_create_business`     │
-- │         is the sanctioned path. A malicious client cannot directly    │
-- │         insert into sw_businesses because no INSERT policy exists.    │
-- │ Update: caller's role in that business is 'owner' or 'admin'.         │
-- │ Delete: only 'owner'. Soft delete (deleted_at) preferred.             │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_businesses enable row level security;

create policy "sw_businesses: read own"
  on sw_businesses for select
  using (id in (select public.current_user_sw_business_ids()));

create policy "sw_businesses: update if owner/admin"
  on sw_businesses for update
  using (public.current_user_business_role(id) in ('owner', 'admin'))
  with check (public.current_user_business_role(id) in ('owner', 'admin'));

create policy "sw_businesses: delete if owner"
  on sw_businesses for delete
  using (public.current_user_business_role(id) = 'owner');

-- ╭─── sw_business_memberships ───────────────────────────────────────────╮
-- │ Members of a business can read its membership list.                    │
-- │ Only owners + admins can add / update / remove members.                │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_business_memberships enable row level security;

create policy "sw_memberships: read in own business"
  on sw_business_memberships for select
  using (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_memberships: insert if owner/admin"
  on sw_business_memberships for insert
  with check (
    business_id in (select public.current_user_sw_business_ids())
    and public.current_user_business_role(business_id) in ('owner', 'admin')
  );

create policy "sw_memberships: update if owner/admin"
  on sw_business_memberships for update
  using (
    business_id in (select public.current_user_sw_business_ids())
    and public.current_user_business_role(business_id) in ('owner', 'admin')
  )
  with check (
    business_id in (select public.current_user_sw_business_ids())
    and public.current_user_business_role(business_id) in ('owner', 'admin')
  );

create policy "sw_memberships: delete if owner/admin"
  on sw_business_memberships for delete
  using (
    business_id in (select public.current_user_sw_business_ids())
    and public.current_user_business_role(business_id) in ('owner', 'admin')
  );

-- ╭─── sw_customers  ─────────────────────────────────────────────────────╮
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_customers enable row level security;

create policy "sw_customers: read in own business"
  on sw_customers for select
  using (business_id in (select public.current_user_sw_business_ids()) and deleted_at is null);

create policy "sw_customers: insert in own business"
  on sw_customers for insert
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_customers: update in own business"
  on sw_customers for update
  using (business_id in (select public.current_user_sw_business_ids()))
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_customers: delete in own business"
  on sw_customers for delete
  using (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_vendors  ────────────────────────────────────────────────────────╮
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_vendors enable row level security;

create policy "sw_vendors: read in own business"
  on sw_vendors for select
  using (business_id in (select public.current_user_sw_business_ids()) and deleted_at is null);

create policy "sw_vendors: insert in own business"
  on sw_vendors for insert
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_vendors: update in own business"
  on sw_vendors for update
  using (business_id in (select public.current_user_sw_business_ids()))
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_vendors: delete in own business"
  on sw_vendors for delete
  using (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_inventory_items  ───────────────────────────────────────────────╮
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_inventory_items enable row level security;

create policy "sw_inventory_items: read in own business"
  on sw_inventory_items for select
  using (business_id in (select public.current_user_sw_business_ids()) and deleted_at is null);

create policy "sw_inventory_items: insert in own business"
  on sw_inventory_items for insert
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_inventory_items: update in own business"
  on sw_inventory_items for update
  using (business_id in (select public.current_user_sw_business_ids()))
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_inventory_items: delete in own business"
  on sw_inventory_items for delete
  using (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_sales  ──────────────────────────────────────────────────────────╮
-- │ No hard delete — financial records. Soft delete only.                   │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_sales enable row level security;

create policy "sw_sales: read in own business"
  on sw_sales for select
  using (business_id in (select public.current_user_sw_business_ids()) and deleted_at is null);

create policy "sw_sales: insert in own business"
  on sw_sales for insert
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_sales: update in own business"
  on sw_sales for update
  using (business_id in (select public.current_user_sw_business_ids()))
  with check (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_sale_items ──────────────────────────────────────────────────────╮
-- │ Inherits scope via parent sale_id. No DELETE policy (cascade only).     │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_sale_items enable row level security;

create policy "sw_sale_items: read in own business"
  on sw_sale_items for select
  using (
    exists (
      select 1 from public.sw_sales
      where sw_sales.id = sw_sale_items.sale_id
        and sw_sales.business_id in (select public.current_user_sw_business_ids())
        and sw_sales.deleted_at is null
    )
  );

create policy "sw_sale_items: insert in own business"
  on sw_sale_items for insert
  with check (
    exists (
      select 1 from public.sw_sales
      where sw_sales.id = sw_sale_items.sale_id
        and sw_sales.business_id in (select public.current_user_sw_business_ids())
    )
  );

-- ╭─── sw_stock_movements ───────────────────────────────────────────────╮
-- │ Read-only via the API. Writes ONLY via SECURITY DEFINER functions.     │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_stock_movements enable row level security;

create policy "sw_stock_movements: read in own business"
  on sw_stock_movements for select
  using (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_purchase_orders  ───────────────────────────────────────────────╮
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_purchase_orders enable row level security;

create policy "sw_purchase_orders: read in own business"
  on sw_purchase_orders for select
  using (business_id in (select public.current_user_sw_business_ids()) and deleted_at is null);

create policy "sw_purchase_orders: insert in own business"
  on sw_purchase_orders for insert
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_purchase_orders: update in own business"
  on sw_purchase_orders for update
  using (business_id in (select public.current_user_sw_business_ids()))
  with check (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_purchase_order_items ───────────────────────────────────────────╮
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_purchase_order_items enable row level security;

create policy "sw_purchase_order_items: read in own business"
  on sw_purchase_order_items for select
  using (
    exists (
      select 1 from public.sw_purchase_orders
      where sw_purchase_orders.id = sw_purchase_order_items.purchase_order_id
        and sw_purchase_orders.business_id in (select public.current_user_sw_business_ids())
        and sw_purchase_orders.deleted_at is null
    )
  );

create policy "sw_purchase_order_items: insert in own business"
  on sw_purchase_order_items for insert
  with check (
    exists (
      select 1 from public.sw_purchase_orders
      where sw_purchase_orders.id = sw_purchase_order_items.purchase_order_id
        and sw_purchase_orders.business_id in (select public.current_user_sw_business_ids())
    )
  );

-- ╭─── sw_expenses  ──────────────────────────────────────────────────────╮
-- │ No hard delete — financial records.                                     │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_expenses enable row level security;

create policy "sw_expenses: read in own business"
  on sw_expenses for select
  using (business_id in (select public.current_user_sw_business_ids()) and deleted_at is null);

create policy "sw_expenses: insert in own business"
  on sw_expenses for insert
  with check (business_id in (select public.current_user_sw_business_ids()));

create policy "sw_expenses: update in own business"
  on sw_expenses for update
  using (business_id in (select public.current_user_sw_business_ids()))
  with check (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_audit_log ──────────────────────────────────────────────────────╮
-- │ Read-only via the API. Writes via triggers / SECURITY DEFINER.         │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_audit_log enable row level security;

create policy "sw_audit_log: read in own business"
  on sw_audit_log for select
  using (business_id in (select public.current_user_sw_business_ids()));

-- ╭─── sw_display_id_counters ───────────────────────────────────────────╮
-- │ Read + write only via SECURITY DEFINER functions. No direct API access. │
-- ╰─────────────────────────────────────────────────────────────────────────╯
alter table sw_display_id_counters enable row level security;
-- Intentionally NO policies — the table is unreadable and unwritable
-- directly via the anon/authenticated role. All access is via the
-- `next_display_id()` SECURITY DEFINER function.

-- ══════════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS
-- ══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- sw_create_business(p_name text, p_type text, p_currency text, p_timezone text)
--
-- Creates a new business + adds the caller as its owner.
-- Called by the frontend immediately after signup (the existing
-- `handle_new_user` trigger creates a `profiles` row; this function
-- creates the Stockwise-specific business record + membership).
--
-- SECURITY: SECURITY DEFINER so it can INSERT into sw_businesses
-- AND sw_business_memberships (both have no INSERT RLS policy that
-- would let the anon role insert directly — the only path is here).
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.sw_create_business(
  p_name text,
  p_type text default 'retail',
  p_currency text default 'NGN',
  p_timezone text default 'Africa/Lagos'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Must be authenticated to create a business';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Business name is required';
  end if;

  insert into public.sw_businesses (name, type, currency, timezone)
  values (trim(p_name), p_type, p_currency, p_timezone)
  returning id into v_business_id;

  insert into public.sw_business_memberships (business_id, user_id, role)
  values (v_business_id, v_user_id, 'owner');

  return jsonb_build_object(
    'business_id', v_business_id,
    'name', trim(p_name),
    'type', p_type,
    'currency', p_currency,
    'timezone', p_timezone,
    'role', 'owner'
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_create_sale(p_payload jsonb)
--
-- Atomic sale creation: header + line items + stock decrements +
-- stock_movements ledger entries. ALL in one transaction.
--
-- Payload schema:
--   {
--     "business_id": uuid,
--     "customer_id": uuid|null,
--     "payment": "Cash"|"Transfer"|"Card",
--     "status": "completed"|"pending"|"cancelled" (default "completed"),
--     "note": text|null,
--     "items": [
--       { "item_id": uuid, "qty": integer>0, "unit_price": numeric>=0 }
--     ]
--   }
--
-- Returns:
--   { "sale_id": uuid, "display_id": "ORD-0001", "total": 12345.67 }
--
-- SECURITY: SECURITY DEFINER. All validations run server-side. The
-- caller's membership is checked; quantities are validated against
-- real stock; the total is server-computed (NOT taken from the
-- payload). If any line item is invalid, the WHOLE transaction rolls
-- back — no partial state.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.sw_create_sale(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business_id uuid := p_payload->>'business_id';
  v_customer_id uuid := nullif(p_payload->>'customer_id', '')::uuid;
  v_payment text := p_payload->>'payment';
  v_status text := coalesce(p_payload->>'status', 'completed');
  v_note text := p_payload->>'note';
  v_items jsonb := p_payload->'items';
  v_sale_id uuid;
  v_display_id text;
  v_total numeric(14,2) := 0;
  v_item record;
  v_inv record;
  v_user_id uuid := auth.uid();
begin
  -- 1. Auth + membership check.
  if v_user_id is null then
    raise exception 'Must be authenticated to create a sale';
  end if;
  if not public.current_user_is_business_member(v_business_id) then
    raise exception 'Not a member of business %', v_business_id;
  end if;

  -- 2. Payment + status validation.
  if v_payment not in ('Cash', 'Transfer', 'Card') then
    raise exception 'Invalid payment method: %', v_payment;
  end if;
  if v_status not in ('completed', 'pending', 'cancelled') then
    raise exception 'Invalid sale status: %', v_status;
  end if;

  -- 3. Items array must be non-empty.
  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'Sale must have at least one item';
  end if;

  -- 4. Compute the display_id and create the sale header.
  v_display_id := public.next_display_id(v_business_id, 'sale');

  insert into public.sw_sales (business_id, display_id, customer_id, payment, status, total, note)
  values (v_business_id, v_display_id, v_customer_id, v_payment, v_status, 0, v_note)
  returning id into v_sale_id;

  -- 5. Process each line item — full validation per item.
  for v_item in
    select
      (j->>'item_id')::uuid as item_id,
      (j->>'qty')::integer as qty,
      (j->>'unit_price')::numeric as unit_price
    from jsonb_array_elements(v_items) as j
  loop
    -- 5a. Validate qty + unit_price.
    if v_item.qty is null or v_item.qty <= 0 then
      raise exception 'Invalid qty % for item %', v_item.qty, v_item.item_id;
    end if;
    if v_item.unit_price is null or v_item.unit_price < 0 then
      raise exception 'Invalid unit_price % for item %', v_item.unit_price, v_item.item_id;
    end if;

    -- 5b. Look up the inventory item — must belong to this business
    --     AND have enough stock.
    select id, stock, name
      into v_inv
      from public.sw_inventory_items
     where id = v_item.item_id
       and business_id = v_business_id
       and deleted_at is null
    for update; -- row lock to prevent concurrent stock modifications

    if not found then
      raise exception 'Item % does not belong to business %', v_item.item_id, v_business_id;
    end if;

    if v_status = 'completed' and v_inv.stock < v_item.qty then
      raise exception 'Insufficient stock for item "%": have %, need %',
        v_inv.name, v_inv.stock, v_item.qty;
    end if;

    -- 5c. Insert the line item (line_total is computed by GENERATED ALWAYS).
    insert into public.sw_sale_items (sale_id, item_id, qty, unit_price)
    values (v_sale_id, v_item.item_id, v_item.qty, v_item.unit_price);

    -- 5d. Decrement stock (only for completed sales).
    if v_status = 'completed' then
      update public.sw_inventory_items
         set stock = stock - v_item.qty,
             updated_at = now()
       where id = v_item.item_id;

      -- 5e. Write the stock_movement ledger entry.
      insert into public.sw_stock_movements
        (business_id, item_id, kind, qty, sale_id, note, created_by)
      values
        (v_business_id, v_item.item_id, 'sale', -v_item.qty, v_sale_id,
         'Sale ' || v_display_id, v_user_id);
    end if;

    v_total := v_total + (v_item.qty * v_item.unit_price);
  end loop;

  -- 6. Update the sale total with the server-computed sum.
  update public.sw_sales
     set total = v_total,
         updated_at = now()
   where id = v_sale_id;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'display_id', v_display_id,
    'total', v_total
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_adjust_stock(p_business_id uuid, p_item_id uuid, p_delta integer, p_note text)
--
-- Manual stock adjustment (e.g. after a count). Writes a single
-- stock_movement row + updates inventory_items.stock. SECURITY DEFINER
-- so the caller doesn't need direct write access to stock_movements.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.sw_adjust_stock(
  p_business_id uuid,
  p_item_id uuid,
  p_delta integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_stock integer;
  v_inv record;
begin
  if v_user_id is null then
    raise exception 'Must be authenticated';
  end if;
  if not public.current_user_is_business_member(p_business_id) then
    raise exception 'Not a member of business %', p_business_id;
  end if;
  if p_delta = 0 then
    raise exception 'Delta must be non-zero';
  end if;

  select stock, name into v_inv
    from public.sw_inventory_items
   where id = p_item_id
     and business_id = p_business_id
     and deleted_at is null
  for update;

  if not found then
    raise exception 'Item % not found in business %', p_item_id, p_business_id;
  end if;

  if v_inv.stock + p_delta < 0 then
    raise exception 'Adjustment would result in negative stock (% + %)', v_inv.stock, p_delta;
  end if;

  update public.sw_inventory_items
     set stock = stock + p_delta,
         updated_at = now(),
         last_restocked = case when p_delta > 0 then current_date else last_restocked end
   where id = p_item_id
  returning stock into v_new_stock;

  insert into public.sw_stock_movements
    (business_id, item_id, kind, qty, note, created_by)
  values
    (p_business_id, p_item_id, 'adjustment', p_delta, p_note, v_user_id);

  return jsonb_build_object(
    'item_id', p_item_id,
    'new_stock', v_new_stock,
    'delta', p_delta
  );
end;
$$;

-- Grant the anon + authenticated roles the ability to call these
-- RPC functions. They are still subject to SECURITY DEFINER checks
-- inside the function bodies (auth.uid() must be set, membership
-- must be valid).
grant execute on function public.sw_create_business(text, text, text, text) to anon, authenticated;
grant execute on function public.sw_create_sale(jsonb) to anon, authenticated;
grant execute on function public.sw_adjust_stock(uuid, uuid, integer, text) to anon, authenticated;
grant execute on function public.current_user_sw_business_ids() to anon, authenticated;
grant execute on function public.current_user_is_business_member(uuid) to anon, authenticated;
grant execute on function public.current_user_business_role(uuid) to anon, authenticated;
grant execute on function public.next_display_id(uuid, text) to anon, authenticated;
