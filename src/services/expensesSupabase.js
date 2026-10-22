// src/services/expensesSupabase.js
// Supabase-backed implementation of the expenses service.

import { supabase } from '../lib/supabase';

function shapeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    vendor: row.vendor,
    amount: Number(row.amount),
    date: row.expense_date,
    payment: row.payment,
    note: row.note,
  };
}


export async function list({ search = '', category = 'all', payment = 'All', page = 1, pageSize = 100 } = {}) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };

  let query = supabase
    .from('sw_expenses')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,vendor.ilike.%${search}%,note.ilike.%${search}%`);
  }
  if (category && category !== 'all') query = query.eq('category', category);
  if (payment && payment !== 'All') query = query.eq('payment', payment);
  query = query.order('expense_date', { ascending: false });
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: rawData, error, count } = await query;
  if (error) return { data: null, error: { code: error.code, message: error.message } };

  return {
    data: (rawData ?? []).map(shapeRow),
    error: null,
    pagination: { page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) },
  };
}

export async function get(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { data: row, error } = await supabase
    .from('sw_expenses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Expense not found' } };
  return { data: shapeRow(row), error: null };
}

export async function create(payload) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const insertRow = {
    business_id: payload.businessId,
    name: payload.name,
    category: payload.category,
    vendor: payload.vendor,
    amount: Number(payload.amount),
    payment: payload.payment,
    expense_date: payload.date ?? new Date().toISOString().slice(0, 10),
    note: payload.note || null,
  };
  const { data: row, error } = await supabase
    .from('sw_expenses')
    .insert(insertRow)
    .select()
    .single();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: shapeRow(row), error: null };
}

export async function update(id, patch) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const dbPatch = {};
  if (patch.name !== undefined)      dbPatch.name = patch.name;
  if (patch.category !== undefined)  dbPatch.category = patch.category;
  if (patch.vendor !== undefined)    dbPatch.vendor = patch.vendor;
  if (patch.amount !== undefined)    dbPatch.amount = Number(patch.amount);
  if (patch.payment !== undefined)   dbPatch.payment = patch.payment;
  if (patch.date !== undefined)       dbPatch.expense_date = patch.date;
  if (patch.note !== undefined)      dbPatch.note = patch.note;
  dbPatch.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('sw_expenses')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  if (!row) return { data: null, error: { code: 'NOT_FOUND', message: 'Expense not found' } };
  return { data: shapeRow(row), error: null };
}

export async function remove(id) {
  if (!supabase) return { data: null, error: { code: 'NOT_CONFIGURED', message: 'Supabase client not configured' } };
  const { error } = await supabase
    .from('sw_expenses')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { data: null, error: { code: error.code, message: error.message } };
  return { data: { id }, error: null };
}

export async function listCategories() {
  return {
    data: [
      { id: 'stock',     label: 'Stock Purchase', icon: 'Package',   color: '#16a34a', bg: '#f0fdf4' },
      { id: 'rent',      label: 'Rent',           icon: 'Home',      color: '#3b82f6', bg: '#dbeafe' },
      { id: 'transport', label: 'Transport',      icon: 'Truck',     color: '#f59e0b', bg: '#fef3c7' },
      { id: 'utilities', label: 'Utilities',      icon: 'Zap',       color: '#8b5cf6', bg: '#ede9fe' },
      { id: 'marketing', label: 'Marketing',      icon: 'Megaphone', color: '#ec4899', bg: '#fdf2f8' },
      { id: 'salaries',  label: 'Salaries',       icon: 'Users',     color: '#0ea5e9', bg: '#e0f2fe' },
      { id: 'packaging', label: 'Packaging',      icon: 'MailOpen',  color: '#10b981', bg: '#d1fae5' },
      { id: 'other',     label: 'Other',          icon: 'Wrench',    color: '#6b7280', bg: '#f3f4f6' },
    ],
    error: null,
  };
}

export async function listPaymentMethods() {
  return { data: ['Cash', 'Transfer', 'Card'], error: null };
}
