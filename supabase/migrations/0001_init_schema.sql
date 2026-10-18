-- supabase/migrations/0001_init_schema.sql
-- ─────────────────────────────────────────────────────────────────────────
-- PROPOSED Stockwise schema for Supabase / PostgreSQL 15+.
--
-- ⚠️  THIS FILE IS A PROPOSAL. IT HAS NOT BEEN APPLIED TO ANY DATABASE.
-- ⚠️  Do not run this against a shared or production database without
--     explicit approval from the project owner and the backend engineer.
--
-- The schema is derived from the entities visible in the existing
-- `src/data/mockData.js` module + the open questions in
-- `docs/DATABASE_AUDIT.md` §4. Where a decision was unresolved at
-- audit time, the proposed default is used here and clearly marked
-- with a `-- DECISION:` comment so the backend engineer can override.
--
-- Conventions:
--   - UUIDs for all primary keys (`gen_random_uuid()`).
--   - `display_id` columns for human-friendly codes (ORD-XXXX, PO-XXXX).
--   - `business_id` on every tenant-scoped table for multi-tenant
--     isolation (DECISION: single business per user, with a future
--     `business_users` join table for shared businesses).
--   - `created_at`, `updated_at`, `deleted_at` on every table.
--   - Soft delete (`deleted_at IS NULL` filter in views + RLS).
--   - Monetary amounts as `numeric(14, 2)` in NGN (DECISION: store
--     in naira with 2 decimal places, NOT in kobo integers — easier
--     to read in DB inspection).
--   - Enums as `text` + `CHECK` constraint rather than `enum` type —
--     easier to evolve without a migration.
-- ─────────────────────────────────────────────────────────────────────────

