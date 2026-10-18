// src/services/customersMock.js
// Mock data-access layer for customers. See docs/BACKEND_HANDOVER.md §4.

import { customersData as mockCustomers, customerTypes, customerStatuses } from '../data/mockData';

let workingCustomers = mockCustomers.map(c => ({ ...c }));

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const avatarColors = [
  { color: '#fce7f3', textColor: '#9d174d' },
  { color: '#dbeafe', textColor: '#1d4ed8' },
  { color: '#fef3c7', textColor: '#92400e' },
  { color: '#f0fdf4', textColor: '#15803d' },
  { color: '#ede9fe', textColor: '#6d28d9' },
  { color: '#fff7ed', textColor: '#c2410c' },
  { color: '#ecfdf5', textColor: '#065f46' },
];

function pickColor(seed) {
  // Deterministic pick based on the sum of char codes — avoids the
  // ESLint react-hooks/purity warning that fires when Math.random is
  // called inside a setState path, and gives stable colors across
  // remounts.
  let sum = 0;
  for (const ch of String(seed ?? '')) sum += ch.charCodeAt(0);
  return avatarColors[sum % avatarColors.length];
}

function initialsFor(first = '', last = '') {
  return `${(first[0] ?? '')}${(last[0] ?? '')}`.toUpperCase();
}

export async function list({ search = '', type = 'All', status = 'All', page = 1, pageSize = 100 } = {}) {
  await delay(50);
  let r = [...workingCustomers];
  if (search) {
    const q = search.toLowerCase();
    r = r.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
    );
  }
  if (type && type !== 'All') r = r.filter(c => c.type === type);
  if (status && status !== 'All') r = r.filter(c => c.status === status.toLowerCase());
  r.sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate));
  const total = r.length;
  const start = (page - 1) * pageSize;
  return { data: r.slice(start, start + pageSize), error: null, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function get(id) {
  await delay(30);
  const data = workingCustomers.find(c => String(c.id) === String(id));
  if (!data) return { data: null, error: { code: 'NOT_FOUND', message: 'Customer not found' } };
  return { data, error: null };
}

export async function create(payload) {
  await delay(250);
  const id = Date.now();
  const colorPair = pickColor(`${payload.firstName}${payload.lastName}`);
  const customer = {
    ...payload,
    id,
    initials: initialsFor(payload.firstName, payload.lastName),
    color: colorPair.color,
    textColor: colorPair.textColor,
    status: 'new',
    joinDate: new Date().toISOString().slice(0, 10),
    totalSpent: 0,
    totalOrders: 0,
    lastOrder: null,
    orders: [],
  };
  workingCustomers = [customer, ...workingCustomers];
  return { data: customer, error: null };
}

export async function update(id, patch) {
  await delay(200);
  let updated = null;
  workingCustomers = workingCustomers.map(c => {
    if (String(c.id) === String(id)) { updated = { ...c, ...patch, id: c.id }; return updated; }
    return c;
  });
  if (!updated) return { data: null, error: { code: 'NOT_FOUND', message: 'Customer not found' } };
  return { data: updated, error: null };
}

export async function remove(id) {
  await delay(150);
  workingCustomers = workingCustomers.filter(c => String(c.id) !== String(id));
  return { data: { id }, error: null };
}

export async function listTypes()     { return { data: customerTypes.filter(t => t !== 'All'), error: null }; }
export async function listStatuses() { return { data: customerStatuses.filter(s => s !== 'All'), error: null }; }

export function __resetForTests() {
  workingCustomers = mockCustomers.map(c => ({ ...c }));
}
