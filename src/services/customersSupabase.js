// src/services/customersSupabase.js
// Supabase-backed implementation of the customers service.

import { supabase } from '../lib/supabase';

const AVATAR_COLORS = [
  { color: '#fce7f3', textColor: '#9d174d' },
  { color: '#dbeafe', textColor: '#1d4ed8' },
  { color: '#fef3c7', textColor: '#92400e' },
  { color: '#f0fdf4', textColor: '#15803d' },
  { color: '#ede9fe', textColor: '#6d28d9' },
  { color: '#fff7ed', textColor: '#c2410c' },
  { color: '#ecfdf5', textColor: '#065f46' },
];

function pickColor(seed) {
  let sum = 0;
  for (const ch of String(seed ?? '')) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initialsFor(first = '', last = '') {
  return `${(first[0] ?? '')}${(last[0] ?? '')}`.toUpperCase() || '?';
}

function shapeRow(row, stats = {}) {
  if (!row) return null;
  const colorPair = pickColor(`${row.first_name}${row.last_name}`);
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    type: row.type,
    location: row.location,
    status: row.status,
    note: row.note,
    joinDate: row.created_at?.slice(0, 10),
    initials: initialsFor(row.first_name, row.last_name),
    color: colorPair.color,
    textColor: colorPair.textColor,
    totalSpent: stats.totalSpent ?? 0,
    totalOrders: stats.totalOrders ?? 0,
    lastOrder: stats.lastOrder ?? null,
    orders: stats.orders ?? [],
  };
}


export async function list({ search = '', type = 'All', status = 'All', page = 1, pageSize = 100 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  let query = supabase
    .from('sw_customers')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,location.ilike.%${search}%`);
  }
  if (type && type !== 'All') query = query.eq('type', type);
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
    .from('sw_customers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Customer not found' } };

  // Fetch the customer's recent orders.
  const { data: orders } = await supabase
    .from('sw_sales')
    .select('id, display_id, sale_date, total, status')
    .eq('customer_id', id)
    .is('deleted_at', null)
    .order('sale_date', { ascending: false })
    .limit(10);

  const stats = {
    totalSpent: (orders ?? []).filter(o => o.status === 'completed').reduce((s, o) => s + Number(o.total), 0),
    totalOrders: orders?.length ?? 0,
    lastOrder: orders?.[0]?.sale_date?.slice(0, 10) ?? null,
    orders: (orders ?? []).map(o => ({
      id: o.display_id ?? o.id,
      date: o.sale_date?.slice(0, 10),
      total: Number(o.total),
      status: o.status,
      items: 0, // would need a join to sw_sale_items to compute
    })),
  };
  return { data: shapeRow(row, stats), error: null };
}

export async function create(payload) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const insertRow = {
    business_id: payload.businessId,
    first_name: payload.firstName,
    last_name: payload.lastName,
    email: payload.email || null,
    phone: payload.phone,
    type: payload.type,
    location: payload.location,
    note: payload.note || null,
    status: 'new',
  };
  const { data: row, error } = await supabase
    .from('sw_customers')
    .insert(insertRow)
    .select()
    .single();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: shapeRow(row), error: null };
}

export async function update(id, patch) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const dbPatch = {};
  if (patch.firstName !== undefined)  dbPatch.first_name = patch.firstName;
  if (patch.lastName !== undefined)   dbPatch.last_name = patch.lastName;
  if (patch.email !== undefined)      dbPatch.email = patch.email;
  if (patch.phone !== undefined)      dbPatch.phone = patch.phone;
  if (patch.type !== undefined)       dbPatch.type = patch.type;
  if (patch.location !== undefined)   dbPatch.location = patch.location;
  if (patch.status !== undefined)     dbPatch.status = patch.status;
  if (patch.note !== undefined)       dbPatch.note = patch.note;
  dbPatch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('sw_customers')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Customer not found' } };
  return { data: shapeRow(row), error: null };
}

export async function remove(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { error } = await supabase
    .from('sw_customers')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: { id }, error: null };
}

export async function listTypes()     { return { data: ['Retailer', 'Wholesale', 'Walk-in', 'E-commerce'], error: null }; }
export async function listStatuses() { return { data: ['Active', 'New', 'Owing', 'Inactive'], error: null }; }