-- Required extension for gen_random_uuid().
create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────────
-- businesses  — top-level tenant entity. Every other tenant-scoped table
-- has a `business_id` FK to this table.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists businesses (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  type            text        not null check (type in ('retail', 'wholesale', 'ecommerce', 'distribution', 'manufacturing', 'other')),
  currency        text        not null default 'NGN',
  timezone        text        not null default 'Africa/Lagos',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- ──────────────────────────────────────────────────────────────────────────
-- auth.users  is provided by Supabase Auth. We never create it.
-- We do create a `profiles` table that 1:1 mirrors auth.users but
-- holds the business-specific fields Supabase Auth doesn't (firstName,
-- lastName, businessName, businessId).
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  business_id     uuid        references businesses(id) on delete restrict,
  first_name      text        not null,
  last_name       text        not null,
  email           text        not null,
  phone           text,
  -- DECISION: a single user belongs to a single business today.
  -- A future `business_members` join table will allow multi-business.
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth.users row is created
-- (i.e. on signup). This is a Supabase convention. The trigger
-- function copies email and metadata fields from the auth.users row.
-- ⚠️  Trigger + function pairs are security-sensitive — the backend
--     engineer MUST review this before applying. In particular, the
--     function is `SECURITY DEFINER` so it runs as the postgreSQL
--     owner; we use it to allow anon-role inserts into `profiles`
--     ONLY for the user's own row, by copying from auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, business_id, first_name, last_name, email, phone)
  values (
    new.id,
    -- Create a new business for the user (single-business-per-user).
    -- A follow-up decision can switch this to an existing business_id
    -- (e.g. invited users joining an existing business).
    (insert into public.businesses (name, type)
       values (coalesce(new.raw_user_meta_data->>'businessName', 'My Business'),
               coalesce(new.raw_user_meta_data->>'businessType', 'retail'))
       returning id),
    coalesce(new.raw_user_meta_data->>'firstName', ''),
    coalesce(new.raw_user_meta_data->>'lastName', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────────────
-- customers  — a business's customer list.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists customers (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references businesses(id) on delete cascade,
  first_name      text        not null,
  last_name       text        not null,
  email           text,
  phone           text        not null,
  -- DECISION: customer.type is `Retailer | Wholesale | Walk-in | E-commerce`.
  type            text        not null check (type in ('Retailer', 'Wholesale', 'Walk-in', 'E-commerce')),
  location        text        not null,
  -- DECISION: customer.status is `active | new | owing | inactive`.
  status          text        not null default 'new' check (status in ('active', 'new', 'owing', 'inactive')),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists customers_business_id_idx        on customers(business_id) where deleted_at is null;
create index if not exists customers_business_status_idx     on customers(business_id, status) where deleted_at is null;
create index if not exists customers_business_type_idx      on customers(business_id, type) where deleted_at is null;
create index if not exists customers_business_name_lower_idx on customers(business_id, lower(first_name || ' ' || last_name))
  where deleted_at is null;
create unique index if not exists customers_business_email_unique
  on customers(business_id, lower(email)) where deleted_at is null and email is not null;

-- ──────────────────────────────────────────────────────────────────────────
-- vendors  — a business's supplier list.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists vendors (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references businesses(id) on delete cascade,
  name            text        not null,
  contact_person  text        not null,
  email           text,
  phone           text        not null,
  -- DECISION: vendor.category is `Clothing & Accessories | Footwear | Leather Goods | Accessories`.
  category        text        not null check (category in ('Clothing & Accessories', 'Footwear', 'Leather Goods', 'Accessories', 'Other')),
  location        text        not null,
  -- DECISION: vendor.status is `active | inactive`.
  status          text        not null default 'active' check (status in ('active', 'inactive')),
  lead_time_days  integer     not null default 7 check (lead_time_days >= 0),
  rating          smallint    not null default 4 check (rating between 1 and 5),
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists vendors_business_id_idx        on vendors(business_id) where deleted_at is null;
create index if not exists vendors_business_category_idx  on vendors(business_id, category) where deleted_at is null;
create index if not exists vendors_business_status_idx    on vendors(business_id, status) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- inventory_items  — products the business sells.
-- `supplier_id` is a FK to vendors(id) (nullable for items without a
-- known supplier).
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists inventory_items (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references businesses(id) on delete cascade,
  name            text        not null,
  sku             text        not null,
  -- DECISION: inventory.category is `Clothing | Footwear | Accessories | Other`.
  category        text        not null check (category in ('Clothing', 'Footwear', 'Accessories', 'Other')),
  supplier_id     uuid        references vendors(id) on delete set null,
  stock           integer     not null default 0 check (stock >= 0),
  threshold       integer     not null default 0 check (threshold >= 0),
  cost_price      numeric(14, 2) not null default 0 check (cost_price >= 0),
  selling_price   numeric(14, 2) not null default 0 check (selling_price >= 0),
  -- Business rule: selling price must be >= cost price. Backend MUST
  -- also enforce this; the CHECK here is a backstop.
  check (selling_price >= cost_price),
  last_restocked  date,
  -- Presentation-only fields (icon_name, bg_color) are intentionally
  -- NOT stored on the backend — the frontend derives them from the
  -- category. See docs/DATABASE_AUDIT.md §3.7.
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create unique index if not exists inventory_items_business_sku_unique
  on inventory_items(business_id, lower(sku)) where deleted_at is null;
create index if not exists inventory_items_business_id_idx        on inventory_items(business_id) where deleted_at is null;
create index if not exists inventory_items_business_category_idx  on inventory_items(business_id, category) where deleted_at is null;
create index if not exists inventory_items_business_stock_idx     on inventory_items(business_id, stock) where deleted_at is null and stock <= threshold;

-- ──────────────────────────────────────────────────────────────────────────
-- sales  — header record for a customer sale. Line items live in
-- `sale_items`.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sales (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references businesses(id) on delete cascade,
  -- `display_id` is the human-friendly ORD-XXXX code. Generated by
  -- a sequence per business so it's monotonic and unique within the
  -- business. The frontend uses `display_id` for display; the API
  -- contract uses `id` (UUID) for everything else.
  display_id      text        not null,
  customer_id     uuid        references customers(id) on delete restrict,
  -- DECISION: sales.payment is `Cash | Transfer | Card`. (Note: the
  -- frontend currently uses `POS` for sales and `Card` for expenses;
  -- we unify on `Card` here. The frontend will be updated to match.)
  payment         text        not null check (payment in ('Cash', 'Transfer', 'Card')),
  -- DECISION: sales.status is `completed | pending | cancelled`.
  status          text        not null default 'pending' check (status in ('completed', 'pending', 'cancelled')),
  -- `total` is denormalized for read performance; it's recomputed by
  -- a trigger on `sale_items` insert/update/delete. See trigger below.
  total           numeric(14, 2) not null default 0,
  note            text,
  sale_date       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create unique index if not exists sales_business_display_id_unique
  on sales(business_id, display_id) where deleted_at is null;
create index if not exists sales_business_id_idx        on sales(business_id) where deleted_at is null;
create index if not exists sales_business_status_idx    on sales(business_id, status) where deleted_at is null;
create index if not exists sales_business_date_idx      on sales(business_id, sale_date desc) where deleted_at is null;
create index if not exists sales_business_customer_idx  on sales(business_id, customer_id) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- sale_items  — one row per item in a sale.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists sale_items (
  id              uuid        primary key default gen_random_uuid(),
  sale_id         uuid        not null references sales(id) on delete cascade,
  item_id         uuid        not null references inventory_items(id) on delete restrict,
  qty             integer     not null check (qty > 0),
  -- `unit_price` is captured at sale time so that later price changes
  -- don't retroactively alter historical sales totals.
  unit_price      numeric(14, 2) not null check (unit_price >= 0),
  line_total      numeric(14, 2) generated always as (qty * unit_price) stored,
  created_at      timestamptz not null default now()
);

create index if not exists sale_items_sale_id_idx   on sale_items(sale_id);
create index if not exists sale_items_item_id_idx  on sale_items(item_id);

-- Trigger to recompute sales.total whenever sale_items change.
-- ⚠️  Trigger function is SECURITY DEFINER. Review before applying.
create or replace function public.recompute_sale_total()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sales
     set total = coalesce((select sum(line_total) from public.sale_items where sale_id = coalesce(new.sale_id, old.sale_id)), 0),
         updated_at = now()
   where id = coalesce(new.sale_id, old.sale_id);
  return coalesce(new, old);
end;
$$;

create trigger sale_items_total_recompute
  after insert or update or delete on sale_items
  for each row execute function public.recompute_sale_total();

-- ──────────────────────────────────────────────────────────────────────────
-- stock_movements  — ledger of every stock increment/decrement.
-- DECISION: ledger approach for reproducibility. The `stock` column
-- on inventory_items is the current value; this table is the audit
-- trail. A trigger on `sales` / `purchase_orders` writes to this
-- ledger. For sale creation, the trigger decrements `stock` and
-- writes a `sale` movement row.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists stock_movements (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references businesses(id) on delete cascade,
  item_id         uuid        not null references inventory_items(id) on delete restrict,
  -- DECISION: movement.kind is `sale | restock | adjustment | return`.
  kind            text        not null check (kind in ('sale', 'restock', 'adjustment', 'return')),
  qty             integer     not null, -- negative for outbound, positive for inbound
  -- nullable FKs to the source record (sale_item_id or purchase_order_id)
  sale_id         uuid        references sales(id) on delete set null,
  purchase_order_id uuid      references purchase_orders(id) on delete set null,
  note            text,
  created_at      timestamptz not null default now(),
  created_by       uuid        references auth.users(id) on delete set null
);

create index if not exists stock_movements_business_item_idx on stock_movements(business_id, item_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────────────
-- purchase_orders  — orders placed to vendors for restocking.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists purchase_orders (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references businesses(id) on delete cascade,
  display_id      text        not null,
  vendor_id       uuid        not null references vendors(id) on delete restrict,
  -- DECISION: purchase_orders.status is `pending | delivered | cancelled`.
  -- NOTE: differs from sales.status intentionally (delivered vs completed).
  status          text        not null default 'pending' check (status in ('pending', 'delivered', 'cancelled')),
  total           numeric(14, 2) not null default 0,
  note            text,
  order_date      date        not null default current_date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create unique index if not exists purchase_orders_business_display_id_unique
  on purchase_orders(business_id, display_id) where deleted_at is null;
create index if not exists purchase_orders_business_id_idx     on purchase_orders(business_id) where deleted_at is null;
create index if not exists purchase_orders_business_vendor_idx on purchase_orders(business_id, vendor_id) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- purchase_order_items  — line items on a purchase order.
-- DECISION: free-text `item_name` here, NOT a FK to inventory_items.
-- Rationale: purchase orders often reference items that don't yet
-- exist in inventory (the PO is what creates them). On delivery, the
-- stock is incremented either onto an existing inventory item (matched
-- by SKU) or creates a new inventory item.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists purchase_order_items (
  id              uuid        primary key default gen_random_uuid(),
  purchase_order_id uuid      not null references purchase_orders(id) on delete cascade,
  item_name       text        not null,
  qty             integer     not null check (qty > 0),
  unit_price      numeric(14, 2) not null check (unit_price >= 0),
  line_total      numeric(14, 2) generated always as (qty * unit_price) stored,
  created_at      timestamptz not null default now()
);

create index if not exists purchase_order_items_po_idx on purchase_order_items(purchase_order_id);

-- ──────────────────────────────────────────────────────────────────────────
-- expenses  — money the business pays out.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        not null references businesses(id) on delete cascade,
  name            text        not null,
  -- DECISION: expense.category is `stock | rent | transport | utilities | marketing | salaries | packaging | other`.
  category        text        not null check (category in ('stock', 'rent', 'transport', 'utilities', 'marketing', 'salaries', 'packaging', 'other')),
  -- DECISION: `vendor` is free-text payee (not FK to vendors). Rationale:
  -- expenses often go to one-off payees (e.g. "Landlord", "Total
  -- Energies") that don't merit a vendor record. The frontend's
  -- datalist suggestion from `vendors` is preserved as a UX hint.
  vendor          text        not null,
  amount          numeric(14, 2) not null check (amount > 0),
  -- DECISION: same payment enum as sales: `Cash | Transfer | Card`.
  payment         text        not null check (payment in ('Cash', 'Transfer', 'Card')),
  expense_date    date        not null default current_date,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists expenses_business_id_idx       on expenses(business_id) where deleted_at is null;
create index if not exists expenses_business_category_idx on expenses(business_id, category) where deleted_at is null;
create index if not exists expenses_business_date_idx     on expenses(business_id, expense_date desc) where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- audit_log  — who-did-what-when, for every write. Especially
-- important for financial records.
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id              uuid        primary key default gen_random_uuid(),
  business_id     uuid        references businesses(id) on delete cascade,
  actor_user_id   uuid        references auth.users(id) on delete set null,
  entity          text        not null,             -- e.g. 'sales', 'inventory_items'
  entity_id       uuid,
  action          text        not null,             -- 'insert' | 'update' | 'delete'
  payload_diff    jsonb,                            -- before/after diff
  created_at      timestamptz not null default now()
);

create index if not exists audit_log_business_idx     on audit_log(business_id, created_at desc);
create index if not exists audit_log_entity_idx       on audit_log(entity, entity_id, created_at desc);
