// src/services/salesSupabase.js
// Supabase-backed implementation of the sales service. The crucial
// difference from the mock: sale creation is ATOMIC via the
// `sw_create_sale` SECURITY DEFINER RPC function (see docs/BACKEND_HANDOVER.md).
//
// This means:
// - Stock decrements + sale_items + stock_movements are all written
//   in a single transaction.
// - If any line item validation fails (e.g. insufficient stock),
//   the WHOLE sale rolls back — no partial state.
// - The total is SERVER-COMPUTED from the line items, never taken
//   from the client payload.
//
// SECURITY:
// - The caller must be authenticated.
// - business_id is required in the payload (the frontend reads it
//   from the current user's memberships).
// - The RPC function checks business membership + validates each
//   item's existence + stock. The browser cannot fake a sale.

import { supabase } from '../lib/supabase';

function shapeRow(row) {
  if (!row) return null;
  return {
    id: row.display_id ?? row.id, // frontend displays display_id; uses id for API calls
    _uuid: row.id,
    customer: {
      // TODO: when sw_customers is joined, populate this from customer_id.
      // For now, the customer object is left as a placeholder — the
      // frontend's NewSaleModal currently passes a free-text customer
      // name, not a customer_id. This will need to be reconciled when
      // the customer-picker is refactored.
      name: row._customer_name ?? 'Unknown',
      initials: '?',
      color: '#dcfce7',
      textColor: '#15803d',
    },
    items: (row._items ?? []).map(si => ({
      name: si._item_name ?? 'Unknown item',
      qty: si.qty,
      price: Number(si.unit_price),
    })),
    total: Number(row.total),
    payment: row.payment,
    status: row.status,
    date: row.sale_date,
    note: row.note,
  };
}


export async function list({ search = '', status = 'All', payment = 'All', page = 1, pageSize = 100 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  let query = supabase
    .from('sw_sales')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (status && status !== 'All') query = query.eq('status', status.toLowerCase());
  if (payment && payment !== 'All') query = query.eq('payment', payment);
  if (search) {
    query = query.or(`display_id.ilike.%${search}%,note.ilike.%${search}%`);
  }
  query = query.order('sale_date', { ascending: false });
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: rawData, error, count } = await query;
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  // Fetch the line items for each sale in one batch.
  const salesIds = (rawData ?? []).map(s => s.id);
  let itemsBySale = {};
  if (salesIds.length > 0) {
    const { data: lineItems, error: liErr } = await supabase
      .from('sw_sale_items')
      .select('sale_id, qty, unit_price, item_id')
      .in('sale_id', salesIds);
    if (!liErr && lineItems) {
      for (const li of lineItems) {
        if (!itemsBySale[li.sale_id]) itemsBySale[li.sale_id] = [];
        itemsBySale[li.sale_id].push(li);
      }
    }
  }

  const shaped = (rawData ?? []).map(s => shapeRow({
    ...s,
    _items: itemsBySale[s.id] ?? [],
  }));
  return {
    data: shaped,
    error: null,
    pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
  };
}

export async function get(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // Try by UUID first, then by display_id.
  let { data: row, error } = await supabase
    .from('sw_sales')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!row) {
    const r2 = await supabase
      .from('sw_sales')
      .select('*')
      .eq('display_id', id)
      .maybeSingle();
    row = r2.data;
    error = r2.error;
  }
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Sale not found' } };

  // Fetch line items.
  const { data: lineItems } = await supabase
    .from('sw_sale_items')
    .select('qty, unit_price, item_id')
    .eq('sale_id', row.id);
  return { data: shapeRow({ ...row, _items: lineItems ?? [] }), error: null };
}

export async function create(payload) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  // The frontend's NewSaleModal currently passes:
  //   { customerName: string, items: [{item_id, qty, unit_price}], payment, status, note }
  // We need to translate this to the RPC payload schema:
  //   { business_id, customer_id|null, payment, status, note, items: [{item_id, qty, unit_price}] }
  //
  // The customer_id is null for now (walk-in customer). When the
  // customer picker is refactored to pick a real customer, this will
  // pass customer_id.

  const rpcPayload = {
    business_id: payload.businessId,
    customer_id: payload.customerId ?? null,
    payment: payload.payment,
    status: payload.status ?? 'completed',
    note: payload.note ?? null,
    items: (payload.items ?? []).map(i => ({
      item_id: i.itemId ?? i.item_id,
      qty: Number(i.qty),
      unit_price: Number(i.unitPrice ?? i.unit_price),
    })),
  };

  const { data, error } = await supabase.rpc('sw_create_sale', {
    p_payload: rpcPayload,
  });

  if (error) {
    return { data: null, error: { code: error.code, message: error.message } };
  }
  // RPC returns { sale_id, display_id, total } — fetch the full sale
  // for the caller to use immediately.
  const fullSale = await get(data.sale_id);
  return { data: fullSale.data, error: fullSale.error };
}

export async function update(id, patch) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const dbPatch = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.note !== undefined) dbPatch.note = patch.note;
  if (patch.payment !== undefined) dbPatch.payment = patch.payment;
  dbPatch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('sw_sales')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Sale not found' } };
  return { data: shapeRow(row), error: null };
}

export async function listPaymentMethods() {
  return { data: ['Cash', 'Transfer', 'Card'], error: null };
}
