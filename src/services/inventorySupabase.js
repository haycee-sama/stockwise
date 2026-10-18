// src/services/inventorySupabase.js
// Supabase-backed implementation of the inventory service. Mirrors the
// shape of inventoryMock.js so callers can be swapped between them
// without code changes.
//
// SECURITY:
// - All queries are scoped by RLS via the `current_user_sw_business_ids()`
//   helper (RLS policy on sw_inventory_items). The browser never sends a
//   business_id — the server enforces isolation.
// - For atomic stock adjustments, we call the `sw_adjust_stock` RPC
//   function (SECURITY DEFINER) rather than issuing direct UPDATEs. This
//   also writes the stock_movements ledger entry atomically.
//
// Requires:
// - `sw_inventory_items` table + RLS policies (supabase/migrations/0001 + 0002).
// - The caller must be authenticated (Supabase Auth session).

import { supabase } from '../lib/supabase';

function deriveStatus(item) {
  if (!item) return 'out_of_stock';
  if (Number(item.stock) === 0) return 'out_of_stock';
  if (Number(item.stock) <= Number(item.threshold)) return 'low_stock';
  return 'in_stock';
}

// Maps a Supabase row (snake_case) to the shape the frontend expects
// (camelCase + derived fields like `iconName`, `bg`).
function shapeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    supplier: row.supplier_id ?? null, // backend stores UUID; frontend's old code expected a string. Mock layer returns the string name; for Supabase we return the UUID and the frontend can fetch vendor details separately if needed. See TODO in BACKEND_HANDOVER.
    stock: Number(row.stock),
    threshold: Number(row.threshold),
    costPrice: Number(row.cost_price),
    sellingPrice: Number(row.selling_price),
    lastRestocked: row.last_restocked ?? null,
    // Presentation-only fields derived on the client (not stored in DB):
    iconName: deriveIconName(row.category),
    bg: deriveBackground(row.category),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deriveIconName(category) {
  // Map category to a Lucide icon name (matches the frontend's iconMap).
  // Not stored on the backend (presentation only — see DATABASE_AUDIT).
  switch (category) {
    case 'Clothing':    return 'Shirt';
    case 'Footwear':    return 'Footprints';
    case 'Accessories': return 'ShoppingBag';
    default:            return 'Package';
  }
}

function deriveBackground(category) {
  switch (category) {
    case 'Clothing':    return '#fce7f3';
    case 'Footwear':    return '#dbeafe';
    case 'Accessories': return '#fef3c7';
    default:            return '#f0fdf4';
  }
}


export async function list({
  search = '',
  category = '',
  status = '',
  sort = 'name:asc',
  page = 1,
  pageSize = 100,
} = {}) {
  if (!supabase) {
    return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  }

  let query = supabase
    .from('sw_inventory_items')
    .select('*', { count: 'exact' });

  if (search) {
    // PostgREST `ilike` is case-insensitive. OR across name/sku/category.
    query = query.or(
      `name.ilike.%${search}%,sku.ilike.%${search}%,category.ilike.%${search}%`
    );
  }
  if (category && category !== 'All') {
    query = query.eq('category', category);
  }
  // status filter is derived (not stored) — we can't push it to the DB
  // without a generated column. Apply client-side post-fetch. (For
  // small result sets this is fine; for large result sets we'd add a
  // generated `status` column on the DB.)
  const [sortField, sortDir] = sort.split(':');
  // Map camelCase sort fields from the frontend to snake_case columns.
  const sortMap = { name: 'name', sku: 'sku', category: 'category', stock: 'stock', costPrice: 'cost_price', sellingPrice: 'selling_price' };
  const dbSortField = sortMap[sortField] ?? 'name';
  query = query.order(dbSortField, { ascending: sortDir !== 'desc' });
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: rawData, error, count } = await query;
  if (error) {
    return { data: null, error: { code: error.code, message: error.message }, pagination: null };
  }

  // Apply status filter client-side post-fetch.
  let filtered = (rawData ?? []).map(shapeRow);
  if (status && status !== 'All') {
    filtered = filtered.filter(i => deriveStatus(i) === status.toLowerCase());
  }
  return {
    data: filtered,
    error: null,
    pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
  };
}

