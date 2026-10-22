// src/services/vendorsMock.js
// Mock data-access layer for vendors / suppliers. See docs/BACKEND_HANDOVER.md.

import { vendorsData as mockVendors, vendorCategories, vendorStatuses } from '../data/mockData';

let workingVendors = mockVendors.map(v => ({ ...v }));

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const avatarColors = [
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
  return avatarColors[sum % avatarColors.length];
}

function initialsFor(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export async function list({ search = '', category = 'All', status = 'All', page = 1, pageSize = 100 } = {}) {
  await delay(50);
  let r = [...workingVendors];
  if (search) {
    const q = search.toLowerCase();
    r = r.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.contactPerson.toLowerCase().includes(q) ||
      v.location.toLowerCase().includes(q) ||
      (v.itemsSupplied ?? []).some(i => i.toLowerCase().includes(q))
    );
  }
  if (category && category !== 'All') r = r.filter(v => v.category === category);
  if (status && status !== 'All') r = r.filter(v => v.status === status.toLowerCase());
  r.sort((a, b) => b.totalPaid - a.totalPaid);
  const total = r.length;
  const start = (page - 1) * pageSize;
  return { data: r.slice(start, start + pageSize), error: null, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function get(id) {
  await delay(30);
  const data = workingVendors.find(v => String(v.id) === String(id));
  if (!data) return { data: null, error: { code: 'NOT_FOUND', message: 'Vendor not found' } };
  return { data, error: null };
}

export async function create(payload) {
  await delay(250);
  const id = Date.now();
  const colorPair = pickColor(payload.name);
  const vendor = {
    ...payload,
    id,
    initials: initialsFor(payload.name),
    color: colorPair.color,
    textColor: colorPair.textColor,
    status: 'active',
    joinDate: new Date().toISOString().slice(0, 10),
    totalOrders: 0,
    totalPaid: 0,
    pendingAmount: 0,
    lastOrder: null,
    rating: 4,
    orders: [],
    leadTimeDays: Number(payload.leadTimeDays) || 0,
    itemsSupplied: (payload.itemsSupplied ?? []).filter(i => i.trim()),
  };
  workingVendors = [vendor, ...workingVendors];
  return { data: vendor, error: null };
}

export async function update(id, patch) {
  await delay(200);
  let updated = null;
  workingVendors = workingVendors.map(v => {
    if (String(v.id) === String(id)) { updated = { ...v, ...patch, id: v.id }; return updated; }
    return v;
  });
  if (!updated) return { data: null, error: { code: 'NOT_FOUND', message: 'Vendor not found' } };
  return { data: updated, error: null };
}

export async function remove(id) {
  await delay(150);
  workingVendors = workingVendors.filter(v => String(v.id) !== String(id));
  return { data: { id }, error: null };
}

export async function placeOrder(vendorId, newOrder, total) {
  await delay(300);
  let updated = null;
  workingVendors = workingVendors.map(v => {
    if (String(v.id) === String(vendorId)) {
      updated = {
        ...v,
        totalOrders: v.totalOrders + 1,
        pendingAmount: v.pendingAmount + total,
        lastOrder: newOrder.date,
        orders: [newOrder, ...(v.orders ?? [])],
      };
      return updated;
    }
    return v;
  });
  if (!updated) return { data: null, error: { code: 'NOT_FOUND', message: 'Vendor not found' } };
  return { data: updated, error: null };
}

export async function listCategories() { return { data: vendorCategories.filter(c => c !== 'All'), error: null }; }
export async function listStatuses()   { return { data: vendorStatuses.filter(s => s !== 'All'), error: null }; }

export function __resetForTests() {
  workingVendors = mockVendors.map(v => ({ ...v }));
}

// Mock receive purchase order — in demo mode, just marks the PO as
// delivered + increments vendor's totalPaid. Does NOT touch inventory
// (no sw_inventory_items table in demo mode).
export async function receivePurchaseOrder(purchaseOrderId) {
  await delay(300);
  let updated = null;
  workingVendors = workingVendors.map(v => {
    const poIdx = (v.orders ?? []).findIndex(o => o.id === purchaseOrderId);
    if (poIdx >= 0) {
      const newOrders = [...v.orders];
      newOrders[poIdx] = { ...newOrders[poIdx], status: 'delivered' };
      updated = newOrders[poIdx];
      return { ...v, orders: newOrders, totalPaid: v.totalPaid + newOrders[poIdx].total, pendingAmount: Math.max(0, v.pendingAmount - newOrders[poIdx].total) };
    }
    return v;
  });
  if (!updated) return { data: null, error: { code: 'NOT_FOUND', message: 'Purchase order not found' } };
  return { data: { purchase_order_id: purchaseOrderId, status: 'delivered', items_processed: 1, total_qty_received: 0 }, error: null };
}
