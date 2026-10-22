// src/services/salesMock.js
// Mock data-access layer for sales / orders. Same conventions as inventoryMock.
// See docs/BACKEND_HANDOVER.md for the proposed API contract.

import { salesData as mockSales, paymentMethods } from '../data/mockData';

let workingSales = mockSales.map(s => ({ ...s }));

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export async function list({ search = '', status = 'All', payment = 'All', page = 1, pageSize = 100 } = {}) {
  await delay(50);
  let r = [...workingSales];
  if (search) {
    const q = search.toLowerCase();
    r = r.filter(s =>
      String(s.id).toLowerCase().includes(q) ||
      s.customer.name.toLowerCase().includes(q) ||
      s.items.some(i => i.name.toLowerCase().includes(q))
    );
  }
  if (status && status !== 'All') r = r.filter(s => s.status === status.toLowerCase());
  if (payment && payment !== 'All') r = r.filter(s => s.payment === payment);
  r.sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = r.length;
  const start = (page - 1) * pageSize;
  return { data: r.slice(start, start + pageSize), error: null, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function get(id) {
  await delay(30);
  const data = workingSales.find(s => String(s.id) === String(id));
  if (!data) return { data: null, error: { code: 'NOT_FOUND', message: 'Sale not found' } };
  return { data, error: null };
}

export async function create(payload) {
  await delay(300);
  const sale = {
    ...payload,
    id: payload.id ?? `ORD-${Math.floor(Math.random() * 9000) + 1000}`,
    date: payload.date ?? new Date().toISOString(),
    status: payload.status ?? 'completed',
  };
  workingSales = [sale, ...workingSales];
  return { data: sale, error: null };
}

export async function update(id, patch) {
  await delay(200);
  let updated = null;
  workingSales = workingSales.map(s => {
    if (String(s.id) === String(id)) { updated = { ...s, ...patch }; return updated; }
    return s;
  });
  if (!updated) return { data: null, error: { code: 'NOT_FOUND', message: 'Sale not found' } };
  return { data: updated, error: null };
}

export async function listPaymentMethods() {
  return { data: paymentMethods, error: null };
}

export function __resetForTests() {
  workingSales = mockSales.map(s => ({ ...s }));
}
