// src/services/inventoryMock.js
// Mock data-access layer for inventory items. Returns the same async
// shape that the eventual Supabase-backed implementation will return
// (`{ data, error }`), so call sites can be written today without
// depending on the backend existing.
//
// All mutations here are in-memory only — they mutate the shared mock
// array AND call back to local React state via the consumer. Nothing
// persists across a page reload. See docs/SUPABASE_SETUP.md §"What is
// NOT implemented".
//
// The shape mirrors the proposed API in docs/BACKEND_HANDOVER.md §2.

import { inventoryItems as mockItems, categories as mockCategories, suppliers as mockSuppliers } from '../data/mockData';

// In-memory working copy so mutations don't leak back into the imported
// module (which is shared across pages).
let workingItems = mockItems.map(i => ({ ...i }));

const delay = (ms) => new Promise(r => setTimeout(r, ms));

function deriveStatus(item) {
  if (item.stock === 0) return 'out_of_stock';
  if (item.stock <= item.threshold) return 'low_stock';
  return 'in_stock';
}

export async function list({
  search = '',
  category = '',
  status = '',
  sort = 'name:asc',
  page = 1,
  pageSize = 100,
} = {}) {
  await delay(50); // simulate latency
  let r = [...workingItems];
  if (search) {
    const q = search.toLowerCase();
    r = r.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.sku.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }
  if (category && category !== 'All') {
    r = r.filter(i => i.category === category);
  }
  if (status && status !== 'All') {
    r = r.filter(i => deriveStatus(i) === status.toLowerCase());
  }
  const [field, dir] = sort.split(':');
  const dirMul = dir === 'desc' ? -1 : 1;
  r.sort((a, b) => {
    const av = a[field]; const bv = b[field];
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * dirMul;
    }
    return ((av ?? 0) - (bv ?? 0)) * dirMul;
  });
  const total = r.length;
  const start = (page - 1) * pageSize;
  const data = r.slice(start, start + pageSize);
  return { data, error: null, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function get(id) {
  await delay(30);
  const data = workingItems.find(i => String(i.id) === String(id));
  if (!data) return { data: null, error: { code: 'NOT_FOUND', message: 'Item not found' } };
  return { data, error: null };
}

export async function create(payload) {
  await delay(200);
  const id = Date.now();
  const item = {
    ...payload,
    id,
    lastRestocked: new Date().toISOString().slice(0, 10),
  };
  workingItems = [item, ...workingItems];
  return { data: item, error: null };
}

export async function update(id, patch) {
  await delay(200);
  let updated = null;
  workingItems = workingItems.map(i => {
    if (String(i.id) === String(id)) {
      updated = { ...i, ...patch, id: i.id };
      return updated;
    }
    return i;
  });
  if (!updated) return { data: null, error: { code: 'NOT_FOUND', message: 'Item not found' } };
  return { data: updated, error: null };
}

export async function remove(id) {
  await delay(150);
  workingItems = workingItems.filter(i => String(i.id) !== String(id));
  return { data: { id }, error: null };
}

export async function listCategories() {
  return { data: mockCategories.filter(c => c !== 'All'), error: null };
}

export async function listSuppliers() {
  return { data: mockSuppliers, error: null };
}

export function __resetForTests() {
  workingItems = mockItems.map(i => ({ ...i }));
}