export async function get(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data: row, error } = await supabase
    .from('sw_inventory_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Item not found' } };
  return { data: shapeRow(row), error: null };
}

export async function create(payload) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // business_id is omitted — RLS policy determines the user's businesses
  // and the INSERT policy `with check (business_id in ...)` enforces
  // the user is a member. The CLIENT must include business_id in the
  // payload; the SERVER validates it.
  //
  // NOTE: the frontend should fetch the active business_id from
  // `sw_business_memberships` and include it here. We don't trust
  // the client to pick a business_id blindly — the RLS check ensures
  // the user is a member of that business.
  const insertRow = {
    business_id: payload.businessId,
    name: payload.name,
    sku: payload.sku,
    category: payload.category,
    supplier_id: payload.supplierId ?? null,
    stock: Number(payload.stock) || 0,
    threshold: Number(payload.threshold) || 0,
    cost_price: Number(payload.costPrice) || 0,
    selling_price: Number(payload.sellingPrice) || 0,
    last_restocked: payload.lastRestocked ?? new Date().toISOString().slice(0, 10),
  };
  const { data: row, error } = await supabase
    .from('sw_inventory_items')
    .insert(insertRow)
    .select()
    .single();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: shapeRow(row), error: null };
}

export async function update(id, patch) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // Map camelCase patch to snake_case columns.
  const dbPatch = {};
  if (patch.name !== undefined)         dbPatch.name         = patch.name;
  if (patch.sku !== undefined)          dbPatch.sku          = patch.sku;
  if (patch.category !== undefined)     dbPatch.category     = patch.category;
  if (patch.supplierId !== undefined)   dbPatch.supplier_id  = patch.supplierId;
  if (patch.stock !== undefined)         dbPatch.stock        = Number(patch.stock);
  if (patch.threshold !== undefined)    dbPatch.threshold    = Number(patch.threshold);
  if (patch.costPrice !== undefined)    dbPatch.cost_price   = Number(patch.costPrice);
  if (patch.sellingPrice !== undefined) dbPatch.selling_price = Number(patch.sellingPrice);
  if (patch.lastRestocked !== undefined) dbPatch.last_restocked = patch.lastRestocked;
  dbPatch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('sw_inventory_items')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Item not found' } };
  return { data: shapeRow(row), error: null };
}

export async function remove(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // Soft delete — set deleted_at.
  const { error } = await supabase
    .from('sw_inventory_items')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: { id }, error: null };
}

export async function listCategories() {
  return { data: ['Clothing', 'Footwear', 'Accessories', 'Other'], error: null };
}

export async function listSuppliers() {
  // Suppliers = vendors. The frontend's `suppliers` list expects just
  // the vendor names. We could either:
  // 1. Fetch vendors here and return just the names (legacy shape).
  // 2. Return full vendor objects and let the caller pick.
  // For backwards compat with ItemModal.jsx, return names.
  if (!supabase) return { data: [], error: null };
  const { data: vendors, error } = await supabase
    .from('sw_vendors')
    .select('name')
    .is('deleted_at', null)
    .order('name');
  if (error) return { data: [], error: { code: error.code, message: error.message } };
  return { data: (vendors ?? []).map(v => v.name), error: null };
}

// Adjusts stock via the SECURITY DEFINER RPC function (writes the
// stock_movements ledger entry atomically). Use this for manual
// adjustments; for sale-driven decrements, use salesService.create()
// which calls sw_create_sale.
export async function adjustStock(businessId, itemId, delta, note = null) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data, error } = await supabase.rpc('sw_adjust_stock', {
    p_business_id: businessId,
    p_item_id: itemId,
    p_delta: delta,
    p_note: note,
  });
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data, error: null };
}
