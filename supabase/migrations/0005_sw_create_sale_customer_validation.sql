-- supabase/migrations/0005_sw_create_sale_customer_validation.sql
-- ─────────────────────────────────────────────────────────────────────────
-- SECURITY FIX — patches the sw_create_sale RPC to validate that
-- customer_id belongs to the caller's business.
--
-- ⚠️  This migration REPLACES the sw_create_sale function. It must be
-- ⚠️  applied AFTER 0002 (which creates the original function).
--
-- DEFECT FOUND IN PHASE 3F REVIEW:
--   The original sw_create_sale extracted customer_id from the payload
--   and inserted it into sw_sales WITHOUT checking that the customer
--   belongs to the caller's business. The FK constraint on
--   sw_sales.customer_id → sw_customers.id checks row EXISTENCE, not
--   business_id scope. PostgreSQL FK constraints bypass RLS — so a
--   malicious client could pass a customer_id from ANOTHER business,
--   and the FK would pass because the row exists in sw_customers.
--
--   Impact: a sale in Business A could be linked to Business B's
--   customer. This is a cross-business data integrity leak — not a
--   data READ leak (the sale's business_id is still A, so Business B
--   can't see the sale), but the customer reference is wrong.
--
-- FIX:
--   After extracting customer_id, explicitly check that the customer
--   exists in sw_customers with business_id = v_business_id AND
--   deleted_at IS NULL. Raise an exception if not.
--
--   This check runs inside the SECURITY DEFINER function, so it uses
--   the function's search_path and bypasses RLS (which is correct —
--   we want to check the actual row, not the RLS-filtered view).
-- ─────────────────────────────────────────────────────────────────────────

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

  -- ── FIX (Phase 3F): validate customer_id belongs to this business ──
  -- The original function did NOT check this. FK constraints bypass RLS,
  -- so a customer_id from another business would pass the FK check.
  -- This explicit check prevents cross-business customer linkage.
  if v_customer_id is not null then
    if not exists (
      select 1 from public.sw_customers
      where id = v_customer_id
        and business_id = v_business_id
        and deleted_at is null
    ) then
      raise exception 'Customer % does not belong to business %', v_customer_id, v_business_id;
    end if;
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
    for update;

    if not found then
      raise exception 'Item % does not belong to business %', v_item.item_id, v_business_id;
    end if;

    if v_status = 'completed' and v_inv.stock < v_item.qty then
      raise exception 'Insufficient stock for item "%": have %, need %',
        v_inv.name, v_inv.stock, v_item.qty;
    end if;

    -- 5c. Insert the line item.
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

-- Re-grant (CREATE OR REPLACE doesn't preserve grants automatically).
grant execute on function public.sw_create_sale(jsonb) to anon, authenticated;
