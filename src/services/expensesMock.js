// src/services/expensesMock.js
// Mock data-access layer for expenses. See docs/BACKEND_HANDOVER.md §6.

import { expensesData as mockExpenses, expenseCategories, expensePaymentMethods } from '../data/mockData';

let workingExpenses = mockExpenses.map(e => ({ ...e }));

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export async function list({ search = '', category = 'all', payment = 'All', page = 1, pageSize = 100 } = {}) {
  await delay(50);
  let r = [...workingExpenses];
  if (search) {
    const q = search.toLowerCase();
    r = r.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.vendor.toLowerCase().includes(q) ||
      (e.note ?? '').toLowerCase().includes(q)
    );
  }
  if (category && category !== 'all') r = r.filter(e => e.category === category);
  if (payment && payment !== 'All') r = r.filter(e => e.payment === payment);
  r.sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = r.length;
  const start = (page - 1) * pageSize;
  return { data: r.slice(start, start + pageSize), error: null, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}

export async function get(id) {
  await delay(30);
  const data = workingExpenses.find(e => String(e.id) === String(id));
  if (!data) return { data: null, error: { code: 'NOT_FOUND', message: 'Expense not found' } };
  return { data, error: null };
}

export async function create(payload) {
  await delay(250);
  const expense = {
    ...payload,
    id: Date.now(),
    amount: Number(payload.amount) || 0,
  };
  workingExpenses = [expense, ...workingExpenses];
  return { data: expense, error: null };
}

export async function update(id, patch) {
  await delay(200);
  let updated = null;
  workingExpenses = workingExpenses.map(e => {
    if (String(e.id) === String(id)) { updated = { ...e, ...patch, id: e.id }; return updated; }
    return e;
  });
  if (!updated) return { data: null, error: { code: 'NOT_FOUND', message: 'Expense not found' } };
  return { data: updated, error: null };
}

export async function remove(id) {
  await delay(150);
  workingExpenses = workingExpenses.filter(e => String(e.id) !== String(id));
  return { data: { id }, error: null };
}

export async function listCategories()      { return { data: expenseCategories, error: null }; }
export async function listPaymentMethods() { return { data: expensePaymentMethods, error: null }; }

export function __resetForTests() {
  workingExpenses = mockExpenses.map(e => ({ ...e }));
}
