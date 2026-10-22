// src/services/vendorsSupabase.js
// Supabase-backed implementation of the vendors service.

import { supabase } from '../lib/supabase';

const AVATAR_COLORS = [
  { color: '#dbeafe', textColor: '#1d4ed8' },
  { color: '#fef3c7', textColor: '#92400e' },
  { color: '#fce7f3', textColor: '#9d174d' },
  { color: '#f0fdf4', textColor: '#15803d' },
  { color: '#ede9fe', textColor: '#6d28d9' },
  { color: '#fff7ed', textColor: '#c2410c' },
];

function pickColor(seed) {
  let sum = 0;
  for (const ch of String(seed ?? '')) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initialsFor(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function shapeRow(row, stats = {}) {
  if (!row) return null;
  const colorPair = pickColor(row.name);
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    category: row.category,
    location: row.location,
    status: row.status,
    joinDate: row.created_at?.slice(0, 10),
    leadTimeDays: Number(row.lead_time_days),
    rating: Number(row.rating),
    note: row.note,
    itemsSupplied: row.items_supplied ?? [], // optional; populated via separate query if needed
    totalOrders: stats.totalOrders ?? 0,
    totalPaid: stats.totalPaid ?? 0,
    pendingAmount: stats.pendingAmount ?? 0,
    lastOrder: stats.lastOrder ?? null,
    orders: stats.orders ?? [],
    initials: initialsFor(row.name),
    color: colorPair.color,
    textColor: colorPair.textColor,
  };
}


export async function list({ search = '', category = 'All', status = 'All', page = 1, pageSize = 100 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  let query = supabase
    .from('sw_vendors')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%,location.ilike.%${search}%`);
  }
  if (category && category !== 'All') query = query.eq('category', category);
  if (status && status !== 'All') query = query.eq('status', status.toLowerCase());
  query = query.order('created_at', { ascending: false });
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: rawData, error, count } = await query;
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  const shaped = (rawData ?? []).map(r => shapeRow(r));
  return {
    data: shaped,
    error: null,
    pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
  };
}

export async function get(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data: row, error } = await supabase
    .from('sw_vendors')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Vendor not found' } };

  // Fetch this vendor's recent purchase orders.
  const { data: pos } = await supabase
    .from('sw_purchase_orders')
    .select('id, display_id, order_date, total, status')
    .eq('vendor_id', id)
    .is('deleted_at', null)
    .order('order_date', { ascending: false })
    .limit(10);

  // Fetch line-item counts per PO in one batched query so the
  // VendorDrawer can show "N items" for each order instead of the
  // previous hardcoded "0 items". Uses PostgREST on
  // sw_purchase_order_items — no backend change required.
  const poIds = (pos ?? []).map(p => p.id);
  let itemCountByPo = {};
  if (poIds.length > 0) {
    const { data: poItems } = await supabase
      .from('sw_purchase_order_items')
      .select('purchase_order_id, qty')
      .in('purchase_order_id', poIds);
    for (const it of (poItems ?? [])) {
      itemCountByPo[it.purchase_order_id] = (itemCountByPo[it.purchase_order_id] ?? 0) + 1;
    }
  }

  const stats = {
    totalOrders: pos?.length ?? 0,
    totalPaid: (pos ?? []).filter(p => p.status === 'delivered').reduce((s, p) => s + Number(p.total), 0),
    pendingAmount: (pos ?? []).filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.total), 0),
    lastOrder: pos?.[0]?.order_date ?? null,
    orders: (pos ?? []).map(p => ({
      id: p.display_id ?? p.id,
      date: p.order_date,
      items: itemCountByPo[p.id] ?? 0,
      total: Number(p.total),
      status: p.status,
    })),
  };
  return { data: shapeRow(row, stats), error: null };
}

export async function create(payload) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const insertRow = {
    business_id: payload.businessId,
    name: payload.name,
    contact_person: payload.contactPerson,
    email: payload.email || null,
    phone: payload.phone,
    category: payload.category,
    location: payload.location,
    lead_time_days: Number(payload.leadTimeDays) || 7,
    rating: Number(payload.rating) || 4,
    note: payload.note || null,
    // Honour the caller's status; default to 'active' only when not
    // supplied. The previous implementation hardcoded 'active' and
    // silently dropped any caller-provided status, which meant the
    // create form could not create an 'inactive' vendor even when
    // the user picked that option from the dropdown.
    status: payload.status ?? 'active',
  };
  const { data: row, error } = await supabase
    .from('sw_vendors')
    .insert(insertRow)
    .select()
    .single();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: shapeRow(row), error: null };
}

export async function update(id, patch) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const dbPatch = {};
  if (patch.name !== undefined)          dbPatch.name = patch.name;
  if (patch.contactPerson !== undefined) dbPatch.contact_person = patch.contactPerson;
  if (patch.email !== undefined)         dbPatch.email = patch.email;
  if (patch.phone !== undefined)         dbPatch.phone = patch.phone;
  if (patch.category !== undefined)      dbPatch.category = patch.category;
  if (patch.location !== undefined)     dbPatch.location = patch.location;
  if (patch.status !== undefined)        dbPatch.status = patch.status;
  if (patch.leadTimeDays !== undefined)  dbPatch.lead_time_days = Number(patch.leadTimeDays);
  if (patch.rating !== undefined)        dbPatch.rating = Number(patch.rating);
  if (patch.note !== undefined)          dbPatch.note = patch.note;
  dbPatch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('sw_vendors')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Vendor not found' } };
  return { data: shapeRow(row), error: null };
}

export async function remove(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { error } = await supabase
    .from('sw_vendors')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: { id }, error: null };
}

// Place-order — uses sw_purchase_orders + sw_purchase_order_items
// directly. Stock is NOT incremented until the PO is marked
// 'delivered' (which would call a separate RPC function — TODO for v1.1).
export async function placeOrder(vendorId, newOrder, total) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  // Get the vendor's business_id from the row.
  const { data: vendor, error: vErr } = await supabase
    .from('sw_vendors')
    .select('business_id')
    .eq('id', vendorId)
    .maybeSingle();
  if (vErr) return { data: null, error: { code: vErr.code, message: vErr.message } };
  if (!vendor) return { data: null, error: { code: 'NOT_FOUND', message: 'Vendor not found' } };

  // Generate the display_id via the helper RPC.
  const { data: displayId, error: dErr } = await supabase.rpc('next_display_id', {
    p_business_id: vendor.business_id,
    p_entity: 'purchase_order',
  });
  if (dErr) return { data: null, error: { code: dErr.code, message: dErr.message } };

  // Insert the PO header.
  const { data: po, error: poErr } = await supabase
    .from('sw_purchase_orders')
    .insert({
      business_id: vendor.business_id,
      display_id: displayId,
      vendor_id: vendorId,
      status: newOrder.status ?? 'pending',
      total: Number(total) || 0,
      note: newOrder.note ?? null,
      order_date: newOrder.date ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (poErr) return { data: null, error: { code: poErr.code, message: poErr.message } };

  // Insert line items (only valid ones). The frontend sends the array
  // in `newOrder.lineItems`; older callers may have used `newOrder.items`
  // (an array of {name, qty, unitPrice}). Accept either; the count
  // version of `newOrder.items` (a number) is intentionally rejected by
  // the Array.isArray guard.
  const itemsArray = Array.isArray(newOrder.lineItems)
    ? newOrder.lineItems
    : (Array.isArray(newOrder.items) ? newOrder.items : []);
  const lineItems = itemsArray
    .filter(i => i.name && i.qty > 0 && Number(i.unitPrice) > 0)
    .map(i => ({
      purchase_order_id: po.id,
      item_name: i.name,
      qty: Number(i.qty),
      unit_price: Number(i.unitPrice),
    }));

  if (lineItems.length > 0) {
    const { error: liErr } = await supabase
      .from('sw_purchase_order_items')
      .insert(lineItems);
    if (liErr) {
      // Best-effort cleanup of the orphaned PO header.
      await supabase.from('sw_purchase_orders').delete().eq('id', po.id);
      return { data: null, error: { code: liErr.code, message: liErr.message } };
    }
  }

  return { data: po, error: null };
}

export async function listCategories() {
  return { data: ['Clothing & Accessories', 'Footwear', 'Leather Goods', 'Accessories', 'Other'], error: null };
}
export async function listStatuses() {
  return { data: ['Active', 'Inactive'], error: null };
}

// Receive a purchase order — calls the sw_receive_purchase_order RPC.
// The RPC is defined in docs/BACKEND_HANDOVER.md (Section C, PO receiving).
//
// `purchaseOrderId` may be either a UUID (the table primary key) or a
// display_id (e.g. `PO-001`). The mock callers and the VendorDrawer
// display use the display_id; the RPC requires a UUID. We resolve the
// display_id → UUID here so the rest of the app keeps the user-facing
// display_id.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function receivePurchaseOrder(purchaseOrderId) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  let poUuid = purchaseOrderId;
  if (!UUID_RE.test(String(purchaseOrderId))) {
    // Resolve display_id → UUID. Must match the business's own POs
    // (RLS will scope the SELECT correctly).
    const { data: po, error: lookupErr } = await supabase
      .from('sw_purchase_orders')
      .select('id')
      .eq('display_id', purchaseOrderId)
      .maybeSingle();
    if (lookupErr) return { data: null, error: { code: lookupErr.code, message: lookupErr.message } };
    if (!po) return { data: null, error: { code: 'NOT_FOUND', message: `Purchase order ${purchaseOrderId} not found` } };
    poUuid = po.id;
  }

  const { data, error } = await supabase.rpc('sw_receive_purchase_order', {
    p_purchase_order_id: poUuid,
  });
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data, error: null };
}
