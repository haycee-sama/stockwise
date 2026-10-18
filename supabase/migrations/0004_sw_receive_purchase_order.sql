-- supabase/migrations/0004_sw_receive_purchase_order.sql
-- ─────────────────────────────────────────────────────────────────────────
-- PROPOSED — NOT YET APPLIED. Add to the dev project via the SQL Editor
-- after 0001 + 0002 are applied.
--
-- Adds the sw_receive_purchase_order RPC function for the
-- purchase-order receiving workflow.
--
-- Design decisions:
--   - FULL receiving only (no partial receiving). The PO is either
--     fully received or not at all. This avoids the complexity of
--     tracking outstanding quantities per line item. If partial
--     receiving is needed later, add an `outstanding_qty` column
--     to sw_purchase_order_items and adjust the logic.
--   - The function increments inventory stock for each line item's
--     referenced item_name → looks up sw_inventory_items by
--     (business_id, name). If the item doesn't exist, it's created
--     with a default category + cost price = the PO's unit_price.
--     This supports the "PO references items that don't yet exist
--     in inventory" use case.
--   - Stock movements (kind='restock') are written atomically in the
--     same transaction.
--   - The function is idempotent for a delivered PO — calling it
--     again on a PO with status='delivered' raises an error.
--   - Uses pg_advisory_xact_lock to prevent concurrent receiving
--     of the same PO from double-incrementing stock.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.sw_receive_purchase_order(
  p_purchase_order_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_po record;
  v_item record;
  v_user_id uuid := auth.uid();
  v_total_qty integer := 0;
  v_items_processed integer := 0;
  v_inv_id uuid;
  v_inv_name text;
  v_inv_category text;
begin
  -- 1. Auth check.
  if v_user_id is null then
    raise exception 'Must be authenticated to receive a purchase order';
  end if;

  -- 2. Lock the PO row to prevent concurrent receiving.
  select id, business_id, vendor_id, status, display_id, order_date
    into v_po
    from public.sw_purchase_orders
   where id = p_purchase_order_id
  for update;

  if not found then
    raise exception 'Purchase order % not found', p_purchase_order_id;
  end if;

  -- 3. Business membership check.
  if not public.current_user_is_business_member(v_po.business_id) then
    raise exception 'Not a member of business %', v_po.business_id;
  end if;

  -- 4. State check — must be 'pending'.
  if v_po.status = 'delivered' then
    raise exception 'Purchase order % has already been received', v_po.display_id;
  end if;
  if v_po.status = 'cancelled' then
    raise exception 'Purchase order % is cancelled — cannot receive', v_po.display_id;
  end if;
  if v_po.status != 'pending' then
    raise exception 'Purchase order % has unexpected status: %', v_po.display_id, v_po.status;
  end if;

  -- 5. Fetch all line items + process each.
  for v_item in
    select poi.id, poi.item_name, poi.qty, poi.unit_price, poi.purchase_order_id
      from public.sw_purchase_order_items poi
     where poi.purchase_order_id = p_purchase_order_id
  loop
    if v_item.qty <= 0 then
      raise exception 'Invalid qty % for item %', v_item.qty, v_item.item_name;
    end if;

    -- 5a. Look up the inventory item by (business_id, name).
    --     If it doesn't exist, create it with a default category.
    select id, name, category into v_inv_id, v_inv_name, v_inv_category
      from public.sw_inventory_items
     where business_id = v_po.business_id
       and name = v_item.item_name
       and deleted_at is null
    for update;

    if not found then
      -- Create a new inventory item. The cost_price is set to the
      -- PO's unit_price; the selling_price is set to cost_price * 1.5
      -- as a default margin (the user can edit later).
      insert into public.sw_inventory_items
        (business_id, name, sku, category, supplier_id, stock, threshold,
         cost_price, selling_price, last_restocked)
      values
        (v_po.business_id, v_item.item_name,
         'AUTO-' || upper(left(md5(v_item.item_name || ':' || v_po.business_id::text), 8)),
         'Other', null, 0, 0,
         v_item.unit_price, v_item.unit_price * 1.5, current_date)
      returning id, name, category into v_inv_id, v_inv_name, v_inv_category;
    end if;

    -- 5b. Increment the inventory stock.
    update public.sw_inventory_items
       set stock = stock + v_item.qty,
           last_restocked = current_date,
           updated_at = now()
     where id = v_inv_id;

    -- 5c. Write the stock_movement ledger entry.
    insert into public.sw_stock_movements
      (business_id, item_id, kind, qty, purchase_order_id, note, created_by)
    values
      (v_po.business_id, v_inv_id, 'restock', v_item.qty, p_purchase_order_id,
       'Received PO ' || v_po.display_id, v_user_id);

    v_total_qty := v_total_qty + v_item.qty;
    v_items_processed := v_items_processed + 1;
  end loop;

  if v_items_processed = 0 then
    raise exception 'Purchase order % has no line items', v_po.display_id;
  end if;

  -- 6. Update the PO status to 'delivered'.
  update public.sw_purchase_orders
     set status = 'delivered',
         updated_at = now()
   where id = p_purchase_order_id;

  -- 7. Return a structured result.
  return jsonb_build_object(
    'purchase_order_id', p_purchase_order_id,
    'display_id', v_po.display_id,
    'status', 'delivered',
    'items_processed', v_items_processed,
    'total_qty_received', v_total_qty
  );
end;
$$;

-- Grant execute to anon + authenticated.
grant execute on function public.sw_receive_purchase_order(uuid) to anon, authenticated;
