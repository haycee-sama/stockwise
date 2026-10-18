-- supabase/migrations/0001_init_schema.sql
-- ─────────────────────────────────────────────────────────────────────────
-- PROPOSED Stockwise schema for Supabase / PostgreSQL 15+.
--
-- ⚠️  This file has NOT been applied yet. Apply via the Supabase
-- ⚠️  Dashboard SQL Editor (Database → SQL Editor → New query →
-- ⚠️  paste → Run) OR via the Supabase CLI (`supabase db push`).
--
-- Coexistence strategy:
-- The dev Supabase project (`yvphrgfxqdjaokaydkyw.supabase.co`) already
-- has an existing schema from a previous experiment (`profiles`,
-- `addresses`, `orders`, `order_items`, `user_roles`, `discounts`,
-- `admin_audit_logs`, `inventory_reservation_items`). Rather than
-- dropping those (which the project owner explicitly forbade:
-- "Do not reset or delete any existing database without my explicit
-- approval"), all Stockwise tables use the `sw_` prefix so they
-- coexist cleanly. The existing `profiles` table is reused as-is for
-- the auth user's display fields (`email`, `phone`, `full_name`);
-- Stockwise-specific data lives in `sw_*` tables.
--
-- Conventions:
--   - UUIDs for all primary keys (`gen_random_uuid()`).
--   - `display_id` columns for human-friendly codes (ORD-XXXX, PO-XXXX).
--   - `business_id` on every tenant-scoped table for multi-tenant
--     isolation.
--   - `created_at`, `updated_at`, `deleted_at` on every table.
--   - Soft delete (`deleted_at IS NULL` filter in views + RLS).
--   - Money as `numeric(14, 2)` in NGN — stored in naira with 2 dp.
--     Currency code stored per-business in `sw_businesses.currency`.
--     A `currency_code` field on monetary records is intentionally
--     NOT added — multi-currency conversion is out of scope for v1;
--     see the "Multi-currency" note at the bottom of this file.
--   - Enums as `text` + `CHECK` constraint (easier to evolve than
--     `enum` types).
-- ─────────────────────────────────────────────────────────────────────────

-- Required extension for gen_random_uuid().
create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_businesses  — top-level Stockwise tenant entity. Every other
-- tenant-scoped table has a `business_id` FK to this table.
--
-- One auth user can belong to multiple businesses (via
-- sw_business_memberships). This is the canonical multi-tenant model.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_businesses (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  type            text        not null check (type in ('retail', 'wholesale', 'ecommerce', 'distribution', 'manufacturing', 'other')),
  currency        text        not null default 'NGN' check (currency in ('NGN', 'USD', 'EUR', 'GBP', 'GHS', 'KES')),
  timezone        text        not null default 'Africa/Lagos',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists sw_businesses_active_idx on sw_businesses(created_at desc) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_business_memberships — join table: which auth users belong to
-- which businesses, and in what role. This is what enables business
-- isolation via RLS without needing to trust the client.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_business_memberships (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete cascade,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  -- DECISION: roles are `owner | admin | staff`. Owner can do everything
  -- including delete the business; admin can manage everything except
  -- billing; staff can read + write records but not manage members.
  role            text        not null default 'staff' check (role in ('owner', 'admin', 'staff')),
  created_at      timestamptz not null default now(),
  -- A user can only have one role per business.
  unique (business_id, user_id)
);

create index if not exists sw_business_memberships_user_idx    on sw_business_memberships(user_id);
create index if not exists sw_business_memberships_business_idx on sw_business_memberships(business_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Helper: current_user_sw_business_ids()
-- Returns the set of business_id UUIDs the current auth user is a
-- member of. Used by every RLS policy. SECURITY DEFINER so anon role
-- can call it; the function only reads from sw_business_memberships.
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
-- sw_customers  — a business's customer list.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_customers (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete restrict,
  first_name      text        not null,
  last_name       text        not null,
  email           text,
  phone           text        not null,
  type            text        not null check (type in ('Retailer', 'Wholesale', 'Walk-in', 'E-commerce')),
  location        text        not null,
  status          text        not null default 'new' check (status in ('active', 'new', 'owing', 'inactive')),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists sw_customers_business_idx       on sw_customers(business_id) where deleted_at is null;
create index if not exists sw_customers_business_status_idx on sw_customers(business_id, status) where deleted_at is null;
create index if not exists sw_customers_business_type_idx   on sw_customers(business_id, type) where deleted_at is null;
create index if not exists sw_customers_business_name_lower_idx on sw_customers(business_id, lower(first_name || ' ' || last_name))
  where deleted_at is null;
create unique index if not exists sw_customers_business_email_unique
  on sw_customers(business_id, lower(email)) where deleted_at is null and email is not null;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_vendors  — a business's supplier list.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_vendors (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete restrict,
  name            text        not null,
  contact_person  text        not null,
  email           text,
  phone           text        not null,
  category        text        not null check (category in ('Clothing & Accessories', 'Footwear', 'Leather Goods', 'Accessories', 'Other')),
  location        text        not null,
  status          text        not null default 'active' check (status in ('active', 'inactive')),
  lead_time_days  integer     not null default 7 check (lead_time_days >= 0),
  rating          smallint    not null default 4 check (rating between 1 and 5),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists sw_vendors_business_idx        on sw_vendors(business_id) where deleted_at is null;
create index if not exists sw_vendors_business_category_idx on sw_vendors(business_id, category) where deleted_at is null;
create index if not exists sw_vendors_business_status_idx on sw_vendors(business_id, status) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_inventory_items  — products the business sells.
-- `supplier_id` is a FK to sw_vendors(id), nullable for items without
-- a known supplier.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_inventory_items (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete restrict,
  name            text        not null,
  sku             text        not null,
  category        text        not null check (category in ('Clothing', 'Footwear', 'Accessories', 'Other')),
  supplier_id     uuid        references sw_vendors(id) on delete set null,
  stock           integer     not null default 0 check (stock >= 0),
  threshold       integer     not null default 0 check (threshold >= 0),
  cost_price      numeric(14, 2) not null default 0 check (cost_price >= 0),
  selling_price   numeric(14, 2) not null default 0 check (selling_price >= 0),
  check (selling_price >= cost_price),
  last_restocked  date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create unique index if not exists sw_inventory_items_business_sku_unique
  on sw_inventory_items(business_id, lower(sku)) where deleted_at is null;
create index if not exists sw_inventory_items_business_idx       on sw_inventory_items(business_id) where deleted_at is null;
create index if not exists sw_inventory_items_business_category_idx on sw_inventory_items(business_id, category) where deleted_at is null;
create index if not exists sw_inventory_items_business_stock_idx on sw_inventory_items(business_id, stock) where deleted_at is null and stock <= threshold;

-- ──────────────────────────────────────────────────────────────────────────
-- Per-business counter table for display_id generation.
-- `display_id` (e.g. ORD-0342, PO-0024) is generated atomically via
-- this counter. The counter is incremented under an advisory lock so
-- concurrent inserts in the same business get unique, monotonic
-- numbers. See the `next_display_id()` function in migration 0002.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_display_id_counters (
  business_id     uuid        not null references sw_businesses(id) on delete cascade,
  entity          text        not null check (entity in ('sale', 'purchase_order')),
  -- The next number to assign. Incremented atomically by next_display_id().
  next_value      integer     not null default 1,
  primary key (business_id, entity)
);

-- ──────────────────────────────────────────────────────────────────────────
-- sw_sales  — header record for a customer sale.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_sales (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete restrict,
  display_id      text        not null,
  customer_id     uuid        references sw_customers(id) on delete restrict,
  payment         text        not null check (payment in ('Cash', 'Transfer', 'Card')),
  status          text        not null default 'pending' check (status in ('completed', 'pending', 'cancelled')),
  total           numeric(14, 2) not null default 0,
  note            text,
  sale_date       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create unique index if not exists sw_sales_business_display_id_unique
  on sw_sales(business_id, display_id) where deleted_at is null;
create index if not exists sw_sales_business_idx        on sw_sales(business_id) where deleted_at is null;
create index if not exists sw_sales_business_status_idx on sw_sales(business_id, status) where deleted_at is null;
create index if not exists sw_sales_business_date_idx   on sw_sales(business_id, sale_date desc) where deleted_at is null;
create index if not exists sw_sales_business_customer_idx on sw_sales(business_id, customer_id) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_sale_items — one row per item in a sale.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_sale_items (
  id              uuid        primary key default gen_random_uuid(),
  sale_id         uuid        not null references sw_sales(id) on delete cascade,
  item_id         uuid        not null references sw_inventory_items(id) on delete restrict,
  qty             integer     not null check (qty > 0),
  -- Captured at sale time so later price changes don't alter historical sales.
  unit_price      numeric(14, 2) not null check (unit_price >= 0),
  line_total      numeric(14, 2) generated always as (qty * unit_price) stored,
  created_at      timestamptz not null default now()
);

create index if not exists sw_sale_items_sale_idx  on sw_sale_items(sale_id);
create index if not exists sw_sale_items_item_idx on sw_sale_items(item_id);

-- ──────────────────────────────────────────────────────────────────────────
-- sw_stock_movements — ledger of every stock increment/decrement.
-- DECISION: ledger approach for reproducibility. `stock` column on
-- sw_inventory_items is the current value; this table is the audit
-- trail. Writes happen ONLY via SECURITY DEFINER RPC functions (see
-- migration 0002) — the API does not let clients write to this table
-- directly. A malicious client cannot fake a stock movement.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_stock_movements (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete cascade,
  item_id         uuid        not null references sw_inventory_items(id) on delete restrict,
  kind            text        not null check (kind in ('sale', 'restock', 'adjustment', 'return')),
  qty             integer     not null, -- negative for outbound, positive for inbound
  sale_id         uuid        references sw_sales(id) on delete set null,
  purchase_order_id uuid      references sw_purchase_orders(id) on delete set null,
  note            text,
  created_at      timestamptz not null default now(),
  created_by       uuid        references auth.users(id) on delete set null
);

create index if not exists sw_stock_movements_business_item_idx on sw_stock_movements(business_id, item_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────────────
-- sw_purchase_orders — orders placed to vendors for restocking.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_purchase_orders (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete restrict,
  display_id      text        not null,
  vendor_id       uuid        not null references sw_vendors(id) on delete restrict,
  status          text        not null default 'pending' check (status in ('pending', 'delivered', 'cancelled')),
  total           numeric(14, 2) not null default 0,
  note            text,
  order_date      date        not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create unique index if not exists sw_purchase_orders_business_display_id_unique
  on sw_purchase_orders(business_id, display_id) where deleted_at is null;
create index if not exists sw_purchase_orders_business_idx     on sw_purchase_orders(business_id) where deleted_at is null;
create index if not exists sw_purchase_orders_business_vendor_idx on sw_purchase_orders(business_id, vendor_id) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_purchase_order_items — line items on a purchase order.
-- `item_name` is free-text (not FK to inventory_items) because POs
-- often reference items that don't yet exist in inventory.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_purchase_order_items (
  id              uuid        primary key default gen_random_uuid(),
  purchase_order_id uuid       not null references sw_purchase_orders(id) on delete cascade,
  item_name       text        not null,
  qty             integer     not null check (qty > 0),
  unit_price      numeric(14, 2) not null check (unit_price >= 0),
  line_total      numeric(14, 2) generated always as (qty * unit_price) stored,
  created_at      timestamptz not null default now()
);

create index if not exists sw_purchase_order_items_po_idx on sw_purchase_order_items(purchase_order_id);

-- ──────────────────────────────────────────────────────────────────────────
-- sw_expenses — money the business pays out.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_expenses (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references sw_businesses(id) on delete restrict,
  name            text        not null,
  category        text        not null check (category in ('stock', 'rent', 'transport', 'utilities', 'marketing', 'salaries', 'packaging', 'other')),
  vendor          text        not null,
  amount          numeric(14, 2) not null check (amount > 0),
  payment         text        not null check (payment in ('Cash', 'Transfer', 'Card')),
  expense_date    date        not null default current_date,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists sw_expenses_business_idx       on sw_expenses(business_id) where deleted_at is null;
create index if not exists sw_expenses_business_category_idx on sw_expenses(business_id, category) where deleted_at is null;
create index if not exists sw_expenses_business_date_idx   on sw_expenses(business_id, expense_date desc) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- sw_audit_log — who-did-what-when, for every write. Especially
-- important for financial records.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sw_audit_log (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        references sw_businesses(id) on delete cascade,
  actor_user_id   uuid        references auth.users(id) on delete set null,
  entity          text        not null,
  entity_id       uuid,
  action          text        not null check (action in ('insert', 'update', 'delete')),
  payload_diff    jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists sw_audit_log_business_idx on sw_audit_log(business_id, created_at desc);
create index if not exists sw_audit_log_entity_idx   on sw_audit_log(entity, entity_id, created_at desc);

-- ╭─── Multi-currency note ───────────────────────────────────────────────╮
-- │ The schema stores money as `numeric(14, 2)` in the business's       │
-- │ reporting currency (sw_businesses.currency, default 'NGN'). v1 does   │
-- │ NOT support multi-currency conversion — every amount in a business   │
-- │ is in that business's currency. If multi-currency is required later:  │
-- │   - Add a `currency` column on sw_sales / sw_expenses / sw_purchase_  │
-- │     orders.                                                           │
-- │   - Add an `exchange_rate` column (numeric(10,6)) for each record    │
-- │     denominated in a foreign currency.                                │
-- │   - Add a `sw_exchange_rates` table with daily snapshots.             │
-- │ Until then, the reporting currency is implicit per business.          │
-- ╰─────────────────────────────────────────────────────────────────────────╯
